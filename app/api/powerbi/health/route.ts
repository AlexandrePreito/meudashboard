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

    let userGroupIds: string[] = [];
    let validConnectionIds: string[] = [];

    if (user.is_master) {
      // Master vê tudo
    } else {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);
        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      if (userGroupIds.length === 0) {
        return NextResponse.json({
          summary: { healthPercentage: 0, total: 0, updated: 0, failed: 0, stale: 0 },
          datasets: { total: 0, ok: 0, failed: 0, stale: 0 },
          dataflows: { total: 0, ok: 0, failed: 0, stale: 0 }
        });
      }
    }

    // Buscar conexões válidas para filtrar dataflows
    if (groupId) {
      const { data: groupConnections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .eq('company_group_id', groupId);
      validConnectionIds = groupConnections?.map(c => c.id) || [];
    } else if (!user.is_master && userGroupIds.length > 0) {
      const { data: userConnections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .in('company_group_id', userGroupIds);
      validConnectionIds = userConnections?.map(c => c.id) || [];
    }

    // ========== DATASETS (de powerbi_dashboard_screens) ==========
    let screensQuery = supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, is_active, last_refresh_date, refresh_status, company_group_id')
      .eq('is_active', true);

    if (groupId) {
      screensQuery = screensQuery.eq('company_group_id', groupId);
    } else if (!user.is_master && userGroupIds.length > 0) {
      screensQuery = screensQuery.in('company_group_id', userGroupIds);
    }

    const { data: screens, error: screensError } = await screensQuery;

    // ========== DATAFLOWS (de powerbi_dataflows - CORRIGIDO!) ==========
    let dataflowsQuery = supabase
      .from('powerbi_dataflows')  // CORRETO: usar powerbi_dataflows, NÃO powerbi_reports
      .select('id, name, is_active, last_refresh_date, refresh_status, connection_id')
      .eq('is_active', true);

    if (validConnectionIds.length > 0) {
      dataflowsQuery = dataflowsQuery.in('connection_id', validConnectionIds);
    } else if (!user.is_master) {
      dataflowsQuery = dataflowsQuery.in('connection_id', ['00000000-0000-0000-0000-000000000000']);
    }

    const { data: dataflows, error: dataflowsError } = await dataflowsQuery;

    if (screensError || dataflowsError) {
      console.error('Erro ao buscar recursos:', { screensError, dataflowsError });
    }

    const allScreens = screens || [];
    const allDataflows = dataflows || [];

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let datasetsOk = 0;
    let datasetsFailed = 0;
    let datasetsStale = 0;

    let dataflowsOk = 0;
    let dataflowsFailed = 0;
    let dataflowsStale = 0;

    for (const screen of allScreens) {
      if (screen.refresh_status === 'Failed' || screen.refresh_status === 'Error') {
        datasetsFailed++;
      } else {
        const lastRefresh = screen.last_refresh_date ? new Date(screen.last_refresh_date) : null;
        if (!lastRefresh || lastRefresh < oneDayAgo) {
          datasetsStale++;
        } else {
          datasetsOk++;
        }
      }
    }

    for (const dataflow of allDataflows) {
      if (dataflow.refresh_status === 'Failed' || dataflow.refresh_status === 'Error') {
        dataflowsFailed++;
      } else {
        const lastRefresh = dataflow.last_refresh_date ? new Date(dataflow.last_refresh_date) : null;
        if (!lastRefresh || lastRefresh < oneDayAgo) {
          dataflowsStale++;
        } else {
          dataflowsOk++;
        }
      }
    }

    const totalActive = allScreens.length + allDataflows.length;
    const totalOk = datasetsOk + dataflowsOk;
    const totalFailed = datasetsFailed + dataflowsFailed;
    const totalStale = datasetsStale + dataflowsStale;
    
    const healthPercentage = totalActive > 0 ? Math.round((totalOk / totalActive) * 100) : 0;

    return NextResponse.json({
      summary: {
        healthPercentage,
        total: totalActive,
        updated: totalOk,
        failed: totalFailed,
        stale: totalStale
      },
      datasets: {
        total: allScreens.length,
        ok: datasetsOk,
        failed: datasetsFailed,
        stale: datasetsStale
      },
      dataflows: {
        total: allDataflows.length,
        ok: dataflowsOk,
        failed: dataflowsFailed,
        stale: dataflowsStale
      }
    });

  } catch (error) {
    console.error('Erro na API de health:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
