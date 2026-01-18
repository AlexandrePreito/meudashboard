import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Listar usuários do grupo
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar memberships do grupo
    const { data: memberships, error: membershipError } = await supabase
      .from('user_group_membership')
      .select('id, user_id, company_group_id, is_active, role, can_use_ai, can_refresh, created_at')
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false });

    if (membershipError) {
      console.error('Erro ao buscar memberships:', membershipError);
      return NextResponse.json({ users: [] });
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ users: [] });
    }

    // Buscar dados dos usuários
    const userIds = [...new Set(memberships.map(m => m.user_id))];

    const { data: usersData } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url, created_at')
      .in('id', userIds);

    const usersMap = new Map<string, any>();
    
    if (usersData) {
      usersData.forEach(u => usersMap.set(u.id, u));
    }

    // Para os que não encontrou, buscar do Auth
    const missingUserIds = userIds.filter(id => !usersMap.has(id));
    if (missingUserIds.length > 0) {
      for (const userId of missingUserIds) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.user) {
            const u = authUser.user;
            usersMap.set(userId, {
              id: u.id,
              email: u.email || '',
              full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
              avatar_url: u.user_metadata?.avatar_url || null,
              created_at: u.created_at
            });
          }
        } catch (err) {
          console.error(`Erro ao buscar usuário ${userId}:`, err);
        }
      }
    }

    // Formatar dados
    const users = memberships.map(m => {
      const userData = usersMap.get(m.user_id);
      return {
        id: userData?.id || m.user_id,
        email: userData?.email || '',
        full_name: userData?.full_name || '',
        avatar_url: userData?.avatar_url,
        is_active: m.is_active,
        role: m.role || 'user',
        membership_id: m.id,
        company_group_id: m.company_group_id,
        can_use_ai: m.can_use_ai ?? false,
        can_refresh: m.can_refresh ?? false,
        created_at: userData?.created_at || m.created_at,
      };
    });

    return NextResponse.json({ users });
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

    const body = await request.json();
    const { email, full_name, password, company_group_id, role } = body;

    if (!email || !full_name || !password || !company_group_id) {
      return NextResponse.json({ error: 'Campos obrigatórios: email, full_name, password, company_group_id' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, company_group_id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar quota do grupo
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_users')
      .eq('id', company_group_id)
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

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // Verificar se já tem membership neste grupo
      const { data: existingMembership } = await supabase
        .from('user_group_membership')
        .select('id')
        .eq('user_id', existingUser.id)
        .eq('company_group_id', company_group_id)
        .maybeSingle();

      if (existingMembership) {
        return NextResponse.json({ error: 'Usuário já está neste grupo' }, { status: 400 });
      }

      userId = existingUser.id;
    } else {
      // Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email.toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name }
      });

      if (authError) {
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      userId = authData.user.id;

      // Criar registro na tabela users
      await supabase.from('users').insert({
        id: userId,
        email: email.toLowerCase(),
        full_name,
        role: 'user',
        is_active: true
      });
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

    const body = await request.json();
    const { user_id, membership_id, company_group_id, full_name, role, is_active, password } = body;

    if (!user_id || !membership_id || !company_group_id) {
      return NextResponse.json({ error: 'user_id, membership_id e company_group_id são obrigatórios' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, company_group_id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

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

    const { searchParams } = new URL(request.url);
    const membershipId = searchParams.get('membership_id');
    const groupId = searchParams.get('group_id');

    if (!membershipId || !groupId) {
      return NextResponse.json({ error: 'membership_id e group_id são obrigatórios' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Remover membership
    const { error } = await supabase
      .from('user_group_membership')
      .delete()
      .eq('id', membershipId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
