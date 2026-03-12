import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Buscar filiais de um usuário
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const groupId = searchParams.get('group_id');

    if (!userId || !groupId) {
      return NextResponse.json({ error: 'user_id e group_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!(user as { is_master?: boolean }).is_master) {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', groupId)
        .eq('developer_id', developerId)
        .single();

      if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    const { data: companies } = await supabase
      .from('rls_user_companies')
      .select('company_code')
      .eq('user_id', userId)
      .eq('company_group_id', groupId)
      .order('company_code');

    const codes = (companies || []).map((c) => c.company_code);

    return NextResponse.json({ companies: codes });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Salvar filiais de um usuário
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, group_id, user_email, companies } = body;

    if (!user_id || !group_id || !user_email) {
      return NextResponse.json(
        { error: 'user_id, group_id e user_email são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    if (!(user as { is_master?: boolean }).is_master) {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    await supabase
      .from('rls_user_companies')
      .delete()
      .eq('user_id', user_id)
      .eq('company_group_id', group_id);

    const codes = (companies || [])
      .map((c: string) => String(c).trim())
      .filter((c: string) => c.length > 0);

    if (codes.length > 0) {
      const inserts = codes.map((code: string) => ({
        user_id,
        company_group_id: group_id,
        user_email: String(user_email).trim().toLowerCase(),
        company_code: code,
      }));

      const { error } = await supabase.from('rls_user_companies').insert(inserts);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
