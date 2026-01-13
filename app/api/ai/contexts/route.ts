import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// Funcao auxiliar para verificar permissoes
async function checkPermissions(supabase: any, user: any, groupId?: string | null) {
  let userGroupIds: string[] = [];
  let userRole = 'user';

  if (user.is_master) {
    userRole = 'master';
  } else {
    // Primeiro verificar se é desenvolvedor
    const { getUserDeveloperId } = await import('@/lib/auth');
    const developerId = await getUserDeveloperId(user.id);

    if (developerId) {
      // Desenvolvedor: buscar grupos pelo developer_id
      userRole = 'developer';
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      
      userGroupIds = devGroups?.map((g: any) => g.id) || [];
    } else {
      // Usuário comum: buscar via membership
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      userGroupIds = memberships?.map((m: any) => m.company_group_id) || [];
      
      if (memberships?.some((m: any) => m.role === 'admin')) {
        userRole = 'admin';
      }
    }
  }

  // Validar acesso ao grupo especifico
  if (groupId && userRole !== 'master' && userRole !== 'developer' && !userGroupIds.includes(groupId)) {
    return { allowed: false, userRole, userGroupIds, error: 'Sem permissao para este grupo' };
  }

  // Para developer, validar se o grupo pertence a ele
  if (groupId && userRole === 'developer' && !userGroupIds.includes(groupId)) {
    return { allowed: false, userRole, userGroupIds, error: 'Sem permissao para este grupo' };
  }

  return { allowed: true, userRole, userGroupIds, error: null };
}

// GET - Listar contextos
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    const { allowed, userRole, userGroupIds, error } = await checkPermissions(supabase, user, groupId);
    
    // Usuario comum nao tem acesso a contextos IA
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para acessar contextos' }, { status: 403 });
    }

    if (!allowed) {
      return NextResponse.json({ error }, { status: 403 });
    }

    let query = supabase
      .from('ai_model_contexts')
      .select(`
        *,
        connection:powerbi_connections(id, name),
        company_group:company_groups(id, name)
      `)
      .order('created_at', { ascending: false });

    // Filtrar por grupo
    if (groupId) {
      query = query.eq('company_group_id', groupId);
    } else if (userRole !== 'master') {
      query = query.in('company_group_id', userGroupIds);
    }

    const { data: contexts, error: queryError } = await query;

    if (queryError) {
      console.error('Erro ao buscar contextos:', queryError);
      return NextResponse.json({ error: queryError.message }, { status: 500 });
    }

    return NextResponse.json({ contexts: contexts || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar contexto
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    const { allowed, userRole, userGroupIds, error } = await checkPermissions(supabase, user, body.company_group_id);
    
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para criar contextos' }, { status: 403 });
    }

    if (!allowed) {
      return NextResponse.json({ error }, { status: 403 });
    }

    // Se ja existe um contexto ativo para este dataset, desativar
    if (body.connection_id && body.dataset_id) {
      await supabase
        .from('ai_model_contexts')
        .update({ is_active: false })
        .eq('connection_id', body.connection_id)
        .eq('dataset_id', body.dataset_id)
        .eq('is_active', true);
    }

    // Buscar grupo da conexao
    let companyGroupId = body.company_group_id;
    if (!companyGroupId && body.connection_id) {
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', body.connection_id)
        .single();
      companyGroupId = connection?.company_group_id;
    }

    const { data: context, error: insertError } = await supabase
      .from('ai_model_contexts')
      .insert({
        company_group_id: companyGroupId,
        connection_id: body.connection_id,
        dataset_id: body.dataset_id || null,
        dataset_name: body.dataset_name || null,
        context_name: body.context_name,
        context_content: body.context_content,
        context_format: body.context_format || 'markdown',
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao criar contexto:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ context });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar contexto
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Buscar contexto para verificar grupo
    const { data: existingContext } = await supabase
      .from('ai_model_contexts')
      .select('company_group_id')
      .eq('id', body.id)
      .single();

    const { allowed, userRole, error } = await checkPermissions(supabase, user, existingContext?.company_group_id);
    
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para editar contextos' }, { status: 403 });
    }

    if (!allowed) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { data: context, error: updateError } = await supabase
      .from('ai_model_contexts')
      .update({
        context_name: body.context_name,
        context_content: body.context_content,
        is_active: body.is_active ?? true,
        updated_at: new Date().toISOString()
      })
      .eq('id', body.id)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar contexto:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ context });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir contexto
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID e obrigatorio' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar contexto para verificar grupo
    const { data: existingContext } = await supabase
      .from('ai_model_contexts')
      .select('company_group_id')
      .eq('id', id)
      .single();

    const { allowed, userRole, error } = await checkPermissions(supabase, user, existingContext?.company_group_id);
    
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para excluir contextos' }, { status: 403 });
    }

    if (!allowed) {
      return NextResponse.json({ error }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('ai_model_contexts')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir contexto:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
