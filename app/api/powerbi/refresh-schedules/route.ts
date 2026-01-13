import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// Função auxiliar para verificar permissão no grupo
async function checkGroupPermission(supabase: any, user: any, groupId: string): Promise<boolean> {
  // Master tem acesso total
  if (user.is_master) return true;
  
  // Developer pode acessar grupos que criou
  const developerId = await getUserDeveloperId(user.id);
  if (developerId) {
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();
    return !!group;
  }
  
  // Admin/User pode acessar via membership
  const { data: membership } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .single();
  
  return !!membership;
}

// GET - Buscar agendamentos de um grupo
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão no grupo
    const hasPermission = await checkGroupPermission(supabase, user, groupId);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para acessar este grupo' }, { status: 403 });
    }

    const { data: schedules, error } = await supabase
      .from('powerbi_refresh_schedules')
      .select('*')
      .eq('company_group_id', groupId);

    if (error) throw error;

    return NextResponse.json({ schedules: schedules || [] });

  } catch (error: any) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar ou atualizar agendamento
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      company_group_id, 
      item_id, 
      item_type, 
      item_name,
      dataflow_id,
      dataset_id,
      connection_id,
      schedule_enabled, 
      schedule_times, 
      schedule_days 
    } = body;

    if (!company_group_id || !item_id || !item_type) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar permissão no grupo
    const hasPermission = await checkGroupPermission(supabase, user, company_group_id);
    if (!hasPermission) {
      return NextResponse.json({ error: 'Sem permissão para acessar este grupo' }, { status: 403 });
    }

    // Calcular próxima execução
    let next_run_at = null;
    if (schedule_enabled && schedule_times?.length > 0 && schedule_days?.length > 0) {
      next_run_at = calculateNextRun(schedule_times, schedule_days);
    }

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('powerbi_refresh_schedules')
      .select('id')
      .eq('company_group_id', company_group_id)
      .eq('item_id', item_id)
      .eq('item_type', item_type)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('powerbi_refresh_schedules')
        .update({
          item_name,
          dataflow_id,
          dataset_id,
          connection_id,
          schedule_enabled,
          schedule_times,
          schedule_days,
          next_run_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('powerbi_refresh_schedules')
        .insert({
          company_group_id,
          item_id,
          item_type,
          item_name,
          dataflow_id,
          dataset_id,
          connection_id,
          schedule_enabled,
          schedule_times,
          schedule_days,
          next_run_at
        });

      if (error) throw error;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao salvar agendamento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remover agendamento
export async function DELETE(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('powerbi_refresh_schedules')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro ao remover agendamento:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Função para calcular próxima execução
function calculateNextRun(times: string[], days: number[]): string {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Ordenar horários
  const sortedTimes = [...times].sort();

  // Verificar se há execução hoje
  if (days.includes(currentDay)) {
    for (const time of sortedTimes) {
      const [hours, minutes] = time.split(':').map(Number);
      const timeInMinutes = hours * 60 + minutes;
      if (timeInMinutes > currentTime) {
        const nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);
        return nextRun.toISOString();
      }
    }
  }

  // Encontrar próximo dia
  for (let i = 1; i <= 7; i++) {
    const nextDay = (currentDay + i) % 7;
    if (days.includes(nextDay)) {
      const [hours, minutes] = sortedTimes[0].split(':').map(Number);
      const nextRun = new Date(now);
      nextRun.setDate(now.getDate() + i);
      nextRun.setHours(hours, minutes, 0, 0);
      return nextRun.toISOString();
    }
  }

  return new Date().toISOString();
}

