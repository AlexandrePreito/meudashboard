import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// POST - Clonar alerta
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Buscar alerta original
    const { data: originalAlert, error: fetchError } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !originalAlert) {
      console.error('[ERROR /api/alertas/[id]/clone] Erro ao buscar alerta original:', fetchError);
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Verificar permissões: usuário deve ter acesso ao grupo do alerta original
    let userRole = 'user';
    let userGroupIds: string[] = [];
    let hasAccess = false;

    if (user.is_master) {
      userRole = 'master';
      hasAccess = true;
    } else {
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        userRole = 'developer';
        // Buscar grupos do desenvolvedor
        const { data: devGroups, error: devGroupsError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        if (devGroupsError) {
          console.error('[ERROR /api/alertas/[id]/clone] Erro ao buscar grupos do dev:', devGroupsError);
          return NextResponse.json({ error: 'Erro ao buscar grupos do desenvolvedor', details: devGroupsError.message }, { status: 500 });
        }

        userGroupIds = devGroups?.map(g => String(g.id)) || [];
        
        // Verificar se o grupo do alerta pertence ao desenvolvedor
        const alertGroupId = String(originalAlert.company_group_id);
        hasAccess = userGroupIds.includes(alertGroupId);
      } else {
        // Verificar se é admin do grupo
        const { data: memberships, error: membershipError } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipError) {
          console.error('[ERROR /api/alertas/[id]/clone] Erro ao buscar memberships:', membershipError);
          return NextResponse.json({ error: 'Erro ao buscar memberships', details: membershipError.message }, { status: 500 });
        }

        userGroupIds = memberships?.map(m => String(m.company_group_id)) || [];
        
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }

        // Verificar se tem acesso ao grupo do alerta
        const alertGroupId = String(originalAlert.company_group_id);
        hasAccess = userGroupIds.includes(alertGroupId);
        
        // Se for admin, verificar se é admin do grupo específico
        if (userRole === 'admin' && hasAccess) {
          hasAccess = await isUserAdminOfGroup(user.id, alertGroupId);
        }
      }
    }

    if (!hasAccess) {
      console.warn('[SEGURANÇA /api/alertas/[id]/clone] Acesso negado:', {
        userId: user.id,
        alertId: id,
        alertGroupId: originalAlert.company_group_id,
        userGroupIds,
        userRole
      });
      return NextResponse.json({ error: 'Sem permissão para clonar este alerta' }, { status: 403 });
    }

    // Determinar o grupo para o alerta clonado
    let targetGroupId: string | null = null;

    if (user.is_master) {
      // Master: usar o grupo do alerta original ou do body se fornecido
      const body = await request.json().catch(() => ({}));
      targetGroupId = body.company_group_id || originalAlert.company_group_id;
    } else if (userRole === 'developer') {
      // Developer: usar o grupo do alerta original (já validado acima)
      targetGroupId = originalAlert.company_group_id;
    } else if (userRole === 'admin') {
      // Admin: usar o grupo do alerta original (já validado acima)
      targetGroupId = originalAlert.company_group_id;
    }

    if (!targetGroupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    // Validar limite de alertas do grupo
    const { data: quotaData } = await supabase
      .from('company_groups')
      .select('quota_alerts')
      .eq('id', targetGroupId)
      .single();

    const alertLimit = quotaData?.quota_alerts || 20;

    // Contar alertas ativos do grupo
    const { count: alertsCount } = await supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', targetGroupId)
      .eq('is_enabled', true);

    // Bloquear se limite atingido
    if (alertsCount !== null && alertsCount >= alertLimit) {
      return NextResponse.json({
        error: `Limite de ${alertLimit} alertas atingido. Entre em contato com o administrador.`,
        current: alertsCount,
        max: alertLimit
      }, { status: 403 });
    }

    // Criar alerta clonado (copiar todos os campos exceto id, timestamps e status)
    const clonedAlert: any = {
      name: `${originalAlert.name} (Cópia)`,
      description: originalAlert.description,
      is_enabled: false, // Desabilitado por padrão
      alert_type: originalAlert.alert_type,
      alert_config: originalAlert.alert_config || {},
      dax_query: originalAlert.dax_query,
      condition: originalAlert.condition,
      threshold: originalAlert.threshold,
      check_frequency: originalAlert.check_frequency,
      check_times: originalAlert.check_times,
      check_days_of_week: originalAlert.check_days_of_week,
      check_days_of_month: originalAlert.check_days_of_month,
      notify_whatsapp: originalAlert.notify_whatsapp,
      whatsapp_number: originalAlert.whatsapp_number,
      whatsapp_group_id: originalAlert.whatsapp_group_id,
      message_template: originalAlert.message_template,
      notify_webhook: originalAlert.notify_webhook || false,
      webhook_url: originalAlert.webhook_url,
      connection_id: originalAlert.connection_id,
      dataset_id: originalAlert.dataset_id,
      context_id: originalAlert.context_id,
      company_group_id: targetGroupId,
      created_by: user.id
    };

    const { data: newAlert, error: createError } = await supabase
      .from('ai_alerts')
      .insert(clonedAlert)
      .select()
      .single();

    if (createError) {
      console.error('[ERROR /api/alertas/[id]/clone] Erro ao criar alerta clonado:', createError);
      return NextResponse.json({ error: 'Erro ao clonar alerta', details: createError.message }, { status: 500 });
    }

    console.log('[DEBUG /api/alertas/[id]/clone] Alerta clonado com sucesso:', {
      originalId: id,
      newId: newAlert.id,
      targetGroupId
    });

    return NextResponse.json({ 
      alert: newAlert,
      message: 'Alerta clonado com sucesso!'
    }, { status: 201 });
  } catch (error: any) {
    console.error('[ERROR /api/alertas/[id]/clone] Erro geral:', {
      message: error?.message || 'Erro desconhecido',
      stack: error?.stack?.substring(0, 500) || 'N/A',
      name: error?.name || 'Error'
    });
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
