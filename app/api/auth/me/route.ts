/**
 * API Route - Me (Usuário Autenticado)
 * 
 * Endpoint GET que retorna os dados do usuário autenticado.
 */
import { NextResponse } from 'next/server';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    // Obtém o usuário autenticado do cookie/token
    const user = await getAuthUser();

    // Se não tiver usuário, retorna 401
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Buscar role e grupos do usuário (se não for master)
    let role: string | null = null;
    let groupIds: string[] = [];
    
    // Verificar se é desenvolvedor
    let isDeveloper = false;
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      isDeveloper = !!developerId;
    }
    
    let canUseAi = false;
    let canRefresh = false;

    if (!user.is_master && !isDeveloper) {
      const supabase = createAdminClient();
      
      // Buscar memberships do usuário
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role, can_use_ai, can_refresh')
        .eq('user_id', user.id)
        .eq('is_active', true);

      groupIds = memberships?.map(m => m.company_group_id) || [];
      const userRole = memberships?.some(m => m.role === 'admin') ? 'admin' : 'user';
      role = userRole;
      // Verificar permissões - se qualquer membership tiver, o usuário tem
      canUseAi = memberships?.some(m => m.can_use_ai) || false;
      canRefresh = memberships?.some(m => m.can_refresh) || false;
    }

    // Se tiver usuário, retorna 200 com os dados
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_master: user.is_master,
        is_developer: isDeveloper,
        status: user.status,
        role: user.is_master ? 'master' : (isDeveloper ? 'developer' : role),
        can_use_ai: user.is_master || isDeveloper || canUseAi,
        can_refresh: user.is_master || isDeveloper || canRefresh,
      },
      role: user.is_master ? 'master' : (isDeveloper ? 'developer' : role),
      groupIds: groupIds
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
