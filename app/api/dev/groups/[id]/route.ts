/**
 * API Route - Developer Group [id]
 * Operações em grupo específico pelo desenvolvedor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Detalhes do grupo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Buscar grupo verificando se pertence ao desenvolvedor
    const { data: group, error } = await supabase
      .from('company_groups')
      .select('*')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (error || !group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Buscar usuários do grupo
    const { data: users } = await supabase
      .from('user_group_membership')
      .select(`
        id,
        role,
        is_active,
        user:users(id, email, full_name, status, last_login_at)
      `)
      .eq('company_group_id', id);

    // Buscar telas do grupo
    const { data: screens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id, name, is_active')
      .eq('company_group_id', id);

    // Buscar alertas do grupo
    const { data: alerts } = await supabase
      .from('ai_alerts')
      .select('id, name, is_active')
      .eq('company_group_id', id);

    // Buscar uso de hoje
    const today = new Date().toISOString().split('T')[0];
    const { data: usageToday } = await supabase
      .from('daily_usage')
      .select('*')
      .eq('company_group_id', id)
      .eq('usage_date', today)
      .maybeSingle();

    return NextResponse.json({
      group,
      users: users || [],
      screens: screens || [],
      alerts: alerts || [],
      usage_today: usageToday || {
        whatsapp_messages_sent: 0,
        ai_credits_used: 0,
        alert_executions: 0,
      },
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar grupo
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: existing } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      logo_url,
      primary_color,
      secondary_color,
      use_developer_logo,
      use_developer_colors,
      status,
      quota_users,
      quota_screens,
      quota_alerts,
      quota_whatsapp_per_day,
      quota_ai_credits_per_day,
      quota_alert_executions_per_day,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
    if (use_developer_logo !== undefined) updateData.use_developer_logo = use_developer_logo ?? true;
    if (use_developer_colors !== undefined) updateData.use_developer_colors = use_developer_colors ?? true;
    if (status !== undefined) updateData.status = status;
    if (quota_users !== undefined) updateData.quota_users = quota_users;
    if (quota_screens !== undefined) updateData.quota_screens = quota_screens;
    if (quota_alerts !== undefined) updateData.quota_alerts = quota_alerts;
    if (quota_whatsapp_per_day !== undefined) updateData.quota_whatsapp_per_day = quota_whatsapp_per_day;
    if (quota_ai_credits_per_day !== undefined) updateData.quota_ai_credits_per_day = quota_ai_credits_per_day;
    if (quota_alert_executions_per_day !== undefined) updateData.quota_alert_executions_per_day = quota_alert_executions_per_day;

    const { data: group, error } = await supabase
      .from('company_groups')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, group });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Desativar grupo
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: existing } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Soft delete
    const { error } = await supabase
      .from('company_groups')
      .update({ status: 'suspended' })
      .eq('id', id);

    if (error) {
      console.error('Erro ao desativar grupo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
