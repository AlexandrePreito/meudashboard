import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

const RESERVED_SUBDOMAINS = [
  'www', 'app', 'api', 'admin', 'dev', 'login', 'cadastro',
  'mail', 'smtp', 'ftp', 'blog', 'docs', 'help', 'support',
  'status', 'cdn', 'assets', 'static', 'staging', 'test',
];

function validateSubdomain(slug: string): { ok: boolean; error?: string } {
  if (!slug || slug.length < 3 || slug.length > 63) {
    return { ok: false, error: 'Subdomínio deve ter entre 3 e 63 caracteres' };
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { ok: false, error: 'Use apenas letras minúsculas, números e hífen' };
  }
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return { ok: false, error: 'Não pode começar ou terminar com hífen' };
  }
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    return { ok: false, error: 'Este subdomínio está reservado' };
  }
  return { ok: true };
}

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('developers')
      .select('subdomain, subdomain_enabled, subdomain_approved, landing_title, landing_description, landing_background_url')
      .eq('id', developerId)
      .single();

    if (error) return NextResponse.json({ error: 'Erro ao buscar subdomínio' }, { status: 500 });

    return NextResponse.json({
      subdomain: data?.subdomain || '',
      subdomain_enabled: !!data?.subdomain_enabled,
      subdomain_approved: !!data?.subdomain_approved,
      landing_title: data?.landing_title || '',
      landing_description: data?.landing_description || '',
      landing_background_url: data?.landing_background_url || '',
    });
  } catch (e) {
    console.error('[dev/subdomain GET]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso apenas para desenvolvedores' }, { status: 403 });

    const supabase = createAdminClient();
    const { data: dev } = await supabase
      .from('developers')
      .select('subdomain_allowed')
      .eq('id', developerId)
      .single();
    if (!dev?.subdomain_allowed) {
      return NextResponse.json({ error: 'Subdomínio não habilitado. Entre em contato com o administrador.' }, { status: 403 });
    }

    const body = await request.json();
    let { subdomain, landing_title, landing_description, landing_background_url } = body;

    const sub = typeof subdomain === 'string' ? subdomain.toLowerCase().trim() : '';
    if (sub) {
      const validation = validateSubdomain(sub);
      if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

      const { data: existing } = await supabase
        .from('developers')
        .select('id')
        .eq('subdomain', sub)
        .neq('id', developerId)
        .maybeSingle();
      if (existing) return NextResponse.json({ error: 'Este subdomínio já está em uso' }, { status: 409 });
    }

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (typeof subdomain === 'string') {
      update.subdomain = sub || null;
      update.subdomain_enabled = !!sub;
      update.subdomain_approved = false;
    }
    if (typeof landing_title === 'string') update.landing_title = landing_title.trim() || null;
    if (typeof landing_description === 'string') update.landing_description = landing_description.trim() || null;
    if (typeof landing_background_url === 'string') update.landing_background_url = landing_background_url.trim() || null;

    const { data, error } = await supabase
      .from('developers')
      .update(update)
      .eq('id', developerId)
      .select('subdomain, subdomain_enabled, subdomain_approved, landing_title, landing_description, landing_background_url')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      subdomain: data?.subdomain || '',
      subdomain_enabled: !!data?.subdomain_enabled,
      subdomain_approved: !!data?.subdomain_approved,
      landing_title: data?.landing_title || '',
      landing_description: data?.landing_description || '',
      landing_background_url: data?.landing_background_url || '',
    });
  } catch (e) {
    console.error('[dev/subdomain PUT]', e);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
