import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar telas
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    const onlyMine = searchParams.get('only_mine') === 'true';

    const supabase = createAdminClient();

    // Se não for master, buscar grupos do usuário
    let userGroupIds: string[] = [];
    if (!user.is_master) {
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      userGroupIds = memberships?.map(m => m.company_group_id) || [];

      if (userGroupIds.length === 0) {
        return NextResponse.json({ screens: [] });
      }
    }

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

    if (groupId) {
      query = query.eq('company_group_id', groupId);
    }

    const { data: screens, error } = await query;

    if (error) {
      console.error('Erro ao buscar telas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Se onlyMine, filtra por permissões do usuário
    if (onlyMine && !user.is_master) {
      const { data: userScreens } = await supabase
        .from('powerbi_screen_users')
        .select('screen_id')
        .eq('user_id', user.id);

      const userScreenIds = userScreens?.map(s => s.screen_id) || [];

      const { data: userCompanies } = await supabase
        .from('user_company_access')
        .select('company_id')
        .eq('user_id', user.id);

      const userCompanyIds = userCompanies?.map(c => c.company_id) || [];

      const { data: companyScreens } = await supabase
        .from('powerbi_screen_companies')
        .select('screen_id')
        .in('company_id', userCompanyIds.length > 0 ? userCompanyIds : ['00000000-0000-0000-0000-000000000000']);

      const companyScreenIds = companyScreens?.map(s => s.screen_id) || [];

      const filteredScreens = [];
      
      for (const screen of screens || []) {
        const { data: screenUsers } = await supabase
          .from('powerbi_screen_users')
          .select('id')
          .eq('screen_id', screen.id);
        
        const { data: screenCompanies } = await supabase
          .from('powerbi_screen_companies')
          .select('id')
          .eq('screen_id', screen.id);

        const hasUserBindings = (screenUsers?.length || 0) > 0;
        const hasCompanyBindings = (screenCompanies?.length || 0) > 0;

        if (!hasUserBindings && !hasCompanyBindings) {
          filteredScreens.push(screen);
          continue;
        }

        if (hasUserBindings && userScreenIds.includes(screen.id)) {
          filteredScreens.push(screen);
          continue;
        }

        if (hasCompanyBindings && companyScreenIds.includes(screen.id)) {
          filteredScreens.push(screen);
          continue;
        }
      }

      return NextResponse.json({ screens: filteredScreens });
    }

    // Filtrar por grupos do usuário (se não for master)
    let filteredScreens = screens || [];
    if (!user.is_master) {
      filteredScreens = filteredScreens.filter(screen => 
        screen.company_group_id && 
        userGroupIds.includes(screen.company_group_id)
      );
    }

    return NextResponse.json({ screens: filteredScreens });
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

    const { data: group } = await supabase
      .from('company_groups')
      .select('plan:powerbi_plans(max_powerbi_screens)')
      .eq('id', company_group_id)
      .single();

    const maxScreens = (group?.plan as any)?.max_powerbi_screens || 10;

    const { count } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id', { count: 'exact' })
      .eq('company_group_id', company_group_id);

    if ((count || 0) >= maxScreens) {
      return NextResponse.json({ error: `Limite de ${maxScreens} telas atingido para o plano atual` }, { status: 400 });
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
