import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Voce nao e um desenvolvedor' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Buscar grupos do desenvolvedor
    const { data: devGroups } = await supabase
      .from('company_groups')
      .select('id, name')
      .eq('developer_id', developerId);

    const groupIds = devGroups?.map(g => g.id) || [];
    const groupNames = devGroups?.reduce((acc, g) => {
      acc[g.id] = g.name;
      return acc;
    }, {} as Record<string, string>) || {};

    if (groupIds.length === 0) {
      return NextResponse.json({ 
        accessByDay: [],
        userSessions: [],
        accessByGroup: []
      });
    }

    // Filtrar por grupo especifico ou todos os grupos do dev
    const targetGroupIds = (groupId && groupId !== 'all') ? [groupId] : groupIds;

    // Construir query base
    let query = supabase
      .from('activity_logs')
      .select('id, user_id, company_group_id, action_type, module, description, entity_type, metadata, created_at')
      .in('company_group_id', targetGroupIds);

    // Filtrar por periodo
    if (startDate) {
      query = query.gte('created_at', `${startDate}T00:00:00`);
    }
    if (endDate) {
      query = query.lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: logs, error } = await query;

    if (error) {
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar nomes dos usuarios
    const userIds = [...new Set((logs || []).map(l => l.user_id).filter(Boolean))];
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', userIds);

    const userNames = users?.reduce((acc, u) => {
      acc[u.id] = u.full_name || u.email || 'Usuario';
      return acc;
    }, {} as Record<string, string>) || {};

    // Agrupar por dia
    const byDay: Record<string, number> = {};
    (logs || []).forEach(log => {
      const day = log.created_at.split('T')[0];
      byDay[day] = (byDay[day] || 0) + 1;
    });

    const accessByDay = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    // Criar lista de sessões de usuários (ordenada por data)
    const userSessions = (logs || [])
      .filter(log => log.user_id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(log => ({
        id: log.id,
        userId: log.user_id,
        userName: userNames[log.user_id] || 'Usuário',
        accessDate: log.created_at,
        module: log.module || 'dashboard',
        actionType: log.action_type || 'page_view',
        description: log.description || null,
        entityType: log.entity_type || null,
        metadata: log.metadata || {}
      }));

    // Agrupar por grupo com última data
    const byGroup: Record<string, { count: number; lastAccess: string }> = {};
    (logs || []).forEach(log => {
      if (log.company_group_id) {
        if (!byGroup[log.company_group_id]) {
          byGroup[log.company_group_id] = { count: 0, lastAccess: log.created_at };
        }
        byGroup[log.company_group_id].count++;
        // Manter a data mais recente
        if (log.created_at > byGroup[log.company_group_id].lastAccess) {
          byGroup[log.company_group_id].lastAccess = log.created_at;
        }
      }
    });

    const accessByGroup = Object.entries(byGroup)
      .map(([groupId, data]) => ({
        groupId,
        groupName: groupNames[groupId] || 'Grupo',
        count: data.count,
        lastAccess: data.lastAccess
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      accessByDay,
      userSessions,
      accessByGroup,
      totalAccess: logs?.length || 0
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
