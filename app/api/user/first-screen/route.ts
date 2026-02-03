import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar primeira tela do usuário baseada na ordem personalizada
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    console.log('[first-screen] ========== INÍCIO ==========');
    console.log('[first-screen] userId:', user.id);
    console.log('[first-screen] groupId recebido:', groupId);

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar telas do grupo que o usuário tem acesso
    const { data: allScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, title, icon, is_active, is_first, company_group_id')
      .eq('company_group_id', groupId)
      .eq('is_active', true);

    if (!allScreens || allScreens.length === 0) {
      return NextResponse.json({ firstScreen: null });
    }

    // Buscar telas específicas do usuário (powerbi_screen_users)
    const { data: userScreens } = await supabase
      .from('powerbi_screen_users')
      .select('screen_id')
      .eq('user_id', user.id);

    const userScreenIds = userScreens?.map(us => us.screen_id) || [];

    // Verificar se o usuário tem membership no grupo
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('id')
      .eq('user_id', user.id)
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .maybeSingle();

    if (!membership) {
      console.warn('[first-screen] Usuário sem membership no grupo:', {
        userId: user.id,
        groupId
      });
      return NextResponse.json({ firstScreen: null });
    }

    // Buscar ordem salva do usuário PRIMEIRO
    const { data: savedOrder, error: savedOrderError } = await supabase
      .from('user_screen_order')
      .select('screen_id, display_order')
      .eq('user_id', user.id)
      .eq('company_group_id', groupId)
      .order('display_order');

    if (savedOrderError) {
      console.error('[first-screen] ERRO ao buscar ordem:', savedOrderError);
    }

    console.log('[first-screen] Ordem salva:', {
      userId: user.id,
      groupId,
      savedOrderCount: savedOrder?.length || 0,
      savedOrder: savedOrder,
      primeiroScreenId: savedOrder?.[0]?.screen_id
    });
    
    // DEBUG: Verificar se a tela específica está nas telas do grupo
    const telaEsperada = '3946f83e-8402-4ef1-a768-3c935a6cabef';
    const telaEsperadaNasOrdem = savedOrder?.find(o => o.screen_id === telaEsperada);
    const telaEsperadaNasTelas = allScreens.find(s => s.id === telaEsperada);
    console.log('[first-screen] DEBUG tela esperada:', {
      telaEsperada,
      estaNaOrdem: !!telaEsperadaNasOrdem,
      estaNasTelas: !!telaEsperadaNasTelas,
      detalheTela: telaEsperadaNasTelas
    });

    // Filtrar telas que o usuário tem acesso
    // Se não tem telas específicas, tem acesso a todas (tela pública)
    let accessibleScreens = allScreens;
    if (userScreenIds.length > 0) {
      accessibleScreens = allScreens.filter(s => userScreenIds.includes(s.id));
    }
    
    console.log('[first-screen] Telas acessíveis:', {
      userId: user.id,
      groupId,
      totalScreens: allScreens.length,
      userSpecificScreens: userScreenIds.length,
      accessibleScreens: accessibleScreens.length,
      accessibleScreenIds: accessibleScreens.map(s => s.id)
    });

    // Se tem ordem personalizada, usar ela
    if (savedOrder && savedOrder.length > 0) {
      const orderMap = new Map(savedOrder.map(o => [o.screen_id, o.display_order]));
      
      // Buscar a primeira tela da ordem que está acessível
      const orderedScreenIds = savedOrder
        .sort((a, b) => a.display_order - b.display_order)
        .map(o => o.screen_id);
      
      console.log('[first-screen] Ordem de telas:', orderedScreenIds);
      
      // Encontrar a primeira tela da ordem que está acessível
      for (const screenId of orderedScreenIds) {
        // Verificar se a tela está nas telas acessíveis
        let screen = accessibleScreens.find(s => s.id === screenId);
        
        // Se não está nas acessíveis, verificar se está nas telas do grupo
        // IMPORTANTE: Se a tela está na ordem personalizada, ela DEVE ser acessível
        // mesmo que não esteja nas telas específicas, desde que esteja nas telas do grupo
        if (!screen) {
          screen = allScreens.find(s => s.id === screenId);
          if (screen) {
            // Se a tela está na ordem personalizada e nas telas do grupo, ela é acessível
            // Mesmo que o usuário tenha telas específicas, a ordem personalizada tem prioridade
            console.log('[first-screen] Tela da ordem encontrada nas telas do grupo (prioridade da ordem):', {
              screenId,
              title: screen.title,
              hasSpecificScreens: userScreenIds.length > 0,
              isInSpecificScreens: userScreenIds.includes(screenId)
            });
          } else {
            console.warn('[first-screen] Tela da ordem não encontrada nas telas do grupo:', screenId);
            continue;
          }
        }
        
        if (screen) {
          console.log('[first-screen] ✅ Primeira tela da ordem encontrada:', {
            id: screen.id,
            title: screen.title,
            display_order: orderMap.get(screen.id)
          });
          return NextResponse.json({ firstScreen: { id: screen.id, title: screen.title } });
        }
      }
      
      // Se nenhuma tela da ordem está acessível, continuar para fallback
      console.warn('[first-screen] ⚠️ Nenhuma tela da ordem está acessível, usando fallback');
    }

    if (accessibleScreens.length === 0) {
      return NextResponse.json({ firstScreen: null });
    }

    // Se não tem ordem personalizada, usar ordem padrão (is_first ou título)
    const defaultOrderedScreens = accessibleScreens.sort((a, b) => {
      if (a.is_first && !b.is_first) return -1;
      if (!a.is_first && b.is_first) return 1;
      return a.title.localeCompare(b.title);
    });

    const firstScreen = defaultOrderedScreens[0];
    return NextResponse.json({ firstScreen: { id: firstScreen.id, title: firstScreen.title } });
  } catch (error: any) {
    console.error('Erro ao buscar primeira tela:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
