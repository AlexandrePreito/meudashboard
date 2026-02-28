import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Não é developer' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // 1. Tem grupos?
    const { count: groupCount } = await supabase
      .from('company_groups')
      .select('id', { count: 'exact', head: true })
      .eq('developer_id', developerId)
      .eq('status', 'active');

    const hasGroups = (groupCount || 0) > 0;

    // 2. Tem usuários (membership em grupos do dev, excluindo o próprio dev)?
    let hasUsers = false;
    if (hasGroups) {
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      const groupIds = devGroups?.map((g) => g.id) || [];
      if (groupIds.length > 0) {
        const { count: membershipCount } = await supabase
          .from('user_group_membership')
          .select('id', { count: 'exact', head: true })
          .in('company_group_id', groupIds)
          .eq('is_active', true)
          .neq('user_id', user.id);
        hasUsers = (membershipCount || 0) > 0;
      }
    }

    // 3. Tem conexões Power BI?
    let hasConnections = false;
    if (hasGroups) {
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      const groupIds = devGroups?.map((g) => g.id) || [];
      if (groupIds.length > 0) {
        const { count: connectionCount } = await supabase
          .from('powerbi_connections')
          .select('id', { count: 'exact', head: true })
          .in('company_group_id', groupIds);
        hasConnections = (connectionCount || 0) > 0;
      }
    }

    // 4. Tem relatórios?
    let hasReports = false;
    if (hasConnections) {
      const { data: devGroupsForReports } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      const groupIdsForReports = devGroupsForReports?.map((g) => g.id) || [];
      if (groupIdsForReports.length > 0) {
        const { data: connections } = await supabase
          .from('powerbi_connections')
          .select('id')
          .in('company_group_id', groupIdsForReports);
        const connectionIds = connections?.map((c) => c.id) || [];
        if (connectionIds.length > 0) {
          const { count: reportCount } = await supabase
            .from('powerbi_reports')
            .select('id', { count: 'exact', head: true })
            .in('connection_id', connectionIds);
          hasReports = (reportCount || 0) > 0;
        }
      }
    }

    // 5. Tem telas?
    let hasScreens = false;
    if (hasGroups) {
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      const groupIds = devGroups?.map((g) => g.id) || [];
      if (groupIds.length > 0) {
        const { count: screenCount } = await supabase
          .from('powerbi_dashboard_screens')
          .select('id', { count: 'exact', head: true })
          .in('company_group_id', groupIds);
        hasScreens = (screenCount || 0) > 0;
      }
    }

    // 6. Tem permissões de tela (powerbi_screen_users)?
    let hasPermissions = false;
    if (hasScreens) {
      const { data: devGroups } = await supabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active');
      const groupIds = devGroups?.map((g) => g.id) || [];
      if (groupIds.length > 0) {
        const { data: screens } = await supabase
          .from('powerbi_dashboard_screens')
          .select('id')
          .in('company_group_id', groupIds);
        const screenIds = screens?.map((s) => s.id) || [];
        if (screenIds.length > 0) {
          const { count: permissionCount } = await supabase
            .from('powerbi_screen_users')
            .select('id', { count: 'exact', head: true })
            .in('screen_id', screenIds);
          hasPermissions = (permissionCount || 0) > 0;
        }
      }
    }

    const progress = {
      has_groups: hasGroups,
      has_users: hasUsers,
      has_connections: hasConnections,
      has_reports: hasReports,
      has_screens: hasScreens,
      has_permissions: hasPermissions,
    };

    return NextResponse.json({ progress });
  } catch (error) {
    console.error('Erro ao carregar progresso:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
