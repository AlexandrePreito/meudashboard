import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Buscar config RLS de uma tela
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get('screen_id');

    if (!screenId) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: screen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, rls_enabled, rls_role_name, company_group_id')
      .eq('id', screenId)
      .single();

    if (!screen) return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });

    return NextResponse.json({
      rls_enabled: screen.rls_enabled || false,
      rls_role_name: screen.rls_role_name || '',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Salvar config RLS de uma tela
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { screen_id, rls_enabled, rls_role_name } = body;

    if (!screen_id) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: screen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('company_group_id')
      .eq('id', screen_id)
      .single();

    if (!screen) return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });

    if (!(user as { is_master?: boolean }).is_master) {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', screen.company_group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { error } = await supabase
      .from('powerbi_dashboard_screens')
      .update({
        rls_enabled: rls_enabled ?? false,
        rls_role_name: rls_enabled ? (rls_role_name || null) : null,
      })
      .eq('id', screen_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
