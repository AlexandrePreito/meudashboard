import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('alert_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('ai_alert_history')
      .select(`
        *,
        ai_alerts (
          name,
          description
        )
      `)
      .order('triggered_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (alertId) {
      query = query.eq('alert_id', alertId);
    }

    const { data: history, error } = await query;

    if (error) {
      console.error('Erro ao buscar histórico:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Contar total
    let countQuery = supabase
      .from('ai_alert_history')
      .select('*', { count: 'exact', head: true });
    
    if (alertId) {
      countQuery = countQuery.eq('alert_id', alertId);
    }

    const { count } = await countQuery;

    return NextResponse.json({
      history: history || [],
      total: count || 0,
      limit,
      offset
    });

  } catch (error: any) {
    console.error('Erro no histórico:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

