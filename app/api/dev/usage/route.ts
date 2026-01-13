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
      return NextResponse.json({ usage: [] });
    }

    // Construir query
    let query = supabase
      .from('daily_usage')
      .select('*')
      .in('company_group_id', groupIds);

    // Filtrar por grupo especifico
    if (groupId && groupId !== 'all') {
      query = query.eq('company_group_id', groupId);
    }

    // Filtrar por periodo
    if (startDate) {
      query = query.gte('usage_date', startDate);
    }
    if (endDate) {
      query = query.lte('usage_date', endDate);
    }

    // Ordenar por data
    query = query.order('usage_date', { ascending: true });

    const { data: usage, error } = await query;

    if (error) {
      console.error('Erro ao buscar uso:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Adicionar nome do grupo aos dados
    const usageWithNames = (usage || []).map(item => ({
      ...item,
      group_name: groupNames[item.company_group_id] || 'Desconhecido'
    }));

    return NextResponse.json({ usage: usageWithNames });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
