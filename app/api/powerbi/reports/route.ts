import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar relatórios
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get('connection_id');

    const supabase = createAdminClient();

    // Se não for master, buscar grupos do usuário
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      userGroupIds = memberships?.map(m => m.company_group_id) || [];

      if (userGroupIds.length === 0) {
        return NextResponse.json({ reports: [] });
      }
    }

    let query = supabase
      .from('powerbi_reports')
      .select(`
        *,
        connection:powerbi_connections(id, name, company_group_id)
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

    if (!user.is_master) {
      return NextResponse.json({ error: 'Apenas master pode criar relatórios' }, { status: 403 });
    }

    const body = await request.json();
    const { connection_id, name, report_id, dataset_id, default_page } = body;

    if (!connection_id || !name || !report_id || !dataset_id) {
      return NextResponse.json({ error: 'Campos obrigatórios: connection_id, name, report_id, dataset_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

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




