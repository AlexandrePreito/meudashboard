/**
 * API Route - Developer Dashboard
 * Painel do desenvolvedor logado - métricas e resumo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Dashboard do desenvolvedor
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Buscar developer_id do usuário
    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar dados do desenvolvedor
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .select(`
        id,
        name,
        logo_url,
        primary_color,
        max_companies,
        max_users,
        max_powerbi_screens,
        max_daily_refreshes,
        max_chat_messages_per_day,
        max_alerts,
        monthly_price
      `)
      .eq('id', developerId)
      .single();

    if (devError || !developer) {
      return NextResponse.json({ error: 'Desenvolvedor não encontrado' }, { status: 404 });
    }

    // Buscar grupos do desenvolvedor (apenas ativos)
    const { data: groups } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        status,
        logo_url,
        quota_whatsapp_per_day,
        quota_alert_executions_per_day,
        quota_users,
        quota_screens,
        quota_alerts,
        created_at
      `)
      .eq('developer_id', developerId)
      .eq('status', 'active')
      .order('name');

    // Buscar uso de hoje de todos os grupos
    const today = new Date().toISOString().split('T')[0];
    const groupIds = groups?.map(g => g.id) || [];

    let usageToday: any[] = [];
    if (groupIds.length > 0) {
      const { data } = await supabase
        .from('daily_usage')
        .select('*')
        .in('company_group_id', groupIds)
        .eq('usage_date', today);
      usageToday = data || [];
    }

    // Calcular estatísticas
    let totalUsers = 0;
    let totalScreens = 0;
    let totalAlerts = 0;

    // Contar usuários por grupo
    for (const group of groups || []) {
      const { count: usersCount } = await supabase
        .from('user_group_membership')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', group.id)
        .eq('is_active', true);

      const { count: screensCount } = await supabase
        .from('powerbi_dashboard_screens')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', group.id);

      const { count: alertsCount } = await supabase
        .from('ai_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('company_group_id', group.id);

      totalUsers += usersCount || 0;
      totalScreens += screensCount || 0;
      totalAlerts += alertsCount || 0;
    }

    // Calcular uso total de hoje
    const whatsappUsedToday = usageToday.reduce((acc, u) => acc + (u.whatsapp_messages_sent || 0), 0);
    
    // Contar refreshes de hoje
    let refreshesUsedToday = 0;
    if (groupIds.length > 0) {
      const { count: refreshesCount } = await supabase
        .from('powerbi_daily_refresh_count')
        .select('*', { count: 'exact', head: true })
        .in('company_group_id', groupIds)
        .eq('refresh_date', today);
      refreshesUsedToday = refreshesCount || 0;
    }

    // Contar grupos
    const groupCount = groups?.length || 0;
    const userCount = totalUsers;
    const screenCount = totalScreens;
    const alertCount = totalAlerts;

    // Montar resposta
    const response = {
      developer: {
        id: developer.id,
        name: developer.name,
        email: user.email,
        logo_url: developer.logo_url,
        status: 'active'
      },
      plan: {
        name: 'Plano Personalizado',
        max_groups: developer.max_companies || 5,
        max_users: developer.max_users || 50,
        max_screens: developer.max_powerbi_screens || 10,
        max_alerts: developer.max_alerts || 20,
        max_whatsapp_per_day: developer.max_chat_messages_per_day || 1000,
        max_refreshes_per_day: developer.max_daily_refreshes || 20
      },
      stats: {
        groups: { used: groupCount, limit: developer.max_companies || 5 },
        users: { used: userCount, limit: developer.max_users || 50 },
        screens: { used: screenCount, limit: developer.max_powerbi_screens || 10 },
        alerts: { used: alertCount, limit: developer.max_alerts || 20 }
      },
      usage_today: {
        whatsapp: { used: whatsappUsedToday, limit: developer.max_chat_messages_per_day || 1000 },
        refreshes: { used: refreshesUsedToday, limit: developer.max_daily_refreshes || 20 }
      },
      groups: await Promise.all((groups || []).map(async (g) => {
        const groupUsage = usageToday.find(u => u.company_group_id === g.id);
        
        // Contar refreshes do grupo de hoje
        const { count: groupRefreshesCount } = await supabase
          .from('powerbi_daily_refresh_count')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', g.id)
          .eq('refresh_date', today);
        const groupRefreshesToday = groupRefreshesCount || 0;
        
        return {
          id: g.id,
          name: g.name,
          status: g.status,
          logo_url: g.logo_url,
          quotas: {
            users: g.quota_users,
            screens: g.quota_screens,
            alerts: g.quota_alerts,
            whatsapp_per_day: g.quota_whatsapp_per_day,
            refreshes_per_day: g.quota_alert_executions_per_day,
          },
          usage_today: {
            whatsapp: groupUsage?.whatsapp_messages_sent || 0,
            refreshes: groupRefreshesToday,
          },
        };
      }))
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
