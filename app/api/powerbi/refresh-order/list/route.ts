import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar todas as ordens de atualização
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Buscar ordens sem JOIN primeiro
    const { data: orders, error } = await supabase
      .from('powerbi_refresh_order')
      .select('*')
      .order('created_at', { ascending: false });

    // Se a tabela não existir ainda, retorna array vazio
    if (error) {
      console.error('Erro ao buscar ordens:', error);
      console.error('Código do erro:', error.code);
      console.error('Detalhes:', error.details);
      if (error.code === '42P01') {
        // Tabela não existe
        return NextResponse.json({ orders: [] });
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // Buscar nomes dos grupos separadamente
    if (orders && orders.length > 0) {
      const groupIds = orders.map(o => o.company_group_id);
      const { data: groups } = await supabase
        .from('company_groups')
        .select('id, name')
        .in('id', groupIds);

      // Adicionar nome do grupo a cada ordem
      const ordersWithGroups = orders.map(order => ({
        ...order,
        company_group: groups?.find(g => g.id === order.company_group_id) || null
      }));

      return NextResponse.json({ orders: ordersWithGroups });
    }

    return NextResponse.json({ orders: orders || [] });

  } catch (error: any) {
    console.error('Erro ao listar ordens:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

