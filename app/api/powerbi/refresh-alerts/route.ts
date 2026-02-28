import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

const DAILY_ALERT_LIMIT = 10; // Limite de disparos por grupo por dia

// GET - Listar alertas de refresh de um grupo
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');
    if (!groupId) return NextResponse.json({ error: 'group_id obrigatório' }, { status: 400 });

    const supabase = createAdminClient();

    // Verificar permissão
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', groupId)
          .eq('developer_id', developerId)
          .single();
        if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      } else {
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_group_id', groupId)
          .eq('is_active', true)
          .single();
        if (!membership || membership.role === 'user') {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }
    }

    const { data: alerts, error } = await supabase
      .from('refresh_alerts')
      .select('*')
      .eq('company_group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Buscar contagem de disparos de hoje
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
    const { count: todayCount } = await supabase
      .from('refresh_alert_daily_log')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', groupId)
      .eq('date_key', today);

    return NextResponse.json({
      alerts: alerts || [],
      daily_usage: {
        used: todayCount || 0,
        limit: DAILY_ALERT_LIMIT,
        remaining: Math.max(0, DAILY_ALERT_LIMIT - (todayCount || 0)),
      }
    });
  } catch (error: any) {
    console.error('[refresh-alerts GET]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar ou atualizar alerta de refresh
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const body = await request.json();
    const supabase = createAdminClient();

    const {
      company_group_id,
      refresh_order_item_id,
      item_name,
      item_type,
      dataset_id,
      dataflow_id,
      connection_id,
      is_enabled,
      alert_on_error,
      alert_on_delay,
      alert_daily_report,
      expected_refresh_time,
      daily_report_time,
      whatsapp_numbers,
    } = body;

    if (!company_group_id) return NextResponse.json({ error: 'company_group_id obrigatório' }, { status: 400 });
    if (!item_name || !item_type) return NextResponse.json({ error: 'item_name e item_type obrigatórios' }, { status: 400 });

    // Verificar permissão
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', company_group_id)
          .eq('developer_id', developerId)
          .single();
        if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      } else {
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_group_id', company_group_id)
          .eq('is_active', true)
          .single();
        if (!membership || membership.role === 'user') {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }
    }

    // Verificar se já existe alerta para este item neste grupo
    const itemId = item_type === 'dataset' ? dataset_id : dataflow_id;
    const { data: existing } = await supabase
      .from('refresh_alerts')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('item_type', item_type)
      .eq(item_type === 'dataset' ? 'dataset_id' : 'dataflow_id', itemId)
      .maybeSingle();

    const alertData = {
      company_group_id,
      refresh_order_item_id: refresh_order_item_id || null,
      item_name,
      item_type,
      dataset_id: dataset_id || null,
      dataflow_id: dataflow_id || null,
      connection_id: connection_id || null,
      is_enabled: is_enabled ?? true,
      alert_on_error: alert_on_error ?? true,
      alert_on_delay: alert_on_delay ?? false,
      alert_daily_report: alert_daily_report ?? false,
      expected_refresh_time: expected_refresh_time || '08:00',
      daily_report_time: daily_report_time || '07:00',
      whatsapp_numbers: whatsapp_numbers || null,
      updated_at: new Date().toISOString(),
    };

    let alert;
    let error;

    if (existing) {
      const result = await supabase
        .from('refresh_alerts')
        .update(alertData)
        .eq('id', existing.id)
        .select()
        .single();
      alert = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .from('refresh_alerts')
        .insert({
          ...alertData,
          created_by: user.id,
        })
        .select()
        .single();
      alert = result.data;
      error = result.error;
    }

    if (error) throw error;

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('[refresh-alerts POST]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir alerta de refresh
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const supabase = createAdminClient();

    const { data: alert } = await supabase
      .from('refresh_alerts')
      .select('company_group_id')
      .eq('id', id)
      .single();

    if (!alert) return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });

    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      if (developerId) {
        const { data: group } = await supabase
          .from('company_groups')
          .select('id')
          .eq('id', alert.company_group_id)
          .eq('developer_id', developerId)
          .single();
        if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      } else {
        const { data: membership } = await supabase
          .from('user_group_membership')
          .select('role')
          .eq('user_id', user.id)
          .eq('company_group_id', alert.company_group_id)
          .eq('is_active', true)
          .single();
        if (!membership || membership.role === 'user') {
          return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
        }
      }
    }

    const { error } = await supabase
      .from('refresh_alerts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[refresh-alerts DELETE]', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
