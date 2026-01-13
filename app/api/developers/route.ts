/**
 * API Route - Developers
 * CRUD de desenvolvedores - APENAS MASTER
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Lista desenvolvedores
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('developers')
      .select(`
        *,
        plan:developer_plans(id, name, max_groups, max_users)
      `)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: developers, error } = await query;

    if (error) {
      console.error('Erro ao buscar desenvolvedores:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar contagem de grupos para cada desenvolvedor
    const developersWithCounts = await Promise.all(
      (developers || []).map(async (dev) => {
        const { count: groupsCount } = await supabase
          .from('company_groups')
          .select('*', { count: 'exact', head: true })
          .eq('developer_id', dev.id);

        const { count: usersCount } = await supabase
          .from('developer_users')
          .select('*', { count: 'exact', head: true })
          .eq('developer_id', dev.id)
          .eq('is_active', true);

        return {
          ...dev,
          groups_count: groupsCount || 0,
          users_count: usersCount || 0,
        };
      })
    );

    return NextResponse.json({ developers: developersWithCounts });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar desenvolvedor
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      document,
      email,
      phone,
      logo_url,
      primary_color,
      secondary_color,
      plan_id,
      notes,
      owner_email,
      owner_name,
      owner_password,
    } = body;

    if (!name || !slug || !email) {
      return NextResponse.json(
        { error: 'Nome, slug e email são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verificar se slug já existe
    const { data: existingSlug } = await supabase
      .from('developers')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Este slug já está em uso' },
        { status: 400 }
      );
    }

    // Criar desenvolvedor
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        document,
        email: email.toLowerCase(),
        phone,
        logo_url,
        primary_color: primary_color || '#3B82F6',
        secondary_color: secondary_color || '#1E40AF',
        plan_id,
        notes,
        status: 'active',
      })
      .select()
      .single();

    if (devError) {
      console.error('Erro ao criar desenvolvedor:', devError);
      return NextResponse.json({ error: devError.message }, { status: 500 });
    }

    // Se dados de owner foram fornecidos, criar usuário owner
    if (owner_email && owner_name && owner_password) {
      const bcrypt = require('bcryptjs');
      const passwordHash = await bcrypt.hash(owner_password, 10);

      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', owner_email.toLowerCase())
        .maybeSingle();

      let ownerId: string;

      if (existingUser) {
        ownerId = existingUser.id;
        // Atualizar para is_developer_user
        await supabase
          .from('users')
          .update({ is_developer_user: true })
          .eq('id', ownerId);
      } else {
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert({
            email: owner_email.toLowerCase(),
            full_name: owner_name,
            password_hash: passwordHash,
            is_master: false,
            is_developer_user: true,
            status: 'active',
          })
          .select('id')
          .single();

        if (userError) {
          await supabase.from('developers').delete().eq('id', developer.id);
          return NextResponse.json({ error: 'Erro ao criar usuário owner' }, { status: 500 });
        }

        ownerId = newUser.id;
      }

      await supabase
        .from('developer_users')
        .insert({
          developer_id: developer.id,
          user_id: ownerId,
          role: 'owner',
          is_active: true,
        });
    }

    return NextResponse.json({ success: true, developer });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
