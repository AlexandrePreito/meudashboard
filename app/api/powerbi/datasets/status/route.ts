import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let connectionsQuery = supabase
      .from('powerbi_connections')
      .select('*');

    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id);

      const groupIds = memberships?.map(m => m.company_group_id) || [];
      if (groupIds.length === 0) {
        return NextResponse.json({ datasets: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
      }
      connectionsQuery = connectionsQuery.in('company_group_id', groupIds);
    }

    const { data: connections } = await connectionsQuery;

    if (!connections || connections.length === 0) {
      return NextResponse.json({ datasets: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
    }

    const allDatasets: any[] = [];
    const now = new Date();

    for (const connection of connections) {
      try {
        const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
        const tokenResponse = await fetch(tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: connection.client_id,
            client_secret: connection.client_secret,
            scope: 'https://analysis.windows.net/powerbi/api/.default',
          }),
        });

        if (!tokenResponse.ok) continue;

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        const datasetsRes = await fetch(
          `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!datasetsRes.ok) continue;

        const datasetsData = await datasetsRes.json();
        const datasets = datasetsData.value || [];

        for (const dataset of datasets) {
          try {
            const refreshRes = await fetch(
              `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${dataset.id}/refreshes?$top=1`,
              { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            let lastRefreshTime: string | null = null;
            let lastRefreshStatus = 'Unknown';
            let hoursAgo: number | null = null;
            let isStale = false;

            if (refreshRes.ok) {
              const refreshData = await refreshRes.json();
              const lastRefresh = refreshData.value?.[0];

              if (lastRefresh) {
                lastRefreshTime = lastRefresh.startTime;
                const status = lastRefresh.status || 'Unknown';
                
                if (status === 'Completed') {
                  lastRefreshStatus = 'Completed';
                } else if (status === 'Failed') {
                  lastRefreshStatus = 'Failed';
                } else if (status === 'InProgress' || status === 'Unknown') {
                  lastRefreshStatus = 'InProgress';
                } else {
                  lastRefreshStatus = status;
                }

                if (lastRefreshTime) {
                  const refreshDate = new Date(lastRefreshTime);
                  hoursAgo = Math.floor((now.getTime() - refreshDate.getTime()) / (1000 * 60 * 60));
                  isStale = hoursAgo > 24;
                }
              }
            }

            allDatasets.push({
              id: dataset.id,
              name: dataset.name,
              workspaceName: connection.name,
              lastRefreshTime,
              lastRefreshStatus,
              isStale,
              hoursAgo
            });
          } catch (e) {
            console.error('Erro ao buscar refresh do dataset:', e);
          }
        }
      } catch (e) {
        console.error('Erro ao processar conexão:', e);
      }
    }

    const summary = {
      total: allDatasets.length,
      updated: allDatasets.filter(d => d.lastRefreshStatus === 'Completed' && !d.isStale).length,
      failed: allDatasets.filter(d => d.lastRefreshStatus === 'Failed').length,
      stale: allDatasets.filter(d => d.isStale).length
    };

    return NextResponse.json({ datasets: allDatasets, summary });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

