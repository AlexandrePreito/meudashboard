import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Valida o token e redefine a senha
 *
 * Body:
 * - token: string
 * - new_password: string
 */
export async function POST(request: NextRequest) {
  try {
    const { token, new_password } = await request.json();

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    if (new_password === '123456') {
      return NextResponse.json(
        { error: 'Escolha uma senha diferente da padrão "123456".' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar usuário pelo token
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, reset_token, reset_token_expires')
      .eq('reset_token', token)
      .maybeSingle();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: 'Link inválido ou já utilizado. Solicite um novo.' },
        { status: 400 }
      );
    }

    // Verificar expiração
    if (user.reset_token_expires && new Date(user.reset_token_expires) < new Date()) {
      // Limpar token expirado
      await supabase
        .from('users')
        .update({ reset_token: null, reset_token_expires: null })
        .eq('id', user.id);

      return NextResponse.json(
        { error: 'Este link expirou. Solicite um novo link de redefinição.' },
        { status: 400 }
      );
    }

    // Gerar hash da nova senha
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Atualizar senha no Supabase Auth (se usar auth.users)
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password,
    });

    if (authError) {
      console.error('[reset-password] Erro ao atualizar senha no Auth:', authError);
    }

    // Atualizar hash na tabela users + limpar token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: newPasswordHash,
        reset_token: null,
        reset_token_expires: null,
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('[reset-password] Erro ao atualizar:', updateError);
      return NextResponse.json(
        { error: 'Erro ao redefinir senha. Tente novamente.' },
        { status: 500 }
      );
    }

    console.log(`[reset-password] Senha redefinida para: ${user.email}`);

    return NextResponse.json({
      success: true,
      message: 'Senha redefinida com sucesso! Agora você pode fazer login.',
    });
  } catch (error: unknown) {
    console.error('[reset-password] Erro:', error);
    return NextResponse.json(
      { error: 'Erro ao redefinir senha' },
      { status: 500 }
    );
  }
}
