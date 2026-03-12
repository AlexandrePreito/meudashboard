import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const groupId = searchParams.get('group_id');
    const screenId = searchParams.get('screen_id');

    if (!userId || !groupId) {
      return NextResponse.json({ error: 'user_id e group_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se o grupo pertence ao desenvolvedor
    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();
    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Se tem screen_id: retornar config de PÁGINAS daquela tela (para o modal de config por páginas)
    if (screenId) {
      const { data: savedConfig } = await supabase
        .from('user_screen_presentation')
        .select('page_name, is_enabled, display_order, duration_seconds')
        .eq('user_id', userId)
        .eq('company_group_id', groupId)
        .eq('screen_id_ref', screenId)
        .order('display_order');

      const pages = (savedConfig || []).map(c => ({
        page_name: c.page_name,
        is_enabled: c.is_enabled,
        display_order: c.display_order,
        duration_seconds: c.duration_seconds,
      }));
      return NextResponse.json({ screens: pages, pages });
    }

    // Sem screen_id: modo por telas do sistema (lista de telas com ordem/duração)
    const { data: allScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, icon, display_order')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .order('display_order')
      .order('title');

    // Buscar telas com acesso do usuário (powerbi_screen_users)
    const { data: userScreens } = await supabase
      .from('powerbi_screen_users')
      .select('screen_id')
      .eq('user_id', userId);
    const accessIds = userScreens?.map(a => a.screen_id) || [];

    // Se tem telas específicas, filtrar; senão todas as telas do grupo são acessíveis
    const accessibleScreens = accessIds.length > 0
      ? (allScreens || []).filter(s => accessIds.includes(s.id))
      : allScreens || [];

    // Buscar configuração de apresentação salva
    const { data: savedConfig } = await supabase
      .from('user_screen_presentation')
      .select('screen_id, is_enabled, display_order, duration_seconds')
      .eq('user_id', userId)
      .eq('company_group_id', groupId)
      .order('display_order');

    const configMap = new Map(savedConfig?.map(c => [c.screen_id, c]) || []);

    // Mesclar: para cada tela acessível, retornar a config salva ou defaults
    const screens = accessibleScreens
      .map((screen, index) => {
        const config = configMap.get(screen.id);
        return {
          id: screen.id,
          title: screen.title,
          icon: screen.icon,
          is_enabled: config?.is_enabled ?? true,
          display_order: config?.display_order ?? index,
          duration_seconds: config?.duration_seconds ?? 10,
        };
      })
      .sort((a, b) => a.display_order - b.display_order);

    return NextResponse.json({ screens });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const { user_id, group_id, screens, pages: pagesPayload, screen_id: screen_id_ref } = body;

    if (!user_id || !group_id) {
      return NextResponse.json({ error: 'user_id e group_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const developerId = await getUserDeveloperId(user.id);
    if (!user.is_master && developerId) {
      const { data: devGroup } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', group_id)
        .eq('developer_id', developerId)
        .maybeSingle();

      if (!devGroup) {
        return NextResponse.json({ error: 'Sem permissão para este grupo' }, { status: 403 });
      }
    }

    // Modo páginas: salvar config por página do relatório (screen_id_ref + page_name)
    if (screen_id_ref && pagesPayload && Array.isArray(pagesPayload)) {
      await supabase
        .from('user_screen_presentation')
        .delete()
        .eq('user_id', user_id)
        .eq('company_group_id', group_id)
        .eq('screen_id_ref', screen_id_ref);

      const inserts = pagesPayload.map((p: any, index: number) => ({
        user_id,
        company_group_id: group_id,
        screen_id_ref,
        page_name: p.page_name,
        is_enabled: p.is_enabled ?? true,
        display_order: p.display_order ?? index,
        duration_seconds: Math.max(5, Math.min(120, p.duration_seconds || 10)),
      }));

      if (inserts.length > 0) {
        const { error } = await supabase
          .from('user_screen_presentation')
          .insert(inserts);
        if (error) throw error;
      }
      return NextResponse.json({ success: true });
    }

    // Modo telas do sistema (comportamento original)
    if (!screens) {
      return NextResponse.json({ error: 'screens ou pages+screen_id obrigatórios' }, { status: 400 });
    }

    await supabase
      .from('user_screen_presentation')
      .delete()
      .eq('user_id', user_id)
      .eq('company_group_id', group_id)
      .not('screen_id', 'is', null);

    const inserts = (screens as any[]).map((s: any, index: number) => ({
      user_id,
      screen_id: s.screen_id,
      company_group_id: group_id,
      is_enabled: s.is_enabled ?? true,
      display_order: s.display_order ?? index,
      duration_seconds: Math.max(5, Math.min(120, s.duration_seconds || 10)),
    }));

    if (inserts.length > 0) {
      const { error } = await supabase
        .from('user_screen_presentation')
        .insert(inserts);

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
