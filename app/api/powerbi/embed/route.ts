import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// POST - Gerar embed token
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { screen_id } = body;

    if (!screen_id) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: screen, error: screenError } = await supabase
      .from('powerbi_dashboard_screens')
      .select(`
        *,
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

    const report = screen.report;
    const connection = report?.connection;

    if (!connection) {
      return NextResponse.json({ error: 'Conexão Power BI não configurada' }, { status: 400 });
    }

    // 1. Obter token do Azure AD
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Erro ao obter token Azure:', errorData);
      return NextResponse.json({ 
        error: 'Falha na autenticação Power BI: ' + (errorData.error_description || 'Erro desconhecido')
      }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // 2. Gerar embed token para o relatório
    const embedUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/reports/${report.report_id}/GenerateToken`;
    
    const embedResponse = await fetch(embedUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        accessLevel: 'View',
        allowSaveAs: false,
      }),
    });

    if (!embedResponse.ok) {
      const errorData = await embedResponse.json();
      console.error('Erro ao gerar embed token:', errorData);
      return NextResponse.json({ 
        error: 'Falha ao gerar token de visualização: ' + (errorData.error?.message || 'Erro desconhecido')
      }, { status: 500 });
    }

    const embedData = await embedResponse.json();

    // 3. Montar URL de embed
    const reportEmbedUrl = `https://app.powerbi.com/reportEmbed?reportId=${report.report_id}&groupId=${connection.workspace_id}`;

    return NextResponse.json({
      embedToken: embedData.token,
      embedUrl: reportEmbedUrl,
      reportId: report.report_id,
      expiration: embedData.expiration,
      defaultPage: report.default_page,
      showPageNavigation: connection.show_page_navigation,
      screenTitle: screen.title,
      screenIcon: screen.icon
    });
  } catch (error) {
    console.error('Erro ao gerar embed:', error);
    return NextResponse.json({ error: 'Erro interno ao gerar embed' }, { status: 500 });
  }
}



