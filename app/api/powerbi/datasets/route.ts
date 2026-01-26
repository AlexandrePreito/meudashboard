import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar datasets e reports
// Se connection_id for fornecido, busca diretamente do Power BI
// Se group_id for fornecido, filtra por grupo
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Se connection_id foi fornecido, buscar datasets e reports diretamente do Power BI
    if (connectionId) {
      // Buscar conexão
      const { data: connection, error: connError } = await supabase
        .from('powerbi_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (connError || !connection) {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }

      // Verificar se a conexão pertence ao grupo (se group_id foi fornecido)
      if (groupId) {
        const connectionGroupId = String(connection.company_group_id);
        const requestedGroupId = String(groupId);
        if (connectionGroupId !== requestedGroupId) {
          console.warn('[SEGURANÇA /api/powerbi/datasets] Conexão não pertence ao grupo:', {
            connectionId,
            connectionGroupId,
            requestedGroupId
          });
          return NextResponse.json({ error: 'Conexão não pertence ao grupo' }, { status: 403 });
        }
      }

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
        return NextResponse.json({ error: 'Falha na autenticação Power BI' }, { status: 401 });
      }

      const tokenData = await tokenResponse.json();
      const accessToken = tokenData.access_token;

      // Buscar datasets do Power BI
      const datasetsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets`;
      const datasetsResponse = await fetch(datasetsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      let datasets: any[] = [];
      if (datasetsResponse.ok) {
        const datasetsData = await datasetsResponse.json();
        datasets = (datasetsData.value || []).map((ds: any) => ({
          id: ds.id,
          name: ds.name,
          dataset_id: ds.id,
        }));
        console.log('[DEBUG /api/powerbi/datasets] Datasets do Power BI:', datasets.length);
      } else {
        const errorText = await datasetsResponse.text();
        console.error('[ERROR /api/powerbi/datasets] Erro ao buscar datasets:', {
          status: datasetsResponse.status,
          error: errorText
        });
      }

      // Buscar reports do Power BI
      const reportsUrl = `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/reports`;
      const reportsResponse = await fetch(reportsUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      let reports: any[] = [];
      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        reports = (reportsData.value || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          datasetId: r.datasetId,
        }));
        console.log('[DEBUG /api/powerbi/datasets] Reports do Power BI:', reports.length);
      } else {
        const errorText = await reportsResponse.text();
        console.error('[ERROR /api/powerbi/datasets] Erro ao buscar reports:', {
          status: reportsResponse.status,
          error: errorText
        });
      }

      return NextResponse.json({ datasets, reports });
    }

    // Se não tem connection_id, buscar datasets baseados nos relatórios cadastrados
    // Se tem filtro de grupo, primeiro buscar as conexões desse grupo
    let validConnectionIds: string[] = [];
    
    if (groupId) {
      const { data: groupConnections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .eq('company_group_id', groupId);
      
      validConnectionIds = groupConnections?.map(c => c.id) || [];
      
      if (validConnectionIds.length === 0) {
        return NextResponse.json({ datasets: [], reports: [] });
      }
    }

    // Buscar relatórios
    let query = supabase
      .from('powerbi_reports')
      .select('id, name, dataset_id, connection_id');

    if (groupId && validConnectionIds.length > 0) {
      query = query.in('connection_id', validConnectionIds);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Erro ao buscar datasets:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por dataset_id único
    const datasetsMap = new Map();
    reports?.forEach((report: any) => {
      if (!datasetsMap.has(report.dataset_id)) {
        datasetsMap.set(report.dataset_id, {
          id: report.dataset_id,
          dataset_id: report.dataset_id,
          name: report.name,
          connection_id: report.connection_id,
          report_id: report.id
        });
      }
    });

    const datasets = Array.from(datasetsMap.values());

    return NextResponse.json({ datasets, reports: reports || [] });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}