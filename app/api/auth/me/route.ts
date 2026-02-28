/**
 * API Route - Me (Usuário Autenticado)
 * 
 * Endpoint GET que retorna os dados do usuário autenticado.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

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
    const supabase = createAdminClient();

    if (!user.is_master && !isDeveloper) {
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

    // Buscar dados completos do usuário (phone, created_at, last_login_at)
    const { data: userData } = await supabase
      .from('users')
      .select('password_hash, phone, created_at, last_login_at')
      .eq('id', user.id)
      .single();

    let needsPasswordChange = false;
    if (userData?.password_hash) {
      needsPasswordChange = await bcrypt.compare('123456', userData.password_hash);
    }

    // Se não for master nem developer, buscar memberships com company_group (para Perfil)
    let memberships: Array<{ role: string; company_group: { id: string; name: string } | null }> = [];
    if (!user.is_master && !isDeveloper) {
      const { data: mems } = await supabase
        .from('user_group_membership')
        .select('role, company_group:company_groups(id, name)')
        .eq('user_id', user.id)
        .eq('is_active', true);
      memberships = mems || [];
    }

    const userRole = user.is_master ? 'master' : (isDeveloper ? 'developer' : role);
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: userData?.phone ?? null,
        is_master: user.is_master,
        is_developer: isDeveloper,
        is_admin: role === 'admin',
        status: user.status,
        role: userRole,
        can_use_ai: user.is_master || isDeveloper || canUseAi,
        can_refresh: user.is_master || isDeveloper || canRefresh,
        needsPasswordChange: needsPasswordChange,
        created_at: userData?.created_at,
        last_login_at: userData?.last_login_at,
        groupIds,
        memberships,
      },
      role: userRole,
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

// PUT - Atualizar perfil (full_name, phone) - qualquer usuário autenticado
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone } = body;

    const supabase = createAdminClient();
    const updateData: Record<string, unknown> = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (phone !== undefined) updateData.phone = phone;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', user.id)
      .select('id, full_name, phone')
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
