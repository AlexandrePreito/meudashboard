import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // Master tem tudo liberado
    if (user.is_master) {
      return NextResponse.json({
        plan_name: 'Master',
        plan_type: 'master',
        features: {
          whatsapp: true,
          alerts: true,
          ai: true,
          max_groups: 999,
          max_users: 999,
          max_screens: 999,
          allow_powerbi_connections: true,
          allow_whatsapp_instances: true,
        },
        is_free: false,
      });
    }

    const supabase = createAdminClient();

    // Developer: buscar plano (busca direta por plan_id - mais confiável)
    const developerId = await getUserDeveloperId(user.id);
    if (developerId) {
      const { data: developer, error: devError } = await supabase
        .from('developers')
        .select('id, plan_id, allow_powerbi_connections, allow_whatsapp_instances')
        .eq('id', developerId)
        .single();

      if (devError || !developer) {
        console.warn('[features] Erro ao buscar developer:', devError?.message, 'developerId:', developerId);
      }

      let plan: { name?: string; max_groups?: number; max_users?: number; max_screens?: number; max_whatsapp_messages_per_day?: number; max_alert_executions_per_day?: number; ai_enabled?: boolean } | null = null;
      if (developer?.plan_id) {
        const { data: planRow } = await supabase
          .from('developer_plans')
          .select('name, max_groups, max_users, max_screens, max_whatsapp_messages_per_day, max_alert_executions_per_day, ai_enabled')
          .eq('id', developer.plan_id)
          .eq('is_active', true)
          .maybeSingle();
        plan = planRow;
      }

      const planName = (plan?.name || 'Free').trim();
      const isFree = planName.toLowerCase() === 'free';

      const maxGroups = plan?.max_groups ?? 5;
      const maxUsers = plan?.max_users ?? 15;
      const maxScreens = plan?.max_screens ?? 15;
      const hasWhatsapp = (plan?.max_whatsapp_messages_per_day ?? 0) > 0;
      const hasAlerts = (plan?.max_alert_executions_per_day ?? 0) > 0;
      const hasAi = plan?.ai_enabled ?? false;

      return NextResponse.json({
        plan_name: planName,
        plan_type: isFree ? 'free' : 'pro',
        features: {
          whatsapp: isFree ? false : hasWhatsapp,
          alerts: isFree ? false : hasAlerts,
          ai: isFree ? false : hasAi,
          max_groups: maxGroups,
          max_users: maxUsers,
          max_screens: maxScreens,
          allow_powerbi_connections: developer?.allow_powerbi_connections ?? true,
          allow_whatsapp_instances: developer?.allow_whatsapp_instances ?? true,
        },
        is_free: isFree,
      });
    }

    // Admin/Viewer: buscar via grupo → developer → plano
    const { data: memberships } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1);

    let viewerDeveloperId: string | null = null;

    if (memberships && memberships.length > 0) {
      const { data: groupData } = await supabase
        .from('company_groups')
        .select('developer_id')
        .eq('id', memberships[0].company_group_id)
        .single();

      viewerDeveloperId = groupData?.developer_id || null;
    }

    if (!viewerDeveloperId) {
      const { data: userData } = await supabase
        .from('users')
        .select('developer_id, company_group_id')
        .eq('id', user.id)
        .single();

      if (userData?.developer_id) {
        viewerDeveloperId = userData.developer_id;
      } else if (userData?.company_group_id) {
        const { data: groupData } = await supabase
          .from('company_groups')
          .select('developer_id')
          .eq('id', userData.company_group_id)
          .single();

        viewerDeveloperId = groupData?.developer_id || null;
      }
    }

    if (!viewerDeveloperId) {
      console.warn('[features] Usuário sem developer associado:', user.id);
      return NextResponse.json({
        plan_name: 'Free',
        plan_type: 'free',
        features: {
          whatsapp: false,
          alerts: false,
          ai: false,
          max_groups: 5,
          max_users: 15,
          max_screens: 15,
          allow_powerbi_connections: true,
          allow_whatsapp_instances: true,
        },
        is_free: true,
      });
    }

    const { data: dev } = await supabase
      .from('developers')
      .select('plan_id, allow_powerbi_connections, allow_whatsapp_instances')
      .eq('id', viewerDeveloperId)
      .single();

    let devPlan: { name?: string; max_groups?: number; max_users?: number; max_screens?: number; max_whatsapp_messages_per_day?: number; max_alert_executions_per_day?: number; ai_enabled?: boolean } | null = null;
    if (dev?.plan_id) {
      const { data: planRow } = await supabase
        .from('developer_plans')
        .select('name, max_groups, max_users, max_screens, max_whatsapp_messages_per_day, max_alert_executions_per_day, ai_enabled')
        .eq('id', dev.plan_id)
        .eq('is_active', true)
        .maybeSingle();
      devPlan = planRow;
    }

    const planName = (devPlan?.name || 'Free').trim();
    const isFree = planName.toLowerCase() === 'free';

    const maxGroups = devPlan?.max_groups ?? 5;
    const maxUsers = devPlan?.max_users ?? 15;
    const maxScreens = devPlan?.max_screens ?? 15;
    const hasWhatsapp = (devPlan?.max_whatsapp_messages_per_day ?? 0) > 0;
    const hasAlerts = (devPlan?.max_alert_executions_per_day ?? 0) > 0;
    const hasAi = devPlan?.ai_enabled ?? false;

    return NextResponse.json({
      plan_name: planName,
      plan_type: isFree ? 'free' : 'pro',
      features: {
        whatsapp: isFree ? false : hasWhatsapp,
        alerts: isFree ? false : hasAlerts,
        ai: isFree ? false : hasAi,
        max_groups: maxGroups,
        max_users: maxUsers,
        max_screens: maxScreens,
        allow_powerbi_connections: dev?.allow_powerbi_connections ?? true,
        allow_whatsapp_instances: dev?.allow_whatsapp_instances ?? true,
      },
      is_free: isFree,
    });
  } catch (error: any) {
    console.error('Erro ao verificar features:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
