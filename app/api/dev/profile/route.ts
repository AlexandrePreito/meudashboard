import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

// GET - Buscar perfil do desenvolvedor
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Usuario nao e desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();
    
    const { data: developer, error } = await supabase
      .from('developers')
      .select('id, name, logo_url, primary_color, phone, subdomain, subdomain_enabled, subdomain_approved, subdomain_allowed, landing_title, landing_description, landing_background_url')
      .eq('id', developerId)
      .single();

    if (error) {
      console.error('Erro ao buscar developer:', error);
      return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
    }

    return NextResponse.json({
      developer: { ...developer, email: user.email },
    });
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar perfil do desenvolvedor
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Usuario nao e desenvolvedor' }, { status: 403 });
    }

    const body = await request.json();
    const { name, logo_url, primary_color, phone } = body;

    const supabase = createAdminClient();
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) {
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 });
      }
      updateData.name = name.trim();
    }
    if (logo_url !== undefined) updateData.logo_url = logo_url || null;
    if (primary_color !== undefined) updateData.primary_color = primary_color || null;
    if (phone !== undefined) updateData.phone = phone || null;

    const { data: developer, error } = await supabase
      .from('developers')
      .update(updateData)
      .eq('id', developerId)
      .select('id, name, logo_url, primary_color')
      .single();

    if (error) {
      console.error('Erro ao atualizar developer:', error);
      return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
    }

    return NextResponse.json({ developer, message: 'Perfil atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}