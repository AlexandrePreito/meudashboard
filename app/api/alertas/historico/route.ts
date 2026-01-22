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

    // Buscar histórico com join em ai_alerts para pegar o company_group_id
    let query = supabase
      .from('ai_alert_history')
      .select(`
        *,
        ai_alerts!inner (
          name,
          description,
          company_group_id
        )
      `)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (alertId) {
      query = query.eq('alert_id', alertId);
    }

    // Filtrar por grupo
    if (groupId) {
      const groupIdStr = String(groupId);
      query = query.eq('ai_alerts.company_group_id', groupIdStr);
      console.log('[DEBUG /api/alertas/historico] Filtrando por group_id:', groupIdStr);
    } else if (!user.is_master) {
      // Filtrar por grupos do usuário (se não for master)
      query = query.in('ai_alerts.company_group_id', userGroupIds);
      console.log('[DEBUG /api/alertas/historico] Filtrando por userGroupIds:', userGroupIds);
    }

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
      userGroupIds: userGroupIds.length > 0 ? userGroupIds : 'N/A (master)'
    });

    // Contar total com os mesmos filtros
    let countQuery = supabase
      .from('ai_alert_history')
      .select('*, ai_alerts!inner(company_group_id)', { count: 'exact', head: true });

    if (alertId) {
      countQuery = countQuery.eq('alert_id', alertId);
    }

    if (groupId) {
      const groupIdStr = String(groupId);
      countQuery = countQuery.eq('ai_alerts.company_group_id', groupIdStr);
    } else if (!user.is_master) {
      countQuery = countQuery.in('ai_alerts.company_group_id', userGroupIds);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      history: history || [],
      total: count || 0,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('Erro no histórico:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
