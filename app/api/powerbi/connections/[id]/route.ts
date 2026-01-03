import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar conexão por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('powerbi_connections')
      .select(`
        *,
        company_group:company_groups(id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar conexão
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Apenas master pode editar conexões' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('powerbi_connections')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ connection: data });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir conexão
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Apenas master pode excluir conexões' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('powerbi_connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir conexão:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

