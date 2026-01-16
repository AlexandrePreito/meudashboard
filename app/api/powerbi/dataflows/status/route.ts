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
        return NextResponse.json({ dataflows: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
      }
    }

    // Buscar reports através das connections para filtrar por grupo
    let reportsQuery = supabase
      .from('powerbi_reports')
      .select(`
        id, 
        name, 
        is_active, 
        last_refresh_date, 
        refresh_status,
        connection:powerbi_connections(company_group_id)
      `)
      .eq('is_active', true);

    const { data: reportsData } = await reportsQuery;

    // Filtrar por grupo se necessário
    let reports = (reportsData || []).filter((r: any) => {
      const reportGroupId = r.connection?.company_group_id;
      
      if (groupId) {
        if (!user.is_master && !userGroupIds.includes(groupId)) {
          return false;
        }
        return reportGroupId === groupId;
      } else if (!user.is_master && userGroupIds.length > 0) {
        return reportGroupId && userGroupIds.includes(reportGroupId);
      }
      
      return true;
    });

    const now = new Date();
    
    const flows = reports.map((d: any) => {
      const lastRefresh = d.last_refresh_date ? new Date(d.last_refresh_date) : null;
      const hoursAgo = lastRefresh ? Math.floor((now.getTime() - lastRefresh.getTime()) / 3600000) : null;
      const isStale = !lastRefresh || (hoursAgo !== null && hoursAgo > 24);

      return {
        id: d.id,
        name: d.name || 'Sem nome',
        workspaceName: 'Workspace',
        lastRefreshTime: d.last_refresh_date,
        lastRefreshStatus: d.refresh_status || 'Unknown',
        isStale,
        hoursAgo
      };
    });

    const total = flows.length;
    const updated = flows.filter(d => !d.isStale && (d.lastRefreshStatus === 'Success' || d.lastRefreshStatus === 'Completed')).length;
    const failed = flows.filter(d => ['Failed', 'Error'].includes(d.lastRefreshStatus)).length;
    const stale = flows.filter(d => d.isStale).length;

    return NextResponse.json({
      dataflows: flows,
      summary: { total, updated, failed, stale }
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
