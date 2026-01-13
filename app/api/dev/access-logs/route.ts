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
        accessByUser: [],
        accessByGroup: []
      });
    }

    // Filtrar por grupo especifico ou todos os grupos do dev
    const targetGroupIds = (groupId && groupId !== 'all') ? [groupId] : groupIds;

    // Construir query base
    let query = supabase
      .from('activity_logs')
      .select('id, user_id, company_group_id, action_type, created_at')
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

    // Agrupar por usuario
    const byUser: Record<string, number> = {};
    (logs || []).forEach(log => {
      if (log.user_id) {
        byUser[log.user_id] = (byUser[log.user_id] || 0) + 1;
      }
    });

    const accessByUser = Object.entries(byUser)
      .map(([userId, count]) => ({
        userId,
        userName: userNames[userId] || 'Usuario',
        count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // Agrupar por grupo
    const byGroup: Record<string, number> = {};
    (logs || []).forEach(log => {
      if (log.company_group_id) {
        byGroup[log.company_group_id] = (byGroup[log.company_group_id] || 0) + 1;
      }
    });

    const accessByGroup = Object.entries(byGroup)
      .map(([groupId, count]) => ({
        groupId,
        groupName: groupNames[groupId] || 'Grupo',
        count
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      accessByDay,
      accessByUser,
      accessByGroup,
      totalAccess: logs?.length || 0
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
