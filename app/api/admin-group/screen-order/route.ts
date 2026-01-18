import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { isUserAdminOfGroup } from '@/lib/admin-helpers';

// GET - Buscar telas e ordem de um usuário
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const groupId = searchParams.get('group_id');

    if (!userId || !groupId) {
      return NextResponse.json({ error: 'user_id e group_id são obrigatórios' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, groupId);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Buscar telas do grupo que o usuário tem acesso
    const { data: allScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, icon, is_active')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .order('title');

    // Buscar telas específicas do usuário (powerbi_screen_users)
    const { data: userScreens } = await supabase
      .from('powerbi_screen_users')
      .select('screen_id')
      .eq('user_id', userId);

    const userScreenIds = userScreens?.map(us => us.screen_id) || [];

    // Buscar ordem salva do usuário
    const { data: savedOrder } = await supabase
      .from('user_screen_order')
      .select('screen_id, display_order')
      .eq('user_id', userId)
      .eq('company_group_id', groupId)
      .order('display_order');

    const orderMap = new Map(savedOrder?.map(o => [o.screen_id, o.display_order]) || []);

    // Filtrar telas que o usuário tem acesso
    let accessibleScreens = allScreens || [];
    if (userScreenIds.length > 0) {
      accessibleScreens = allScreens?.filter(s => userScreenIds.includes(s.id)) || [];
    }

    // Ordenar
    const screens = accessibleScreens.map(screen => ({
      ...screen,
      display_order: orderMap.get(screen.id) ?? 999
    })).sort((a, b) => a.display_order - b.display_order);

    return NextResponse.json({ screens });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Salvar ordem das telas
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { user_id, group_id, screen_order } = body;

    if (!user_id || !group_id || !screen_order) {
      return NextResponse.json({ error: 'user_id, group_id e screen_order são obrigatórios' }, { status: 400 });
    }

    // Verificar se é master ou admin do grupo
    const isAdmin = user.is_master || await isUserAdminOfGroup(user.id, group_id);
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Deletar ordem antiga
    await supabase
      .from('user_screen_order')
      .delete()
      .eq('user_id', user_id)
      .eq('company_group_id', group_id);

    // Inserir nova ordem
    const inserts = screen_order.map((screen_id: string, index: number) => ({
      user_id,
      screen_id,
      company_group_id: group_id,
      display_order: index
    }));

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('user_screen_order')
        .insert(inserts);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
