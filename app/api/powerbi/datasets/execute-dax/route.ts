import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { connection_id, dataset_id, query } = body;

    if (!connection_id || !dataset_id || !query) {
      return NextResponse.json({ error: 'connection_id, dataset_id e query são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar conexão
    const { data: connection, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connection_id)
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
      const errorText = await tokenResponse.text();
      return NextResponse.json({ error: 'Erro na autenticação: ' + errorText }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();

    // Executar DAX
    const daxRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${dataset_id}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queries: [{ query }],
          serializerSettings: { includeNulls: true }
        })
      }
    );

    if (!daxRes.ok) {
      const errorText = await daxRes.text();
      return NextResponse.json({ error: 'Erro DAX: ' + errorText }, { status: 400 });
    }

    const daxData = await daxRes.json();
    const results = daxData.results?.[0]?.tables?.[0]?.rows || [];

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Erro ao executar DAX:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

