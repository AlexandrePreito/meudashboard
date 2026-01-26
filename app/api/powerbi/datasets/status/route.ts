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
      .select(`
        id, 
        title, 
        is_active, 
        last_refresh_date, 
        refresh_status, 
        company_group_id,
        report:powerbi_reports(
          id,
          dataset_id,
          connection:powerbi_connections(
            id,
            workspace_id,
            tenant_id,
            client_id,
            client_secret
          )
        )
      `)
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
    
    // Buscar dados atualizados do Power BI para cada tela
    const datasetsPromises = (screens || []).map(async (s: any) => {
      const report = s.report;
      const connection = report?.connection;
      const datasetId = report?.dataset_id;
      
      let lastRefreshTime: string | null = s.last_refresh_date;
      let lastRefreshStatus = s.refresh_status || 'Unknown';
      let hoursAgo: number | null = null;
      
      // Se tem conexão e dataset_id, buscar dados atualizados do Power BI
      if (connection && datasetId && connection.workspace_id && connection.tenant_id && connection.client_id && connection.client_secret) {
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

            // Buscar última atualização do dataset
            const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/refreshes?$top=1`;
            const refreshResponse = await fetch(refreshUrl, {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            });

            if (refreshResponse.ok) {
              const refreshData = await refreshResponse.json();
              const lastRefresh = refreshData.value?.[0];
              
              if (lastRefresh) {
                // Usar endTime se disponível, senão usar startTime
                lastRefreshTime = lastRefresh.endTime || lastRefresh.startTime || null;
                lastRefreshStatus = lastRefresh.status || 'Unknown';
                
                // Converter "Unknown" para "InProgress" se não tem endTime
                if (lastRefreshStatus === 'Unknown' && !lastRefresh.endTime) {
                  lastRefreshStatus = 'InProgress';
                }
              }
            }
          }
        } catch (error) {
          console.error(`[ERROR] Erro ao buscar status do dataset ${datasetId}:`, error);
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
        id: s.id,
        name: s.title || 'Sem nome',
        workspaceName: connection?.workspace_id || 'Workspace',
        lastRefreshTime,
        lastRefreshStatus,
        isStale,
        hoursAgo
      };
    });
    
    const datasets = await Promise.all(datasetsPromises);

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
