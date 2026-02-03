import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Listar usuários dos grupos do desenvolvedor
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    // Buscar grupos do desenvolvedor
    let groupsQuery = supabase
      .from('company_groups')
      .select('id, name')
      .eq('developer_id', developerId);

    if (groupId) {
      groupsQuery = groupsQuery.eq('id', groupId);
    }

    const { data: groups } = await groupsQuery;
    const groupIds = groups?.map(g => g.id) || [];

    if (groupIds.length === 0) {
      return NextResponse.json({ users: [], groups: [] });
    }

    // Buscar memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('user_group_membership')
      .select('id, user_id, company_group_id, is_active, role, can_use_ai, can_refresh, created_at')
      .in('company_group_id', groupIds)
      .order('created_at', { ascending: false });

    if (membershipError) {
      console.error('Erro ao buscar memberships:', membershipError);
      return NextResponse.json({ users: [], groups });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ users: [], groups });
    }

    // Buscar dados dos usuários
    const userIds = [...new Set(memberships.map(m => m.user_id))];
    console.log('Buscando usuários com IDs:', userIds);

    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, created_at')
      .in('id', userIds);

    console.log('Resultado users:', usersData);
    console.log('Erro users:', usersError);

    // Se não encontrou na tabela users, tentar buscar do Auth
    const usersMap = new Map<string, any>();
    
    // Primeiro adiciona os que encontrou na tabela users
    if (usersData) {
      usersData.forEach(u => usersMap.set(u.id, u));
    }

    // Para os que não encontrou, buscar do Auth
    const missingUserIds = userIds.filter(id => !usersMap.has(id));
    if (missingUserIds.length > 0) {
      for (const userId of missingUserIds) {
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userId);
          if (!authError && authUser?.user) {
            const user = authUser.user;
            usersMap.set(userId, {
              id: user.id,
              email: user.email || '',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
              avatar_url: user.user_metadata?.avatar_url || null,
              is_active: (user as any).banned !== true && (user.email_confirmed_at !== null),
              created_at: user.created_at
            });
          }
        } catch (err) {
          console.error(`Erro ao buscar usuário ${userId} do Auth:`, err);
        }
      }
    }

    const groupsMap = new Map((groups || []).map(g => [g.id, g]));

    // Formatar dados
    const users = memberships.map(m => {
      const userData = usersMap.get(m.user_id);
      const groupData = groupsMap.get(m.company_group_id);
      return {
        id: userData?.id || m.user_id,
        email: userData?.email || '',
        full_name: userData?.full_name || '',
        avatar_url: userData?.avatar_url,
        is_active: m.is_active,
        user_is_active: true,
        role: m.role || 'user',
        membership_id: m.id,
        company_group_id: m.company_group_id,
        company_group_name: groupData?.name || '',
        can_use_ai: m.can_use_ai ?? false,
        can_refresh: m.can_refresh ?? false,
        created_at: userData?.created_at || m.created_at,
      };
    });

    return NextResponse.json({ users, groups });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, password, company_group_id, role } = body;

    if (!email || !full_name || !password || !company_group_id) {
      return NextResponse.json({ error: 'Campos obrigatórios: email, full_name, password, company_group_id' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_users')
      .eq('id', company_group_id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Verificar quota de usuários
    const { count: currentUsers } = await supabase
      .from('user_group_membership')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', company_group_id)
      .eq('is_active', true);

    if (group.quota_users && currentUsers && currentUsers >= group.quota_users) {
      return NextResponse.json({ error: `Limite de usuários atingido (${group.quota_users})` }, { status: 400 });
    }

    // Verificar se email já existe na tabela users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // Usuário existe na tabela users
      userId = existingUser.id;
    } else {
      // Tentar criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError) {
        // Se o erro for de email já registrado, buscar o usuário existente no Auth
        if (authError.message.includes('already been registered') || 
            authError.message.includes('already exists') ||
            authError.message.includes('User already registered')) {
          
          // Buscar usuário no Auth por email (listar e filtrar)
          let foundAuthUser = null;
          let page = 0;
          const pageSize = 1000;
          
          while (!foundAuthUser) {
            const { data: authUsersList, error: listError } = await supabase.auth.admin.listUsers({
              page,
              perPage: pageSize
            });
            
            if (listError || !authUsersList?.users) {
              break;
            }
            
            foundAuthUser = authUsersList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
            
            // Se não encontrou e ainda tem mais páginas, continuar
            if (!foundAuthUser && authUsersList.users.length === pageSize) {
              page++;
            } else {
              break;
            }
          }
          
          if (foundAuthUser) {
            userId = foundAuthUser.id;
            
            // Gerar hash da senha (usar senha fornecida ou gerar placeholder)
            const password_hash = password 
              ? await bcrypt.hash(password, 10)
              : await bcrypt.hash('temp_' + Date.now(), 10); // Placeholder se não tiver senha
            
            // Criar registro na tabela users
            const { error: userInsertError } = await supabase.from('users').insert({
              id: userId,
              email: email.toLowerCase(),
              full_name: foundAuthUser.user_metadata?.full_name || full_name,
              password_hash
            });

            if (userInsertError) {
              // Se já existe na tabela (pode ter sido criado entre a verificação e agora)
              if (userInsertError.code === '23505' || userInsertError.message.includes('duplicate')) {
                // Buscar o usuário que acabou de ser criado
                const { data: newlyCreatedUser } = await supabase
                  .from('users')
                  .select('id')
                  .eq('email', email.toLowerCase())
                  .maybeSingle();
                
                if (newlyCreatedUser) {
                  userId = newlyCreatedUser.id;
                } else {
                  return NextResponse.json({ 
                    error: `Erro ao criar registro do usuário: ${userInsertError.message}` 
                  }, { status: 500 });
                }
              } else {
                return NextResponse.json({ 
                  error: `Erro ao criar registro do usuário: ${userInsertError.message}` 
                }, { status: 500 });
              }
            }

            // Atualizar senha se fornecida
            if (password) {
              await supabase.auth.admin.updateUserById(userId, { password });
            }
          } else {
            return NextResponse.json({ 
              error: 'Email já está registrado, mas não foi possível localizar o usuário. Tente novamente.' 
            }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: authError.message }, { status: 400 });
        }
      } else {
        // Usuário criado com sucesso no Auth
        userId = authData.user.id;

        // Gerar hash da senha
        const password_hash = await bcrypt.hash(password, 10);

        // Criar registro na tabela users
        const { error: userInsertError } = await supabase.from('users').insert({
          id: userId,
          email: email.toLowerCase(),
          full_name,
          password_hash
        });

        if (userInsertError) {
          console.error('Erro ao criar registro na tabela users:', userInsertError);
          // Tentar remover o usuário do Auth se falhou
          await supabase.auth.admin.deleteUser(userId);
          return NextResponse.json({ 
            error: `Erro ao criar usuário: ${userInsertError.message}` 
          }, { status: 500 });
        }
      }
    }

    // Verificar se já tem membership neste grupo
    const { data: existingMembership } = await supabase
      .from('user_group_membership')
      .select('id')
      .eq('user_id', userId)
      .eq('company_group_id', company_group_id)
      .maybeSingle();

    if (existingMembership) {
      return NextResponse.json({ error: 'Usuário já está neste grupo' }, { status: 400 });
    }

    // Criar membership
    const { error: membershipError } = await supabase
      .from('user_group_membership')
      .insert({
        user_id: userId,
        company_group_id,
        role: role || 'user',
        is_active: true
      });

    if (membershipError) {
      return NextResponse.json({ error: membershipError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user_id: userId });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, membership_id, full_name, role, is_active, password } = body;

    if (!user_id || !membership_id) {
      return NextResponse.json({ error: 'user_id e membership_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se membership pertence a um grupo do desenvolvedor
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select(`
        id,
        company_group_id,
        company_groups:company_group_id (developer_id)
      `)
      .eq('id', membership_id)
      .single();

    if (!membership || (membership.company_groups as any)?.developer_id !== developerId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Atualizar dados do usuário
    if (full_name) {
      await supabase
        .from('users')
        .update({ full_name })
        .eq('id', user_id);
    }

    // Atualizar senha se fornecida
    if (password) {
      await supabase.auth.admin.updateUserById(user_id, { password });
    }

    // Atualizar membership
    const updateData: any = {};
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (body.can_use_ai !== undefined) updateData.can_use_ai = body.can_use_ai;
    if (body.can_refresh !== undefined) updateData.can_refresh = body.can_refresh;

    if (Object.keys(updateData).length > 0) {
      await supabase
        .from('user_group_membership')
        .update(updateData)
        .eq('id', membership_id);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remover usuário do grupo
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membership_id');

    if (!membershipId) {
      return NextResponse.json({ error: 'membership_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se membership pertence a um grupo do desenvolvedor
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select(`
        id,
        company_groups:company_group_id (developer_id)
      `)
      .eq('id', membershipId)
      .single();

    if (!membership || (membership.company_groups as any)?.developer_id !== developerId) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // Remover membership
    await supabase
      .from('user_group_membership')
      .delete()
      .eq('id', membershipId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
