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

    // Buscar grupo do usuário
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (!membership?.company_group_id) {
      return NextResponse.json({ used_today: 0, daily_limit: 50 });
    }

    // Buscar plano do grupo
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', membership.company_group_id)
      .single();

    let dailyLimit = 50;

    if (groupData?.plan_id) {
      const { data: plan } = await supabase
        .from('powerbi_plans')
        .select('max_ai_questions_per_day')
        .eq('id', groupData.plan_id)
        .single();
      
      if (plan?.max_ai_questions_per_day) {
        dailyLimit = plan.max_ai_questions_per_day;
      }
    }

    // Buscar uso do dia
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('questions_count')
      .eq('company_group_id', membership.company_group_id)
      .eq('usage_date', today)
      .single();

    return NextResponse.json({
      used_today: usage?.questions_count || 0,
      daily_limit: dailyLimit
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
