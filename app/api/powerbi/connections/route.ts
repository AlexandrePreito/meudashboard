import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar conexões
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterGroupId = searchParams.get('company_group_id') || searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar grupos do usuario
    let userGroupIds: string[] = [];
    
    if (!user.is_master) {
      // Primeiro verificar se é desenvolvedor
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
        return NextResponse.json({ connections: [] });
      }

      // SEGURANCA: Se passou group_id, validar acesso
      if (filterGroupId && !userGroupIds.includes(filterGroupId)) {
        return NextResponse.json({ error: 'Sem permissao para este grupo' }, { status: 403 });
      }
    }

    let query = supabase
      .from('powerbi_connections')
      .select(`
        *,
        company_group:company_groups(id, name)
      `)
      .order('name');

    // Filtrar por grupo
    if (filterGroupId) {
      query = query.eq('company_group_id', filterGroupId);
    } else if (!user.is_master) {
      query = query.in('company_group_id', userGroupIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar conexoes:', error);
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

    const body = await request.json();
    const { company_group_id, name, tenant_id, client_id, client_secret, workspace_id, show_page_navigation } = body;

    // Verificar permissão: master pode tudo, dev só seus grupos
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para criar conexões' }, { status: 403 });
      }

      // Verificar se o grupo pertence ao desenvolvedor
      const supabaseCheck = createAdminClient();
      const { data: group } = await supabaseCheck
        .from('company_groups')
        .select('id')
        .eq('id', company_group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) {
        return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
      }
    }

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




