/**
 * API Route - Me (Usuário Autenticado)
 * 
 * Endpoint GET que retorna os dados do usuário autenticado.
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
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
    
    if (!user.is_master) {
      const supabase = createAdminClient();
      
      // Buscar memberships do usuário
      const { data: memberships } = await supabase
        .from('user_group_membership')
        .select('company_group_id, role')
        .eq('user_id', user.id)
        .eq('is_active', true);

      groupIds = memberships?.map(m => m.company_group_id) || [];
      const userRole = memberships?.some(m => m.role === 'admin') ? 'admin' : 'user';
      role = userRole;
    }

    // Se tiver usuário, retorna 200 com os dados
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_master: user.is_master,
        status: user.status,
        role: user.is_master ? 'master' : role,
      },
      role: user.is_master ? 'master' : role,
      groupIds: groupIds  // GARANTIR QUE ISSO ESTÁ SENDO RETORNADO
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
