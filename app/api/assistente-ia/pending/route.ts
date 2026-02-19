import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership, getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar perguntas pendentes
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    // Bloquear viewer e operator
    if (membership.role === 'viewer' || membership.role === 'operator') {
      return NextResponse.json({ success: false, error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupIdParam = searchParams.get('group_id');
    const datasetId = searchParams.get('dataset_id');
    const status = searchParams.get('status') || 'pending';
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const countsOnly = searchParams.get('counts') === 'true';

    // Determinar qual group_id usar
    let groupId = groupIdParam || membership.company_group_id;
    
    // Se for developer e passou group_id, validar se o grupo pertence a ele
    if (groupIdParam && membership.role === 'developer') {
      const user = await getAuthUser();
      if (user) {
        const developerId = await getUserDeveloperId(user.id);
        if (developerId) {
          const { data: group } = await supabase
            .from('company_groups')
            .select('id')
            .eq('id', groupIdParam)
            .eq('developer_id', developerId)
            .single();
          
          if (!group) {
            return NextResponse.json(
              { success: false, error: 'Grupo não encontrado ou sem permissão' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Se pediu apenas contadores
    if (countsOnly) {
      if (!groupId) {
        return NextResponse.json({
          success: true,
          counts: {
            total: 0,
            pending: 0,
            trained: 0,
            ignored: 0
          }
        });
      }

      const [totalResult, pendingResult, trainedResult, ignoredResult] = await Promise.all([
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).eq('company_group_id', groupId),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).eq('company_group_id', groupId).eq('status', 'pending'),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).eq('company_group_id', groupId).eq('status', 'trained'),
        supabase.from('ai_unanswered_questions').select('*', { count: 'exact', head: true }).eq('company_group_id', groupId).eq('status', 'ignored')
      ]);

      return NextResponse.json({
        success: true,
        counts: {
          total: totalResult.count || 0,
          pending: pendingResult.count || 0,
          trained: trainedResult.count || 0,
          ignored: ignoredResult.count || 0
        }
      });
    }

    if (!groupId) {
      return NextResponse.json({ success: true, data: [], total: 0, limit, offset });
    }

    // Buscar da tabela ai_unanswered_questions
    let query = supabase
      .from('ai_unanswered_questions')
      .select('*', { count: 'exact' })
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtrar por status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Filtrar por dataset
    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    }

    // Busca por texto
    if (search) {
      query = query.ilike('user_question', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('[PENDING API] Erro:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    console.log('[PENDING API] Encontrados:', count || 0, 'perguntas');

    return NextResponse.json({ 
      success: true,
      data: data || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('[PENDING API] Exceção:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PATCH - Atualizar status de uma pergunta
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, training_example_id } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 });
    }

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (status === 'trained') {
      updateData.trained_at = new Date().toISOString();
      if (training_example_id) {
        updateData.training_example_id = training_example_id;
      }
    }
    
    const { error } = await supabase
      .from('ai_unanswered_questions')
      .update(updateData)
      .eq('id', id);
    
    if (error) {
      console.error('[PENDING API] Erro ao atualizar:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PENDING API] Exceção:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Deletar pergunta
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID obrigatório' }, { status: 400 });
    }
    
    const { error } = await supabase
      .from('ai_unanswered_questions')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[PENDING API] Erro ao deletar:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[PENDING API] Exceção:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
