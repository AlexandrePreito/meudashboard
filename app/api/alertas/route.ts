import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar alertas
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('ai_alerts')
      .select(`
        id,
        name,
        description,
        is_enabled,
        alert_type,
        dax_query,
        condition,
        threshold,
        check_frequency,
        check_times,
        check_days_of_week,
        check_days_of_month,
        notify_whatsapp,
        whatsapp_number,
        whatsapp_group_id,
        message_template,
        last_checked_at,
        last_triggered_at,
        created_at,
        connection_id,
        dataset_id,
        context_id
      `)
      .order('created_at', { ascending: false });

    // Se não for master, filtra por grupo
    if (!user.is_master) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (membership?.company_group_id) {
        query = query.eq('company_group_id', membership.company_group_id);
      }
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error('Erro ao buscar alertas:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alerts: alerts || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar alerta
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const supabase = createAdminClient();

    // Buscar grupo do usuário
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    const companyGroupId = membership?.company_group_id;
    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    const { data: alert, error } = await supabase
      .from('ai_alerts')
      .insert({
        company_group_id: companyGroupId,
        created_by: user.id,
        name: body.name,
        description: body.description || null,
        is_enabled: true,
        alert_type: body.alert_type || 'warning',
        alert_config: body.alert_config || {},
        dax_query: body.dax_query || null,
        condition: body.condition || null,
        threshold: body.threshold || null,
        check_frequency: body.check_frequency || 'daily',
        check_times: body.check_times || ['08:00'],
        check_days_of_week: body.check_days_of_week || [],
        check_days_of_month: body.check_days_of_month || [],
        connection_id: body.connection_id || null,
        dataset_id: body.dataset_id || null,
        context_id: body.context_id || null,
        notify_whatsapp: body.notify_whatsapp || false,
        whatsapp_number: body.whatsapp_numbers?.join(',') || null,
        whatsapp_group_id: body.whatsapp_group_ids?.join(',') || null,
        message_template: body.message_template || null,
        notify_webhook: body.notify_webhook || false,
        webhook_url: body.webhook_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar alerta
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Preparar dados para atualização
    const dataToUpdate: any = {
      updated_at: new Date().toISOString()
    };

    if (updateData.name !== undefined) dataToUpdate.name = updateData.name;
    if (updateData.description !== undefined) dataToUpdate.description = updateData.description;
    if (updateData.is_enabled !== undefined) dataToUpdate.is_enabled = updateData.is_enabled;
    if (updateData.alert_type !== undefined) dataToUpdate.alert_type = updateData.alert_type;
    if (updateData.dax_query !== undefined) dataToUpdate.dax_query = updateData.dax_query;
    if (updateData.condition !== undefined) dataToUpdate.condition = updateData.condition;
    if (updateData.threshold !== undefined) dataToUpdate.threshold = updateData.threshold;
    if (updateData.check_frequency !== undefined) dataToUpdate.check_frequency = updateData.check_frequency;
    if (updateData.check_times !== undefined) dataToUpdate.check_times = updateData.check_times;
    if (updateData.check_days_of_week !== undefined) dataToUpdate.check_days_of_week = updateData.check_days_of_week;
    if (updateData.check_days_of_month !== undefined) dataToUpdate.check_days_of_month = updateData.check_days_of_month;
    if (updateData.connection_id !== undefined) dataToUpdate.connection_id = updateData.connection_id;
    if (updateData.dataset_id !== undefined) dataToUpdate.dataset_id = updateData.dataset_id;
    if (updateData.context_id !== undefined) dataToUpdate.context_id = updateData.context_id;
    if (updateData.notify_whatsapp !== undefined) dataToUpdate.notify_whatsapp = updateData.notify_whatsapp;
    if (updateData.whatsapp_numbers !== undefined) dataToUpdate.whatsapp_number = updateData.whatsapp_numbers?.join(',');
    if (updateData.whatsapp_group_ids !== undefined) dataToUpdate.whatsapp_group_id = updateData.whatsapp_group_ids?.join(',');
    if (updateData.message_template !== undefined) dataToUpdate.message_template = updateData.message_template;
    if (updateData.notify_webhook !== undefined) dataToUpdate.notify_webhook = updateData.notify_webhook;
    if (updateData.webhook_url !== undefined) dataToUpdate.webhook_url = updateData.webhook_url;

    const { data: alert, error } = await supabase
      .from('ai_alerts')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir alerta
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('ai_alerts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

