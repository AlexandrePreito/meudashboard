import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH - Atualizar grupo (apenas master)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, status, logo_url } = body;

    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (status !== undefined) updateData.status = status;
    if (logo_url !== undefined) updateData.logo_url = logo_url || null;

    const { error } = await supabase
      .from('company_groups')
      .update(updateData)
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao atualizar grupo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir grupo (apenas master)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se tem usuários ativos (user_groups usado na listagem)
    const { count } = await supabase
      .from('user_groups')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', id);

    if (count && count > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir grupo com usuários ativos' },
        { status: 400 }
      );
    }

    const { error } = await supabase.from('company_groups').delete().eq('id', id);

    if (error) {
      console.error('Erro ao excluir grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir grupo:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
