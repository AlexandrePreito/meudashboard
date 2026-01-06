import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// POST - Disparar atualização de dados (dataset ou dataflow)
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { screen_id, dataset_id, dataflow_id, connection_id } = body;

    const supabase = createAdminClient();
    let connection: any = null;
    let datasetId = dataset_id;
    let dataflowId = dataflow_id;

    // Se passou screen_id, busca a conexão pela tela
    if (screen_id) {
      const { data: screen, error: screenError } = await supabase
        .from('powerbi_dashboard_screens')
        .select(`
          *,
          company_group:company_groups(id, name),
          report:powerbi_reports(
            *,
            connection:powerbi_connections(*)
          )
        `)
        .eq('id', screen_id)
        .single();

      if (screenError || !screen) {
        return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
      }

      connection = screen.report?.connection;
      datasetId = screen.report?.dataset_id;
    }
    // Se passou connection_id diretamente
    else if (connection_id) {
      const { data: conn } = await supabase
        .from('powerbi_connections')
        .select('*')
        .eq('id', connection_id)
        .single();
      connection = conn;
    }

    if (!connection) {
      return NextResponse.json({ error: 'Conexão Power BI não encontrada' }, { status: 400 });
    }

    if (!datasetId && !dataflowId) {
      return NextResponse.json({ error: 'Dataset ID ou Dataflow ID não encontrado' }, { status: 400 });
    }

    // Obter token do Azure AD
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

    // Se é um DATAFLOW
    if (dataflowId) {
      // Primeiro verificar se já tem refresh em andamento
      const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${dataflowId}/transactions?$top=1`;
      const statusRes = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const lastTransaction = statusData.value?.[0];
        if (lastTransaction?.status === 'InProgress') {
          // Já tem refresh em andamento, retorna sucesso (o polling vai esperar terminar)
          return NextResponse.json({ 
            success: true, 
            message: 'Atualização já em andamento',
            type: 'dataflow',
            dataflow_id: dataflowId,
            alreadyInProgress: true
          });
        }
      }

      const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${dataflowId}/refreshes`;
      
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifyOption: 'NoNotification'
        })
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Erro ao atualizar dataflow:', errorText);
        
        // Se o erro é "já está atualizando", retorna sucesso
        if (errorText.includes('AlreadyRefreshing') || errorText.includes('InProgress')) {
          return NextResponse.json({ 
            success: true, 
            message: 'Atualização já em andamento',
            type: 'dataflow',
            dataflow_id: dataflowId,
            alreadyInProgress: true
          });
        }
        
        return NextResponse.json({ 
          error: 'Falha ao disparar atualização do dataflow',
          details: errorText 
        }, { status: refreshResponse.status });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Atualização do dataflow iniciada',
        type: 'dataflow',
        dataflow_id: dataflowId
      });
    }

    // Se é um DATASET
    if (datasetId) {
      // Primeiro verificar se já tem refresh em andamento
      const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/refreshes?$top=1`;
      const statusRes = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const lastRefresh = statusData.value?.[0];
        if (lastRefresh?.status === 'Unknown') {
          // Unknown geralmente significa em andamento para datasets
          return NextResponse.json({ 
            success: true, 
            message: 'Atualização já em andamento',
            type: 'dataset',
            dataset_id: datasetId,
            alreadyInProgress: true
          });
        }
      }

      const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/refreshes`;
      
      const refreshResponse = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notifyOption: 'NoNotification'
        })
      });

      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        console.error('Erro ao atualizar dataset:', errorText);
        
        // Se o erro é "já está atualizando", retorna sucesso
        if (errorText.includes('RefreshInProgress') || errorText.includes('already executing')) {
          return NextResponse.json({ 
            success: true, 
            message: 'Atualização já em andamento',
            type: 'dataset',
            dataset_id: datasetId,
            alreadyInProgress: true
          });
        }
        
        return NextResponse.json({ 
          error: 'Falha ao disparar atualização do dataset',
          details: errorText 
        }, { status: refreshResponse.status });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Atualização do dataset iniciada',
        type: 'dataset',
        dataset_id: datasetId
      });
    }

    return NextResponse.json({ error: 'Nenhum item para atualizar' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro ao disparar atualização:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// GET - Verificar status da atualização
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('dataset_id');
    const dataflowId = searchParams.get('dataflow_id');
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id é obrigatório' }, { status: 400 });
    }

    if (!datasetId && !dataflowId) {
      return NextResponse.json({ error: 'dataset_id ou dataflow_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
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
      return NextResponse.json({ error: 'Falha na autenticação' }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Se é um DATAFLOW
    if (dataflowId) {
      const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${dataflowId}/transactions?$top=1`;
      
      const statusResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!statusResponse.ok) {
        return NextResponse.json({ error: 'Falha ao verificar status' }, { status: statusResponse.status });
      }

      const statusData = await statusResponse.json();
      const lastTransaction = statusData.value?.[0];

      // Mapear status do dataflow para padrão
      let status = lastTransaction?.status || 'Unknown';
      if (status === 'Success') status = 'Completed';

      return NextResponse.json({
        type: 'dataflow',
        dataflow_id: dataflowId,
        status: status,
        startTime: lastTransaction?.startTime,
        endTime: lastTransaction?.endTime,
        refreshType: lastTransaction?.refreshType
      });
    }

    // Se é um DATASET
    if (datasetId) {
      const statusUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/refreshes?$top=1`;
      
      const statusResponse = await fetch(statusUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (!statusResponse.ok) {
        return NextResponse.json({ error: 'Falha ao verificar status' }, { status: statusResponse.status });
      }

      const statusData = await statusResponse.json();
      const lastRefresh = statusData.value?.[0];

      // Mapear status do dataset
      let status = lastRefresh?.status || 'Unknown';
      // "Unknown" no dataset geralmente significa em andamento
      if (status === 'Unknown') status = 'InProgress';

      return NextResponse.json({
        type: 'dataset',
        dataset_id: datasetId,
        status: status,
        startTime: lastRefresh?.startTime,
        endTime: lastRefresh?.endTime,
        serviceExceptionJson: lastRefresh?.serviceExceptionJson
      });
    }

    return NextResponse.json({ error: 'Nenhum item para verificar' }, { status: 400 });

  } catch (error: any) {
    console.error('Erro ao verificar status:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
