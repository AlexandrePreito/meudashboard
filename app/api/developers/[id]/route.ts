/**
 * API Route - Developer [id]
 * Operações em desenvolvedor específico - APENAS MASTER
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Detalhes do desenvolvedor
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: developer, error } = await supabase
      .from('developers')
      .select(`
        *,
        plan:developer_plans(*)
      `)
      .eq('id', id)
      .single();

    if (error || !developer) {
      return NextResponse.json({ error: 'Desenvolvedor não encontrado' }, { status: 404 });
    }

    // Buscar usuários do desenvolvedor
    const { data: devUsers } = await supabase
      .from('developer_users')
      .select(`
        id,
        role,
        is_active,
        user:users(id, email, full_name, status)
      `)
      .eq('developer_id', id);

    // Buscar grupos do desenvolvedor
    const { data: groups } = await supabase
      .from('company_groups')
      .select(`
        id,
        name,
        status,
        quota_whatsapp_per_day,
        quota_ai_credits_per_day,
        quota_alert_executions_per_day,
        quota_users,
        quota_screens,
        quota_alerts,
        created_at
      `)
      .eq('developer_id', id)
      .order('name');

    // Calcular totais alocados
    const allocated = {
      users: 0,
      screens: 0,
      alerts: 0,
      whatsapp: 0,
      ai: 0,
      executions: 0,
    };

    groups?.forEach(g => {
      allocated.users += g.quota_users || 0;
      allocated.screens += g.quota_screens || 0;
      allocated.alerts += g.quota_alerts || 0;
      allocated.whatsapp += g.quota_whatsapp_per_day || 0;
      allocated.ai += g.quota_ai_credits_per_day || 0;
      allocated.executions += g.quota_alert_executions_per_day || 0;
    });

    return NextResponse.json({
      developer,
      users: devUsers || [],
      groups: groups || [],
      allocated,
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar desenvolvedor
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const {
      name,
      document,
      email,
      phone,
      logo_url,
      primary_color,
      secondary_color,
      use_developer_logo,
      use_developer_colors,
      plan_id,
      status,
      notes,
    } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (document !== undefined) updateData.document = document;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (primary_color !== undefined) updateData.primary_color = primary_color;
    if (secondary_color !== undefined) updateData.secondary_color = secondary_color;
    if (use_developer_logo !== undefined) updateData.use_developer_logo = use_developer_logo;
    if (use_developer_colors !== undefined) updateData.use_developer_colors = use_developer_colors;
    if (plan_id !== undefined) updateData.plan_id = plan_id;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'suspended') {
      updateData.suspended_at = new Date().toISOString();
    }

    const { data: developer, error } = await supabase
      .from('developers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar desenvolvedor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, developer });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Desativar desenvolvedor (soft delete)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Soft delete - apenas muda status
    const { error } = await supabase
      .from('developers')
      .update({
        status: 'cancelled',
        suspended_at: new Date().toISOString(),
        suspended_reason: 'Desativado pelo administrador',
      })
      .eq('id', id);

    if (error) {
      console.error('Erro ao desativar desenvolvedor:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Desativar todos os grupos do desenvolvedor
    await supabase
      .from('company_groups')
      .update({ status: 'suspended' })
      .eq('developer_id', id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
