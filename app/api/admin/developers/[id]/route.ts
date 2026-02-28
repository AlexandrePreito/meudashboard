import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar desenvolvedor por ID com cotas e contagens
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: developer, error } = await supabase
      .from('developers')
      .select(`
        id, name, email, slug, status, logo_url, primary_color,
        plan_id, self_registered, created_at, registered_at,
        max_companies, max_users, max_powerbi_screens,
        max_alerts, max_chat_messages_per_day, max_whatsapp_messages_per_day,
        max_ai_credits_per_day, max_daily_refreshes,
        subdomain, subdomain_enabled, subdomain_approved, subdomain_allowed,
        landing_title, landing_description
      `)
      .eq('id', id)
      .single();

    if (error || !developer) {
      return NextResponse.json({ error: 'Developer nao encontrado' }, { status: 404 });
    }

    const { count: groupCount } = await supabase
      .from('company_groups')
      .select('id', { count: 'exact', head: true })
      .eq('developer_id', id);

    const { count: userCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('developer_id', id);

    const { data: plans } = await supabase
      .from('developer_plans')
      .select('id, name')
      .eq('is_active', true)
      .order('display_order');

    let planName: string | null = null;
    if (developer.plan_id) {
      const { data: planRow } = await supabase
        .from('developer_plans')
        .select('name')
        .eq('id', developer.plan_id)
        .maybeSingle();
      planName = planRow?.name ?? null;
    }

    return NextResponse.json({
      developer: {
        ...developer,
        plan_name: planName || 'Sem plano',
        group_count: groupCount ?? 0,
        user_count: userCount ?? 0,
      },
      plans: plans ?? [],
    });
  } catch (error: any) {
    console.error('Erro ao buscar desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar desenvolvedor (inclui plano e cotas totais)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    // Campos basicos
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.document !== undefined) updateData.document = body.document;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.plan_id !== undefined) updateData.plan_id = body.plan_id || null;
    if (body.logo_url !== undefined) updateData.logo_url = body.logo_url;
    if (body.primary_color !== undefined) updateData.primary_color = body.primary_color;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.allow_shared_tenant !== undefined) updateData.allow_shared_tenant = body.allow_shared_tenant;

    // Responsavel
    if (body.responsible_name !== undefined) updateData.responsible_name = body.responsible_name;
    if (body.responsible_email !== undefined) updateData.responsible_email = body.responsible_email;
    if (body.responsible_phone !== undefined) updateData.responsible_phone = body.responsible_phone;

    // Endereco
    if (body.address_street !== undefined) updateData.address_street = body.address_street;
    if (body.address_number !== undefined) updateData.address_number = body.address_number;
    if (body.address_complement !== undefined) updateData.address_complement = body.address_complement;
    if (body.address_neighborhood !== undefined) updateData.address_neighborhood = body.address_neighborhood;
    if (body.address_city !== undefined) updateData.address_city = body.address_city;
    if (body.address_state !== undefined) updateData.address_state = body.address_state;
    if (body.address_zip !== undefined) updateData.address_zip = body.address_zip;

    // Cotas totais do developer (Master define, Developer distribui entre grupos)
    if (body.max_companies !== undefined) updateData.max_companies = body.max_companies;
    if (body.max_users !== undefined) updateData.max_users = body.max_users;
    if (body.max_powerbi_screens !== undefined) updateData.max_powerbi_screens = body.max_powerbi_screens;
    if (body.max_alerts !== undefined) updateData.max_alerts = body.max_alerts;
    if (body.max_chat_messages_per_day !== undefined) updateData.max_chat_messages_per_day = body.max_chat_messages_per_day;
    if (body.max_whatsapp_messages_per_day !== undefined) {
      updateData.max_whatsapp_messages_per_day = body.max_whatsapp_messages_per_day;
      updateData.max_chat_messages_per_day = body.max_whatsapp_messages_per_day;
    }
    if (body.max_ai_credits_per_day !== undefined) updateData.max_ai_credits_per_day = body.max_ai_credits_per_day;
    if (body.max_daily_refreshes !== undefined) updateData.max_daily_refreshes = body.max_daily_refreshes;

    if (body.subdomain !== undefined) updateData.subdomain = body.subdomain || null;
    if (typeof body.subdomain_enabled === 'boolean') updateData.subdomain_enabled = body.subdomain_enabled;
    if (typeof body.subdomain_approved === 'boolean') updateData.subdomain_approved = body.subdomain_approved;
    if (typeof body.subdomain_allowed === 'boolean') updateData.subdomain_allowed = body.subdomain_allowed;

    const { data: developer, error } = await supabase
      .from('developers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ developer });
  } catch (error: any) {
    console.error('Erro ao atualizar desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir desenvolvedor
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }
    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se tem grupos vinculados
    const { count: groupsCount } = await supabase
      .from('company_groups')
      .select('*', { count: 'exact', head: true })
      .eq('developer_id', id);

    if (groupsCount && groupsCount > 0) {
      return NextResponse.json({
        error: `Este desenvolvedor possui ${groupsCount} grupo(s) vinculado(s). Remova os grupos primeiro.`
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('developers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao excluir desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
