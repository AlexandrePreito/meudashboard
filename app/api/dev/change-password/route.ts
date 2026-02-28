import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

/**
 * PUT /api/dev/change-password
 * Altera a senha do desenvolvedor autenticado
 *
 * Body:
 * - currentPassword: string (senha atual)
 * - newPassword: string (nova senha)
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });
    }

    const body = await request.json();
    const currentPassword = body.currentPassword ?? body.current_password;
    const newPassword = body.newPassword ?? body.new_password;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'A nova senha deve ser diferente da atual' },
        { status: 400 }
      );
    }

    if (newPassword === '123456') {
      return NextResponse.json(
        { error: 'A nova senha não pode ser a senha padrão "123456". Escolha uma senha diferente.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      console.error('[dev/change-password] Erro ao buscar usuário:', fetchError);
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    if (!userData.password_hash) {
      return NextResponse.json(
        { error: 'Senha atual não configurada. Entre em contato com o administrador.' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(currentPassword, userData.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
    });
    if (authError) {
      console.error('[dev/change-password] Erro ao atualizar senha no Auth:', authError);
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('[dev/change-password] Erro ao atualizar password_hash:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar senha. Tente novamente.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error: unknown) {
    console.error('[dev/change-password] Erro inesperado:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao alterar senha' },
      { status: 500 }
    );
  }
}
