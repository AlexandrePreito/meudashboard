import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado', errorType: 'auth' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { dataset_id, dax_query, company_group_id } = body;

    if (!dataset_id || !dax_query) {
      return NextResponse.json({ 
        success: false, 
        error: 'dataset_id e dax_query são obrigatórios',
        errorType: 'validation'
      }, { status: 400 });
    }

    const trimmedDax = dax_query.trim();
    if (!trimmedDax.toUpperCase().startsWith('EVALUATE')) {
      return NextResponse.json({ 
        success: false, 
        error: 'A query DAX deve começar com EVALUATE',
        errorType: 'syntax',
        suggestion: 'Adicione EVALUATE no início da query'
      }, { status: 400 });
    }

    const groupId = company_group_id || membership.company_group_id;

    // Buscar conexão do grupo (mesma lógica do training/test)
    const { data: connections, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .limit(1);

    if (connError || !connections || connections.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Nenhuma conexão Power BI encontrada para o grupo',
        errorType: 'connection'
      }, { status: 404 });
    }

    const connection = connections[0];

    // Obter token Power BI
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: connection.client_id,
          client_secret: connection.client_secret,
          scope: 'https://analysis.windows.net/powerbi/api/.default',
          grant_type: 'client_credentials',
        }),
      }
    );

    if (!tokenRes.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao obter token do Power BI',
        errorType: 'auth'
      }, { status: 500 });
    }

    const tokenData = await tokenRes.json();
    const access_token = tokenData.access_token;

    // Executar DAX
    const daxResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${dataset_id}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queries: [{ query: trimmedDax }],
          serializerSettings: { includeNulls: true }
        })
      }
    );

    const executionTime = Date.now() - startTime;

    if (!daxResponse.ok) {
      const errorText = await daxResponse.text();
      let errorMessage = 'Erro ao executar DAX';
      let errorType = 'execution';
      let suggestion = '';

      if (errorText.toLowerCase().includes('column') && errorText.toLowerCase().includes('not found')) {
        errorType = 'column_not_found';
        errorMessage = 'Coluna não encontrada no modelo';
        suggestion = 'Verifique se o nome da coluna está correto';
      } else if (errorText.toLowerCase().includes('table') && errorText.toLowerCase().includes('not found')) {
        errorType = 'table_not_found';
        errorMessage = 'Tabela não encontrada no modelo';
        suggestion = 'Verifique se o nome da tabela está correto';
      } else if (errorText.toLowerCase().includes('syntax')) {
        errorType = 'syntax';
        errorMessage = 'Erro de sintaxe na query DAX';
        suggestion = 'Verifique a sintaxe da query';
      }

      return NextResponse.json({ 
        success: false, 
        error: errorMessage,
        errorType,
        suggestion,
        details: errorText.substring(0, 300),
        executionTime
      }, { status: 400 });
    }

    const daxData = await daxResponse.json();
    const rows = daxData.results?.[0]?.tables?.[0]?.rows || [];
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    if (rows.length === 0) {
      let suggestion = 'A query executou mas não retornou dados.';
      const stringMatch = trimmedDax.match(/"([^"]+)"/g);
      if (stringMatch) {
        const values = stringMatch.map((s: string) => s.replace(/"/g, ''));
        suggestion = `Valores buscados: ${values.join(', ')}. Verifique se existem no banco.`;
      }

      return NextResponse.json({
        success: true,
        result: [],
        columns,
        rowCount: 0,
        executionTime,
        warning: 'Query retornou vazio',
        suggestion
      });
    }

    return NextResponse.json({
      success: true,
      result: rows,
      columns,
      rowCount: rows.length,
      executionTime
    });

  } catch (error: any) {
    console.error('Erro na API execute-dax:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Erro interno do servidor',
      errorType: 'internal'
    }, { status: 500 });
  }
}
