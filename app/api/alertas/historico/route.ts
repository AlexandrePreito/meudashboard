import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alert_id');
    const groupId = searchParams.get('group_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Se não for master, buscar grupos do usuário
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Desenvolvedor: buscar grupos pelo developer_id
        const { data: devGroups, error: devGroupsError } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        if (devGroupsError) {
          console.error('[ERROR /api/alertas/historico] Erro ao buscar grupos do dev:', {
            message: devGroupsError.message,
            details: devGroupsError.details,
            hint: devGroupsError.hint,
            code: devGroupsError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos do desenvolvedor', details: devGroupsError.message }, { status: 500 });
        }

        userGroupIds = devGroups?.map(g => String(g.id)) || [];
        
        console.log('[DEBUG /api/alertas/historico] Grupos do desenvolvedor:', {
          developerId,
          userGroupIds,
          totalGrupos: userGroupIds.length,
          requestedGroupId: groupId || 'nenhum'
        });
        
        // SEGURANÇA: Validar group_id se passado
        if (groupId) {
          const groupIdStr = String(groupId);
          
          if (userGroupIds.length === 0) {
            console.warn('[SEGURANÇA /api/alertas/historico] Dev sem grupos mas tentando acessar grupo específico:', {
              developerId,
              requestedGroupId: groupIdStr
            });
            return NextResponse.json({ error: 'Nenhum grupo encontrado para este desenvolvedor' }, { status: 403 });
          }
          
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/alertas/historico] Dev tentando acessar grupo de outro dev:', {
              developerId,
              requestedGroupId: groupIdStr,
              allowedGroupIds: userGroupIds,
              groupIdInList: hasAccess
            });
            return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
          }
          console.log('[DEBUG /api/alertas/historico] Validação OK - grupo pertence ao dev');
        }
      } else {
        // Usuario comum: buscar via membership
        const { data: memberships, error: membershipError } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (membershipError) {
          console.error('[ERROR /api/alertas/historico] Erro ao buscar memberships:', {
            message: membershipError.message,
            details: membershipError.details,
            hint: membershipError.hint,
            code: membershipError.code
          });
          return NextResponse.json({ error: 'Erro ao buscar memberships', details: membershipError.message }, { status: 500 });
        }

        userGroupIds = memberships?.map(m => String(m.company_group_id)) || [];
        
        // SEGURANCA: Se passou group_id, validar acesso
        if (groupId) {
          const groupIdStr = String(groupId);
          const hasAccess = userGroupIds.some(gid => String(gid) === groupIdStr);
          
          if (!hasAccess) {
            console.warn('[SEGURANÇA /api/alertas/historico] Acesso negado (membership):', {
              userId: user.id,
              groupId: groupIdStr,
              userGroupIds
            });
            return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
          }
        }
      }

      if (userGroupIds.length === 0) {
        console.log('[DEBUG /api/alertas/historico] Nenhum grupo encontrado para o usuário');
        return NextResponse.json({
          history: [],
          total: 0,
          limit,
          offset
        });
      }
    }

    // Primeiro, buscar os alert_ids que pertencem aos grupos permitidos
    let alertIdsQuery = supabase
      .from('ai_alerts')
      .select('id, company_group_id, name');

    if (groupId) {
      const groupIdStr = String(groupId);
      alertIdsQuery = alertIdsQuery.eq('company_group_id', groupIdStr);
      console.log('[DEBUG /api/alertas/historico] Filtrando alertas por group_id:', groupIdStr);
    } else if (!user.is_master) {
      // Filtrar por grupos do usuário (se não for master)
      alertIdsQuery = alertIdsQuery.in('company_group_id', userGroupIds);
      console.log('[DEBUG /api/alertas/historico] Filtrando alertas por userGroupIds:', userGroupIds);
    }

    if (alertId) {
      alertIdsQuery = alertIdsQuery.eq('id', alertId);
    }

    const { data: allowedAlerts, error: alertsError } = await alertIdsQuery;
    
    console.log('[DEBUG /api/alertas/historico] Alertas encontrados na query:', {
      total: allowedAlerts?.length || 0,
      alerts: allowedAlerts?.map(a => ({ id: a.id, name: a.name, company_group_id: a.company_group_id })) || [],
      requestedGroupId: groupId || 'todos',
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)'
    });

    if (alertsError) {
      console.error('[ERROR /api/alertas/historico] Erro ao buscar alertas:', {
        message: alertsError.message,
        details: alertsError.details,
        hint: alertsError.hint,
        code: alertsError.code
      });
      return NextResponse.json({ error: 'Erro ao buscar alertas', details: alertsError.message }, { status: 500 });
    }

    const allowedAlertIds = allowedAlerts?.map(a => a.id) || [];

    console.log('[DEBUG /api/alertas/historico] Alertas permitidos:', {
      total: allowedAlertIds.length,
      alertIds: allowedAlertIds.slice(0, 10),
      groupId: groupId || 'todos',
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)',
      allAllowedAlerts: allowedAlerts?.map(a => ({ id: a.id })) || []
    });
    
    // Verificar se há histórico sem filtro de alert_id para debug
    const { count: totalHistoryCount, data: allHistory } = await supabase
      .from('ai_alert_history')
      .select('alert_id')
      .order('triggered_at', { ascending: false })
      .limit(10);
    
    const uniqueAlertIds = [...new Set(allHistory?.map(h => h.alert_id) || [])];
    
    console.log('[DEBUG /api/alertas/historico] Total de registros na tabela (sem filtro):', totalHistoryCount);
    console.log('[DEBUG /api/alertas/historico] Alert IDs que têm histórico:', uniqueAlertIds);
    console.log('[DEBUG /api/alertas/historico] Alert IDs permitidos vs com histórico:', {
      allowed: allowedAlertIds,
      withHistory: uniqueAlertIds,
      intersection: allowedAlertIds.filter(id => uniqueAlertIds.includes(id))
    });

    if (allowedAlertIds.length === 0) {
      console.log('[DEBUG /api/alertas/historico] Nenhum alerta encontrado para os grupos permitidos');
      return NextResponse.json({
        history: [],
        total: 0,
        limit,
        offset
      });
    }

    // DEBUG: Buscar histórico sem filtro primeiro para verificar se há dados
    const { data: debugHistory, error: debugError } = await supabase
      .from('ai_alert_history')
      .select('alert_id, triggered_at, alert_value, webhook_sent')
      .order('triggered_at', { ascending: false })
      .limit(5);
    
    console.log('[DEBUG /api/alertas/historico] Últimos 5 registros de histórico (sem filtro):', {
      count: debugHistory?.length || 0,
      records: debugHistory || [],
      error: debugError?.message
    });

    // Agora buscar o histórico apenas dos alertas permitidos
    let query = supabase
      .from('ai_alert_history')
      .select(`
        *,
        ai_alerts (
          name,
          description,
          company_group_id
        )
      `)
      .in('alert_id', allowedAlertIds)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: history, error } = await query;

    if (error) {
      console.error('[ERROR /api/alertas/historico] Erro ao buscar histórico:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[DEBUG /api/alertas/historico] Histórico retornado:', {
      total: history?.length || 0,
      groupId: groupId || 'todos',
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)',
      allowedAlertIds: allowedAlertIds.length,
      historySample: history?.slice(0, 2) || [],
      firstItemStructure: history?.[0] ? Object.keys(history[0]) : []
    });
    
    // Verificar estrutura dos dados
    if (history && history.length > 0) {
      console.log('[DEBUG /api/alertas/historico] Estrutura do primeiro item:', {
        keys: Object.keys(history[0]),
        ai_alerts: history[0].ai_alerts,
        hasAiAlerts: !!history[0].ai_alerts,
        aiAlertsType: Array.isArray(history[0].ai_alerts) ? 'array' : typeof history[0].ai_alerts
      });
    }

    // Contar total com os mesmos filtros
    const { count } = await supabase
      .from('ai_alert_history')
      .select('*', { count: 'exact', head: true })
      .in('alert_id', allowedAlertIds);

    // Normalizar estrutura dos dados (Supabase pode retornar ai_alerts como array)
    const normalizedHistory = (history || []).map((item: any) => {
      // Se ai_alerts é um array, pegar o primeiro item
      const alert = Array.isArray(item.ai_alerts) 
        ? item.ai_alerts[0] 
        : item.ai_alerts;
      
      return {
        ...item,
        ai_alerts: alert || null
      };
    });

    return NextResponse.json({
      history: normalizedHistory,
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Erro no histórico:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
