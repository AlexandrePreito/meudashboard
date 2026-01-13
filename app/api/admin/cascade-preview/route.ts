import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

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

    const supabase = getSupabase();
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
        .from('groups')
        .select('id, name')
        .eq('developer_id', id);

      const groupIds = groups?.map(g => g.id) || [];

      const { data: devUsers } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('developer_id', id);

      let groupUsers: any[] = [];
      if (groupIds.length > 0) {
        const { data: gUsers } = await supabase
          .from('users')
          .select('id, full_name, email, group_id')
          .in('group_id', groupIds);
        groupUsers = gUsers || [];
      }

      let screens: any[] = [];
      if (groupIds.length > 0) {
        const { data: gScreens } = await supabase
          .from('screens')
          .select('id, name, group_id')
          .in('group_id', groupIds);
        screens = gScreens || [];
      }

      cascade.items = [
        {
          type: 'developer',
          id: developer.id,
          name: developer.name,
          children: [
            ...(devUsers || []).map(u => ({
              type: 'user',
              id: u.id,
              name: u.full_name || u.email,
              parentType: 'developer'
            })),
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
        users: (devUsers?.length || 0) + groupUsers.length,
        screens: screens.length
      };

    } else if (type === 'group') {
      const { data: group } = await supabase
        .from('groups')
        .select('id, name, developer_id')
        .eq('id', id)
        .single();

      if (!group) {
        return NextResponse.json({ error: 'Grupo nao encontrado' }, { status: 404 });
      }

      cascade.root = { type: 'group', id: group.id, name: group.name };

      const { data: users } = await supabase
        .from('users')
        .select('id, full_name, email')
        .eq('group_id', id);

      const { data: screens } = await supabase
        .from('screens')
        .select('id, name')
        .eq('group_id', id);

      cascade.items = [
        {
          type: 'group',
          id: group.id,
          name: group.name,
          children: [
            ...(users || []).map(u => ({
              type: 'user',
              id: u.id,
              name: u.full_name || u.email
            })),
            ...(screens || []).map(s => ({
              type: 'screen',
              id: s.id,
              name: s.name
            }))
          ]
        }
      ];

      cascade.summary = {
        users: users?.length || 0,
        screens: screens?.length || 0
      };
    }

    return NextResponse.json(cascade);
  } catch (error: any) {
    console.error('Cascade preview error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
