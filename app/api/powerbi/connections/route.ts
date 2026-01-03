import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar conexões
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    let query = supabase
      .from('powerbi_connections')
      .select(`
        *,
        company_group:company_groups(id, name)
      `)
      .order('name');

    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id);
      
      const groupIds = memberships?.map(m => m.company_group_id) || [];
      query = query.in('company_group_id', groupIds.length > 0 ? groupIds : ['00000000-0000-0000-0000-000000000000']);
    }

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar conexões:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connections: data || [] });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar conexão
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Apenas master pode criar conexões' }, { status: 403 });
    }

    const body = await request.json();
    const { company_group_id, name, tenant_id, client_id, client_secret, workspace_id, show_page_navigation } = body;

    if (!company_group_id || !name || !tenant_id || !client_id || !client_secret || !workspace_id) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('powerbi_connections')
      .insert({
        company_group_id,
        name,
        tenant_id,
        client_id,
        client_secret,
        workspace_id,
        show_page_navigation: show_page_navigation ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data }, { status: 201 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

