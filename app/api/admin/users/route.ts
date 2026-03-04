import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar usuarios (master: todos, developer: dos seus grupos, admin: dos grupos onde é membro)
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const developerId = await getUserDeveloperId(user.id);
    const isDeveloper = !!developerId;
    const isAdmin = !user.is_master && !isDeveloper;

    // Determinar quais user IDs o usuário pode ver (null = todos para master)
    let allowedUserIds: string[] | null = null;

    if (!user.is_master) {
      if (isDeveloper) {
        // Developer: buscar grupos do developer, depois usuários desses grupos
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId);

        const groupIds = (devGroups || []).map((g: { id: string }) => g.id);
        if (groupIds.length > 0) {
          const { data: groupUsers } = await supabase
            .from('user_group_membership')
            .select('user_id')
            .in('company_group_id', groupIds);
          allowedUserIds = [...new Set((groupUsers || []).map((gu: { user_id: string }) => gu.user_id))];
        } else {
          allowedUserIds = [];
        }
      } else {
        // Admin: buscar grupos onde é membro, depois usuários desses grupos
        const { data: adminMemberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        const groupIds = (adminMemberships || []).map((m: { company_group_id: string }) => m.company_group_id);
        if (groupIds.length > 0) {
          const { data: groupUsers } = await supabase
            .from('user_group_membership')
            .select('user_id')
            .in('company_group_id', groupIds);
          allowedUserIds = [...new Set((groupUsers || []).map((gu: { user_id: string }) => gu.user_id))];
        } else {
          allowedUserIds = [];
        }
      }
    }

    // Buscar usuarios
    let usersQuery = supabase
      .from('users')
      .select(`
        id,
        full_name,
        email,
        is_master,
        is_developer_user,
        status,
        created_at
      `)
      .order('full_name');

    if (allowedUserIds !== null) {
      if (allowedUserIds.length === 0) {
        return NextResponse.json({ users: [] });
      }
      usersQuery = usersQuery.in('id', allowedUserIds);
    }

    const { data: users, error } = await usersQuery;

    if (error) throw error;

    // Buscar grupos de cada usuario (user_group_membership)
    const usersWithGroups = [];
    for (const usr of users || []) {
      const { data: userMemberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', usr.id)
        .eq('is_active', true);

      const groupIds = (userMemberships || []).map((m: { company_group_id: string }) => m.company_group_id);

      let groups: { id: string; name: string }[] = [];
      if (groupIds.length > 0) {
        const { data: groupsData } = await supabase
          .from('company_groups')
          .select('id, name')
          .in('id', groupIds);
        groups = groupsData || [];
      }

      usersWithGroups.push({
        ...usr,
        role: 'user',
        is_developer: usr.is_developer_user || false,
        is_active: usr.status === 'active',
        groups
      });
    }

    return NextResponse.json({ users: usersWithGroups });
  } catch (error: any) {
    console.error('Erro ao buscar usuarios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
