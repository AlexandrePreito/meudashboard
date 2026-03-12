import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { getDeveloperIdForGroup, resolveConnectionForGroup } from '@/lib/shared-resources';

/**
 * GET - Lista as páginas do relatório Power BI associado à tela.
 * Usado pelo modal de configuração de apresentação (páginas do relatório).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { id: screenId } = await params;
    const supabase = createAdminClient();

    const { data: screen, error: screenError } = await supabase
      .from('powerbi_dashboard_screens')
      .select(`
        id,
        company_group_id,
        report:powerbi_reports(
          id,
          report_id,
          connection:powerbi_connections(*)
        )
      `)
      .eq('id', screenId)
      .single();

    if (screenError || !screen) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    const report = screen.report as any;
    if (!report) {
      return NextResponse.json({ error: 'Relatório não encontrado para esta tela' }, { status: 404 });
    }

    let connection = report?.connection;
    if (!connection) {
      const developerId = await getDeveloperIdForGroup(screen.company_group_id);
      if (developerId) {
        connection = await resolveConnectionForGroup(screen.company_group_id, developerId);
      }
    }
    if (!connection) {
      return NextResponse.json({ error: 'Conexão Power BI não encontrada' }, { status: 404 });
    }

    // Verificar permissão: dev do grupo ou master
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (!developerId) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', screen.company_group_id)
        .eq('developer_id', developerId)
        .single();
      if (!group) {
        return NextResponse.json({ error: 'Sem permissão para esta tela' }, { status: 403 });
      }
    }

    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json();
      console.error('Token Power BI:', errData);
      return NextResponse.json({ error: 'Erro ao obter token Power BI' }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const pagesUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/reports/${report.report_id}/pages`;
    const pagesRes = await fetch(pagesUrl, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!pagesRes.ok) {
      const errText = await pagesRes.text();
      console.error('Power BI pages:', errText);
      return NextResponse.json({ error: 'Erro ao listar páginas do relatório' }, { status: 500 });
    }

    const pagesData = await pagesRes.json();
    const value = pagesData.value || [];
    const pages = value.map((p: any, index: number) => ({
      name: p.name,
      displayName: p.displayName || p.name,
      order: p.order ?? index,
    }));

    return NextResponse.json({ pages });
  } catch (error: any) {
    console.error('Erro em screens/[id]/pages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
