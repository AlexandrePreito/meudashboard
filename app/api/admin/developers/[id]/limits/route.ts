import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    
    if (!user || !user.is_master) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient();

    const {
      max_companies,
      max_users,
      max_powerbi_screens,
      max_daily_refreshes,
      max_chat_messages_per_day,
      max_alerts,
      monthly_price
    } = body;

    // Verificar se o desenvolvedor existe
    const { data: developer, error: findError } = await supabase
      .from('developers')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !developer) {
      return NextResponse.json(
        { error: 'Desenvolvedor não encontrado' },
        { status: 404 }
      );
    }

    // Atualizar os limites
    const { data, error } = await supabase
      .from('developers')
      .update({
        max_companies: max_companies ?? 5,
        max_users: max_users ?? 50,
        max_powerbi_screens: max_powerbi_screens ?? 10,
        max_daily_refreshes: max_daily_refreshes ?? 20,
        max_chat_messages_per_day: max_chat_messages_per_day ?? 1000,
        max_alerts: max_alerts ?? 20,
        monthly_price: monthly_price ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar limites:', error);
      return NextResponse.json(
        { error: 'Erro ao atualizar limites' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      developer: data
    });

  } catch (error) {
    console.error('Erro na API de limites:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    
    if (!user || !user.is_master) {
      return NextResponse.json(
        { error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: developer, error } = await supabase
      .from('developers')
      .select(`
        id,
        name,
        max_companies,
        max_users,
        max_powerbi_screens,
        max_daily_refreshes,
        max_chat_messages_per_day,
        max_alerts,
        monthly_price
      `)
      .eq('id', id)
      .single();

    if (error || !developer) {
      return NextResponse.json(
        { error: 'Desenvolvedor não encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ developer });

  } catch (error) {
    console.error('Erro ao buscar limites:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
