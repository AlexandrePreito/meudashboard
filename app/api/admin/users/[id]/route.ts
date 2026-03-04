import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper: retorna os user IDs que o usuário atual pode ver/editar (null = todos para master)
async function getAllowedUserIds(supabase: ReturnType<typeof createAdminClient>): Promise<string[] | null> {
  const user = await getAuthUser();
  if (!user || user.is_master) return null;

  const developerId = await getUserDeveloperId(user.id);
  const isDeveloper = !!developerId;

  if (isDeveloper) {
    const { data: devGroups } = await supabase
      .from('company_groups')
      .select('id')
      .eq('developer_id', developerId);

    const groupIds = (devGroups || []).map((g: { id: string }) => g.id);
    if (groupIds.length === 0) return [];

    const { data: groupUsers } = await supabase
      .from('user_group_membership')
      .select('user_id')
      .in('company_group_id', groupIds);
    return [...new Set((groupUsers || []).map((gu: { user_id: string }) => gu.user_id))];
  }

  // Admin
  const { data: adminMemberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const groupIds = (adminMemberships || []).map((m: { company_group_id: string }) => m.company_group_id);
  if (groupIds.length === 0) return [];

  const { data: groupUsers } = await supabase
    .from('user_group_membership')
    .select('user_id')
    .in('company_group_id', groupIds);
  return [...new Set((groupUsers || []).map((gu: { user_id: string }) => gu.user_id))];
}

// GET - Buscar usuario por ID
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    if (!user.is_master) {
      const allowedIds = await getAllowedUserIds(supabase);
      if (allowedIds !== null && !allowedIds.includes(id)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Erro ao buscar usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar usuario
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { full_name, email, role, is_active, is_developer, is_master, reset_password } = body;

    const supabase = createAdminClient();

    if (!user.is_master) {
      const allowedIds = await getAllowedUserIds(supabase);
      if (allowedIds !== null && !allowedIds.includes(id)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (full_name !== undefined) updateData.full_name = full_name;
    if (role !== undefined) updateData.role = role;
    if (is_developer !== undefined) updateData.is_developer_user = is_developer;
    if (is_master !== undefined && user.is_master) updateData.is_master = is_master;

    if (is_active !== undefined) {
      updateData.status = is_active ? 'active' : 'inactive';
    }

    if (email !== undefined) updateData.email = email;

    // Reset de senha
    let tempPassword: string | null = null;
    if (reset_password) {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
      tempPassword = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(tempPassword, salt);
    }

    const { data: userData, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      user: userData,
      ...(tempPassword ? { temp_password: tempPassword } : {})
    });
  } catch (error: any) {
    console.error('Erro ao atualizar usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir usuario
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const { id } = await params;

    if (id === user.id) {
      return NextResponse.json({ error: 'Voce nao pode excluir a si mesmo' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!user.is_master) {
      const allowedIds = await getAllowedUserIds(supabase);
      if (allowedIds !== null && !allowedIds.includes(id)) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
      }
    }

    // Remover de user_group_membership primeiro
    await supabase
      .from('user_group_membership')
      .delete()
      .eq('user_id', id);

    // Excluir usuario
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir usuario:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
