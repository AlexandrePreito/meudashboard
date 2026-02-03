import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password
 * Altera a senha do usuário autenticado
 * 
 * Body:
 * - current_password: string (senha atual)
 * - new_password: string (nova senha)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { current_password, new_password } = await request.json();

    if (!current_password || !new_password) {
      return NextResponse.json(
        { error: 'Senha atual e nova senha são obrigatórias' },
        { status: 400 }
      );
    }

    if (new_password.length < 6) {
      return NextResponse.json(
        { error: 'A nova senha deve ter no mínimo 6 caracteres' },
        { status: 400 }
      );
    }

    // Não permitir usar a senha padrão "123456" como nova senha
    if (new_password === '123456') {
      return NextResponse.json(
        { error: 'A nova senha não pode ser a senha padrão "123456". Escolha uma senha diferente.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Buscar hash da senha atual do usuário
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', user.id)
      .single();

    if (fetchError || !userData) {
      console.error('[change-password] Erro ao buscar usuário:', fetchError);
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se a senha atual está correta
    if (!userData.password_hash) {
      return NextResponse.json(
        { error: 'Senha atual não configurada. Entre em contato com o administrador.' },
        { status: 400 }
      );
    }

    const isValid = await bcrypt.compare(current_password, userData.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Senha atual incorreta' },
        { status: 401 }
      );
    }

    // Gerar hash da nova senha
    const newPasswordHash = await bcrypt.hash(new_password, 10);

    // Atualizar senha no Supabase Auth
    const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
      password: new_password
    });

    if (authError) {
      console.error('[change-password] Erro ao atualizar senha no Auth:', authError);
      // Continuar mesmo se falhar no Auth, pois pode ser que o usuário não exista lá
    }

    // Atualizar hash na tabela users
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', user.id);

    if (updateError) {
      console.error('[change-password] Erro ao atualizar password_hash:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar senha. Tente novamente.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Senha alterada com sucesso' });
  } catch (error: any) {
    console.error('[change-password] Erro inesperado:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao alterar senha' },
      { status: 500 }
    );
  }
}
