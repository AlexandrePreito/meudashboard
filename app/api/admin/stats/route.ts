import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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

    // Total de desenvolvedores
    const { count: totalDevelopers } = await supabase
      .from('developers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Total de grupos
    const { count: totalGroups } = await supabase
      .from('company_groups')
      .select('*', { count: 'exact', head: true });

    // Total de usuarios
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Total de planos ativos
    const { count: totalPowerBIPlans } = await supabase
      .from('powerbi_plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: totalDevPlans } = await supabase
      .from('developer_plans')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Consumo de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: todayUsage } = await supabase
      .from('daily_usage')
      .select('whatsapp_messages_sent, ai_credits_used, alert_executions')
      .eq('usage_date', today);

    const todayWhatsapp = (todayUsage || []).reduce((sum, r) => sum + (r.whatsapp_messages_sent || 0), 0);
    const todayAI = (todayUsage || []).reduce((sum, r) => sum + (r.ai_credits_used || 0), 0);
    const todayAlerts = (todayUsage || []).reduce((sum, r) => sum + (r.alert_executions || 0), 0);

    // Consumo do mes
    const firstDayOfMonth = new Date();
    firstDayOfMonth.setDate(1);
    const monthStart = firstDayOfMonth.toISOString().split('T')[0];

    const { data: monthUsage } = await supabase
      .from('daily_usage')
      .select('whatsapp_messages_sent, ai_credits_used, alert_executions')
      .gte('usage_date', monthStart);

    const monthWhatsapp = (monthUsage || []).reduce((sum, r) => sum + (r.whatsapp_messages_sent || 0), 0);
    const monthAI = (monthUsage || []).reduce((sum, r) => sum + (r.ai_credits_used || 0), 0);
    const monthAlerts = (monthUsage || []).reduce((sum, r) => sum + (r.alert_executions || 0), 0);

    // Top desenvolvedores (por numero de grupos)
    const { data: developers } = await supabase
      .from('developers')
      .select('id, name')
      .eq('is_active', true)
      .limit(10);

    const topDevelopers = [];
    for (const dev of developers || []) {
      const { count: groups_count } = await supabase
        .from('company_groups')
        .select('*', { count: 'exact', head: true })
        .eq('developer_id', dev.id);

      const { data: groupIds } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', dev.id);

      let users_count = 0;
      if (groupIds && groupIds.length > 0) {
        const { count } = await supabase
          .from('user_groups')
          .select('*', { count: 'exact', head: true })
          .in('company_group_id', groupIds.map(g => g.id));
        users_count = count || 0;
      }

      topDevelopers.push({
        id: dev.id,
        name: dev.name,
        groups_count: groups_count || 0,
        users_count
      });
    }

    // Ordenar por grupos
    topDevelopers.sort((a, b) => b.groups_count - a.groups_count);

    // Grupos recentes
    const { data: recentGroupsData } = await supabase
      .from('company_groups')
      .select('id, name, developer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentGroups = [];
    for (const group of recentGroupsData || []) {
      const { data: devData } = await supabase
        .from('developers')
        .select('name')
        .eq('id', group.developer_id)
        .single();

      recentGroups.push({
        id: group.id,
        name: group.name,
        developer_name: devData?.name || 'Desconhecido',
        created_at: group.created_at
      });
    }

    return NextResponse.json({
      totalDevelopers: totalDevelopers || 0,
      totalGroups: totalGroups || 0,
      totalUsers: totalUsers || 0,
      totalPlans: (totalPowerBIPlans || 0) + (totalDevPlans || 0),
      todayWhatsapp,
      todayAI,
      todayAlerts,
      monthWhatsapp,
      monthAI,
      monthAlerts,
      topDevelopers: topDevelopers.slice(0, 5),
      recentGroups
    });
  } catch (error: any) {
    console.error('Erro ao buscar estatisticas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
