import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Não é developer' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar developer (sem join - mais confiável)
    const { data: devData, error: devError } = await supabase
      .from('developers')
      .select('id, name, created_at, plan_id')
      .eq('id', developerId)
      .single();

    if (devError || !devData) {
      console.error('[dashboard-stats] Erro ao buscar developer:', devError?.message);
      return NextResponse.json({ error: 'Developer não encontrado' }, { status: 404 });
    }

    // Buscar plano diretamente por plan_id (evita problemas de join)
    let plan: { name?: string; max_groups?: number; max_users?: number; max_screens?: number } | null = null;
    console.log('[DEBUG] plan_id:', devData.plan_id, typeof devData.plan_id);
    if (devData.plan_id) {
      const { data: planRow, error: planError } = await supabase
        .from('developer_plans')
        .select('name, max_groups, max_users, max_screens')
        .eq('id', devData.plan_id)
        .eq('is_active', true)
        .maybeSingle();
      console.log('[DEBUG] planRow:', JSON.stringify(planRow));
      console.log('[DEBUG] planError:', JSON.stringify(planError));
      plan = planRow;
    }

    const planName = (plan?.name || 'Free').trim();
    const isFree = planName.toLowerCase() === 'free';

    // Limites: plan > defaults Free
    const maxGroups = plan?.max_groups ?? 5;
    const maxUsers = plan?.max_users ?? 15;
    const maxScreens = plan?.max_screens ?? 15;

    const { data: devGroups } = await supabase
      .from('company_groups')
      .select('id')
      .eq('developer_id', developerId)
      .eq('status', 'active');
    const groupIds = devGroups?.map((g) => g.id) || [];

    let groupCount = groupIds.length;
    let userCount = 0;
    let screenCount = 0;
    let connectionCount = 0;
    let reportCount = 0;

    if (groupIds.length > 0) {
      const { count: usersCount } = await supabase
        .from('user_group_membership')
        .select('id', { count: 'exact', head: true })
        .in('company_group_id', groupIds)
        .eq('is_active', true)
        .neq('user_id', user.id);
      userCount = usersCount || 0;

      const { count: screensCount } = await supabase
        .from('powerbi_dashboard_screens')
        .select('id', { count: 'exact', head: true })
        .in('company_group_id', groupIds);
      screenCount = screensCount || 0;

      const { data: connections } = await supabase
        .from('powerbi_connections')
        .select('id')
        .in('company_group_id', groupIds);
      connectionCount = connections?.length || 0;

      const connectionIds = connections?.map((c) => c.id) || [];
      if (connectionIds.length > 0) {
        const { count: reportsCount } = await supabase
          .from('powerbi_reports')
          .select('id', { count: 'exact', head: true })
          .in('connection_id', connectionIds);
        reportCount = reportsCount || 0;
      }
    }

    const { data: recentGroups } = await supabase
      .from('company_groups')
      .select('id, name, slug, logo_url, created_at, status')
      .eq('developer_id', developerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentGroupsWithCounts = await Promise.all(
      (recentGroups || []).map(async (g) => {
        const { count: usersCount } = await supabase
          .from('user_group_membership')
          .select('id', { count: 'exact', head: true })
          .eq('company_group_id', g.id)
          .eq('is_active', true);
        return { ...g, users_count: usersCount || 0 };
      })
    );

    return NextResponse.json({
      developer: {
        name: devData?.name || user.full_name || 'Desenvolvedor',
        plan: planName,
        isFree,
        createdAt: devData?.created_at,
      },
      stats: {
        groups: groupCount,
        users: userCount,
        screens: screenCount,
        connections: connectionCount,
        reports: reportCount,
      },
      limits: {
        maxGroups,
        maxUsers,
        maxScreens,
      },
      recentGroups: recentGroupsWithCounts,
    });
  } catch (error) {
    console.error('Erro dashboard stats:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
