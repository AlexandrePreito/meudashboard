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
        *,
        plan:developer_plans(*)
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
        quota_ai_credits_per_day,
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
    const usageTodayTotal = usageToday.reduce(
      (acc, u) => ({
        whatsapp: acc.whatsapp + (u.whatsapp_messages_sent || 0),
        ai: acc.ai + (u.ai_credits_used || 0),
        executions: acc.executions + (u.alert_executions || 0),
      }),
      { whatsapp: 0, ai: 0, executions: 0 }
    );

    // Montar resposta
    const plan = developer.plan;
    const response = {
      developer: {
        id: developer.id,
        name: developer.name,
        email: developer.email,
        logo_url: developer.logo_url,
        status: developer.status,
      },
      plan: plan ? {
        name: plan.name,
        max_groups: plan.max_groups,
        max_users: plan.max_users,
        max_screens: plan.max_screens,
        max_alerts: plan.max_alerts,
        max_whatsapp_per_day: plan.max_whatsapp_messages_per_day,
        max_ai_per_day: plan.max_ai_credits_per_day,
        max_executions_per_day: plan.max_alert_executions_per_day,
      } : null,
      stats: {
        groups: {
          used: groups?.length || 0,
          limit: plan?.max_groups || 0,
        },
        users: {
          used: totalUsers,
          limit: plan?.max_users || 0,
        },
        screens: {
          used: totalScreens,
          limit: plan?.max_screens || 0,
        },
        alerts: {
          used: totalAlerts,
          limit: plan?.max_alerts || 0,
        },
      },
      usage_today: {
        whatsapp: {
          used: usageTodayTotal.whatsapp,
          limit: plan?.max_whatsapp_messages_per_day || 0,
        },
        ai: {
          used: usageTodayTotal.ai,
          limit: plan?.max_ai_credits_per_day || 0,
        },
        executions: {
          used: usageTodayTotal.executions,
          limit: plan?.max_alert_executions_per_day || 0,
        },
      },
      groups: (groups || []).map(g => {
        const groupUsage = usageToday.find(u => u.company_group_id === g.id);
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
            ai_per_day: g.quota_ai_credits_per_day,
            executions_per_day: g.quota_alert_executions_per_day,
          },
          usage_today: {
            whatsapp: groupUsage?.whatsapp_messages_sent || 0,
            ai: groupUsage?.ai_credits_used || 0,
            executions: groupUsage?.alert_executions || 0,
          },
        };
      }),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
