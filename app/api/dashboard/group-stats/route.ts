import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    if (!groupId) {
      return NextResponse.json({ error: 'group_id obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: group } = await supabase
      .from('company_groups')
      .select('id, name')
      .eq('id', groupId)
      .eq('status', 'active')
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: devGroup } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', groupId)
          .eq('developer_id', developerId)
          .single();
        if (!devGroup) {
          const { data: membership } = await supabase
            .from('user_group_membership')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_group_id', groupId)
            .eq('is_active', true)
            .maybeSingle();
          if (!membership) {
            return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
          }
        }
      } else {
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_group_id', groupId)
          .eq('is_active', true)
          .maybeSingle();
        if (!membership) {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }
    }

    const { count: usersCount } = await supabase
      .from('user_group_membership')
      .select('id', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    const { count: screensCount } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id', { count: 'exact', head: true })
      .eq('company_group_id', groupId);

    const { data: connections } = await supabase
      .from('powerbi_connections')
      .select('id')
      .eq('company_group_id', groupId);
    const connectionIds = connections?.map((c) => c.id) || [];
    let reportsCount = 0;
    if (connectionIds.length > 0) {
      const { count } = await supabase
        .from('powerbi_reports')
        .select('id', { count: 'exact', head: true })
        .in('connection_id', connectionIds);
      reportsCount = count || 0;
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
      },
      stats: {
        users: usersCount || 0,
        screens: screensCount || 0,
        reports: reportsCount,
      },
    });
  } catch (error) {
    console.error('Erro group-stats:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
