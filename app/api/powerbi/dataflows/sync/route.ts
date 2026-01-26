import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Permitir master ou developer
    const canSync = user.is_master || user.is_developer;
    if (!canSync) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const groupId = searchParams.get('group_id');

    let connectionsQuery = supabase
      .from('powerbi_connections')
      .select('id, workspace_id, tenant_id, client_id, client_secret, company_group_id')
      .eq('is_active', true);

    if (connectionId) {
      connectionsQuery = connectionsQuery.eq('id', connectionId);
    } else if (groupId) {
      connectionsQuery = connectionsQuery.eq('company_group_id', groupId);
    }

    const { data: connections, error: connError } = await connectionsQuery;

    if (connError || !connections || connections.length === 0) {
      return NextResponse.json({ 
        error: 'Nenhuma conexão encontrada',
        details: connError?.message 
      }, { status: 404 });
    }

    const results: any[] = [];

    for (const connection of connections) {
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

        if (!tokenResponse.ok) {
          results.push({
            connection_id: connection.id,
            success: false,
            error: 'Falha ao obter token do Power BI'
          });
          continue;
        }

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.access_token;

        // Listar dataflows do workspace
        const dataflowsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows`;
        const dataflowsResponse = await fetch(dataflowsUrl, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        if (!dataflowsResponse.ok) {
          const errorText = await dataflowsResponse.text();
          results.push({
            connection_id: connection.id,
            success: false,
            error: `Falha ao listar dataflows: ${dataflowsResponse.status}`,
            details: errorText
          });
          continue;
        }

        const dataflowsData = await dataflowsResponse.json();
        const dataflows = dataflowsData.value || [];

        console.log(`[SYNC] Conexão ${connection.id}: ${dataflows.length} dataflows encontrados`);

        let synced = 0;
        let errors = 0;

        for (const df of dataflows) {
          try {
            // Buscar última transação do dataflow para status
            let lastRefreshDate = null;
            let refreshStatus = 'Pending';

            try {
              const transactionsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${df.objectId}/transactions?$top=1`;
              const transactionsResponse = await fetch(transactionsUrl, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
              });

              if (transactionsResponse.ok) {
                const transactionsData = await transactionsResponse.json();
                const lastTransaction = transactionsData.value?.[0];
                
                if (lastTransaction) {
                  lastRefreshDate = lastTransaction.endTime || lastTransaction.startTime || null;
                  refreshStatus = lastTransaction.status || 'Unknown';
                  if (refreshStatus === 'Success') {
                    refreshStatus = 'Completed';
                  }
                }
              }
            } catch (txError) {
              console.error(`[SYNC] Erro ao buscar transações do dataflow ${df.objectId}:`, txError);
            }

            // Upsert no banco de dados
            const { error: upsertError } = await supabase
              .from('powerbi_dataflows')
              .upsert({
                connection_id: connection.id,
                dataflow_id: df.objectId,
                name: df.name || 'Sem nome',
                is_active: true,
                last_refresh_date: lastRefreshDate,
                refresh_status: refreshStatus,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'connection_id,dataflow_id'
              });

            if (upsertError) {
              console.error(`[SYNC] Erro ao salvar dataflow ${df.objectId}:`, upsertError);
              errors++;
            } else {
              synced++;
            }
          } catch (dfError) {
            console.error(`[SYNC] Erro ao processar dataflow ${df.objectId}:`, dfError);
            errors++;
          }
        }

        // Desativar dataflows que não existem mais no Power BI
        const activeDataflowIds = dataflows.map((df: any) => df.objectId);
        if (activeDataflowIds.length > 0) {
          // Buscar todos os dataflows ativos desta conexão
          const { data: existingDataflows } = await supabase
            .from('powerbi_dataflows')
            .select('dataflow_id')
            .eq('connection_id', connection.id)
            .eq('is_active', true);
          
          if (existingDataflows) {
            const toDeactivate = existingDataflows
              .filter((df: any) => !activeDataflowIds.includes(df.dataflow_id))
              .map((df: any) => df.dataflow_id);
            
            if (toDeactivate.length > 0) {
              await supabase
                .from('powerbi_dataflows')
                .update({ is_active: false, updated_at: new Date().toISOString() })
                .eq('connection_id', connection.id)
                .in('dataflow_id', toDeactivate);
            }
          }
        } else {
          // Se não há dataflows no Power BI, desativar todos desta conexão
          await supabase
            .from('powerbi_dataflows')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('connection_id', connection.id)
            .eq('is_active', true);
        }

        results.push({
          connection_id: connection.id,
          success: true,
          total_found: dataflows.length,
          synced,
          errors,
          dataflows: dataflows.map((df: any) => ({
            id: df.objectId,
            name: df.name
          }))
        });

      } catch (connError: any) {
        console.error(`[SYNC] Erro na conexão ${connection.id}:`, connError);
        results.push({
          connection_id: connection.id,
          success: false,
          error: connError.message
        });
      }
    }

    const totalSynced = results.filter(r => r.success).reduce((acc, r) => acc + (r.synced || 0), 0);
    const totalFound = results.filter(r => r.success).reduce((acc, r) => acc + (r.total_found || 0), 0);

    return NextResponse.json({
      success: true,
      message: `Sincronização concluída: ${totalSynced} dataflows sincronizados de ${totalFound} encontrados`,
      connections_processed: results.length,
      total_dataflows_found: totalFound,
      total_synced: totalSynced,
      results
    });

  } catch (error: any) {
    console.error('[SYNC] Erro geral:', error);
    return NextResponse.json({ 
      error: 'Erro interno', 
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
