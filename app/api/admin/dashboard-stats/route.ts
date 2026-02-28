import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { count: totalDevelopers } = await supabase
      .from('developers')
      .select('id', { count: 'exact', head: true });

    const { count: totalGroups } = await supabase
      .from('company_groups')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active');

    const { count: totalUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true });

    const { count: totalScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id', { count: 'exact', head: true });

    const { data: developersList } = await supabase
      .from('developers')
      .select('id, name, logo_url, created_at, plan_id')
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: plansForDevs } = await supabase
      .from('developer_plans')
      .select('id, name');

    const planNameById = Object.fromEntries((plansForDevs || []).map((p) => [p.id, p.name]));

    const planCounts: Record<string, number> = {};
    const recentDevelopers: Array<{
      id: string;
      name: string;
      logo_url: string | null;
      plan_name: string;
      groups_count: number;
      created_at: string;
    }> = [];

    for (const dev of developersList || []) {
      const planName = ((dev.plan_id ? planNameById[dev.plan_id] : null) || 'Free').trim();
      planCounts[planName] = (planCounts[planName] || 0) + 1;

      const { count: groupsCount } = await supabase
        .from('company_groups')
        .select('id', { count: 'exact', head: true })
        .eq('developer_id', dev.id)
        .eq('status', 'active');

      recentDevelopers.push({
        id: dev.id,
        name: dev.name,
        logo_url: dev.logo_url ?? null,
        plan_name: planName,
        groups_count: groupsCount || 0,
        created_at: dev.created_at,
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const { count: newDevelopersCount } = await supabase
      .from('developers')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgoStr);

    return NextResponse.json({
      stats: {
        developers: totalDevelopers || 0,
        groups: totalGroups || 0,
        users: totalUsers || 0,
        screens: totalScreens || 0,
      },
      plans: planCounts,
      newDevelopersLast7Days: newDevelopersCount || 0,
      recentDevelopers: recentDevelopers.slice(0, 5),
    });
  } catch (error) {
    console.error('Erro ao carregar stats admin:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
