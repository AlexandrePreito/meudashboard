import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { logActivity, getUserGroupId } from '@/lib/activity-log';

// Função auxiliar para verificar se usuário é admin de algum grupo
async function getUserAdminGroups(supabase: any, userId: string): Promise<string[]> {
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true);

  return memberships?.map((m: any) => m.company_group_id) || [];
}

// GET - Listar usuários ou buscar por ID
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Se buscar por ID específico
    if (id) {
      // User comum só pode buscar a si mesmo
      if (!user.is_master && id !== user.id) {
        const adminGroupIds = await getUserAdminGroups(supabase, user.id);
        if (adminGroupIds.length === 0) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }

      const { data: userData, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          phone,
          is_master,
          status,
          last_login_at,
          created_at,
          memberships:user_group_membership!user_group_membership_user_id_fkey(
            id,
            role,
            is_active,
            company_group:company_groups(id, name)
          )
        `)
        .eq('id', id)
        .single();

      if (error || !userData) {
        return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ user: userData });
    }

    // Se não for master, verificar se é admin de algum grupo ou developer
    let adminGroupIds: string[] = [];
    let isDeveloper = false;
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        isDeveloper = true;
        // Developer: buscar grupos dele
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');
        adminGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        adminGroupIds = await getUserAdminGroups(supabase, user.id);
      }
      
      if (adminGroupIds.length === 0 && !isDeveloper) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        is_master,
        status,
        last_login_at,
        created_at,
        memberships:user_group_membership!user_group_membership_user_id_fkey(
          id,
          role,
          is_active,
          company_group:company_groups(id, name)
        )
      `)
      .order('created_at', { ascending: false });

    const { data: users, error } = await query;

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Se não for master, filtrar apenas usuários dos grupos que é admin ou developer
    let filteredUsers = users || [];
    if (!user.is_master) {
      filteredUsers = filteredUsers.filter(u => {
        // Não mostrar usuários master para admins de grupo ou developers
        if (u.is_master) return false;
        
        // Verificar se usuário pertence a algum grupo que o admin/developer gerencia
        return u.memberships?.some((m: any) => 
          m.company_group?.id && adminGroupIds.includes(m.company_group.id)
        );
      });
    }

    return NextResponse.json({ users: filteredUsers });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar usuário
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissões
    let adminGroupIds: string[] = [];
    if (!user.is_master) {
      adminGroupIds = await getUserAdminGroups(supabase, user.id);
      
      if (adminGroupIds.length === 0) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { email, full_name, phone, password, is_master, company_group_id, role } = body;

    if (!email || !full_name || !password) {
      return NextResponse.json({ error: 'Email, nome e senha são obrigatórios' }, { status: 400 });
    }

    // Admin de grupo não pode criar master
    if (!user.is_master && is_master) {
      return NextResponse.json({ error: 'Sem permissão para criar usuário master' }, { status: 403 });
    }

    // Admin de grupo só pode criar usuários no seu grupo
    if (!user.is_master) {
      if (!company_group_id || !adminGroupIds.includes(company_group_id)) {
        return NextResponse.json({ error: 'Você só pode criar usuários no seu grupo' }, { status: 403 });
      }
    }

    // Validar limite de usuários (se tiver grupo)
    if (company_group_id) {
      const { data: groupData } = await supabase
        .from('company_groups')
        .select('quota_users')
        .eq('id', company_group_id)
        .single();

      const userLimit = groupData?.quota_users || 10;

      // Contar usuários ativos do grupo
      const { count: usersCount } = await supabase
        .from('user_group_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', company_group_id)
        .eq('is_active', true);

      // Bloquear se limite atingido
      if (usersCount !== null && usersCount >= userLimit) {
        return NextResponse.json({
          error: `Limite de ${userLimit} usuários atingido. Entre em contato com o administrador.`,
          current: usersCount,
          max: userLimit
        }, { status: 403 });
      }
    }

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    // Criar usuário
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase().trim(),
        full_name,
        phone: phone || null,
        password_hash,
        is_master: user.is_master ? (is_master || false) : false,
        status: 'active'
      })
      .select()
      .single();

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Se tiver grupo, criar membership
    if (company_group_id) {
      await supabase
        .from('user_group_membership')
        .insert({
          user_id: newUser.id,
          company_group_id,
          role: role || 'user',
          is_active: true,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        });
    }

    // Registrar log
    const logGroupId = company_group_id || await getUserGroupId(user.id);
    await logActivity({
      userId: user.id,
      companyGroupId: logGroupId,
      actionType: 'create',
      module: 'config',
      description: `Usuário criado: ${newUser.email}`,
      entityType: 'user',
      entityId: newUser.id
    });

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissões
    let adminGroupIds: string[] = [];
    if (!user.is_master) {
      adminGroupIds = await getUserAdminGroups(supabase, user.id);
      
      if (adminGroupIds.length === 0) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    const body = await request.json();
    const { id, email, full_name, phone, password, is_master, status, company_group_id, role } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Buscar usuário que será editado
    const { data: targetUser } = await supabase
      .from('users')
      .select(`
        id,
        is_master,
        memberships:user_group_membership(company_group_id)
      `)
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Admin não pode editar usuários master
    if (!user.is_master && targetUser.is_master) {
      return NextResponse.json({ error: 'Sem permissão para editar usuário master' }, { status: 403 });
    }

    // Admin só pode editar usuários do seu grupo
    if (!user.is_master) {
      const targetGroupIds = targetUser.memberships?.map((m: any) => m.company_group_id) || [];
      const canEdit = targetGroupIds.some((gid: string) => adminGroupIds.includes(gid));
      
      if (!canEdit) {
        return NextResponse.json({ error: 'Sem permissão para editar este usuário' }, { status: 403 });
      }
    }

    // Admin não pode tornar alguém master
    if (!user.is_master && is_master) {
      return NextResponse.json({ error: 'Sem permissão para definir usuário como master' }, { status: 403 });
    }

    const updateData: any = {
      full_name,
      phone: phone || null,
      is_master: user.is_master ? (is_master || false) : targetUser.is_master,
      status: status || 'active',
      updated_at: new Date().toISOString()
    };

    // Se mudar email, verificar duplicado
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .neq('id', id)
        .single();

      if (existingUser) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      updateData.email = email.toLowerCase().trim();
    }

    // Se tiver nova senha
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Atualizar membership se mudou grupo ou role (apenas master pode mudar grupo)
    if (user.is_master && company_group_id !== undefined) {
      // Remover memberships antigas
      await supabase
        .from('user_group_membership')
        .delete()
        .eq('user_id', id);

      // Criar nova se tiver grupo
      if (company_group_id) {
        await supabase
          .from('user_group_membership')
          .insert({
            user_id: id,
            company_group_id,
            role: role || 'user',
            is_active: true,
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString()
          });
      }
    } else if (!user.is_master && role) {
      // Admin pode mudar apenas o role dentro do grupo
      await supabase
        .from('user_group_membership')
        .update({ role })
        .eq('user_id', id)
        .in('company_group_id', adminGroupIds);
    }

    // Registrar log
    const logGroupId = await getUserGroupId(user.id);
    await logActivity({
      userId: user.id,
      companyGroupId: logGroupId,
      actionType: 'update',
      module: 'config',
      description: `Usuário atualizado: ${updatedUser.email}`,
      entityType: 'user',
      entityId: updatedUser.id
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verificar permissões
    let adminGroupIds: string[] = [];
    if (!user.is_master) {
      adminGroupIds = await getUserAdminGroups(supabase, user.id);
      
      if (adminGroupIds.length === 0) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Não pode excluir a si mesmo
    if (id === user.id) {
      return NextResponse.json({ error: 'Não é possível excluir seu próprio usuário' }, { status: 400 });
    }

    // Buscar usuário que será excluído
    const { data: targetUser } = await supabase
      .from('users')
      .select(`
        id,
        is_master,
        memberships:user_group_membership(company_group_id)
      `)
      .eq('id', id)
      .single();

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Admin não pode excluir usuários master
    if (!user.is_master && targetUser.is_master) {
      return NextResponse.json({ error: 'Sem permissão para excluir usuário master' }, { status: 403 });
    }

    // Admin só pode excluir usuários do seu grupo
    if (!user.is_master) {
      const targetGroupIds = targetUser.memberships?.map((m: any) => m.company_group_id) || [];
      const canDelete = targetGroupIds.some((gid: string) => adminGroupIds.includes(gid));
      
      if (!canDelete) {
        return NextResponse.json({ error: 'Sem permissão para excluir este usuário' }, { status: 403 });
      }
    }

    // Excluir memberships primeiro
    await supabase
      .from('user_group_membership')
      .delete()
      .eq('user_id', id);

    // Excluir usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir usuário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Registrar log
    const logGroupId = await getUserGroupId(user.id);
    await logActivity({
      userId: user.id,
      companyGroupId: logGroupId,
      actionType: 'delete',
      module: 'config',
      description: `Usuário excluído: ID ${id}`,
      entityType: 'user',
      entityId: id
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
