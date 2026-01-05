import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// GET - Listar usuários
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        phone,
        is_master,
        status,
        last_login_at,
        created_at,
        memberships:user_group_membership!user_group_membership_user_id_fkey(
          id,
          role,
          is_active,
          company_group:company_groups(id, name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar usuários:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ users: users || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar usuário
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, phone, password, is_master, company_group_id, role } = body;

    if (!email || !full_name || !password) {
      return NextResponse.json({ error: 'Email, nome e senha são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se email já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 10);

    // Criar usuário
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email,
        full_name,
        phone: phone || null,
        password_hash,
        is_master: is_master || false,
        status: 'active'
      })
      .select()
      .single();

    if (userError) {
      console.error('Erro ao criar usuário:', userError);
      return NextResponse.json({ error: userError.message }, { status: 500 });
    }

    // Se tiver grupo, criar membership
    if (company_group_id) {
      await supabase
        .from('user_group_membership')
        .insert({
          user_id: newUser.id,
          company_group_id,
          role: role || 'user',
          is_active: true,
          invited_by: user.id,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ user: newUser });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar usuário
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const body = await request.json();
    const { id, email, full_name, phone, password, is_master, status } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updateData: any = {
      full_name,
      phone: phone || null,
      is_master: is_master || false,
      status: status || 'active',
      updated_at: new Date().toISOString()
    };

    // Se mudar email, verificar duplicado
    if (email) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (existingUser) {
        return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
      }
      updateData.email = email;
    }

    // Se tiver nova senha
    if (password) {
      updateData.password_hash = await bcrypt.hash(password, 10);
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar usuário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    // Não pode excluir a si mesmo
    if (id === user.id) {
      return NextResponse.json({ error: 'Não é possível excluir seu próprio usuário' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Excluir memberships primeiro
    await supabase
      .from('user_group_membership')
      .delete()
      .eq('user_id', id);

    // Excluir usuário
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir usuário:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

