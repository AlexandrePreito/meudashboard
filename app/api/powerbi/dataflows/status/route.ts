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
        return NextResponse.json({ dataflows: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
      }
      connectionsQuery = connectionsQuery.in('company_group_id', groupIds);
    }

    const { data: connections } = await connectionsQuery;

    if (!connections || connections.length === 0) {
      return NextResponse.json({ dataflows: [], summary: { total: 0, updated: 0, failed: 0, stale: 0 } });
    }

    const allDataflows: any[] = [];
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

        const dataflowsRes = await fetch(
          `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );

        if (!dataflowsRes.ok) continue;

        const dataflowsData = await dataflowsRes.json();
        const dataflows = dataflowsData.value || [];

        for (const dataflow of dataflows) {
          try {
            const transactionsRes = await fetch(
              `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${dataflow.objectId}/transactions?$top=1`,
              { headers: { 'Authorization': `Bearer ${accessToken}` } }
            );

            let lastRefreshTime: string | null = null;
            let lastRefreshStatus = 'Unknown';
            let hoursAgo: number | null = null;
            let isStale = false;

            if (transactionsRes.ok) {
              const transactionsData = await transactionsRes.json();
              const lastTransaction = transactionsData.value?.[0];

              if (lastTransaction) {
                lastRefreshTime = lastTransaction.startTime;
                const status = lastTransaction.status || 'Unknown';
                
                if (status === 'Completed' || status === 'Success') {
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

            allDataflows.push({
              id: dataflow.objectId,
              name: dataflow.name,
              workspaceName: connection.name,
              lastRefreshTime,
              lastRefreshStatus,
              isStale,
              hoursAgo
            });
          } catch (e) {
            console.error('Erro ao buscar transação do dataflow:', e);
          }
        }
      } catch (e) {
        console.error('Erro ao processar conexão:', e);
      }
    }

    const summary = {
      total: allDataflows.length,
      updated: allDataflows.filter(d => d.lastRefreshStatus === 'Completed' && !d.isStale).length,
      failed: allDataflows.filter(d => d.lastRefreshStatus === 'Failed').length,
      stale: allDataflows.filter(d => d.isStale).length
    };

    return NextResponse.json({ dataflows: allDataflows, summary });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}



