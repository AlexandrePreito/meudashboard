import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id obrigatorio' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar grupo com plano
    const { data: group, error } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        plan_id,
        plan:powerbi_plans(
          id,
          name,
          ai_enabled,
          max_alerts,
          max_whatsapp_per_day,
          max_ai_credits_per_day,
          max_alert_executions_per_day,
          max_powerbi_screens,
          max_users
        )
      `)
      .eq('id', groupId)
      .single();

    if (error || !group) {
      return NextResponse.json({ error: 'Grupo nao encontrado' }, { status: 404 });
    }

    const plan = group.plan as any;

    return NextResponse.json({
      plan_name: plan?.name || 'Sem plano',
      quotas: {
        ai_enabled: plan?.ai_enabled || false,
        max_alerts: plan?.max_alerts || 0,
        max_whatsapp_per_day: plan?.max_whatsapp_per_day || 0,
        max_ai_credits_per_day: plan?.max_ai_credits_per_day || 0,
        max_alert_executions_per_day: plan?.max_alert_executions_per_day || 0,
        max_powerbi_screens: plan?.max_powerbi_screens || 0,
        max_users: plan?.max_users || 0,
      }
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
