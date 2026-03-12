import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Buscar páginas configuradas para um usuário numa tela
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const screenId = searchParams.get('screen_id');
    const groupId = searchParams.get('group_id');

    if (!userId || !screenId || !groupId) {
      return NextResponse.json({ error: 'user_id, screen_id e group_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão do developer
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();
    if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    // Buscar configuração salva
    const { data: savedAccess } = await supabase
      .from('user_screen_page_access')
      .select('page_name, display_name, is_allowed')
      .eq('user_id', userId)
      .eq('screen_id', screenId)
      .eq('company_group_id', groupId);

    return NextResponse.json({
      pages: savedAccess || [],
      has_custom_config: (savedAccess || []).length > 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Salvar configuração de acesso por página
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const body = await request.json();
    const { user_id, screen_id, group_id, pages } = body;

    if (!user_id || !screen_id || !group_id || !pages) {
      return NextResponse.json({ error: 'user_id, screen_id, group_id e pages são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', group_id)
      .eq('developer_id', developerId)
      .single();
    if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });

    // Deletar config antiga desta tela
    await supabase
      .from('user_screen_page_access')
      .delete()
      .eq('user_id', user_id)
      .eq('screen_id', screen_id)
      .eq('company_group_id', group_id);

    // Se TODAS estão permitidas, não inserir nada (volta ao padrão "todas liberadas")
    const allAllowed = pages.every((p: { is_allowed?: boolean }) => p.is_allowed === true);

    if (!allAllowed && pages.length > 0) {
      const inserts = pages.map((p: { page_name: string; display_name?: string; is_allowed?: boolean }) => ({
        user_id,
        screen_id,
        company_group_id: group_id,
        page_name: p.page_name,
        display_name: p.display_name || p.page_name,
        is_allowed: p.is_allowed ?? true,
      }));

      const { error } = await supabase
        .from('user_screen_page_access')
        .insert(inserts);
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
