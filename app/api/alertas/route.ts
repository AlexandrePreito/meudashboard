import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Listar alertas
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar grupos e role do usuario
    let userGroupIds: string[] = [];
    let userRole = 'user';

    if (user.is_master) {
      userRole = 'master';
    } else {
      // Verificar se é desenvolvedor
      const { getUserDeveloperId } = await import('@/lib/auth');
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
          console.error('[ERROR /api/alertas] Erro ao buscar grupos do dev:', {
            message: devGroupsError.message,
            details: devGroupsError.details,
            hint: devGroupsError.hint,
            code: devGroupsError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos do desenvolvedor', details: devGroupsError.message }, { status: 500 });
        }

        userGroupIds = devGroups?.map(g => String(g.id)) || [];
        
        console.log('[DEBUG /api/alertas] Grupos do desenvolvedor:', {
          developerId,
          userGroupIds,
          totalGrupos: userGroupIds.length,
          requestedGroupId: groupId || 'nenhum'
        });
        
        // SEGURANÇA: Validar group_id se passado
        if (groupId) {
          const groupIdStr = String(groupId);
          
          if (userGroupIds.length === 0) {
            console.warn('[SEGURANÇA /api/alertas] Dev sem grupos mas tentando acessar grupo específico:', {
              developerId,
              requestedGroupId: groupIdStr
            });
            return NextResponse.json({ error: 'Nenhum grupo encontrado para este desenvolvedor' }, { status: 403 });
          }
          
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/alertas] Dev tentando acessar grupo de outro dev:', {
              developerId,
              requestedGroupId: groupIdStr,
              allowedGroupIds: userGroupIds,
              groupIdInList: hasAccess
            });
            return NextResponse.json({ error: 'Sem permissao para este grupo' }, { status: 403 });
          }
          console.log('[DEBUG /api/alertas] Validação OK - grupo pertence ao dev');
        }
      } else {
        // Usuário comum: buscar via membership
        const { data: memberships, error: membershipError } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipError) {
          console.error('[ERROR /api/alertas] Erro ao buscar memberships:', {
            message: membershipError.message,
            details: membershipError.details,
            hint: membershipError.hint,
            code: membershipError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar memberships', details: membershipError.message }, { status: 500 });
        }

        userGroupIds = memberships?.map(m => String(m.company_group_id)) || [];
        
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }
        
        // SEGURANÇA: Se passou group_id, validar acesso
        if (groupId) {
          const groupIdStr = String(groupId);
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/alertas] Acesso negado (membership):', {
              userId: user.id,
              groupId: groupIdStr,
              userGroupIds
            });
            return NextResponse.json({ error: 'Sem permissao para este grupo' }, { status: 403 });
          }
        }
      }
    }

    // Usuario comum nao tem acesso a alertas
    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para acessar alertas' }, { status: 403 });
    }

    // Se nao for master e nao tem grupos, retorna vazio
    if (userRole !== 'master' && userGroupIds.length === 0) {
      return NextResponse.json({ alerts: [] });
    }

    // SEGURANCA: Validação já feita acima para developers e users com membership
    // Esta seção pode ser removida pois a validação já foi feita

    let query = supabase
      .from('ai_alerts')
      .select(`
        id,
        name,
        description,
        is_enabled,
        alert_type,
        dax_query,
        condition,
        threshold,
        check_frequency,
        check_times,
        check_days_of_week,
        check_days_of_month,
        notify_whatsapp,
        whatsapp_number,
        whatsapp_group_id,
        message_template,
        last_checked_at,
        last_triggered_at,
        created_at,
        connection_id,
        dataset_id,
        context_id,
        company_group_id
      `)
      .order('created_at', { ascending: false });

    // Filtrar por grupo
    if (groupId) {
      const groupIdStr = String(groupId);
      query = query.eq('company_group_id', groupIdStr);
      console.log('[DEBUG /api/alertas] Filtrando por group_id:', groupIdStr);
    } else if (userRole !== 'master') {
      query = query.in('company_group_id', userGroupIds);
      console.log('[DEBUG /api/alertas] Filtrando por userGroupIds:', userGroupIds);
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('[ERROR /api/alertas] Erro ao buscar alertas:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[DEBUG /api/alertas] Alertas retornados:', {
      total: alerts?.length || 0,
      groupId: groupId || 'todos',
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)'
    });

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar alerta
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Verificar role e buscar grupo do usuário
    let userRole = 'user';
    let companyGroupId: string | null = null;

    if (user.is_master) {
      userRole = 'master';
      // Master precisa passar company_group_id no body
      companyGroupId = body.company_group_id;
    } else {
      const { getUserDeveloperId } = await import('@/lib/auth');
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        userRole = 'developer';
        // Developer: usar company_group_id do body ou buscar primeiro grupo
        if (body.company_group_id) {
          // Verificar se grupo pertence ao developer
          const { data: group, error: groupError } = await supabase
            .from('company_groups')
            .select('id')
            .eq('id', body.company_group_id)
            .eq('developer_id', developerId)
            .eq('status', 'active')
            .single();
          
          if (groupError || !group) {
            console.error('[ERROR /api/alertas] Erro ao verificar grupo do dev:', {
              groupError: groupError?.message,
              company_group_id: body.company_group_id,
              developerId
            });
            return NextResponse.json({ error: 'Grupo não pertence a você ou não encontrado' }, { status: 403 });
          }
          
          companyGroupId = group.id;
        } else {
          // Buscar primeiro grupo do developer
          const { data: devGroups } = await supabase
            .from('company_groups')
            .select('id')
            .eq('developer_id', developerId)
            .eq('status', 'active')
            .limit(1);
          companyGroupId = devGroups?.[0]?.id || null;
        }
      } else {
        // Usuário comum: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true);
        
        if (memberships?.some(m => m.role === 'admin')) {
          userRole = 'admin';
        }
        companyGroupId = memberships?.[0]?.company_group_id || null;
      }
    }

    if (userRole === 'user') {
      return NextResponse.json({ error: 'Sem permissao para criar alertas' }, { status: 403 });
    }

    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    // Validar limite de alertas
    const { data: quotaData } = await supabase
      .from('company_groups')
      .select('quota_alerts')
      .eq('id', companyGroupId)
      .single();

    const alertLimit = quotaData?.quota_alerts || 20;

    // Contar alertas ativos do grupo
    const { count: alertsCount } = await supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .eq('is_enabled', true);

    // Bloquear se limite atingido
    if (alertsCount !== null && alertsCount >= alertLimit) {
      return NextResponse.json({
        error: `Limite de ${alertLimit} alertas atingido. Entre em contato com o administrador.`,
        current: alertsCount,
        max: alertLimit
      }, { status: 403 });
    }

    // Verificar limite de alertas do mês
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    // Buscar plano do grupo
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', companyGroupId)
      .single();

    let maxAlertsPerMonth = 10; // default

    if (groupData?.plan_id) {
      const { data: plan } = await supabase
        .from('powerbi_plans')
        .select('max_ai_alerts_per_month')
        .eq('id', groupData.plan_id)
        .single();
      
      if (plan?.max_ai_alerts_per_month) {
        maxAlertsPerMonth = plan.max_ai_alerts_per_month;
      }
    }

    // Contar alertas criados no mês
    const { count: alertsThisMonth } = await supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', companyGroupId)
      .gte('created_at', firstDayOfMonth)
      .lte('created_at', lastDayOfMonth + 'T23:59:59');

    // Verificar se excedeu (999999 = ilimitado)
    if (maxAlertsPerMonth < 999999 && (alertsThisMonth || 0) >= maxAlertsPerMonth) {
      return NextResponse.json({ 
        error: `Limite mensal de ${maxAlertsPerMonth} alertas atingido. Aguarde o próximo mês.`,
        limit_reached: true 
      }, { status: 429 });
    }

    const { data: alert, error } = await supabase
      .from('ai_alerts')
      .insert({
        company_group_id: companyGroupId,
        created_by: user.id,
        name: body.name,
        description: body.description || null,
        is_enabled: true,
        alert_type: body.alert_type || 'warning',
        alert_config: body.alert_config || {},
        dax_query: body.dax_query || null,
        condition: body.condition || null,
        threshold: body.threshold || null,
        check_frequency: body.check_frequency || 'daily',
        check_times: body.check_times || ['08:00'],
        check_days_of_week: body.check_days_of_week || [],
        check_days_of_month: body.check_days_of_month || [],
        connection_id: body.connection_id || null,
        dataset_id: body.dataset_id || null,
        context_id: body.context_id || null,
        notify_whatsapp: body.notify_whatsapp || false,
        whatsapp_number: body.whatsapp_numbers?.join(',') || null,
        whatsapp_group_id: body.whatsapp_group_ids?.join(',') || null,
        message_template: body.message_template || null,
        notify_webhook: body.notify_webhook || false,
        webhook_url: body.webhook_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar alerta
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: buscar alerta e verificar acesso
    const { data: existingAlert } = await supabase
      .from('ai_alerts')
      .select('company_group_id')
      .eq('id', id)
      .single();

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Verificar permissão: master pode tudo, admin e dev só seus grupos
    if (!user.is_master) {
      const { getUserDeveloperId } = await import('@/lib/auth');
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Verificar se grupo pertence ao developer
        const { data: group, error: groupError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', existingAlert.company_group_id)
          .eq('developer_id', developerId)
          .eq('status', 'active')
          .single();
        
        if (groupError || !group) {
          console.error('[ERROR /api/alertas] Erro ao verificar grupo do dev para editar:', {
            groupError: groupError?.message,
            company_group_id: existingAlert.company_group_id,
            developerId
          });
          return NextResponse.json({ error: 'Sem permissão para editar este alerta' }, { status: 403 });
        }
      } else {
        // Verificar se é admin do grupo
        const isAdminOfGroup = await isUserAdminOfGroup(user.id, existingAlert.company_group_id);
        if (!isAdminOfGroup) {
          return NextResponse.json({ error: 'Sem permissão para editar este alerta' }, { status: 403 });
        }
      }
    }

    // Preparar dados para atualização
    const dataToUpdate: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.is_enabled !== undefined) dataToUpdate.is_enabled = updateData.is_enabled;
    if (updateData.alert_type !== undefined) dataToUpdate.alert_type = updateData.alert_type;
    if (updateData.dax_query !== undefined) dataToUpdate.dax_query = updateData.dax_query;
    if (updateData.condition !== undefined) dataToUpdate.condition = updateData.condition;
    if (updateData.threshold !== undefined) dataToUpdate.threshold = updateData.threshold;
    if (updateData.check_frequency !== undefined) dataToUpdate.check_frequency = updateData.check_frequency;
    if (updateData.check_times !== undefined) dataToUpdate.check_times = updateData.check_times;
    if (updateData.check_days_of_week !== undefined) dataToUpdate.check_days_of_week = updateData.check_days_of_week;
    if (updateData.check_days_of_month !== undefined) dataToUpdate.check_days_of_month = updateData.check_days_of_month;
    if (updateData.connection_id !== undefined) dataToUpdate.connection_id = updateData.connection_id;
    if (updateData.dataset_id !== undefined) dataToUpdate.dataset_id = updateData.dataset_id;
    if (updateData.context_id !== undefined) dataToUpdate.context_id = updateData.context_id;
    if (updateData.notify_whatsapp !== undefined) dataToUpdate.notify_whatsapp = updateData.notify_whatsapp;
    if (updateData.whatsapp_numbers !== undefined) dataToUpdate.whatsapp_number = updateData.whatsapp_numbers?.join(',');
    if (updateData.whatsapp_group_ids !== undefined) dataToUpdate.whatsapp_group_id = updateData.whatsapp_group_ids?.join(',');
    if (updateData.message_template !== undefined) dataToUpdate.message_template = updateData.message_template;
    if (updateData.notify_webhook !== undefined) dataToUpdate.notify_webhook = updateData.notify_webhook;
    if (updateData.webhook_url !== undefined) dataToUpdate.webhook_url = updateData.webhook_url;

    const { data: alert, error } = await supabase
      .from('ai_alerts')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir alerta
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: buscar alerta e verificar acesso
    const { data: existingAlert } = await supabase
      .from('ai_alerts')
      .select('company_group_id')
      .eq('id', id)
      .single();

    if (!existingAlert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    // Verificar permissão: master pode tudo, admin e dev só seus grupos
    if (!user.is_master) {
      const { getUserDeveloperId } = await import('@/lib/auth');
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Verificar se grupo pertence ao developer
        const { data: group, error: groupError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', existingAlert.company_group_id)
          .eq('developer_id', developerId)
          .eq('status', 'active')
          .single();
        
        if (groupError || !group) {
          console.error('[ERROR /api/alertas] Erro ao verificar grupo do dev para excluir:', {
            groupError: groupError?.message,
            company_group_id: existingAlert.company_group_id,
            developerId
          });
          return NextResponse.json({ error: 'Sem permissão para excluir este alerta' }, { status: 403 });
        }
      } else {
        // Verificar se é admin do grupo
        const isAdminOfGroup = await isUserAdminOfGroup(user.id, existingAlert.company_group_id);
        if (!isAdminOfGroup) {
          return NextResponse.json({ error: 'Sem permissão para excluir este alerta' }, { status: 403 });
        }
      }
    }

    const { error } = await supabase
      .from('ai_alerts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

