import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// POST - Disparar atualização de dados
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { screen_id, dataset_id, connection_id } = body;

    const supabase = createAdminClient();
    let connection: any = null;
    let datasetId = dataset_id;

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
    else if (connection_id && dataset_id) {
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

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset ID não encontrado' }, { status: 400 });
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

    // Disparar refresh do dataset
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
      const errorData = await refreshResponse.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || 'Falha ao iniciar atualização';
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Atualização iniciada com sucesso'
    });

  } catch (error: any) {
    console.error('Erro ao disparar refresh:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// GET - Verificar status de refresh
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('dataset_id');
    const connectionId = searchParams.get('connection_id');

    if (!datasetId || !connectionId) {
      return NextResponse.json({ error: 'dataset_id e connection_id são obrigatórios' }, { status: 400 });
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

    // Buscar histórico de refresh
    const refreshUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/refreshes?$top=5`;

    const refreshResponse = await fetch(refreshUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!refreshResponse.ok) {
      return NextResponse.json({ error: 'Erro ao buscar histórico' }, { status: 400 });
    }

    const refreshData = await refreshResponse.json();
    const refreshes = refreshData.value || [];

    // Formatar resposta
    const history = refreshes.map((r: any) => ({
      id: r.requestId,
      status: r.status,
      startTime: r.startTime,
      endTime: r.endTime,
      refreshType: r.refreshType
    }));

    const lastRefresh = history[0];
    const isRefreshing = lastRefresh?.status === 'Unknown' || lastRefresh?.status === 'InProgress';

    return NextResponse.json({
      isRefreshing,
      lastRefresh,
      history
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

