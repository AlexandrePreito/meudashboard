import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const screenId = searchParams.get('screen_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Se tem screen_id, retornar config de PÁGINAS daquele relatório (modo apresentação por páginas)
    if (screenId) {
      const { data: config } = await supabase
        .from('user_screen_presentation')
        .select('page_name, is_enabled, display_order, duration_seconds')
        .eq('user_id', user.id)
        .eq('company_group_id', groupId)
        .eq('screen_id_ref', screenId)
        .eq('is_enabled', true)
        .order('display_order');

      return NextResponse.json({
        pages: config || [],
        hasPresentation: (config?.length || 0) > 0,
      });
    }

    // Sem screen_id: modo antigo por telas do sistema
    const { data: config } = await supabase
      .from('user_screen_presentation')
      .select('screen_id, is_enabled, display_order, duration_seconds')
      .eq('user_id', user.id)
      .eq('company_group_id', groupId)
      .not('screen_id', 'is', null)
      .eq('is_enabled', true)
      .order('display_order');

    if (!config || config.length === 0) {
      return NextResponse.json({ screens: [], hasPresentation: false });
    }

    const screenIds = config.map(c => c.screen_id).filter(Boolean);
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, icon')
      .in('id', screenIds)
      .eq('is_active', true);

    const screenMap = new Map(screens?.map(s => [s.id, s]) || []);

    const result = config
      .map(c => {
        if (!c.screen_id) return null;
        const screen = screenMap.get(c.screen_id);
        if (!screen) return null;
        return {
          id: screen.id,
          title: screen.title,
          icon: screen.icon,
          duration_seconds: c.duration_seconds,
          display_order: c.display_order,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.display_order - b.display_order);

    return NextResponse.json({ screens: result, hasPresentation: result.length > 0 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
