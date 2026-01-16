/**
 * API Route - Grupos de Empresas do Usuario
 * 
 * Retorna os grupos disponiveis para o usuario autenticado:
 * - Master: todos os grupos ativos
 * - Desenvolvedor: grupos do seu developer_id
 * - Outros: grupos onde tem membership ativo
 */
import { NextResponse } from 'next/server';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    let groups: Array<{ id: string; name: string; slug: string; logo_url: string | null; primary_color: string | null }> = [];
    let developerId: string | null = null;

    // 1. Se master, busca TODOS os grupos ativos
    if (user.is_master) {
      const { data, error } = await supabase
        .from('company_groups')
        .select('id, name, slug, logo_url, primary_color, use_developer_logo, use_developer_colors')
        .eq('status', 'active')
        .order('name');

      if (error) {
        console.error('Erro ao buscar grupos (master):', error);
        return NextResponse.json({ error: 'Erro ao buscar grupos' }, { status: 500 });
      }
      groups = data || [];
    } else {
      // 2. Verificar se e desenvolvedor
      developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        // Desenvolvedor: busca grupos do seu developer_id
        const { data, error } = await supabase
          .from('company_groups')
          .select('id, name, slug, logo_url, primary_color, use_developer_logo, use_developer_colors')
          .eq('developer_id', developerId)
          .eq('status', 'active')
          .order('name');

        if (error) {
          console.error('Erro ao buscar grupos (developer):', error);
          return NextResponse.json({ error: 'Erro ao buscar grupos' }, { status: 500 });
        }
        groups = data || [];
      } else {
        // 3. Usuario normal: busca atraves de membership
        const { data, error } = await supabase
          .from('user_group_membership')
          .select(`
            company_group:company_groups (
              id,
              name,
              slug,
              logo_url,
              primary_color,
              use_developer_logo,
              use_developer_colors,
              developer_id
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (error) {
          console.error('Erro ao buscar grupos (membership):', error);
          return NextResponse.json({ error: 'Erro ao buscar grupos' }, { status: 500 });
        }

        groups = (data || [])
          .map((item: any) => item.company_group)
          .filter((group: any) => group !== null && group.status !== 'inactive');
      }
    }

    // Buscar dados do developer para tema e limites
    let developerInfo = null;

    if (developerId) {
      // Desenvolvedor: busca pelo seu developer_id
      const { data: devData } = await supabase
        .from('developers')
        .select('id, name, logo_url, primary_color, max_daily_refreshes, max_powerbi_screens, max_users, max_companies')
        .eq('id', developerId)
        .single();
      developerInfo = devData;
    } else if (groups.length > 0) {
      // Usuario comum: busca o developer do primeiro grupo com developer e plan
      const { data: groupWithDev } = await supabase
        .from('company_groups')
        .select(`
          developer_id,
          developer:developers(
            id,
            name,
            logo_url,
            primary_color,
            max_daily_refreshes,
            max_powerbi_screens,
            max_users,
            max_companies
          ),
          plan:powerbi_plans(*)
        `)
        .eq('id', groups[0].id)
        .single();
      
      if (groupWithDev?.developer) {
        developerInfo = groupWithDev.developer;
      }
    }

    return NextResponse.json({ 
      groups,
      developer: developerInfo  // dados do desenvolvedor para tema
    });
  } catch (error) {
    console.error('Erro ao buscar grupos:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}