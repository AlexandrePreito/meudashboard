import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

/**
 * GET /api/powerbi/screens/user-screen-ids?group_id=xxx&user_id=yyy
 * Retorna os IDs das telas que o usuário user_id tem acesso no grupo group_id.
 * Apenas master, developer do grupo ou admin do grupo podem chamar.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const userId = searchParams.get('user_id');

    if (!groupId || !userId) {
      return NextResponse.json({ error: 'group_id e user_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: master, developer dono do grupo ou admin do grupo
    if (user.is_master) {
      // ok
    } else {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', groupId)
          .eq('developer_id', developerId)
          .single();
        if (!group) {
          return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
        }
      } else {
        const isAdmin = await isUserAdminOfGroup(user.id, groupId);
        if (!isAdmin) {
          return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
        }
      }
    }

    // Telas do grupo
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('company_group_id', groupId);

    const screenIds = screens?.map((s) => s.id) || [];
    if (screenIds.length === 0) {
      const { count } = await supabase
        .from('powerbi_screen_users')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      return NextResponse.json({
        screen_ids: [],
        has_explicit_config: (count ?? 0) > 0,
      });
    }

    // powerbi_screen_users onde screen_id está no grupo e user_id = userId
    const { data: userScreens } = await supabase
      .from('powerbi_screen_users')
      .select('screen_id')
      .eq('user_id', userId)
      .in('screen_id', screenIds);

    const screen_ids = [...new Set(userScreens?.map((r) => r.screen_id) || [])];

    // Verificar se o usuário tem alguma config explícita (em qualquer grupo) para diferenciar
    // "nunca configurado" (acesso a todas) de "configurado para nenhuma tela"
    const { count } = await supabase
      .from('powerbi_screen_users')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const has_explicit_config = (count ?? 0) > 0 || screen_ids.length > 0;

    return NextResponse.json({ screen_ids, has_explicit_config });
  } catch (error) {
    console.error('Erro user-screen-ids:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
