import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership, getAuthUser, getUserDeveloperId } from '@/lib/auth';

async function resolveGroupId(supabase: any, requestedGroupId: string | null, membership: { user_id: string; company_group_id: string }) {
  let groupId = membership.company_group_id;
  if (!requestedGroupId || requestedGroupId === groupId) return groupId;

  const user = await getAuthUser();
  if (!user) return groupId;

  // Master: pode acessar qualquer grupo ativo
  if (user.is_master) {
    const { data: group } = await supabase.from('company_groups').select('id').eq('id', requestedGroupId).eq('status', 'active').maybeSingle();
    if (group) return requestedGroupId;
  }

  // Developer: grupos do seu developer_id
  const developerId = await getUserDeveloperId(user.id);
  if (developerId) {
    const { data: group } = await supabase.from('company_groups').select('id').eq('id', requestedGroupId).eq('developer_id', developerId).eq('status', 'active').maybeSingle();
    if (group) return requestedGroupId;
  }

  // Usuário comum: membership em user_group_membership
  const { data: memberCheck } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', user.id)
    .eq('company_group_id', requestedGroupId)
    .eq('is_active', true)
    .maybeSingle();

  if (memberCheck) return requestedGroupId;
  return groupId;
}

// GET - Buscar contextos
export async function GET(request: NextRequest) {
  try {
    const membership = await getUserGroupMembership();
    if (!membership) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const requestedGroupId = searchParams.get('group_id');
    const contextId = searchParams.get('id');
    const includeContent = searchParams.get('includeContent') === 'true';
    const datasetId = searchParams.get('datasetId');
    const contextType = searchParams.get('type');

    const groupId = await resolveGroupId(supabase, requestedGroupId, membership);

    // Buscar por ID específico — sempre retorna com content completo
    if (contextId) {
      const { data, error } = await supabase
        .from('ai_model_contexts')
        .select('*')
        .eq('id', contextId)
        .eq('company_group_id', groupId)
        .single();

      if (error) {
        console.error('Erro ao buscar contexto por ID:', error);
        return NextResponse.json({ error: error.message }, { status: error.code === 'PGRST116' ? 404 : 500 });
      }

      if (!data) {
        return NextResponse.json({ error: 'Contexto não encontrado' }, { status: 404 });
      }

      return NextResponse.json({ context: data, contexts: [data] });
    }

    // Listagem por datasetId — incluir context_content apenas quando solicitado (campo grande)
    const selectFields = includeContent
      ? '*'
      : 'id, dataset_id, context_type, context_name, section_base, section_medidas, section_tabelas, section_queries, section_exemplos, is_active, company_group_id, parsed_at, created_at, updated_at';

    let query = supabase
      .from('ai_model_contexts')
      .select(selectFields)
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
    const { datasetId, contextType = 'chat', content, sections, daxData, group_id: requestedGroupId } = body;

    if (!datasetId) {
      return NextResponse.json({ error: 'Dataset é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const groupId = await resolveGroupId(supabase, requestedGroupId, membership);

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
    const requestedGroupId = searchParams.get('group_id');

    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const groupId = await resolveGroupId(supabase, requestedGroupId, membership);

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
