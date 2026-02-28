import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthUser } from '@/lib/auth';
import bcrypt from 'bcryptjs';

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET - Listar todos os desenvolvedores
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const supabase = getSupabase();

    // Buscar developers com plan_id (sem join para evitar FK ambígua)
    const { data: developers, error } = await supabase
      .from('developers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar planos por ID (apenas os referenciados)
    const planIds = [...new Set((developers || []).map((d) => d.plan_id).filter(Boolean))];
    let planMap: Record<string, { name: string }> = {};
    if (planIds.length > 0) {
      const { data: plansById } = await supabase
        .from('developer_plans')
        .select('id, name')
        .in('id', planIds);
      planMap = Object.fromEntries((plansById || []).map((p) => [String(p.id), p]));
    }

    // Buscar contagens (user_group_membership para usuários)
    const developersWithCounts = await Promise.all(
      (developers || []).map(async (dev) => {
        const { count: groupsCount } = await supabase
          .from('company_groups')
          .select('id', { count: 'exact', head: true })
          .eq('developer_id', dev.id);

        const { data: groups } = await supabase
          .from('company_groups')
          .select('id')
          .eq('developer_id', dev.id);

        let usersCount = 0;
        if (groups && groups.length > 0) {
          const groupIds = groups.map((g) => g.id);
          const { count } = await supabase
            .from('user_group_membership')
            .select('id', { count: 'exact', head: true })
            .in('company_group_id', groupIds)
            .eq('is_active', true);
          usersCount = count || 0;
        }

        const plan = dev.plan_id ? planMap[String(dev.plan_id)] : null;
        return {
          ...dev,
          plan_name: plan?.name || 'Free',
          plan_id: dev.plan_id,
          groups_count: groupsCount || 0,
          users_count: usersCount
        };
      })
    );

    // Planos disponíveis (ativos) para selects no UI
    const { data: plans } = await supabase
      .from('developer_plans')
      .select('id, name, max_companies, max_users, max_powerbi_screens, max_whatsapp_messages_per_month, max_ai_alerts_per_month, max_ai_questions_per_day, ai_enabled')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    return NextResponse.json({
      developers: developersWithCounts,
      plans: plans || []
    });
  } catch (error: any) {
    console.error('Erro ao listar desenvolvedores:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar novo desenvolvedor
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, email, phone, document, plan_id, logo_url, primary_color, status,
      notes, responsible_name, responsible_email, responsible_phone,
      address_street, address_number, address_complement, address_neighborhood,
      address_city, address_state, address_zip,
      login_email, login_password
    } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e email sao obrigatorios' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Verificar se email ja existe em developers
    const { data: existingDev } = await supabase
      .from('developers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingDev) {
      return NextResponse.json({ error: 'Ja existe um desenvolvedor com este email' }, { status: 400 });
    }

    // Gerar slug
    const slug = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Criar desenvolvedor
    const { data: developer, error: devError } = await supabase
      .from('developers')
      .insert({
        name,
        slug,
        email,
        phone: phone || null,
        document: document || null,
        plan_id: plan_id || null,
        logo_url: logo_url || null,
        primary_color: primary_color || '#3B82F6',
        status: status || 'active',
        notes: notes || null,
        responsible_name: responsible_name || null,
        responsible_email: responsible_email || null,
        responsible_phone: responsible_phone || null,
        address_street: address_street || null,
        address_number: address_number || null,
        address_complement: address_complement || null,
        address_neighborhood: address_neighborhood || null,
        address_city: address_city || null,
        address_state: address_state || null,
        address_zip: address_zip || null
      })
      .select()
      .single();

    if (devError) throw devError;

    // Se forneceu login_email e login_password, criar usuario
    if (login_email && login_password) {
      // Verificar se usuario ja existe
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', login_email)
        .single();

      if (existingUser) {
        return NextResponse.json({ 
          error: 'Ja existe um usuario com este email de login',
          developer 
        }, { status: 400 });
      }

      // Hash da senha
      const password_hash = await bcrypt.hash(login_password, 10);

      // Criar usuario
      const { error: userError } = await supabase
        .from('users')
        .insert({
          email: login_email,
          password_hash,
          full_name: responsible_name || name,
          is_developer_user: true,
          developer_id: developer.id,
          status: 'active'
        });

      if (userError) {
        console.error('Erro ao criar usuario:', userError);
        // Nao falha, apenas avisa
      }
    }

    return NextResponse.json({ developer });
  } catch (error: any) {
    console.error('Erro ao criar desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
