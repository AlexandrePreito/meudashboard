import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { slug } = await params;

    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: 'Subdomínio inválido' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: developer, error } = await supabase
      .from('developers')
      .select(`
        id,
        name,
        slug,
        subdomain,
        logo_url,
        primary_color,
        secondary_color,
        landing_title,
        landing_description,
        landing_background_url
      `)
      .eq('subdomain', slug.toLowerCase())
      .eq('subdomain_enabled', true)
      .eq('subdomain_approved', true)
      .eq('status', 'active')
      .single();

    if (error || !developer) {
      return NextResponse.json({ error: 'Subdomínio não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      name: developer.name,
      logo_url: developer.logo_url,
      primary_color: developer.primary_color || '#3B82F6',
      secondary_color: developer.secondary_color || '#1E40AF',
      landing_title: developer.landing_title || developer.name,
      landing_description: developer.landing_description || '',
      landing_background_url: developer.landing_background_url,
    });
  } catch (error) {
    console.error('[subdomain]', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
