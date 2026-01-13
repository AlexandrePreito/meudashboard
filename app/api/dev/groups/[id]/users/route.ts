/**
 * API Route - Developer Group Users
 * Gerenciamento de usuários do grupo pelo desenvolvedor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Lista usuários do grupo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_users')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Buscar usuários do grupo
    const { data: memberships, error } = await supabase
      .from('user_group_membership')
      .select(`
        id,
        role,
        is_active,
        created_at,
        user:users!user_group_membership_user_id_fkey(id, email, full_name, status, last_login_at, avatar_url)
      `)
      .eq('company_group_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      users: memberships || [],
      quota: group.quota_users,
      count: memberships?.filter(m => m.is_active).length || 0,
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar usuário no grupo
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_users')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Verificar limite de usuários
    const { count: currentUsers } = await supabase
      .from('user_group_membership')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', id)
      .eq('is_active', true);

    if (group.quota_users && currentUsers && currentUsers >= group.quota_users) {
      return NextResponse.json(
        { error: `Limite de usuários atingido (${group.quota_users})` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { email, full_name, password, role } = body;

    if (!email || !full_name || !password) {
      return NextResponse.json(
        { error: 'Email, nome e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se usuário já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // Verificar se já está no grupo
      const { data: existingMembership } = await supabase
        .from('user_group_membership')
        .select('id, is_active')
        .eq('user_id', existingUser.id)
        .eq('company_group_id', id)
        .maybeSingle();

      if (existingMembership) {
        if (existingMembership.is_active) {
          return NextResponse.json(
            { error: 'Usuário já está neste grupo' },
            { status: 400 }
          );
        } else {
          // Reativar membership
          await supabase
            .from('user_group_membership')
            .update({ is_active: true, role: role || 'viewer' })
            .eq('id', existingMembership.id);

          return NextResponse.json({ success: true, reactivated: true });
        }
      }

      userId = existingUser.id;
    } else {
      // Criar novo usuário
      const passwordHash = await bcrypt.hash(password, 10);

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert({
          email: email.toLowerCase(),
          full_name,
          password_hash: passwordHash,
          is_master: false,
          is_developer_user: false,
          status: 'active',
        })
        .select('id')
        .single();

      if (userError) {
        console.error('Erro ao criar usuário:', userError);
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
      }

      userId = newUser.id;
    }

    // Criar membership
    const { error: membershipError } = await supabase
      .from('user_group_membership')
      .insert({
        user_id: userId,
        company_group_id: id,
        role: role || 'viewer',
        is_active: true,
        invited_by: user.id,
      });

    if (membershipError) {
      console.error('Erro ao criar membership:', membershipError);
      return NextResponse.json({ error: 'Erro ao vincular usuário' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remover usuário do grupo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Desativar membership (soft delete)
    const { error } = await supabase
      .from('user_group_membership')
      .update({ is_active: false })
      .eq('company_group_id', id)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
