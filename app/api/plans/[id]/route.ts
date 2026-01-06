import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// PUT - Atualizar plano
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      max_daily_refreshes,
      max_powerbi_screens,
      max_users,
      max_companies,
      display_order
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('powerbi_plans')
      .update({
        name,
        description,
        max_daily_refreshes,
        max_powerbi_screens,
        max_users,
        max_companies,
        display_order
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plan: data });
  } catch (error: any) {
    console.error('Erro ao atualizar plano:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir plano
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser();
    if (!user?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    // Verificar se há grupos usando este plano
    const { data: groups } = await supabase
      .from('company_groups')
      .select('id')
      .eq('plan_id', params.id)
      .limit(1);

    if (groups && groups.length > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir um plano que está sendo usado por grupos' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('powerbi_plans')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir plano:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

