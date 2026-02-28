import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Buscar grupos e plano do desenvolvedor
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Buscar developer_id do usuario
    const developerId = await getUserDeveloperId(user.id);
    
    if (!developerId && !user.is_master) {
      return NextResponse.json({ error: 'Voce nao e um desenvolvedor' }, { status: 403 });
    }

    // Buscar plano do desenvolvedor
    const { data: developer } = await supabase
      .from('developers')
      .select(`
        id,
        plan:developer_plans(
          max_users,
          max_screens,
          max_alerts,
          max_whatsapp_messages_per_day,
          max_ai_credits_per_day,
          ai_enabled
        )
      `)
      .eq('id', developerId)
      .single();

    // Buscar grupos do desenvolvedor com contagem de uso
    const { data: groups } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        quota_users,
        quota_screens,
        quota_alerts,
        quota_whatsapp_per_day,
        quota_ai_credits_per_day,
        quota_refreshes
      `)
      .eq('developer_id', developerId)
      .order('name');

    // Buscar uso real de cada grupo
    const groupsWithUsage = await Promise.all(
      (groups || []).map(async (group) => {
        // Contar usuarios
        const { count: usersCount } = await supabase
          .from('user_group_membership')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id)
          .eq('is_active', true);

        // Contar telas
        const { count: screensCount } = await supabase
          .from('powerbi_dashboard_screens')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id);

        return {
          ...group,
          used_users: usersCount || 0,
          used_screens: screensCount || 0,
        };
      })
    );

    return NextResponse.json({
      groups: groupsWithUsage,
      plan: developer?.plan || null,
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar quotas dos grupos
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Buscar developer_id do usuario
    const developerId = await getUserDeveloperId(user.id);
    
    if (!developerId && !user.is_master) {
      return NextResponse.json({ error: 'Voce nao e um desenvolvedor' }, { status: 403 });
    }

    // Buscar developer e plano para validar limites (developer overrides plan)
    const { data: developer } = await supabase
      .from('developers')
      .select(`
        max_users,
        max_powerbi_screens,
        max_alerts,
        max_chat_messages_per_day,
        max_whatsapp_messages_per_day,
        max_ai_credits_per_day,
        max_daily_refreshes,
        plan:developer_plans(
          max_users,
          max_powerbi_screens,
          max_alerts,
          max_whatsapp_messages_per_day,
          max_ai_credits_per_day
        )
      `)
      .eq('id', developerId)
      .single();

    const planRaw = developer?.plan;
    const plan = Array.isArray(planRaw) ? planRaw[0] : planRaw;
    const dev = developer as any;

    // Limites efetivos: developer overrides plan
    const maxUsers = dev?.max_users ?? plan?.max_users ?? 50;
    const maxScreens = dev?.max_powerbi_screens ?? plan?.max_powerbi_screens ?? 10;
    const maxAlerts = dev?.max_alerts ?? plan?.max_alerts ?? 20;
    const maxWhatsapp = dev?.max_whatsapp_messages_per_day ?? dev?.max_chat_messages_per_day ?? plan?.max_whatsapp_messages_per_day ?? 500;
    const maxAI = dev?.max_ai_credits_per_day ?? plan?.max_ai_credits_per_day ?? 200;
    const maxRefreshes = dev?.max_daily_refreshes ?? 20;

    const body = await request.json();
    const { quotas } = body;

    if (!quotas || typeof quotas !== 'object') {
      return NextResponse.json({ error: 'Dados invalidos' }, { status: 400 });
    }

    // Validar que soma nao excede limites do developer
    let totalUsers = 0, totalScreens = 0, totalAlerts = 0, totalWhatsapp = 0, totalAI = 0, totalRefreshes = 0;

    Object.values(quotas).forEach((q: any) => {
      totalUsers += q.quota_users || 0;
      totalScreens += q.quota_screens || 0;
      totalAlerts += q.quota_alerts || 0;
      totalWhatsapp += q.quota_whatsapp_per_day || 0;
      totalAI += q.quota_ai_credits_per_day || 0;
      totalRefreshes += q.quota_refreshes || 0;
    });

    if (totalUsers > maxUsers) {
      return NextResponse.json({ error: `Quota de usuarios (${totalUsers}) excede limite (${maxUsers})` }, { status: 400 });
    }
    if (totalScreens > maxScreens) {
      return NextResponse.json({ error: `Quota de telas (${totalScreens}) excede limite (${maxScreens})` }, { status: 400 });
    }
    if (totalAlerts > maxAlerts) {
      return NextResponse.json({ error: `Quota de alertas (${totalAlerts}) excede limite (${maxAlerts})` }, { status: 400 });
    }
    if (totalWhatsapp > maxWhatsapp) {
      return NextResponse.json({ error: `Quota de WhatsApp (${totalWhatsapp}) excede limite (${maxWhatsapp})` }, { status: 400 });
    }
    if (totalAI > maxAI) {
      return NextResponse.json({ error: `Quota de IA (${totalAI}) excede limite (${maxAI})` }, { status: 400 });
    }
    if (totalRefreshes > maxRefreshes) {
      return NextResponse.json({ error: `Quota de atualizacoes (${totalRefreshes}) excede limite (${maxRefreshes})` }, { status: 400 });
    }

    // Atualizar cada grupo
    const errors: string[] = [];

    for (const [groupId, groupQuotas] of Object.entries(quotas)) {
      // Verificar se grupo pertence ao desenvolvedor
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', groupId)
        .eq('developer_id', developerId)
        .single();

      if (!group) {
        errors.push(`Grupo ${groupId} nao encontrado ou sem permissao`);
        continue;
      }

      const q = groupQuotas as any;
      const { error: updateError } = await supabase
        .from('company_groups')
        .update({
          quota_users: q.quota_users || 0,
          quota_screens: q.quota_screens || 0,
          quota_alerts: q.quota_alerts || 0,
          quota_whatsapp_per_day: q.quota_whatsapp_per_day || 0,
          quota_ai_credits_per_day: q.quota_ai_credits_per_day || 0,
          quota_refreshes: q.quota_refreshes || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (updateError) {
        errors.push(`Erro ao atualizar grupo ${groupId}: ${updateError.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: errors.join(', ') }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
