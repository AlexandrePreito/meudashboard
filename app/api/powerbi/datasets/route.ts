import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar datasets de uma conexão
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');

    if (!connectionId) {
      return NextResponse.json({ error: 'connection_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar a conexão para obter as credenciais
    const { data: connection, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Tentar buscar access token
    let accessToken = connection.access_token;

    // Se não tem token ou expirou, tentar renovar
    if (!accessToken || (connection.token_expires_at && new Date(connection.token_expires_at) < new Date())) {
      // Tentar usar refresh token
      if (connection.refresh_token) {
        try {
          const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              client_id: process.env.POWERBI_CLIENT_ID || '',
              client_secret: process.env.POWERBI_CLIENT_SECRET || '',
              refresh_token: connection.refresh_token,
              grant_type: 'refresh_token',
              scope: 'https://analysis.windows.net/powerbi/api/.default offline_access'
            })
          });

          if (tokenResponse.ok) {
            const tokenData = await tokenResponse.json();
            accessToken = tokenData.access_token;

            // Atualizar tokens no banco
            await supabase
              .from('powerbi_connections')
              .update({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || connection.refresh_token,
                token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
              })
              .eq('id', connectionId);
          }
        } catch (err) {
          console.error('Erro ao renovar token:', err);
        }
      }
    }

    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Token de acesso não disponível. Reconecte ao Power BI.',
        datasets: []
      }, { status: 200 });
    }

    // Buscar datasets do workspace
    const workspaceId = connection.workspace_id;
    const apiUrl = workspaceId 
      ? `https://api.powerbi.com/v1.0/myorg/groups/${workspaceId}/datasets`
      : 'https://api.powerbi.com/v1.0/myorg/datasets';

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro ao buscar datasets:', errorText);
      return NextResponse.json({ 
        error: 'Erro ao buscar datasets do Power BI',
        datasets: []
      }, { status: 200 });
    }

    const data = await response.json();
    
    const datasets = (data.value || []).map((ds: any) => ({
      id: ds.id,
      name: ds.name,
      configuredBy: ds.configuredBy,
      isRefreshable: ds.isRefreshable,
      isOnPremGatewayRequired: ds.isOnPremGatewayRequired,
      webUrl: ds.webUrl
    }));

    return NextResponse.json({ datasets });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message, datasets: [] }, { status: 200 });
  }
}

