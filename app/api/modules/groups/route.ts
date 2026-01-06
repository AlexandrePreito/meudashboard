import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar associações módulo-grupo
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    const { data: associations, error } = await supabase
      .from('module_groups')
      .select('module_id, company_group_id');

    if (error) throw error;

    return NextResponse.json({ associations: associations || [] });
  } catch (error: any) {
    console.error('Erro ao buscar associações:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Ativar módulo para grupo
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { module_id, company_group_id } = body;

    if (!module_id || !company_group_id) {
      return NextResponse.json(
        { error: 'module_id e company_group_id são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Verificar se já existe
    const { data: existing } = await supabase
      .from('module_groups')
      .select('*')
      .eq('module_id', module_id)
      .eq('company_group_id', company_group_id)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Associação já existe' });
    }

    const { data, error } = await supabase
      .from('module_groups')
      .insert({ module_id, company_group_id })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ association: data });
  } catch (error: any) {
    console.error('Erro ao criar associação:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Desativar módulo para grupo
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const module_id = searchParams.get('module_id');
    const group_id = searchParams.get('group_id');

    if (!module_id || !group_id) {
      return NextResponse.json(
        { error: 'module_id e group_id são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    
    // Verificar se é módulo Power BI
    const { data: module } = await supabase
      .from('modules')
      .select('name')
      .eq('id', module_id)
      .single();

    if (module?.name === 'powerbi') {
      return NextResponse.json(
        { error: 'O módulo Power BI não pode ser desativado' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('module_groups')
      .delete()
      .eq('module_id', module_id)
      .eq('company_group_id', group_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover associação:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

