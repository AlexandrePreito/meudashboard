import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar detalhes de um dataflow ou dataset
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type'); // 'dataflow' ou 'dataset'
    const itemId = searchParams.get('id'); // ID do item no Power BI (dataflow_id ou dataset_id)
    const connectionId = searchParams.get('connection_id');

    if (!itemType || !itemId || !connectionId) {
      return NextResponse.json({ error: 'type, id e connection_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar conexão
    const { data: connection, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Obter token
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
      return NextResponse.json({ error: 'Falha na autenticação Power BI' }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let details: any = {
      type: itemType,
      id: itemId,
      connectionName: connection.name,
      workspaceId: connection.workspace_id
    };

    if (itemType === 'dataflow') {
      // Buscar detalhes do dataflow
      const dataflowRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (dataflowRes.ok) {
        const dataflowData = await dataflowRes.json();
        details.name = dataflowData.name;
        details.description = dataflowData.description;
        details.configuredBy = dataflowData.configuredBy;
        details.modifiedBy = dataflowData.modifiedBy;
        details.modifiedDateTime = dataflowData.modifiedDateTime;
        
        // Schedule do dataflow (se existir)
        if (dataflowData.refreshSchedule) {
          details.powerbiSchedule = {
            enabled: dataflowData.refreshSchedule.enabled,
            days: dataflowData.refreshSchedule.days,
            times: dataflowData.refreshSchedule.times,
            localTimeZoneId: dataflowData.refreshSchedule.localTimeZoneId,
            notifyOption: dataflowData.refreshSchedule.notifyOption
          };
        }
      }

      // Buscar histórico de transações
      const transactionsRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}/transactions?$top=10`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        details.refreshHistory = (transactionsData.value || []).map((t: any) => ({
          id: t.id,
          status: t.status === 'Success' || t.status === 'Completed' ? 'Completed' : t.status,
          startTime: t.startTime,
          endTime: t.endTime
        }));
      }

    } else if (itemType === 'dataset') {
      // Buscar detalhes do dataset
      const datasetRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (datasetRes.ok) {
        const datasetData = await datasetRes.json();
        details.name = datasetData.name;
        details.configuredBy = datasetData.configuredBy;
        details.createdDate = datasetData.createdDate;
        details.isRefreshable = datasetData.isRefreshable;
        details.isOnPremGatewayRequired = datasetData.isOnPremGatewayRequired;
      }

      // Buscar schedule do dataset
      const scheduleRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}/refreshSchedule`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        details.powerbiSchedule = {
          enabled: scheduleData.enabled,
          days: scheduleData.days,
          times: scheduleData.times,
          localTimeZoneId: scheduleData.localTimeZoneId,
          notifyOption: scheduleData.notifyOption
        };
      }

      // Buscar histórico de refresh
      const refreshesRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}/refreshes?$top=10`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (refreshesRes.ok) {
        const refreshesData = await refreshesRes.json();
        details.refreshHistory = (refreshesData.value || []).map((r: any) => ({
          id: r.requestId,
          status: r.status,
          startTime: r.startTime,
          endTime: r.endTime,
          refreshType: r.refreshType
        }));
      }
    }

    return NextResponse.json(details);

  } catch (error: any) {
    console.error('Erro ao buscar detalhes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

