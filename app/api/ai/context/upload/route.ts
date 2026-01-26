// app/api/ai/context/upload/route.ts
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const connection_id = formData.get('connection_id') as string;
    const dataset_id = formData.get('dataset_id') as string | null;
    const context_name = formData.get('context_name') as string;
    const company_group_id = formData.get('company_group_id') as string;

    if (!file || !connection_id || !context_name || !company_group_id) {
      return NextResponse.json({ 
        error: 'file, connection_id, context_name e company_group_id são obrigatórios' 
      }, { status: 400 });
    }

    // Ler conteúdo do arquivo
    const content = await file.text();

    // Fazer parse
    const parsed = parseDocumentation(content);

    // Validar se tem pelo menos a seção BASE
    if (!parsed.base) {
      return NextResponse.json({ 
        error: 'Documento inválido: seção BASE não encontrada',
        hint: 'O documento deve ter <!-- SECTION:BASE --> e <!-- END:BASE -->'
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se já existe contexto para este connection_id
    const { data: existing } = await supabase
      .from('ai_model_contexts')
      .select('id')
      .eq('connection_id', connection_id)
      .maybeSingle();

    let result;
    
    if (existing) {
      // Atualizar existente
      const { data, error } = await supabase
        .from('ai_model_contexts')
        .update({
          context_name,
          context_content: content,
          dataset_id: dataset_id || null,
          section_base: parsed.base,
          section_medidas: parsed.medidas,
          section_tabelas: parsed.tabelas,
          section_queries: parsed.queries,
          section_exemplos: parsed.exemplos,
          parsed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = { ...data, action: 'updated' };
    } else {
      // Criar novo
      const { data, error } = await supabase
        .from('ai_model_contexts')
        .insert({
          company_group_id,
          connection_id,
          dataset_id: dataset_id || null,
          context_name,
          context_type: 'chat',
          context_content: content,
          section_base: parsed.base,
          section_medidas: parsed.medidas,
          section_tabelas: parsed.tabelas,
          section_queries: parsed.queries,
          section_exemplos: parsed.exemplos,
          parsed_at: new Date().toISOString(),
          is_active: true
        })
        .select()
        .single();

      if (error) throw error;
      result = { ...data, action: 'created' };
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      context_id: result.id,
      context_name: result.context_name,
      stats: parsed.metadata
    });

  } catch (error: any) {
    console.error('[upload] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
