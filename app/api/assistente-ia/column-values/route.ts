import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('dataset_id');
    const tableName = searchParams.get('table');
    const columnName = searchParams.get('column');
    const searchTerm = searchParams.get('search') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!datasetId || !tableName || !columnName) {
      return NextResponse.json({ 
        success: false, 
        error: 'dataset_id, table e column são obrigatórios' 
      }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: reports } = await supabase
      .from('powerbi_reports')
      .select(`
        id, dataset_id, connection_id,
        powerbi_connections (
          id, tenant_id, client_id, client_secret, workspace_id, is_active
        )
      `)
      .eq('dataset_id', datasetId)
      .eq('is_active', true)
      .limit(1);

    if (!reports || reports.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dataset não encontrado' 
      }, { status: 404 });
    }

    const connection = reports[0].powerbi_connections as any;
    if (!connection?.is_active) {
      return NextResponse.json({ 
        success: false, 
        error: 'Conexão Power BI não está ativa' 
      }, { status: 400 });
    }

    // Obter token
    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: connection.client_id,
          client_secret: connection.client_secret,
          scope: 'https://analysis.windows.net/powerbi/api/.default'
        })
      }
    );

    if (!tokenResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao obter token do Power BI' 
      }, { status: 500 });
    }

    const { access_token } = await tokenResponse.json();

    // Query para buscar valores únicos
    const daxQuery = `
      EVALUATE
      TOPN(${limit}, VALUES('${tableName}'[${columnName}]))
      ORDER BY '${tableName}'[${columnName}] ASC
    `;

    const daxResponse = await fetch(
      `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          queries: [{ query: daxQuery }],
          serializerSettings: { includeNulls: true }
        })
      }
    );

    if (!daxResponse.ok) {
      return NextResponse.json({ 
        success: false, 
        error: 'Erro ao buscar valores da coluna'
      }, { status: 500 });
    }

    const daxData = await daxResponse.json();
    const rows = daxData.results?.[0]?.tables?.[0]?.rows || [];
    
    let values = rows.map((row: any) => {
      const keys = Object.keys(row);
      return row[keys[0]];
    }).filter(Boolean);

    // Filtrar por termo de busca se fornecido
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      values = values.filter((v: string) => 
        v.toString().toLowerCase().includes(term)
      );
    }

    return NextResponse.json({
      success: true,
      values,
      total: values.length,
      table: tableName,
      column: columnName
    });

  } catch (error) {
    console.error('Erro na API column-values:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
