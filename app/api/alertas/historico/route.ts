import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      userGroupIds = memberships?.map(m => m.company_group_id) || [];

      if (userGroupIds.length === 0) {
        return NextResponse.json({
          history: [],
          total: 0,
          limit,
          offset
        });
      }

      // SEGURANCA: Se passou group_id, validar acesso
      if (groupId && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
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
      query = query.eq('ai_alerts.company_group_id', groupId);
    } else if (!user.is_master) {
      // Filtrar por grupos do usuário (se não for master)
      query = query.in('ai_alerts.company_group_id', userGroupIds);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Contar total com os mesmos filtros
    let countQuery = supabase
      .from('ai_alert_history')
      .select('*, ai_alerts!inner(company_group_id)', { count: 'exact', head: true });

    if (alertId) {
      countQuery = countQuery.eq('alert_id', alertId);
    }

    if (groupId) {
      countQuery = countQuery.eq('ai_alerts.company_group_id', groupId);
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
