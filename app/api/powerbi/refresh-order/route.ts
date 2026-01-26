import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// Função auxiliar para verificar permissão no grupo
async function checkGroupPermission(supabase: any, user: any, groupId: string): Promise<boolean> {
  // Master tem acesso total
  if (user.is_master) return true;
  
  // Developer pode acessar grupos que criou
  const developerId = await getUserDeveloperId(user.id);
  if (developerId) {
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();
    return !!group;
  }
  
  // Admin/User pode acessar via membership
  const { data: membership } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .single();
  
  return !!membership;
}

// GET - Buscar ordem de atualização de um grupo
export async function GET(request: Request) {
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

    const supabase = createAdminClient();

    // Verificar permissão no grupo
    const hasPermission = await checkGroupPermission(supabase, user, groupId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para acessar este grupo' }, { status: 403 });
    }

    // Buscar ordem configurada
    const { data: refreshOrder, error: orderError } = await supabase
      .from('powerbi_refresh_order')
      .select('*')
      .eq('company_group_id', groupId)
      .single();

    if (orderError && orderError.code !== 'PGRST116') {
      throw orderError;
    }

    // Se houver ordem configurada, retornar
    if (refreshOrder && refreshOrder.items && refreshOrder.items.length > 0) {
      return NextResponse.json({
        items: refreshOrder.items
      });
    }

    // Se não houver ordem configurada, buscar dataflows e datasets do grupo
    
    // 1. Buscar conexões do grupo
    const { data: connections, error: connError } = await supabase
      .from('powerbi_connections')
      .select('id')
      .eq('company_group_id', groupId);

    if (connError) throw connError;

    const connectionIds = connections?.map(c => c.id) || [];
    
    console.log('[DEBUG /api/powerbi/refresh-order] Conexões encontradas:', {
      groupId,
      totalConnections: connections?.length || 0,
      connectionIds
    });

    // 2. Buscar dataflows das conexões do grupo
    let dataflows: any[] = [];
    if (connectionIds.length > 0) {
      const { data: df, error: dfError } = await supabase
        .from('powerbi_dataflows')
        .select('id, name, dataflow_id, connection_id, refresh_order')
        .in('connection_id', connectionIds)
        .eq('is_active', true)
        .order('refresh_order', { ascending: true });

      if (dfError) {
        console.error('[ERROR /api/powerbi/refresh-order] Erro ao buscar dataflows:', dfError);
        throw dfError;
      }
      
      dataflows = df || [];
      console.log('[DEBUG /api/powerbi/refresh-order] Dataflows encontrados:', {
        total: dataflows.length,
        dataflows: dataflows.map((d: any) => ({
          id: d.id,
          name: d.name,
          connection_id: d.connection_id
        }))
      });
    } else {
      console.log('[DEBUG /api/powerbi/refresh-order] Nenhuma conexão encontrada para o grupo');
    }

    // 3. Buscar datasets/reports do grupo
    // Filtrar datasets pelas conexões do grupo (mais eficiente)
    let datasetsQuery = supabase
      .from('powerbi_reports')
      .select(`
        id,
        name,
        dataset_id,
        connection_id,
        powerbi_dashboard_screens (
          company_group_id
        )
      `)
      .not('dataset_id', 'is', null);

    // Filtrar por conexões do grupo se houver conexões
    if (connectionIds.length > 0) {
      datasetsQuery = datasetsQuery.in('connection_id', connectionIds);
    }

    const { data: datasets, error: datasetsError } = await datasetsQuery;

    if (datasetsError) {
      console.error('[ERROR /api/powerbi/refresh-order] Erro ao buscar datasets:', datasetsError);
      throw datasetsError;
    }

    // Filtrar datasets por grupo e remover duplicatas
    const uniqueDatasets = datasets
      ?.filter((d: any) => {
        // Verificar se tem tela do grupo OU se a conexão pertence ao grupo
        const hasScreenFromGroup = d.powerbi_dashboard_screens?.some((s: any) => s.company_group_id === groupId);
        const connectionBelongsToGroup = connectionIds.includes(d.connection_id);
        return hasScreenFromGroup || connectionBelongsToGroup;
      })
      .reduce((acc: any[], current: any) => {
        const exists = acc.find(item => item.dataset_id === current.dataset_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []) || [];

    console.log('[DEBUG /api/powerbi/refresh-order] Datasets encontrados:', {
      total: uniqueDatasets.length,
      datasets: uniqueDatasets.map((d: any) => ({
        id: d.id,
        name: d.name,
        dataset_id: d.dataset_id
      }))
    });

    // 4. Montar lista combinada: dataflows primeiro, depois datasets
    const items: any[] = [];
    
    // Adicionar dataflows
    dataflows.forEach((df, index) => {
      items.push({
        id: df.id,
        name: df.name,
        type: 'dataflow',
        dataflow_id: df.dataflow_id,
        connection_id: df.connection_id,
        order: index + 1
      });
    });

    // Adicionar datasets
    uniqueDatasets.forEach((ds, index) => {
      items.push({
        id: ds.id,
        name: ds.name,
        type: 'dataset',
        dataset_id: ds.dataset_id,
        connection_id: ds.connection_id,
        order: dataflows.length + index + 1
      });
    });

    console.log('[DEBUG /api/powerbi/refresh-order] Items finais:', {
      total: items.length,
      dataflows: items.filter(i => i.type === 'dataflow').length,
      datasets: items.filter(i => i.type === 'dataset').length,
      items: items.map(i => ({ type: i.type, name: i.name }))
    });

    return NextResponse.json({ items });

  } catch (error: any) {
    console.error('Erro ao buscar ordem:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Salvar ordem de atualização
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { company_group_id, items } = body;

    if (!company_group_id) {
      return NextResponse.json({ error: 'company_group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão no grupo
    const hasPermission = await checkGroupPermission(supabase, user, company_group_id);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para acessar este grupo' }, { status: 403 });
    }

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items deve ser um array' }, { status: 400 });
    }

    // Verificar se já existe uma configuração
    const { data: existing } = await supabase
      .from('powerbi_refresh_order')
      .select('id')
      .eq('company_group_id', company_group_id)
      .single();

    if (existing) {
      // Atualizar
      const { error } = await supabase
        .from('powerbi_refresh_order')
        .update({
          items,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      // Criar
      const { error } = await supabase
        .from('powerbi_refresh_order')
        .insert({
          company_group_id,
          items
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao salvar ordem:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
