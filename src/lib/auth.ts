import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { supabase } from './supabase';
import { createAdminClient } from './supabase/admin';
import type { AuthUser, JWTPayload } from '@/types';

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET nao configurado');
  }
  return new TextEncoder().encode(secret);
}

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

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function setAuthCookie(token: string): Promise<void> {
  try {
    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
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
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    };
    if (isProduction) {
      cookieOptions.domain = '.meudashboard.org';
    }
    cookieStore.set('auth-token', token, cookieOptions);
  } catch (error) {
    throw new Error('Erro ao definir cookie');
  }
}

export async function removeAuthCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth-token');
  } catch (error) {
    throw new Error('Erro ao remover cookie');
  }
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;
    if (!token) {
      return null;
    }
    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }
    // const sessionId = payload.session_id;
    const userId = payload.id;
    const adminSupabase = createAdminClient();
    const { data: user, error } = await adminSupabase
      .from('users')
      .select('id, email, full_name, is_master, status, avatar_url, current_session_id')
      .eq('id', userId)
      .single();
    if (error || !user) {
      return null;
    }
    // if (user.current_session_id !== sessionId) {
    //   return null;
    // }
    if (user.status === 'suspended') {
      return null;
    }
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

export async function getUserDeveloperId(userId: string): Promise<string | null> {
  try {
    const adminSupabase = createAdminClient();
    
    // Primeiro, buscar direto na tabela users (campo developer_id)
    const { data: userData, error: userError } = await adminSupabase
      .from('users')
      .select('developer_id')
      .eq('id', userId)
      .single();
    
    if (!userError && userData?.developer_id) {
      return userData.developer_id;
    }
    
    // Fallback: buscar na tabela developer_users (para compatibilidade)
    const { data, error } = await adminSupabase
      .from('developer_users')
      .select('developer_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    if (error || !data) {
      return null;
    }
    return data.developer_id;
  } catch (error) {
    return null;
  }
}

export async function getAuthUserWithDeveloper(): Promise<(AuthUser & { developer_id?: string; developer_role?: string }) | null> {
  try {
    const user = await getAuthUser();
    if (!user) return null;
    const adminSupabase = createAdminClient();
    const { data: devUser } = await adminSupabase
      .from('developer_users')
      .select('developer_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    return {
      ...user,
      developer_id: devUser?.developer_id || undefined,
      developer_role: devUser?.role || undefined,
    };
  } catch (error) {
    return null;
  }
}

export async function getUserGroupMembership(): Promise<{ user_id: string; company_group_id: string; role: string } | null> {
  try {
    const user = await getAuthUser();
    if (!user) {
      console.log('❌ getUserGroupMembership: Usuário não autenticado');
      return null;
    }

    const adminSupabase = createAdminClient();
    
    // Master users podem não ter membership direto
    if (user.is_master) {
      // Buscar primeiro grupo ativo para master
      const { data: firstGroup } = await adminSupabase
        .from('company_groups')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      
      if (firstGroup) {
        return {
          user_id: user.id,
          company_group_id: firstGroup.id,
          role: 'admin'
        };
      }
      return null;
    }

    // Verificar se é desenvolvedor (não confiar em user.is_developer)
    const developerId = await getUserDeveloperId(user.id);
    
    if (developerId) {
      // Desenvolvedores: buscar grupos pelo developer_id
      const { data: firstGroup } = await adminSupabase
        .from('company_groups')
        .select('id')
        .eq('developer_id', developerId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();
      
      if (firstGroup) {
        return {
          user_id: user.id,
          company_group_id: firstGroup.id,
          role: 'developer'
        };
      }
      return null;
    }

    // Usuários comuns: buscar membership direto
    const { data: membership } = await adminSupabase
      .from('user_group_membership')
      .select('company_group_id, role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!membership) {
      return null;
    }

    return {
      user_id: user.id,
      company_group_id: membership.company_group_id,
      role: membership.role
    };
  } catch (error: any) {
    console.error('❌ getUserGroupMembership erro:', error);
    return null;
  }
}