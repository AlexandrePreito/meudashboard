import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// Função auxiliar para verificar grupos que usuário é admin
async function getUserAdminGroups(supabase: any, userId: string): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true);

  return memberships?.map((m: any) => m.company_group_id) || [];
}

// GET - Listar grupos
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Se não for master, verificar se é admin de algum grupo
    let adminGroupIds: string[] = [];
    if (!user.is_master) {
      adminGroupIds = await getUserAdminGroups(supabase, user.id);
      
      if (adminGroupIds.length === 0) {
        return NextResponse.json({ groups: [] });
      }
    }

    let query = supabase
      .from('company_groups')
      .select(`
        id,
        name,
        slug,
        description,
        logo_url,
        status,
        max_users,
        max_companies,
        max_powerbi_screens,
        plan_id,
        primary_color,
        created_at,
        updated_at
      `)
      .eq('status', 'active')
      .neq('status', 'deleted')
      .neq('status', 'inactive')
      .order('name', { ascending: true });

    // Se não for master, filtrar apenas grupos que é admin
    if (!user.is_master) {
      query = query.in('id', adminGroupIds);
    }

    const { data: groups, error } = await query;

    if (error) {
      console.error('Erro ao buscar grupos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Contar usuários por grupo
    const groupsWithCount = await Promise.all(
      (groups || []).map(async (group) => {
        const { count } = await supabase
          .from('user_group_membership')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id)
          .eq('is_active', true);

        return {
          ...group,
          users_count: count || 0
        };
      })
    );

    return NextResponse.json({ groups: groupsWithCount });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar grupo (apenas master)
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
    const { name, description, max_users, max_companies, max_powerbi_screens, logo_url, plan_id, primary_color } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Gerar slug único
    const baseSlug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await supabase
        .from('company_groups')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const { data: newGroup, error } = await supabase
      .from('company_groups')
      .insert({
        name,
        slug,
        description: description || null,
        logo_url: logo_url || null,
        max_users: max_users || 10,
        max_companies: max_companies || 5,
        max_powerbi_screens: max_powerbi_screens || 10,
        plan_id: plan_id || null,
        primary_color: primary_color || 'blue',
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: newGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar grupo
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const body = await request.json();
    const { id, name, description, status, max_users, max_companies, max_powerbi_screens, logo_url, plan_id, primary_color } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Verificar permissões
    if (!user.is_master) {
      const adminGroupIds = await getUserAdminGroups(supabase, user.id);
      
      if (!adminGroupIds.includes(id)) {
        return NextResponse.json({ error: 'Sem permissão para editar este grupo' }, { status: 403 });
      }
    }

    // Se for master, pode atualizar tudo
    // Se for admin do grupo, só pode atualizar tema (logo_url e primary_color)
    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (user.is_master) {
      // Master pode atualizar tudo
      updateData = {
        ...updateData,
        name,
        description: description || null,
        logo_url: logo_url || null,
        status: status || 'active',
        max_users: max_users || 10,
        max_companies: max_companies || 5,
        max_powerbi_screens: max_powerbi_screens || 10,
        plan_id: plan_id || null,
        primary_color: primary_color || 'blue'
      };
    } else {
      // Admin só pode atualizar tema
      if (logo_url !== undefined) updateData.logo_url = logo_url || null;
      if (primary_color !== undefined) updateData.primary_color = primary_color || 'blue';
    }

    const { data: updatedGroup, error } = await supabase
      .from('company_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ group: updatedGroup });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir grupo (apenas master)
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

    // Verificar se tem usuários ativos
    const { count } = await supabase
      .from('user_group_membership')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', id)
      .eq('is_active', true);

    if (count && count > 0) {
      return NextResponse.json({ error: 'Não é possível excluir grupo com usuários ativos' }, { status: 400 });
    }

    const { error } = await supabase
      .from('company_groups')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
