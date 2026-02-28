import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

/**
 * POST /api/powerbi/screens/set-user-screens
 * Body: { group_id: string, user_id: string, screen_ids: string[] }
 * Define quais telas do grupo o usuário pode acessar (atualiza powerbi_screen_users).
 * Apenas master, developer do grupo ou admin do grupo podem chamar.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { group_id: groupId, user_id: userId, screen_ids: screenIds } = body;

    if (!groupId || !userId || !Array.isArray(screenIds)) {
      return NextResponse.json({ error: 'group_id, user_id e screen_ids (array) são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão
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

    // Todas as telas do grupo
    const { data: groupScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('company_group_id', groupId);

    const groupScreenIds = groupScreens?.map((s) => s.id) || [];
    const targetSet = new Set(screenIds);

    for (const screenId of groupScreenIds) {
      const { data: current } = await supabase
        .from('powerbi_screen_users')
        .select('user_id')
        .eq('screen_id', screenId);

      const currentUserIds = current?.map((r) => r.user_id) || [];
      const hasUser = currentUserIds.includes(userId);
      const shouldHave = targetSet.has(screenId);

      if (shouldHave && !hasUser) {
        await supabase.from('powerbi_screen_users').insert({ screen_id: screenId, user_id: userId });
      } else if (!shouldHave && hasUser) {
        await supabase.from('powerbi_screen_users').delete().eq('screen_id', screenId).eq('user_id', userId);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Erro set-user-screens:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
