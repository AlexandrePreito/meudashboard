import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserGroupMembership } from '@/lib/auth';

// GET - Listar datasets (baseado nos relatórios)
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let groupId = searchParams.get('group_id');

    // Se não passou group_id, pegar do membership do usuário
    if (!groupId) {
      const membership = await getUserGroupMembership();
      if (membership?.company_group_id) {
        groupId = membership.company_group_id;
      }
    }

    if (!groupId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Grupo não identificado' 
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar conexões do grupo
    const { data: groupConnections } = await supabase
      .from('powerbi_connections')
      .select('id')
      .eq('company_group_id', groupId)
      .eq('is_active', true);
    
    const validConnectionIds = groupConnections?.map(c => c.id) || [];
    
    if (validConnectionIds.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: [] 
      });
    }

    // Buscar relatórios das conexões do grupo
    const { data: reports, error } = await supabase
      .from('powerbi_reports')
      .select('id, name, dataset_id, connection_id')
      .in('connection_id', validConnectionIds)
      .eq('is_active', true);

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

    // Buscar nomes das conexões para incluir no response
    if (datasets.length > 0) {
      const connectionIds = [...new Set(datasets.map((d: any) => d.connection_id))];
      const { data: connections } = await supabase
        .from('powerbi_connections')
        .select('id, name')
        .in('id', connectionIds);

      const connectionsMap = new Map(connections?.map((c: any) => [c.id, c.name]) || []);
      
      datasets.forEach((dataset: any) => {
        dataset.connection_name = connectionsMap.get(dataset.connection_id) || 'Conexão desconhecida';
      });
    }

    return NextResponse.json({ 
      success: true, 
      data: datasets 
    });

  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Erro interno' 
    }, { status: 500 });
  }
}