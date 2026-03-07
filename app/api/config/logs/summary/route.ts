import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const userId = searchParams.get('user_id');

    const supabase = createAdminClient();

    // Buscar grupos do usuário (master: todos; developer: por developer_id; admin/user: por membership)
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        userGroupIds = devGroups?.map((g: { id: string }) => g.id) || [];
      } else {
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        userGroupIds = memberships?.map((m: { company_group_id: string }) => m.company_group_id) || [];
      }
    }

    // Segurança: validar acesso ao grupo
    if (groupId && !user.is_master && !userGroupIds.includes(groupId)) {
      return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
    }

    let query = supabase
      .from('user_usage_summary')
      .select('*');

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    } else if (!user.is_master && userGroupIds.length > 0) {
      query = query.in('company_group_id', userGroupIds);
    }

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: summary, error } = await query;

    if (error) {
      console.error('Erro ao buscar resumo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ summary: summary || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
