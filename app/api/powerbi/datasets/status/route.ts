import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Buscar grupos que o usuário tem acesso
    let userGroupIds: string[] = [];
    if (user.is_master) {
      // Master vê tudo
    } else {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        // Desenvolvedor: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuário comum: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      if (userGroupIds.length === 0) {
        return NextResponse.json({ datasets: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
      }
    }

    let query = supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, is_active, last_refresh_date, refresh_status, company_group_id')
      .eq('is_active', true);

    // Filtrar por grupo se fornecido ou por grupos do usuário
    if (groupId) {
      if (!user.is_master && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
      }
      query = query.eq('company_group_id', groupId);
    } else if (!user.is_master && userGroupIds.length > 0) {
      query = query.in('company_group_id', userGroupIds);
    }

    const { data: screens } = await query;
    const now = new Date();
    
    const datasets = (screens || []).map(s => {
      const lastRefresh = s.last_refresh_date ? new Date(s.last_refresh_date) : null;
      const hoursAgo = lastRefresh ? Math.floor((now.getTime() - lastRefresh.getTime()) / 3600000) : null;
      const isStale = !lastRefresh || (hoursAgo !== null && hoursAgo > 24);

      return {
        id: s.id,
        name: s.title || 'Sem nome',
        workspaceName: 'Workspace',
        lastRefreshTime: s.last_refresh_date,
        lastRefreshStatus: s.refresh_status || 'Unknown',
        isStale,
        hoursAgo
      };
    });

    const total = datasets.length;
    const updated = datasets.filter(d => !d.isStale && (d.lastRefreshStatus === 'Success' || d.lastRefreshStatus === 'Completed')).length;
    const failed = datasets.filter(d => ['Failed', 'Error'].includes(d.lastRefreshStatus)).length;
    const stale = datasets.filter(d => d.isStale).length;

    return NextResponse.json({
      datasets,
      summary: { total, updated, failed, stale }
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
