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

    // Buscar grupos do usuario
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Desenvolvedor: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuario comum: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      if (userGroupIds.length === 0) {
        return NextResponse.json({ reports: [] });
      }
    }

    let query = supabase
      .from('powerbi_reports')
      .select(`
        *,
        connection:powerbi_connections(
          id, 
          name, 
          company_group_id,
          company_group:company_groups(id, name)
        )
      `)
      .order('name');

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar relatórios:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filtrar por grupos do usuário (se não for master)
    let filteredReports = data || [];
    if (!user.is_master) {
      filteredReports = filteredReports.filter(report => 
        report.connection?.company_group_id && 
        userGroupIds.includes(report.connection.company_group_id)
      );
    }

    // Se passou group_id, filtrar por grupo
    if (groupId) {
      filteredReports = filteredReports.filter(report =>
        report.connection?.company_group_id === groupId
      );
    }

    return NextResponse.json({ reports: filteredReports });
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

    const body = await request.json();
    const { connection_id, name, report_id, dataset_id, default_page } = body;

    if (!connection_id || !name || !report_id || !dataset_id) {
      return NextResponse.json({ error: 'Campos obrigatórios: connection_id, name, report_id, dataset_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: master pode tudo, dev só seus grupos
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para criar relatórios' }, { status: 403 });
      }

      // Buscar conexão para pegar o grupo
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', connection_id)
        .single();

      if (!connection) {
        return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
      }

      // Verificar se o grupo pertence ao desenvolvedor
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', connection.company_group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) {
        return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
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




