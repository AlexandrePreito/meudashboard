/**
 * API Route - Developer Groups
 * Gerenciamento de grupos pelo desenvolvedor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Lista grupos do desenvolvedor
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();

    const { data: groups, error } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        slug,
        status,
        logo_url,
        primary_color,
        secondary_color,
        document,
        email,
        phone,
        quota_whatsapp_per_day,
        quota_ai_credits_per_day,
        quota_alert_executions_per_day,
        quota_users,
        quota_screens,
        quota_alerts,
        use_developer_logo,
        use_developer_colors,
        created_at
      `)
      .eq('developer_id', developerId)
      .eq('status', 'active')
      .order('name');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Buscar contagens para cada grupo
    const groupsWithCounts = await Promise.all(
      (groups || []).map(async (group) => {
        const { count: usersCount } = await supabase
          .from('user_group_membership')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id)
          .eq('is_active', true);

        const { count: screensCount } = await supabase
          .from('powerbi_dashboard_screens')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id);

        const { count: alertsCount } = await supabase
          .from('ai_alerts')
          .select('*', { count: 'exact', head: true })
          .eq('company_group_id', group.id);

        return {
          ...group,
          users_count: usersCount || 0,
          screens_count: screensCount || 0,
          alerts_count: alertsCount || 0,
        };
      })
    );

    return NextResponse.json({ groups: groupsWithCounts });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar grupo
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const supabase = createAdminClient();

    // Validar limite de grupos
    const { data: developer } = await supabase
      .from('developers')
      .select('max_companies')
      .eq('user_id', user.id)
      .single();

    const groupLimit = developer?.max_companies || 5;

    // Contar grupos ativos deste developer
    const { count: groupsCount } = await supabase
      .from('company_groups')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', developerId)
      .eq('status', 'active');

    // Bloquear se limite atingido
    if (groupsCount !== null && groupsCount >= groupLimit) {
      return NextResponse.json({
        error: `Limite de ${groupLimit} grupos atingido. Entre em contato com o administrador.`,
        current: groupsCount,
        max: groupLimit
      }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      logo_url,
      primary_color,
      secondary_color,
      use_developer_logo,
      use_developer_colors,
      quota_users,
      quota_screens,
      quota_alerts,
      quota_whatsapp_per_day,
      quota_ai_credits_per_day,
      quota_alert_executions_per_day,
    } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Nome e slug são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se slug já existe
    const { data: existingSlug } = await supabase
      .from('company_groups')
      .select('id')
      .eq('slug', slug.toLowerCase())
      .maybeSingle();

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Este slug já está em uso' },
        { status: 400 }
      );
    }

    const { data: group, error } = await supabase
      .from('company_groups')
      .insert({
        name,
        slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        developer_id: developerId,
        logo_url,
        primary_color,
        secondary_color,
        use_developer_logo: use_developer_logo ?? true,
        use_developer_colors: use_developer_colors ?? true,
        quota_users,
        quota_screens,
        quota_alerts,
        quota_whatsapp_per_day,
        quota_ai_credits_per_day,
        quota_alert_executions_per_day,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
