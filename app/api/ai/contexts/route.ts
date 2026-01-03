import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar contextos
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('ai_model_contexts')
      .select(`
        *,
        connection:powerbi_connections(id, name)
      `)
      .order('created_at', { ascending: false });

    // Se não é master, filtra por grupos do usuário
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id);

      const groupIds = memberships?.map(m => m.company_group_id) || [];
      if (groupIds.length === 0) {
        return NextResponse.json({ contexts: [] });
      }
      query = query.in('company_group_id', groupIds);
    }

    const { data: contexts, error } = await query;

    if (error) {
      console.error('Erro ao buscar contextos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Se já existe um contexto ativo para este dataset, desativar
    if (body.connection_id && body.dataset_id) {
      await supabase
        .from('ai_model_contexts')
        .update({ is_active: false })
        .eq('connection_id', body.connection_id)
        .eq('dataset_id', body.dataset_id)
        .eq('is_active', true);
    }

    // Buscar grupo da conexão
    let companyGroupId = body.company_group_id;
    if (!companyGroupId && body.connection_id) {
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', body.connection_id)
        .single();
      companyGroupId = connection?.company_group_id;
    }

    const { data: context, error } = await supabase
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

    if (error) {
      console.error('Erro ao criar contexto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    const { data: context, error } = await supabase
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

    if (error) {
      console.error('Erro ao atualizar contexto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('ai_model_contexts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir contexto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

