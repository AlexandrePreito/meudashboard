import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'www', 'mail', 'ftp', 'dashboard', 'dev',
  'master', 'login', 'cadastro', 'suporte', 'help', 'status', 'blog', 'docs',
];

/**
 * GET /api/subdomain/check-availability?slug=xxx
 * Verifica se o subdomínio está disponível.
 * Autenticação opcional: se logado como developer, permite "manter" o próprio slug.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.toLowerCase().trim() ?? '';

    // Validações
    if (!slug) {
      return NextResponse.json({ error: 'Slug é obrigatório' }, { status: 400 });
    }

    if (slug.length < 3) {
      return NextResponse.json({ error: 'Slug deve ter no mínimo 3 caracteres' }, { status: 400 });
    }

    if (slug.length > 50) {
      return NextResponse.json({ error: 'Slug deve ter no máximo 50 caracteres' }, { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      return NextResponse.json(
        { error: 'Slug deve conter apenas letras minúsculas, números e hífens' },
        { status: 400 }
      );
    }

    if (slug.startsWith('-') || slug.endsWith('-')) {
      return NextResponse.json(
        { error: 'Slug não pode começar ou terminar com hífen' },
        { status: 400 }
      );
    }

    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ available: false, reason: 'Subdomínio reservado' }, { status: 400 });
    }

    // Developer atual (opcional)
    let currentDeveloperId: string | null = null;
    const user = await getAuthUser();
    if (user) {
      currentDeveloperId = await getUserDeveloperId(user.id);
    }

    const supabase = createAdminClient();
    const { data: existing, error } = await supabase
      .from('developers')
      .select('id')
      .eq('subdomain', slug)
      .maybeSingle();

    if (error) {
      console.error('[subdomain/check-availability]', error);
      return NextResponse.json({ error: 'Erro ao verificar disponibilidade' }, { status: 500 });
    }

    if (!existing) {
      return NextResponse.json({ available: true });
    }

    if (currentDeveloperId && existing.id === currentDeveloperId) {
      return NextResponse.json({ available: true });
    }

    return NextResponse.json({ available: false, reason: 'Subdomínio já está em uso' });
  } catch (error) {
    console.error('[subdomain/check-availability]', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
