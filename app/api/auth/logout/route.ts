/**
 * API Route - Logout
 * 
 * Endpoint POST para encerrar a sessão do usuário no sistema MeuDashboard.
 * 
 * Processo:
 * 1. Remove o cookie de autenticação
 * 2. Retorna confirmação de logout
 */

import { NextResponse } from 'next/server';
import { removeAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    // Remove o cookie de autenticação
    await removeAuthCookie();

    // Retorna resposta de sucesso
    return NextResponse.json({
      success: true,
      message: 'Logout realizado',
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

