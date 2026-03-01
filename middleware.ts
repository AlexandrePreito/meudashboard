/**
 * Middleware de Proteção de Rotas + Subdomínios
 *
 * Fluxo de subdomínio (ex: vion.meudashboard.org):
 * 1. Detecta o slug do subdomínio
 * 2. Seta header x-subdomain e cookie x-subdomain
 * 3. Bloqueia rotas administrativas (admin, dev, cadastro)
 * 4. Permite rotas de viewer (login, dashboard, tela/*)
 * 5. As páginas existentes usam useSubdomain() para personalizar
 *
 * Fluxo domínio principal (meudashboard.org):
 * - Lógica de auth original inalterada
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const BASE_DOMAINS = [
  'meudashboard.org',
  'meudashboard.com',
  'www.meudashboard.org',
  'www.meudashboard.com',
  'localhost:3000',
  'localhost',
];

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'dev', 'login', 'cadastro',
  'mail', 'smtp', 'ftp', 'blog', 'docs', 'help', 'support',
  'status', 'cdn', 'assets', 'static', 'staging', 'test',
];

/**
 * Rotas BLOQUEADAS em subdomínios — viewers não podem acessar áreas administrativas
 */
const SUBDOMAIN_BLOCKED_PREFIXES = [
  '/admin',
  '/dev',
  '/cadastro',
  '/administrador',
  '/api/admin',
  '/api/dev',
];

/**
 * Rotas PÚBLICAS em subdomínios (não precisam de auth)
 */
const SUBDOMAIN_PUBLIC_ROUTES = [
  '/',
  '/login',
  '/esqueci-senha',
  '/redefinir-senha',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/subdomain/',
];

function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  if (BASE_DOMAINS.some(d => hostname === d || host === d)) return null;

  const match = host.match(/^([a-z0-9-]+)\.(meudashboard\.(org|com))$/);
  if (match) {
    const sub = match[1];
    if (RESERVED_SUBDOMAINS.includes(sub)) return null;
    return sub;
  }

  return null;
}

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET);
}

function setSubdomainCookie(response: NextResponse, subdomain: string): void {
  response.cookies.set('x-subdomain', subdomain, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  });
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  const subdomain = extractSubdomain(hostname);

  // ============================================================
  // SUBDOMÍNIO DETECTADO
  // ============================================================
  if (subdomain) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-subdomain', subdomain);

    // Assets estáticos — passar direto
    if (
      pathname.startsWith('/_next') ||
      pathname.match(/\.(png|svg|jpg|jpeg|gif|ico|css|js|woff|woff2|ttf|webp)$/)
    ) {
      return NextResponse.next({ request: { headers: requestHeaders } });
    }

    // Bloquear rotas administrativas no subdomínio
    const isBlocked = SUBDOMAIN_BLOCKED_PREFIXES.some(prefix => pathname.startsWith(prefix));
    if (isBlocked) {
      // Redirecionar para login do subdomínio
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Rotas públicas do subdomínio
    const isPublic = SUBDOMAIN_PUBLIC_ROUTES.some(route =>
      pathname === route || pathname.startsWith(route)
    );

    if (isPublic) {
      // Raiz do subdomínio → redirecionar para /login
      if (pathname === '/') {
        const loginUrl = new URL('/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        setSubdomainCookie(response, subdomain);
        return response;
      }

      const response = NextResponse.next({ request: { headers: requestHeaders } });
      setSubdomainCookie(response, subdomain);
      return response;
    }

    // APIs normais — passar com header x-subdomain
    if (pathname.startsWith('/api/')) {
      const token = request.cookies.get('auth-token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
      }

      try {
        const secret = getJwtSecret();
        await jwtVerify(token, secret);
        const response = NextResponse.next({ request: { headers: requestHeaders } });
        setSubdomainCookie(response, subdomain);
        return response;
      } catch {
        return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
      }
    }

    // Rotas protegidas do viewer (dashboard, tela/*, etc.)
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      const secret = getJwtSecret();
      await jwtVerify(token, secret);
      const response = NextResponse.next({ request: { headers: requestHeaders } });
      setSubdomainCookie(response, subdomain);
      return response;
    } catch {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ============================================================
  // DOMÍNIO PRINCIPAL — Lógica original inalterada
  // ============================================================
  const publicRoutes = [
    '/',
    '/login',
    '/esqueci-senha',
    '/redefinir-senha',
    '/cadastro',
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/logout',
    '/api/auth/forgot-password',
    '/api/auth/reset-password',
    '/api/whatsapp/webhook',
    '/api/whatsapp/webhook/messages-upsert',
    '/api/whatsapp/webhook/contacts-update',
    '/api/whatsapp/webhook/chats-update',
    '/api/alertas/cron',
  ];

  const isPublicApi = pathname.startsWith('/api/subdomain/');
  const isPublicPath = publicRoutes.includes(pathname) || pathname.startsWith('/cadastro');

  if (isPublicPath || isPublicApi) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/developer')) {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  const token = request.cookies.get('auth-token')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = getJwtSecret();
    await jwtVerify(token, secret);

    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)'],
};
