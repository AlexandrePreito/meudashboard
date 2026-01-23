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

    // 1. Se master, busca TODOS os grupos ativos (não excluídos)
    if (user.is_master) {
      try {
        const { data, error } = await supabase
          .from('company_groups')
          .select('id, name, slug, logo_url, primary_color, use_developer_logo, use_developer_colors')
          .eq('status', 'active')
          .order('name');

        if (error) {
          console.error('[ERROR /api/user/groups] Erro ao buscar grupos (master):', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos', details: error.message }, { status: 500 });
        }
        groups = data || [];
      } catch (masterError: any) {
        console.error('[ERROR /api/user/groups] Exceção ao buscar grupos (master):', {
          message: masterError?.message || 'Erro desconhecido',
          stack: masterError?.stack?.substring(0, 500) || 'N/A'
        });
        return NextResponse.json({ error: 'Erro ao buscar grupos', details: masterError?.message || 'Erro desconhecido' }, { status: 500 });
      }
    } else {
      // 2. Verificar se e desenvolvedor
      try {
        developerId = await getUserDeveloperId(user.id);
      } catch (devIdError: any) {
        console.error('[ERROR /api/user/groups] Erro ao buscar developer_id:', {
          message: devIdError?.message || 'Erro desconhecido',
          stack: devIdError?.stack?.substring(0, 500) || 'N/A',
          userId: user.id
        });
        // Continuar sem developerId, vai buscar via membership
        developerId = null;
      }
      
      if (developerId) {
        // Desenvolvedor: busca grupos do seu developer_id (não excluídos)
        try {
          const { data, error } = await supabase
            .from('company_groups')
            .select('id, name, slug, logo_url, primary_color, use_developer_logo, use_developer_colors')
            .eq('developer_id', developerId)
            .eq('status', 'active')
            .order('name');

          if (error) {
            console.error('[ERROR /api/user/groups] Erro ao buscar grupos (developer):', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              developerId
            });
            return NextResponse.json({ error: 'Erro ao buscar grupos', details: error.message }, { status: 500 });
          }
          groups = data || [];
        } catch (devGroupsError: any) {
          console.error('[ERROR /api/user/groups] Exceção ao buscar grupos (developer):', {
            message: devGroupsError?.message || 'Erro desconhecido',
            stack: devGroupsError?.stack?.substring(0, 500) || 'N/A',
            developerId
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos', details: devGroupsError?.message || 'Erro desconhecido' }, { status: 500 });
        }
      }
      
      if (!developerId) {
        // 3. Usuario normal: busca atraves de membership
        try {
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
                developer_id,
                status
              )
            `)
            .eq('user_id', user.id)
            .eq('is_active', true);

          if (error) {
            console.error('[ERROR /api/user/groups] Erro ao buscar grupos (membership):', {
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code
            });
            return NextResponse.json({ error: 'Erro ao buscar grupos', details: error.message }, { status: 500 });
          }

          groups = (data || [])
            .map((item: any) => item.company_group)
            .filter((group: any) => 
              group !== null && 
              group.status === 'active'
            );
        } catch (membershipError: any) {
          console.error('[ERROR /api/user/groups] Exceção ao buscar grupos (membership):', {
            message: membershipError?.message || 'Erro desconhecido',
            stack: membershipError?.stack?.substring(0, 500) || 'N/A'
          });
          return NextResponse.json({ error: 'Erro ao buscar grupos', details: membershipError?.message || 'Erro desconhecido' }, { status: 500 });
        }
      }
    }

    // Buscar dados do developer para tema e limites
    let developerInfo = null;

    if (developerId) {
      // Desenvolvedor: busca pelo seu developer_id
      const { data: devData, error: devError } = await supabase
        .from('developers')
        .select('id, name, logo_url, primary_color, max_daily_refreshes, max_powerbi_screens, max_users, max_companies')
        .eq('id', developerId)
        .single();
      
      if (devError) {
        console.error('Erro ao buscar developer:', devError);
      }
      
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
  } catch (error: any) {
    console.error('[ERROR /api/user/groups] Erro completo:', {
      message: error?.message || 'Erro desconhecido',
      stack: error?.stack?.substring(0, 500) || 'N/A',
      name: error?.name || 'Error',
      errorString: String(error)
    });
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error?.message || 'Erro desconhecido'
    }, { status: 500 });
  }
}
