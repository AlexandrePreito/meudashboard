/**
 * API Route - Admin Group Dashboard
 * Dashboard do grupo onde o usuário é admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    const supabase = createAdminClient();

    // Se não passou group_id, retornar lista de grupos onde é admin
    if (!groupId) {
      if (user.is_master) {
        // Master: retornar todos os grupos ativos (não excluídos)
        const { data: allGroups } = await supabase
          .from('company_groups')
          .select('id, name, slug, status, logo_url, primary_color, secondary_color')
          .eq('status', 'active')
          .neq('status', 'deleted')
          .neq('status', 'inactive')
          .order('name');
        
        return NextResponse.json({ groups: allGroups || [] });
      }

      // Buscar grupos onde é admin (apenas ativos)
      const { getUserAdminGroupsWithData } = await import('@/lib/admin-helpers');
      const allAdminGroups = await getUserAdminGroupsWithData(user.id);
      const groups = allAdminGroups.filter((g: any) => 
        g.status === 'active' && 
        g.status !== 'deleted' && 
        g.status !== 'inactive'
      );

      if (groups.length === 0) {
        return NextResponse.json({ error: 'Você não é administrador de nenhum grupo.' }, { status: 403 });
      }

      return NextResponse.json({ groups });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar dados do grupo (supabase já foi criado acima na linha 21)
    const { data: group, error: groupError } = await supabase
      .from('company_groups')
      .select('*')
      .eq('id', groupId)
      .single();

    if (groupError || !group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Buscar usuários do grupo
    const { data: memberships } = await supabase
      .from('user_group_membership')
      .select(`
        id,
        role,
        is_active,
        can_use_ai,
        can_refresh,
        created_at,
        user:users(id, email, full_name, status, last_login_at, avatar_url)
      `)
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false });

    // Buscar telas do grupo
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, name, title, is_active, icon')
      .eq('company_group_id', groupId)
      .order('title');

    // Buscar alertas do grupo
    const { data: alerts } = await supabase
      .from('ai_alerts')
      .select('id, name, is_active, alert_type')
      .eq('company_group_id', groupId)
      .order('name');

    // Buscar uso de hoje
    const today = new Date().toISOString().split('T')[0];
    
    // WhatsApp messages de hoje
    const { count: whatsappToday } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .eq('direction', 'outgoing')
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);
    
    // Refreshes de hoje
    const { count: refreshesToday } = await supabase
      .from('powerbi_daily_refresh_count')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .eq('refresh_date', today);

    // Alertas executados hoje
    const { count: alertsToday } = await supabase
      .from('alert_execution_logs')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .gte('executed_at', `${today}T00:00:00Z`)
      .lt('executed_at', `${today}T23:59:59Z`);

    return NextResponse.json({
      group,
      users: memberships || [],
      screens: screens || [],
      alerts: alerts || [],
      usage_today: {
        whatsapp_messages_sent: whatsappToday || 0,
        refreshes: refreshesToday || 0,
        alerts_executed: alertsToday || 0,
      },
      stats: {
        users_count: memberships?.length || 0,
        screens_count: screens?.length || 0,
        alerts_count: alerts?.length || 0,
      }
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
