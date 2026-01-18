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

    // Query base
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
        created_at,
        user:users(id, full_name, email, avatar_url)
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
      console.error('Erro ao buscar logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
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
    const { data: memberships } = await supabase
      .from('user_group_membership')
      .select(`
        user_id,
        user:users(id, email, full_name)
      `)
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    const users = memberships?.map((m: any) => m.user).filter(Boolean) || [];

    return NextResponse.json({
      logs: logs || [],
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
