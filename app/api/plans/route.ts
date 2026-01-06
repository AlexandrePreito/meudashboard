import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar planos
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    const { data: plans, error } = await supabase
      .from('powerbi_plans')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ plans: plans || [] });
  } catch (error: any) {
    console.error('Erro ao buscar planos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar plano
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
      display_order
    } = body;

    if (!name) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    
    const { data, error } = await supabase
      .from('powerbi_plans')
      .insert({
        name,
        description,
        max_daily_refreshes: max_daily_refreshes || 1,
        max_powerbi_screens: max_powerbi_screens || 3,
        max_users: max_users || 10,
        max_companies: max_companies || 2,
        display_order: display_order || 0,
        is_active: true
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ plan: data });
  } catch (error: any) {
    console.error('Erro ao criar plano:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

