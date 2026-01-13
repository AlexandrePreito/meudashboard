import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    if (!user.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = createAdminClient();

    // Data de inicio
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    // Buscar consumo diario
    const { data: dailyData } = await supabase
      .from('daily_usage')
      .select('usage_date, whatsapp_messages_sent, ai_credits_used, alert_executions')
      .gte('usage_date', startDateStr)
      .order('usage_date');

    // Agregar por dia
    const dailyMap = new Map<string, { whatsapp: number; ai: number; alerts: number }>();
    for (const row of dailyData || []) {
      const date = row.usage_date;
      const existing = dailyMap.get(date) || { whatsapp: 0, ai: 0, alerts: 0 };
      existing.whatsapp += row.whatsapp_messages_sent || 0;
      existing.ai += row.ai_credits_used || 0;
      existing.alerts += row.alert_executions || 0;
      dailyMap.set(date, existing);
    }

    const dailyUsage = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    })).sort((a, b) => a.date.localeCompare(b.date));

    // Buscar grupos com desenvolvedor
    const { data: groups } = await supabase
      .from('company_groups')
      .select('id, name, developer_id');

    // Buscar desenvolvedores
    const { data: developers } = await supabase
      .from('developers')
      .select('id, name');

    const devMap = (developers || []).reduce((acc, dev) => {
      acc[dev.id] = dev.name;
      return acc;
    }, {} as Record<string, string>);

    // Agregar por grupo
    const groupMap = new Map<string, { name: string; developer_name: string; whatsapp: number; ai: number; alerts: number }>();
    for (const group of groups || []) {
      groupMap.set(group.id, {
        name: group.name,
        developer_name: devMap[group.developer_id] || 'Desconhecido',
        whatsapp: 0,
        ai: 0,
        alerts: 0
      });
    }

    // Buscar consumo por grupo
    const { data: groupUsageData } = await supabase
      .from('daily_usage')
      .select('company_group_id, whatsapp_messages_sent, ai_credits_used, alert_executions')
      .gte('usage_date', startDateStr);

    for (const row of groupUsageData || []) {
      const existing = groupMap.get(row.company_group_id);
      if (existing) {
        existing.whatsapp += row.whatsapp_messages_sent || 0;
        existing.ai += row.ai_credits_used || 0;
        existing.alerts += row.alert_executions || 0;
      }
    }

    const groupUsage = Array.from(groupMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .filter(g => g.whatsapp > 0 || g.ai > 0 || g.alerts > 0)
      .sort((a, b) => (b.whatsapp + b.ai + b.alerts) - (a.whatsapp + a.ai + a.alerts));

    // Agregar por desenvolvedor
    const developerMap = new Map<string, { name: string; whatsapp: number; ai: number; alerts: number }>();
    for (const dev of developers || []) {
      developerMap.set(dev.id, { name: dev.name, whatsapp: 0, ai: 0, alerts: 0 });
    }

    for (const group of groups || []) {
      const groupData = groupMap.get(group.id);
      const devData = developerMap.get(group.developer_id);
      if (groupData && devData) {
        devData.whatsapp += groupData.whatsapp;
        devData.ai += groupData.ai;
        devData.alerts += groupData.alerts;
      }
    }

    const developerUsage = Array.from(developerMap.entries())
      .map(([id, data]) => ({ id, ...data }))
      .filter(d => d.whatsapp > 0 || d.ai > 0 || d.alerts > 0)
      .sort((a, b) => (b.whatsapp + b.ai + b.alerts) - (a.whatsapp + a.ai + a.alerts));

    // Totais
    const totals = {
      whatsapp: dailyUsage.reduce((sum, d) => sum + d.whatsapp, 0),
      ai: dailyUsage.reduce((sum, d) => sum + d.ai, 0),
      alerts: dailyUsage.reduce((sum, d) => sum + d.alerts, 0)
    };

    return NextResponse.json({
      dailyUsage,
      developerUsage,
      groupUsage,
      totals
    });
  } catch (error: any) {
    console.error('Erro ao buscar relatorios:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
