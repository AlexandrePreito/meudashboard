/**
 * API Route - Me (Usuário Autenticado)
 * 
 * Endpoint GET que retorna os dados do usuário autenticado.
 * 
 * Processo:
 * 1. Verifica o cookie de autenticação
 * 2. Valida o token JWT
 * 3. Busca o usuário no banco de dados
 * 4. Verifica se a sessão ainda é válida
 * 5. Retorna os dados do usuário autenticado
 */

import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

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

    // Se tiver usuário, retorna 200 com os dados
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        is_master: user.is_master,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

