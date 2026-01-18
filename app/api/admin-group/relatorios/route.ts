import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Relatórios de acessos e logs do grupo
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar usuários do grupo com último login
    const { data: memberships } = await supabase
      .from('user_group_membership')
      .select(`
        user_id,
        role,
        is_active,
        created_at,
        user:users(id, email, full_name, last_login_at)
      `)
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false });

    // Buscar logs de atividade dos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: activityLogs } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('company_group_id', groupId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    // Buscar uso diário dos últimos 30 dias
    const { data: dailyUsage } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('company_group_id', groupId)
      .gte('usage_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('usage_date', { ascending: false });

    // Estatísticas de acesso
    const usersWithAccess = memberships?.map((m: any) => ({
      id: m.user?.id,
      email: m.user?.email,
      full_name: m.user?.full_name,
      role: m.role,
      is_active: m.is_active,
      last_login_at: m.user?.last_login_at,
      member_since: m.created_at
    })) || [];

    return NextResponse.json({
      users: usersWithAccess,
      activity_logs: activityLogs || [],
      daily_usage: dailyUsage || [],
      stats: {
        total_users: usersWithAccess.length,
        active_users: usersWithAccess.filter((u: any) => u.is_active).length,
        users_logged_today: usersWithAccess.filter((u: any) => {
          if (!u.last_login_at) return false;
          const loginDate = new Date(u.last_login_at);
          const today = new Date();
          return loginDate.toDateString() === today.toDateString();
        }).length
      }
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
