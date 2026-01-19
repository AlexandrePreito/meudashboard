import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json({ error: 'Parametros invalidos' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const cascade: any = { items: [], summary: {} };

    if (type === 'developer') {
      const { data: developer } = await supabase
        .from('developers')
        .select('id, name')
        .eq('id', id)
        .single();

      if (!developer) {
        return NextResponse.json({ error: 'Desenvolvedor nao encontrado' }, { status: 404 });
      }

      cascade.root = { type: 'developer', id: developer.id, name: developer.name };

      const { data: groups } = await supabase
        .from('company_groups')
        .select('id, name')
        .eq('developer_id', id);

      const groupIds = groups?.map(g => g.id) || [];

      // Buscar usuários via membership
      let groupUsers: any[] = [];
      if (groupIds.length > 0) {
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('user_id, company_group_id, user:users(id, full_name, email)')
          .in('company_group_id', groupIds)
          .eq('is_active', true);
        
        if (memberships) {
          groupUsers = memberships.map(m => ({
            id: m.user_id,
            full_name: (m.user as any)?.full_name || '',
            email: (m.user as any)?.email || '',
            group_id: m.company_group_id
          }));
        }
      }

      // Buscar telas Power BI
      let screens: any[] = [];
      if (groupIds.length > 0) {
        const { data: gScreens } = await supabase
          .from('powerbi_dashboard_screens')
          .select('id, title, company_group_id')
          .in('company_group_id', groupIds);
        screens = (gScreens || []).map(s => ({ id: s.id, name: s.title, group_id: s.company_group_id }));
      }

      cascade.items = [
        {
          type: 'developer',
          id: developer.id,
          name: developer.name,
          children: [
            ...(groups || []).map(g => ({
              type: 'group',
              id: g.id,
              name: g.name,
              children: [
                ...groupUsers.filter(u => u.group_id === g.id).map(u => ({
                  type: 'user',
                  id: u.id,
                  name: u.full_name || u.email,
                  parentType: 'group'
                })),
                ...screens.filter(s => s.group_id === g.id).map(s => ({
                  type: 'screen',
                  id: s.id,
                  name: s.name
                }))
              ]
            }))
          ]
        }
      ];

      cascade.summary = {
        groups: groups?.length || 0,
        users: groupUsers.length,
        screens: screens.length
      };

    } else if (type === 'group') {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id, name, developer_id')
        .eq('id', id)
        .single();

      if (!group) {
        return NextResponse.json({ error: 'Grupo nao encontrado' }, { status: 404 });
      }

      cascade.root = { type: 'group', id: group.id, name: group.name };

      // Buscar usuários via membership
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('user_id, user:users(id, full_name, email)')
        .eq('company_group_id', id)
        .eq('is_active', true);

      const users = (memberships || []).map(m => ({
        id: m.user_id,
        full_name: (m.user as any)?.full_name || '',
        email: (m.user as any)?.email || ''
      }));

      // Buscar telas Power BI
      const { data: screensData } = await supabase
        .from('powerbi_dashboard_screens')
        .select('id, title')
        .eq('company_group_id', id);

      const screens = (screensData || []).map(s => ({ id: s.id, name: s.title }));

      cascade.items = [
        {
          type: 'group',
          id: group.id,
          name: group.name,
          children: [
            ...users.map(u => ({
              type: 'user',
              id: u.id,
              name: u.full_name || u.email
            })),
            ...screens.map(s => ({
              type: 'screen',
              id: s.id,
              name: s.name
            }))
          ]
        }
      ];

      cascade.summary = {
        users: users.length,
        screens: screens.length
      };
    }

    return NextResponse.json(cascade);
  } catch (error: any) {
    console.error('Cascade preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
