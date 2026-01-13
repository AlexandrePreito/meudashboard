import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar planos de desenvolvedor
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: plans, error } = await supabase
      .from('developer_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ plans: plans || [] });
  } catch (error: any) {
    console.error('Erro ao buscar planos de desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar plano de desenvolvedor
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      max_daily_refreshes,
      max_powerbi_screens,
      max_users,
      max_companies,
      max_ai_questions_per_day,
      max_ai_alerts_per_month,
      max_whatsapp_messages_per_month,
      ai_enabled,
      is_active,
      display_order
    } = body;

    const supabase = createAdminClient();

    const { data: plan, error } = await supabase
      .from('developer_plans')
      .insert({
        name,
        description,
        max_daily_refreshes: max_daily_refreshes || 1,
        max_powerbi_screens: max_powerbi_screens || 1,
        max_users: max_users || 1,
        max_companies: max_companies || 1,
        max_ai_questions_per_day: max_ai_questions_per_day || 0,
        max_ai_alerts_per_month: max_ai_alerts_per_month || 0,
        max_whatsapp_messages_per_month: max_whatsapp_messages_per_month || 0,
        ai_enabled: ai_enabled || false,
        is_active: is_active !== false,
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plan });
  } catch (error: any) {
    console.error('Erro ao criar plano de desenvolvedor:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
