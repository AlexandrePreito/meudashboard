import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar todos os grupos
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

    // Buscar grupos
    const { data: groups, error } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        slug,
        document,
        email,
        logo_url,
        status,
        developer_id,
        created_at
      `)
      .order('name');

    if (error) throw error;

    // Buscar desenvolvedores
    const { data: developers } = await supabase
      .from('developers')
      .select('id, name');

    const devMap = (developers || []).reduce((acc, dev) => {
      acc[dev.id] = dev.name;
      return acc;
    }, {} as Record<string, string>);

    // Buscar contagens para cada grupo
    const groupsWithStats = [];
    for (const group of groups || []) {
      // Contar usuarios
      const { count: users_count } = await supabase
        .from('user_groups')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', group.id);

      // Contar telas
      const { count: screens_count } = await supabase
        .from('powerbi_screens')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', group.id);

      groupsWithStats.push({
        ...group,
        developer_name: devMap[group.developer_id] || 'Desconhecido',
        users_count: users_count || 0,
        screens_count: screens_count || 0
      });
    }

    return NextResponse.json({ groups: groupsWithStats });
  } catch (error: any) {
    console.error('Erro ao buscar grupos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
