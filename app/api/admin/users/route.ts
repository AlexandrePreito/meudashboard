import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar todos os usuarios
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar usuarios
    const { data: users, error } = await supabase
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

    if (error) throw error;

    // Buscar grupos de cada usuario
    const usersWithGroups = [];
    for (const usr of users || []) {
      const { data: userGroups } = await supabase
        .from('user_groups')
        .select('company_group_id')
        .eq('user_id', usr.id);

      const groupIds = (userGroups || []).map(ug => ug.company_group_id);
      
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
