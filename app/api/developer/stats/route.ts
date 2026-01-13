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

    // Verificar se e usuario desenvolvedor
    const supabase = getSupabase();
    
    const { data: userData } = await supabase
      .from('users')
      .select('developer_id, is_developer_user')
      .eq('id', user.id)
      .single();

    if (!userData?.is_developer_user || !userData?.developer_id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const developerId = userData.developer_id;

    // Buscar dados do desenvolvedor
    const { data: developer } = await supabase
      .from('developers')
      .select('id, name, logo_url, primary_color')
      .eq('id', developerId)
      .single();

    // Contar grupos
    const { count: groupsCount } = await supabase
      .from('groups')
      .select('id', { count: 'exact', head: true })
      .eq('developer_id', developerId);

    // Buscar IDs dos grupos
    const { data: groups } = await supabase
      .from('groups')
      .select('id')
      .eq('developer_id', developerId);

    const groupIds = groups?.map(g => g.id) || [];

    // Contar usuarios nos grupos
    let usersCount = 0;
    if (groupIds.length > 0) {
      const { count } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .in('group_id', groupIds);
      usersCount = count || 0;
    }

    // Contar telas nos grupos
    let screensCount = 0;
    if (groupIds.length > 0) {
      const { count } = await supabase
        .from('screens')
        .select('id', { count: 'exact', head: true })
        .in('group_id', groupIds);
      screensCount = count || 0;
    }

    return NextResponse.json({
      developer,
      groups: groupsCount || 0,
      users: usersCount,
      screens: screensCount,
    });
  } catch (error: any) {
    console.error('Developer stats error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
