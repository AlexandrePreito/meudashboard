import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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

    const { data: connection, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    // Validar que usuário tem acesso ao grupo da conexão
    if (!user.is_master) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('id')
        .eq('user_id', user.id)
        .eq('company_group_id', connection.company_group_id)
        .eq('is_active', true)
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Sem permissão para acessar esta conexão' }, { status: 403 });
      }
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
      return NextResponse.json({ error: 'Erro ao obter token do Power BI' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Buscar datasets e reports em paralelo
    const [datasetsRes, reportsRes] = await Promise.all([
      fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      ),
      fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/reports`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      )
    ]);

    let datasets: any[] = [];
    let reports: any[] = [];

    if (datasetsRes.ok) {
      const datasetsData = await datasetsRes.json();
      datasets = (datasetsData.value || []).map((d: any) => ({
        id: d.id,
        name: d.name
      }));
    }

    if (reportsRes.ok) {
      const reportsData = await reportsRes.json();
      reports = (reportsData.value || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        datasetId: r.datasetId
      }));
    }

    return NextResponse.json({ datasets, reports });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
