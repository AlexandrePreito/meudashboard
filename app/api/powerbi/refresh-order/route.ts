import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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

    // 2. Buscar dataflows das conexões do grupo
    let dataflows: any[] = [];
    if (connectionIds.length > 0) {
      const { data: df, error: dfError } = await supabase
        .from('powerbi_dataflows')
        .select('id, name, dataflow_id, connection_id, refresh_order')
        .in('connection_id', connectionIds)
        .eq('is_active', true)
        .order('refresh_order', { ascending: true });

      if (dfError) throw dfError;
      dataflows = df || [];
    }

    // 3. Buscar datasets/reports do grupo
    const { data: datasets, error: datasetsError } = await supabase
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

    if (datasetsError) throw datasetsError;

    // Filtrar datasets por grupo e remover duplicatas
    const uniqueDatasets = datasets
      ?.filter((d: any) => d.powerbi_dashboard_screens?.some((s: any) => s.company_group_id === groupId))
      .reduce((acc: any[], current: any) => {
        const exists = acc.find(item => item.dataset_id === current.dataset_id);
        if (!exists) {
          acc.push(current);
        }
        return acc;
      }, []) || [];

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

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'items deve ser um array' }, { status: 400 });
    }

    const supabase = createAdminClient();

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
