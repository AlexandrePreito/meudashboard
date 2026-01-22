import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar datasets (baseado nos relatórios)
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Se tem filtro de grupo, primeiro buscar as conexões desse grupo
    let validConnectionIds: string[] = [];
    
    if (groupId) {
      const { data: groupConnections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .eq('company_group_id', groupId);
      
      validConnectionIds = groupConnections?.map(c => c.id) || [];
      
      if (validConnectionIds.length === 0) {
        return NextResponse.json({ datasets: [] });
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

    return NextResponse.json({ datasets });

  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}