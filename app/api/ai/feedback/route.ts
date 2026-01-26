// app/api/ai/feedback/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { registerFeedback } from '@/lib/query-learning';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { query_id, feedback, comment } = body;

    if (!query_id || !feedback) {
      return NextResponse.json({ 
        error: 'query_id e feedback são obrigatórios' 
      }, { status: 400 });
    }

    if (!['positive', 'negative'].includes(feedback)) {
      return NextResponse.json({ 
        error: 'feedback deve ser "positive" ou "negative"' 
      }, { status: 400 });
    }

    const supabase = createAdminClient();
    const success = await registerFeedback(supabase, query_id, feedback, comment);

    if (!success) {
      return NextResponse.json({ error: 'Erro ao salvar feedback' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[feedback] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
