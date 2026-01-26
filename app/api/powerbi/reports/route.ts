import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar relatórios
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

    // Se tem filtro de grupo, primeiro buscar as conexões desse grupo
    let validConnectionIds: string[] = [];
    
    if (groupId) {
      const { data: groupConnections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .eq('company_group_id', groupId);
      
      validConnectionIds = groupConnections?.map(c => c.id) || [];
      
      // Se não tem conexões nesse grupo, retorna vazio
      if (validConnectionIds.length === 0) {
        return NextResponse.json({ reports: [] });
      }
    }

    // Buscar relatórios
    let reportsQuery = supabase
      .from('powerbi_reports')
      .select('*')
      .order('name');

    if (connectionId) {
      reportsQuery = reportsQuery.eq('connection_id', connectionId);
    } else if (groupId && validConnectionIds.length > 0) {
      // Filtrar por conexões do grupo
      reportsQuery = reportsQuery.in('connection_id', validConnectionIds);
    }

    const { data: reports, error } = await reportsQuery;

    if (error) {
      console.error('Erro ao buscar relatórios:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({ reports: [] });
    }

    // Buscar detalhes das conexões e grupos
    const connectionIds = [...new Set(reports.map((r: any) => r.connection_id).filter(Boolean))];
    
    const { data: connections } = await supabase
      .from('powerbi_connections')
      .select(`
        id, 
        name, 
        company_group_id,
        company_group:company_groups(id, name)
      `)
      .in('id', connectionIds);

    // Combinar os dados
    const reportsWithConnection = reports.map((report: any) => ({
      ...report,
      connection: connections?.find((c: any) => c.id === report.connection_id) || null
    }));

    return NextResponse.json({ reports: reportsWithConnection });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar relatório
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissão e obter developerId se necessário
    let developerId: string | null = null;
    if (!user.is_master) {
      developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para criar relatórios' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { connection_id, name, report_id, dataset_id, default_page } = body;

    if (!connection_id || !name || !report_id || !dataset_id) {
      return NextResponse.json({ error: 'Campos obrigatórios: connection_id, name, report_id, dataset_id' }, { status: 400 });
    }

    // Se for developer, verificar se a conexão pertence a um grupo dele
    if (!user.is_master && developerId) {
      // Buscar a conexão para verificar o grupo
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', connection_id)
        .single();

      if (!connection) {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }

      // Verificar se o grupo pertence ao developer
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', connection.company_group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) {
        return NextResponse.json({ error: 'Sem permissão para criar relatórios nesta conexão' }, { status: 403 });
      }
    }

    const { data, error } = await supabase
      .from('powerbi_reports')
      .insert({
        connection_id,
        name,
        report_id,
        dataset_id,
        default_page: default_page || null
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar relatório:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}