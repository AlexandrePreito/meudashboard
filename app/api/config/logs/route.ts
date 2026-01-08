import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar logs
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const userId = searchParams.get('user_id');
    const module = searchParams.get('module');
    const actionType = searchParams.get('action_type');
    const dateFrom = searchParams.get('date_from');
    const dateTo = searchParams.get('date_to');

    const supabase = createAdminClient();
    const offset = (page - 1) * limit;

    // Buscar grupo do usuário
    let companyGroupId: string | null = null;
    
    if (!user.is_master) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      companyGroupId = membership?.company_group_id || null;
    }

    // Query base
    let query = supabase
      .from('activity_logs')
      .select(`
        id,
        action_type,
        module,
        description,
        entity_type,
        entity_id,
        metadata,
        ip_address,
        created_at,
        user:users(id, full_name, email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filtros
    if (!user.is_master && companyGroupId) {
      query = query.eq('company_group_id', companyGroupId);
    }
    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (module) {
      query = query.eq('module', module);
    }
    if (actionType) {
      query = query.eq('action_type', actionType);
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

    return NextResponse.json({ 
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar log (usado internamente)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, company_group_id, action_type, module, description, entity_type, entity_id, metadata, ip_address, user_agent } = body;

    if (!action_type || !module) {
      return NextResponse.json({ error: 'action_type e module são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id,
        company_group_id,
        action_type,
        module,
        description,
        entity_type,
        entity_id,
        metadata: metadata || {},
        ip_address,
        user_agent
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar log:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ log: data });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
