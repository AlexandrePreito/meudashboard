import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar alerta por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    const { data: alert, error } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar alerta:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    return NextResponse.json({ alert });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

