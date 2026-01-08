/**
 * Biblioteca de Autenticação JWT
 * 
 * Gerencia autenticação baseada em JWT para o sistema MeuDashboard.
 * 
 * Funcionalidades:
 * - Criação e verificação de tokens JWT
 * - Gerenciamento de cookies de autenticação
 * - Validação de usuários autenticados
 * - Integração com Supabase para validação de usuários
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { supabase } from './supabase';
import type { AuthUser, JWTPayload } from '@/types';

/**
 * Retorna a chave secreta JWT codificada
 */
function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não configurado');
  }
  return new TextEncoder().encode(secret);
}

/**
 * Cria um token JWT com o payload fornecido
 * @param payload - Dados do usuário para incluir no token
 * @returns Token JWT assinado
 */
export async function createToken(payload: JWTPayload): Promise<string> {
  try {
    const secret = getJwtSecret();
    const token = await new SignJWT(payload as any)
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(secret);
    
    return token;
  } catch (error) {
    throw new Error('Erro ao criar token JWT');
  }
}

/**
 * Verifica e decodifica um token JWT
 * @param token - Token JWT a ser verificado
 * @returns Payload decodificado ou null se inválido
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Define o cookie de autenticação
 * @param token - Token JWT a ser armazenado
 */
export async function setAuthCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';

    // Em produção, define o domain para funcionar com e sem www
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      maxAge: number;
      path: string;
      domain?: string;
    } = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 dias em segundos
      path: '/',
    };

    // Adiciona domain em produção para funcionar em www e sem www
    if (isProduction) {
      cookieOptions.domain = '.meudashboard.org'; // O ponto permite subdomínios
    }

    cookieStore.set('auth_token', token, cookieOptions);
  } catch (error) {
    throw new Error('Erro ao definir cookie de autenticação');
  }
}

/**
 * Remove o cookie de autenticação
 */
export async function removeAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_token');
  } catch (error) {
    throw new Error('Erro ao remover cookie de autenticação');
  }
}

/**
 * Obtém o usuário autenticado a partir do cookie
 * @returns Usuário autenticado ou null se não autenticado/inválido
 */
export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    // Extrai o session_id do payload junto com o id
    const sessionId = payload.session_id;
    const userId = payload.id;

    // Busca o usuário no Supabase (incluindo current_session_id)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, full_name, is_master, status, avatar_url, current_session_id')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    // Verifica se a sessão ainda é válida (login único)
    // Se current_session_id do banco for diferente do session_id do token,
    // significa que outra sessão foi iniciada e esta foi invalidada
    if (user.current_session_id !== sessionId) {
      return null;
    }

    // Verifica se o usuário não está suspenso
    if (user.status === 'suspended') {
      return null;
    }

    // Retorna o usuário no formato AuthUser
    return {
      id: user.id,
      email: user.email,
      full_name: user.full_name || '',
      is_master: user.is_master || false,
      status: user.status,
      avatar_url: user.avatar_url || undefined,
    } as AuthUser;
  } catch (error) {
    return null;
  }
}

