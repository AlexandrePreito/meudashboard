import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Buscar grupo do usuário
    let companyGroupId: string | null = null;
    
    // Verificar se é developer
    const developerId = await getUserDeveloperId(user.id);
    
    if (developerId) {
      // Developer: pegar primeiro grupo ativo
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active')
        .limit(1);
      
      companyGroupId = devGroups?.[0]?.id || null;
    } else {
      // Usuário normal: buscar via membership
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      companyGroupId = membership?.company_group_id || null;
    }

    if (!companyGroupId) {
      return NextResponse.json({ used_this_month: 0, monthly_limit: 100 });
    }

    // Buscar plano do grupo
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', companyGroupId)
      .single();

    let monthlyLimit = 100;

    if (groupData?.plan_id) {
      const { data: plan } = await supabase
        .from('powerbi_plans')
        .select('max_whatsapp_messages_per_month')
        .eq('id', groupData.plan_id)
        .single();
      
      if (plan?.max_whatsapp_messages_per_month) {
        monthlyLimit = plan.max_whatsapp_messages_per_month;
      }
    }

    // Contar mensagens enviadas (outgoing) no mês
    const { count } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .eq('direction', 'outgoing')
      .gte('created_at', firstDayOfMonth);

    return NextResponse.json({
      used_this_month: count || 0,
      monthly_limit: monthlyLimit
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
