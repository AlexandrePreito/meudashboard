import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Buscar logs de atividade do grupo
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const userId = searchParams.get('user_id');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const offset = (page - 1) * limit;

    // Query base - buscar logs sem relacionamento primeiro
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        user_id,
        action_type,
        module,
        description,
        entity_type,
        entity_id,
        metadata,
        ip_address,
        created_at
      `, { count: 'exact' })
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }

    if (dateTo) {
      query = query.lte('created_at', dateTo + 'T23:59:59');
    }

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('❌ Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('📊 Logs encontrados:', count || 0);

    // Enriquecer logs com dados dos usuários
    let enrichedLogs: any[] = [];
    if (logs && logs.length > 0) {
      const userIds = [...new Set(logs.map(log => log.user_id).filter(Boolean))];
      
      // Buscar dados dos usuários
      let usersMap = new Map();
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, email, full_name, avatar_url')
          .in('id', userIds);

        if (usersData) {
          usersData.forEach(u => usersMap.set(u.id, u));
        }

        // Buscar usuários faltantes no Auth
        const foundUserIds = new Set(usersData?.map(u => u.id) || []);
        const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

        for (const userId of missingUserIds) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            if (authUser?.user) {
              const u = authUser.user;
              const userData = {
                id: u.id,
                email: u.email || '',
                full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
                avatar_url: u.user_metadata?.avatar_url || null
              };
              usersMap.set(userId, userData);
            }
          } catch (err) {
            console.error(`❌ Erro ao buscar usuário ${userId}:`, err);
          }
        }
      }

      // Enriquecer logs com dados dos usuários
      enrichedLogs = logs.map(log => ({
        ...log,
        user: usersMap.get(log.user_id) || null
      }));
    }

    // Buscar resumo de uso por usuário (para tempo de sessão)
    let usageQuery = supabase
      .from('user_usage_summary')
      .select('*')
      .eq('company_group_id', groupId);

    if (userId) {
      usageQuery = usageQuery.eq('user_id', userId);
    }

    if (dateFrom) {
      usageQuery = usageQuery.gte('usage_date', dateFrom);
    }

    if (dateTo) {
      usageQuery = usageQuery.lte('usage_date', dateTo);
    }

    const { data: usageSummary } = await usageQuery;

    // Buscar usuários do grupo para o filtro
    // Primeiro buscar os memberships
    const { data: memberships, error: membershipError } = await supabase
      .from('user_group_membership')
      .select('user_id')
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    console.log('👥 Memberships encontrados:', memberships?.length || 0);

    if (membershipError) {
      console.error('❌ Erro ao buscar memberships:', membershipError);
    }

    // Buscar dados dos usuários
    let users: any[] = [];
    if (memberships && memberships.length > 0) {
      const userIds = memberships.map(m => m.user_id);
      
      // Buscar dados dos usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);

      if (usersError) {
        console.error('❌ Erro ao buscar usuários:', usersError);
      } else {
        users = usersData || [];
        console.log('✅ Usuários carregados:', users.length);
      }

      // Se algum usuário não foi encontrado na tabela users, buscar do Auth
      const foundUserIds = new Set(users.map(u => u.id));
      const missingUserIds = userIds.filter(id => !foundUserIds.has(id));

      if (missingUserIds.length > 0) {
        console.log('🔍 Buscando usuários faltantes no Auth:', missingUserIds.length);
        for (const userId of missingUserIds) {
          try {
            const { data: authUser } = await supabase.auth.admin.getUserById(userId);
            if (authUser?.user) {
              const u = authUser.user;
              users.push({
                id: u.id,
                email: u.email || '',
                full_name: u.user_metadata?.full_name || u.user_metadata?.name || '',
                avatar_url: u.user_metadata?.avatar_url || null
              });
            }
          } catch (err) {
            console.error(`❌ Erro ao buscar usuário ${userId}:`, err);
          }
        }
      }
    }

    return NextResponse.json({
      logs: enrichedLogs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      usage_summary: usageSummary || [],
      users
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
