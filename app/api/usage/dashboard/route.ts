import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Buscar grupo do usuário
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership?.company_group_id) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    const companyGroupId = membership.company_group_id;

    // Buscar dados do grupo e plano
    const { data: group } = await supabase
      .from('company_groups')
      .select('*, plan:powerbi_plans(*)')
      .eq('id', companyGroupId)
      .single();

    const plan = group?.plan || {};

    // Buscar uso de IA hoje
    const { data: aiUsage } = await supabase
      .from('ai_usage')
      .select('questions_count')
      .eq('company_group_id', companyGroupId)
      .eq('usage_date', today)
      .single();

    // Contar alertas do mês
    const { count: alertsCount } = await supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .gte('created_at', firstDayOfMonth);

    // Contar mensagens WhatsApp do mês (outgoing)
    const { count: whatsappCount } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .eq('direction', 'outgoing')
      .gte('created_at', firstDayOfMonth);

    // Contar telas Power BI
    const { count: screensCount } = await supabase
      .from('powerbi_dashboard_screens')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId);

    // Contar usuários do grupo
    const { count: usersCount } = await supabase
      .from('user_group_membership')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .eq('is_active', true);

    // Contar empresas do grupo
    const { count: companiesCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId);

    // Contar refreshes de hoje
    const { count: refreshesCount } = await supabase
      .from('powerbi_daily_refresh_count')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .eq('refresh_date', today);

    return NextResponse.json({
      plan_name: plan.name || 'Sem plano',
      max_ai_questions_per_day: plan.max_ai_questions_per_day || 50,
      max_ai_alerts_per_month: plan.max_ai_alerts_per_month || 10,
      max_whatsapp_messages_per_month: plan.max_whatsapp_messages_per_month || 100,
      max_powerbi_screens: plan.max_powerbi_screens || 5,
      max_users: plan.max_users || 10,
      max_companies: plan.max_companies || 2,
      max_daily_refreshes: plan.max_daily_refreshes || 1,
      
      ai_questions_today: aiUsage?.questions_count || 0,
      ai_alerts_this_month: alertsCount || 0,
      whatsapp_messages_this_month: whatsappCount || 0,
      powerbi_screens_count: screensCount || 0,
      users_count: usersCount || 0,
      companies_count: companiesCount || 0,
      refreshes_today: refreshesCount || 0
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
