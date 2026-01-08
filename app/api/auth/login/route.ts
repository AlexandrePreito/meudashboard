/**
 * API Route - Login
 * 
 * Endpoint POST para autenticação de usuários no sistema MeuDashboard.
 * 
 * Processo:
 * 1. Valida email e senha
 * 2. Verifica credenciais via RPC do Supabase
 * 3. Valida status do usuário
 * 4. Gera session_id único (sessão única: um login derruba o outro)
 * 5. Atualiza session_id no banco de dados
 * 6. Gera token JWT com session_id e salva em cookie
 * 7. Retorna dados do usuário autenticado
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createToken, setAuthCookie } from '@/lib/auth';
import type { AuthUser } from '@/types';
import bcrypt from 'bcryptjs';
import { logActivity, getUserGroupId } from '@/lib/activity-log';

export async function POST(request: NextRequest) {
  try {
    // Parse do body da requisição
    const body = await request.json();
    const { email, password } = body;

    // Validação de campos obrigatórios
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Busca usuário por email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, full_name, is_master, status, avatar_url, password_hash')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Verifica se o usuário não está suspenso
    if (user.status === 'suspended') {
      return NextResponse.json(
        { success: false, message: 'Usuário suspenso' },
        { status: 403 }
      );
    }

    // Verifica a senha com bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, message: 'Email ou senha inválidos' },
        { status: 401 }
      );
    }

    // Atualiza last_login_at
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', user.id);

    // Registrar log de login
    const groupId = await getUserGroupId(user.id);
    await logActivity({
      userId: user.id,
      companyGroupId: groupId,
      actionType: 'login',
      module: 'auth',
      description: `Login realizado: ${user.email}`,
      entityType: 'user',
      entityId: user.id
    });

    // Gera novo session_id único (sessão única: um login derruba o outro)
    const sessionId = crypto.randomUUID();

    // Atualiza o session_id no banco (isso invalida sessão anterior)
    const { error: updateError } = await supabase
      .from('users')
      .update({ current_session_id: sessionId })
      .eq('id', user.id);

    if (updateError) {
      console.error('Erro ao atualizar session_id:', updateError);
      return NextResponse.json(
        { success: false, message: 'Erro ao criar sessão' },
        { status: 500 }
      );
    }

    // Cria token JWT com session_id
    const token = await createToken({
      id: user.id,
      email: user.email,
      is_master: user.is_master || false,
      session_id: sessionId,
    });

    // Salva token no cookie
    await setAuthCookie(token);

    // Prepara dados do usuário para retorno (sem dados sensíveis)
    const userData: AuthUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      is_master: user.is_master || false,
      status: user.status,
      avatar_url: user.avatar_url || undefined,
    };

    // Retorna resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Login realizado',
      user: userData,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

