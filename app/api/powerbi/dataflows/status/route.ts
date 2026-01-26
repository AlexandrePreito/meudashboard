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

    // Buscar dataflows através das connections para filtrar por grupo
    // Primeiro buscar conexões do grupo se necessário
    let validConnectionIds: string[] = [];
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

    let dataflowsQuery = supabase
      .from('powerbi_dataflows')
      .select(`
        id, 
        name, 
        is_active, 
        last_refresh_date, 
        refresh_status,
        dataflow_id,
        connection_id,
        connection:powerbi_connections(
          id,
          company_group_id,
          workspace_id,
          tenant_id,
          client_id,
          client_secret
        )
      `)
      .eq('is_active', true);

    // Filtrar por conexões do grupo se necessário
    if (validConnectionIds.length > 0) {
      dataflowsQuery = dataflowsQuery.in('connection_id', validConnectionIds);
    }

    const { data: dataflowsData, error: dataflowsError } = await dataflowsQuery;
    
    console.log('[DEBUG /api/powerbi/dataflows/status] Dataflows encontrados:', {
      total: dataflowsData?.length || 0,
      groupId,
      error: dataflowsError,
      dataflows: dataflowsData?.map((df: any) => ({
        id: df.id,
        name: df.name,
        groupId: df.connection?.company_group_id
      }))
    });

    // Os dataflows já foram filtrados pela query acima
    const dataflows = dataflowsData || [];
    
    console.log('[DEBUG /api/powerbi/dataflows/status] Dataflows filtrados:', {
      total: dataflows.length,
      groupId,
      validConnectionIds: validConnectionIds.length,
      dataflows: dataflows.map((df: any) => ({
        id: df.id,
        name: df.name,
        connectionId: df.connection_id,
        groupId: df.connection?.company_group_id
      }))
    });

    const now = new Date();
    
    // Buscar dados atualizados do Power BI para cada dataflow
    const flowsPromises = dataflows.map(async (df: any) => {
      const connection = df.connection;
      const dataflowId = df.dataflow_id;
      
      let lastRefreshTime: string | null = df.last_refresh_date;
      let lastRefreshStatus = df.refresh_status || 'Unknown';
      let hoursAgo: number | null = null;
      
      // Se tem conexão e dataflow_id, buscar dados atualizados do Power BI
      if (connection && dataflowId && connection.workspace_id && connection.tenant_id && connection.client_id && connection.client_secret) {
        try {
          // Obter token do Power BI
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

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            const accessToken = tokenData.access_token;

            // Buscar última transação do dataflow
            const transactionsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${dataflowId}/transactions?$top=1`;
            const transactionsResponse = await fetch(transactionsUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (transactionsResponse.ok) {
              const transactionsData = await transactionsResponse.json();
              const lastTransaction = transactionsData.value?.[0];
              
              if (lastTransaction) {
                // Usar endTime se disponível, senão usar startTime
                lastRefreshTime = lastTransaction.endTime || lastTransaction.startTime || null;
                lastRefreshStatus = lastTransaction.status || 'Unknown';
                
                // Converter "Success" para "Completed" para padronizar
                if (lastRefreshStatus === 'Success') {
                  lastRefreshStatus = 'Completed';
                }
              }
            }
          }
        } catch (error) {
          console.error(`[ERROR] Erro ao buscar status do dataflow ${dataflowId}:`, error);
          // Em caso de erro, usar dados locais
        }
      }
      
      // Calcular hoursAgo e isStale
      if (lastRefreshTime) {
        const lastRefresh = new Date(lastRefreshTime);
        hoursAgo = Math.floor((now.getTime() - lastRefresh.getTime()) / 3600000);
      }
      const isStale = !lastRefreshTime || (hoursAgo !== null && hoursAgo > 24);

      return {
        id: df.id,
        name: df.name || 'Sem nome',
        workspaceName: connection?.workspace_id || 'Workspace',
        lastRefreshTime,
        lastRefreshStatus,
        isStale,
        hoursAgo
      };
    });
    
    const flows = await Promise.all(flowsPromises);

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
