/**
 * Middleware de Proteção de Rotas
 * 
 * Gerencia a proteção de rotas do sistema MeuDashboard através de:
 * - Verificação de tokens JWT em cookies
 * - Redirecionamento para login quando não autenticado
 * - Proteção de rotas API e páginas
 * - Lista de rotas públicas que não requerem autenticação
 * 
 * IMPORTANTE: A verificação do session_id no banco será feita no getAuthUser()
 * pois middleware edge não suporta Supabase diretamente.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Retorna a chave secreta JWT codificada
 */
function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

export async function middleware(request: NextRequest) {
  // Rotas públicas que não requerem autenticação
  const publicRoutes = [
    '/login', 
    '/api/auth/login', 
    '/api/auth/logout',
    '/api/whatsapp/webhook',
    '/api/whatsapp/webhook/messages-upsert',
    '/api/whatsapp/webhook/contacts-update',
    '/api/whatsapp/webhook/chats-update',
    '/api/alertas/cron',
  ];
  
  // Obtém o pathname da requisição
  const pathname = request.nextUrl.pathname;
  
  // Se pathname está nas rotas públicas, permite passar
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }
  
  // Pega o token do cookie 'auth_token'
  const token = request.cookies.get('auth_token')?.value;
  
  // Se não tem token
  if (!token) {
    // Se é rota /api/, retorna JSON 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }
    // Se é outra rota, redireciona para '/login'
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Tenta verificar o token com jwtVerify
  try {
    const secret = getJwtSecret();
    await jwtVerify(token, secret);
    
    // Se token válido
    // Se está em '/login', redireciona para '/'
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    // Senão, permite passar
    return NextResponse.next();
  } catch (error) {
    // Se token inválido
    // Se é rota /api/, retorna JSON 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      );
    }
    // Se é outra rota, redireciona para '/login'
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};




