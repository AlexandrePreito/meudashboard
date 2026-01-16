import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Listar telas
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const onlyMine = searchParams.get('only_mine') === 'true';

    const supabase = createAdminClient();

    // Buscar grupos que o usuario tem acesso
    let userGroupIds: string[] = [];
    
    if (user.is_master) {
      // Master ve tudo - se passou groupId, usa ele
      if (groupId) {
        userGroupIds = [groupId];
      }
      // Se nao passou, busca todos
    } else {
      const developerId = await getUserDeveloperId(user.id);

      if (developerId) {
        // Desenvolvedor: buscar grupos pelo developer_id
        const { data: devGroups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', developerId)
          .eq('status', 'active');

        userGroupIds = devGroups?.map(g => g.id) || [];
      } else {
        // Usuario comum: buscar via membership
        const { data: memberships } = await supabase
          .from('user_group_membership')
          .select('company_group_id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        userGroupIds = memberships?.map(m => m.company_group_id) || [];
      }

      if (userGroupIds.length === 0) {
        return NextResponse.json({ screens: [] });
      }

      // SEGURANCA: Se passou groupId, validar que usuario pertence a ele
      if (groupId && !userGroupIds.includes(groupId)) {
        return NextResponse.json({ error: 'Sem permissao para este grupo' }, { status: 403 });
      }

      // Se passou groupId valido, filtra so por ele
      if (groupId) {
        userGroupIds = [groupId];
      }
    }

    // Montar query
    let query = supabase
      .from('powerbi_dashboard_screens')
      .select(`
        *,
        company_group:company_groups(id, name),
        report:powerbi_reports(id, name, report_id, dataset_id, connection:powerbi_connections(*))
      `)
      .order('is_first', { ascending: false })
      .order('display_order')
      .order('title');

    // Filtrar por grupos permitidos (sempre, exceto master sem filtro)
    if (userGroupIds.length > 0) {
      query = query.in('company_group_id', userGroupIds);
    }

    const { data: screens, error } = await query;

    if (error) {
      console.error('Erro ao buscar telas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Se onlyMine, filtra por permissoes especificas do usuario
    if (onlyMine && !user.is_master) {
      // Buscar telas que o usuario tem acesso direto
      const { data: userScreens } = await supabase
        .from('powerbi_screen_users')
        .select('screen_id')
        .eq('user_id', user.id);

      const userScreenIds = userScreens?.map(s => s.screen_id) || [];

      // Buscar quais telas TEM usuarios vinculados (para saber quais sao restritas)
      const { data: screensWithUsers } = await supabase
        .from('powerbi_screen_users')
        .select('screen_id');

      const restrictedScreenIds = [...new Set(screensWithUsers?.map(s => s.screen_id) || [])];

      const filteredScreens = (screens || []).filter(screen => {
        // Se usuario tem acesso direto a tela
        if (userScreenIds.includes(screen.id)) {
          return true;
        }
        // Se a tela NAO tem restricao de usuarios, todos do grupo podem ver
        if (!restrictedScreenIds.includes(screen.id)) {
          return true;
        }
        // Tela tem restricao e usuario nao esta na lista
        return false;
      });

      return NextResponse.json({ screens: filteredScreens });
    }

    return NextResponse.json({ screens: screens || [] });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar tela
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { company_group_id, report_id, title, icon, is_first, user_ids, company_ids } = body;

    if (!company_group_id || !report_id || !title) {
      return NextResponse.json({ error: 'Campos obrigatórios: company_group_id, report_id, title' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão: master pode tudo, dev só seus grupos
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (!developerId) {
        return NextResponse.json({ error: 'Sem permissão para criar telas' }, { status: 403 });
      }

      // Verificar se o grupo pertence ao desenvolvedor
      const { data: groupCheck } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', company_group_id)
        .eq('developer_id', developerId)
        .single();

      if (!groupCheck) {
        return NextResponse.json({ error: 'Grupo não pertence a você' }, { status: 403 });
      }
    }

    // Validar limite de telas
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('developer:developers(max_powerbi_screens)')
      .eq('id', company_group_id)
      .single();

    const screenLimit = groupData?.developer?.max_powerbi_screens || 10;

    // Contar telas existentes
    const { count: screensCount } = await supabase
      .from('powerbi_dashboard_screens')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', company_group_id);

    // Bloquear se limite atingido
    if (screensCount && screensCount >= screenLimit) {
      return NextResponse.json({
        error: `Limite de ${screenLimit} telas atingido. Entre em contato com o administrador.`,
        current: screensCount,
        max: screenLimit
      }, { status: 403 });
    }

    if (is_first) {
      await supabase
        .from('powerbi_dashboard_screens')
        .update({ is_first: false })
        .eq('company_group_id', company_group_id);
    }

    const { data: screen, error } = await supabase
      .from('powerbi_dashboard_screens')
      .insert({
        company_group_id,
        report_id,
        title,
        icon: icon || 'BarChart3',
        is_first: is_first || false
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tela:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (user_ids && user_ids.length > 0) {
      const userInserts = user_ids.map((uid: string) => ({
        screen_id: screen.id,
        user_id: uid
      }));
      await supabase.from('powerbi_screen_users').insert(userInserts);
    }

    if (company_ids && company_ids.length > 0) {
      const companyInserts = company_ids.map((cid: string) => ({
        screen_id: screen.id,
        company_id: cid
      }));
      await supabase.from('powerbi_screen_companies').insert(companyInserts);
    }

    return NextResponse.json({ screen }, { status: 201 });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
