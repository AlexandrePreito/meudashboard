/**
 * API Route - Reset Password
 * Desenvolvedor pode resetar senha de usuário do grupo
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import bcrypt from 'bcryptjs';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST - Resetar senha do usuário
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
    const body = await request.json();
    const { user_id, new_password } = body;

    if (!user_id || !new_password) {
      return NextResponse.json(
        { error: 'user_id e new_password são obrigatórios' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'Senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
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

    // Verificar se usuário pertence ao grupo
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('id')
      .eq('company_group_id', id)
      .eq('user_id', user_id)
      .eq('is_active', true)
      .single();

    if (!membership) {
      return NextResponse.json(
        { error: 'Usuário não pertence a este grupo' },
        { status: 404 }
      );
    }

    // Resetar senha
    const passwordHash = await bcrypt.hash(new_password, 10);

    const { error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', user_id);

    if (error) {
      console.error('Erro ao resetar senha:', error);
      return NextResponse.json({ error: 'Erro ao resetar senha' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
