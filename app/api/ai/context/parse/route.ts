// app/api/ai/context/parse/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { parseDocumentation } from '@/lib/assistente-ia/documentation-parser';

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { context_id, content } = body;

    if (!context_id || !content) {
      return NextResponse.json({ 
        error: 'context_id e content são obrigatórios' 
      }, { status: 400 });
    }

    // Fazer parse
    const parsed = parseDocumentation(content);

    const supabase = createAdminClient();

    // Atualizar no banco
    const { data, error } = await supabase
      .from('ai_model_contexts')
      .update({
        context_content: content,
        section_base: parsed.base,
        section_medidas: parsed.medidas,
        section_tabelas: parsed.tabelas,
        section_queries: parsed.queries,
        section_exemplos: parsed.exemplos,
        parsed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', context_id)
      .select()
      .single();

    if (error) {
      console.error('[parse] Erro ao salvar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      context_id: data.id,
      context_name: data.context_name,
      stats: {
        medidas: parsed.medidas?.length || 0,
        tabelas: parsed.tabelas?.length || 0,
        queries: parsed.queries?.length || 0,
        exemplos: parsed.exemplos?.length || 0,
        hasBase: !!parsed.base
      }
    });

  } catch (error: any) {
    console.error('[parse] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
