import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

// GET - Buscar contextos
export async function GET(request: NextRequest) {
  try {
    const membership = await getUserGroupMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const groupId = membership.company_group_id;

    const { searchParams } = new URL(request.url);
    const datasetId = searchParams.get('datasetId');
    const contextType = searchParams.get('type');

    let query = supabase
      .from('ai_model_contexts')
      .select('*')
      .eq('company_group_id', groupId);

    if (datasetId) {
      query = query.eq('dataset_id', datasetId);
    }

    if (contextType) {
      query = query.eq('context_type', contextType);
    }

    const { data: contexts, error } = await query.order('updated_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar contextos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contexts: contexts || [] });

  } catch (error: any) {
    console.error('Erro ao buscar contexto:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar/Atualizar contexto
export async function POST(request: NextRequest) {
  try {
    const membership = await getUserGroupMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { datasetId, contextType = 'chat', content, sections, daxData } = body;

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const groupId = membership.company_group_id;

    // Verificar se já existe contexto deste tipo para este dataset
    const { data: existing } = await supabase
      .from('ai_model_contexts')
      .select('id')
      .eq('company_group_id', groupId)
      .eq('dataset_id', datasetId)
      .eq('context_type', contextType)
      .single();

    let contextData: any = {
      company_group_id: groupId,
      dataset_id: datasetId,
      context_type: contextType,
      updated_at: new Date().toISOString(),
    };

    // Se for documentação (MD)
    if (content && sections) {
      contextData = {
        ...contextData,
        context_content: content,
        section_base: sections.base || null,
        section_medidas: sections.medidas || null,
        section_tabelas: sections.tabelas || null,
        section_queries: sections.queries || null,
        section_exemplos: sections.exemplos || null,
        parsed_at: new Date().toISOString(),
      };
    }

    // Se for base de DAX (JSON)
    if (daxData) {
      // Converter medidas do formato JSON para o formato esperado
      const medidas = daxData.medidas?.map((m: any) => ({
        name: m.nome,
        description: m.descricao || '',
        whenToUse: '',
        area: m.pasta || 'Geral',
        formula: m.formula || '',
        sourceTable: m.tabela || '',
        columns: [],
        format: m.formato || ''
      })) || [];

      // Converter colunas do formato JSON para o formato esperado
      const colunasPorTabela = new Map<string, any[]>();
      daxData.colunas?.forEach((col: any) => {
        if (!colunasPorTabela.has(col.tabela)) {
          colunasPorTabela.set(col.tabela, []);
        }
        colunasPorTabela.get(col.tabela)!.push({
          name: `${col.tabela}.${col.coluna}`,
          type: col.tipo || 'String',
          usage: ['filter', 'group'],
          examples: col.exemplo_valores || []
        });
      });

      const tabelas = Array.from(colunasPorTabela.entries()).map(([table, columns]) => ({
        table,
        description: '',
        columns
      }));

      contextData = {
        ...contextData,
        context_content: JSON.stringify(daxData),
        section_medidas: medidas,
        section_tabelas: tabelas,
        parsed_at: new Date().toISOString(),
      };
    }

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('ai_model_contexts')
        .update(contextData)
        .eq('id', existing.id)
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('ai_model_contexts')
        .insert({
          ...contextData,
          context_name: contextType === 'chat' ? 'Documentação para Chat' : 'Base de DAX',
          is_active: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) throw error;
      result = data;
    }

    return NextResponse.json({ 
      success: true, 
      context: result,
    });

  } catch (error: any) {
    console.error('Erro ao salvar contexto:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir contexto
export async function DELETE(request: NextRequest) {
  try {
    const membership = await getUserGroupMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const groupId = membership.company_group_id;

    // Verificar se o contexto pertence ao grupo do usuário
    const { data: context } = await supabase
      .from('ai_model_contexts')
      .select('company_group_id')
      .eq('id', id)
      .single();

    if (!context) {
      return NextResponse.json({ error: 'Contexto não encontrado' }, { status: 404 });
    }

    if (context.company_group_id !== groupId) {
      return NextResponse.json({ error: 'Sem permissão para excluir este contexto' }, { status: 403 });
    }

    // Excluir
    const { error } = await supabase
      .from('ai_model_contexts')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir contexto:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('Erro na API de contexto:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
