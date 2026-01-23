import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

// GET: Listar exemplos de treinamento
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para acessar treinamento' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    // Se tem ID, buscar exemplo específico
    if (id) {
      const { data, error } = await supabase
        .from('ai_training_examples')
        .select(`
          *,
          company_group:company_groups(id, name)
        `)
        .eq('id', id)
        .eq('company_group_id', membership.company_group_id)
        .single();

      if (error) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.code === 'PGRST116' ? 404 : 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data
      });
    }

    // Busca de lista (comportamento original)
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const connectionId = searchParams.get('connection_id');
    const datasetId = searchParams.get('dataset_id');
    const validatedOnly = searchParams.get('validated_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('ai_training_examples')
      .select(`
        *,
        company_group:company_groups(id, name)
      `, { count: 'exact' })
      .eq('company_group_id', membership.company_group_id)
      .order('validation_count', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('user_question', `%${search}%`);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (connectionId) {
      query = query.eq('connection_id', connectionId);
    }

    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    }

    if (validatedOnly) {
      query = query.eq('is_validated', true);
    }

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST: Criar novo exemplo de treinamento
export async function POST(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para criar exemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      user_question,
      dax_query,
      formatted_response,
      category,
      tags,
      connection_id,
      dataset_id,
      unanswered_question_id  // ← NOVO PARÂMETRO
    } = body;

    // Validações
    if (!user_question || !dax_query || !formatted_response) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }

    const { data: trainingExample, error } = await supabase
      .from('ai_training_examples')
      .insert({
        company_group_id: membership.company_group_id,
        connection_id: connection_id || null,  // Permitir null
        dataset_id,
        user_question,
        dax_query,
        formatted_response,
        category,
        tags,
        is_validated: true,
        validation_count: 1
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // ← NOVO: Se tem unanswered_question_id, marcar como resolvida
    if (unanswered_question_id) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error: updateError } = await supabase
        .from('ai_unanswered_questions')
        .update({
          status: 'resolved',
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          training_example_id: trainingExample.id  // Vincular ao exemplo criado
        })
        .eq('id', unanswered_question_id)
        .eq('company_group_id', membership.company_group_id);

      if (updateError) {
        console.error('Erro ao marcar pergunta como resolvida:', updateError);
        // Não falhar a requisição, apenas logar o erro
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Exemplo criado com sucesso',
      data: trainingExample
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Atualizar exemplo existente
export async function PUT(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para editar exemplos' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do exemplo é obrigatório' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('ai_training_examples')
      .update(updates)
      .eq('id', id)
      .eq('company_group_id', membership.company_group_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exemplo atualizado com sucesso',
      data
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Excluir exemplo
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para excluir exemplos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID do exemplo é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('ai_training_examples')
      .delete()
      .eq('id', id)
      .eq('company_group_id', membership.company_group_id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Exemplo excluído com sucesso'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
