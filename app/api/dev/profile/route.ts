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
      .select('id, name, logo_url, primary_color')
      .eq('id', developerId)
      .single();

    if (error) {
      console.error('Erro ao buscar developer:', error);
      return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
    }

    return NextResponse.json({ developer });
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
    const { name, logo_url, primary_color } = body;

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Nome e obrigatorio' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data: developer, error } = await supabase
      .from('developers')
      .update({
        name: name.trim(),
        logo_url: logo_url || null,
        primary_color: primary_color || null,
        updated_at: new Date().toISOString()
      })
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