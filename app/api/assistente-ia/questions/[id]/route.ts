import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

// POST: Resolver/Ignorar pergunta
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { success: false, error: 'Sem permissão para resolver perguntas' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, training_example_id } = body;

    if (!action || !['resolve', 'ignore', 'reopen'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Ação inválida' },
        { status: 400 }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();

    const updates: any = {};

    if (action === 'resolve') {
      updates.status = 'resolved';
      updates.resolved_at = new Date().toISOString();
      updates.resolved_by = user?.id;
      if (training_example_id) {
        updates.training_example_id = training_example_id;
      }
    } else if (action === 'ignore') {
      updates.status = 'ignored';
    } else if (action === 'reopen') {
      updates.status = 'pending';
      updates.resolved_at = null;
      updates.resolved_by = null;
    }

    // Verificar se a pergunta existe primeiro
    const { data: existingQuestion, error: fetchError } = await supabase
      .from('ai_unanswered_questions')
      .select('id, company_group_id')
      .eq('id', id)
      .single();

    if (!existingQuestion) {
      return NextResponse.json(
        { success: false, error: 'Pergunta não encontrada' },
        { status: 404 }
      );
    }

    // Se for developer, pode atualizar qualquer registro
    // Se não for, verificar se o company_group_id bate
    if (membership.role !== 'developer' && existingQuestion.company_group_id !== membership.company_group_id) {
      return NextResponse.json(
        { success: false, error: 'Sem permissão para atualizar esta pergunta' },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('ai_unanswered_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro no update:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Pergunta ${action === 'resolve' ? 'resolvida' : action === 'ignore' ? 'ignorada' : 'reaberta'} com sucesso`,
      data
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
