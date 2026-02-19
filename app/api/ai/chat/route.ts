import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { callClaude, classifyError, extractTextFromResponse, hasToolUse, getToolUseBlocks, MODELS } from '@/lib/ai/claude-client';
import Anthropic from '@anthropic-ai/sdk';
import { 
  generateOptimizedContext,
  ParsedDocumentation 
} from '@/lib/assistente-ia/documentation-parser';
import { executeDaxQuery } from '@/lib/ai/dax-engine';
import { identifyQuestionIntent, getWorkingQueries, saveQueryResult, isFailureResponse, identifyFailureReason } from '@/lib/ai/learning';

// Função para buscar contexto do modelo (com fallbacks por connection, dataset e grupo)
async function getModelContext(
  supabase: any, 
  connectionId: string, 
  userQuestion?: string,
  datasetId?: string | null,
  companyGroupId?: string | null
): Promise<string | null> {
  try {
    let context = null;

    // 1. Tentar por connection_id (forma original)
    const { data: ctx1 } = await supabase
      .from('ai_model_contexts')
      .select('context_content, section_base, section_medidas, section_tabelas, section_queries, section_exemplos')
      .eq('connection_id', connectionId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    context = ctx1;

    // 2. Fallback: por dataset_id + company_group_id (como WhatsApp e treinamento salvam)
    if (!context && datasetId && companyGroupId) {
      const { data: ctx2 } = await supabase
        .from('ai_model_contexts')
        .select('context_content, section_base, section_medidas, section_tabelas, section_queries, section_exemplos')
        .eq('dataset_id', datasetId)
        .eq('company_group_id', companyGroupId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      context = ctx2;
    }

    // 3. Fallback: só por dataset_id
    if (!context && datasetId) {
      const { data: ctx3 } = await supabase
        .from('ai_model_contexts')
        .select('context_content, section_base, section_medidas, section_tabelas, section_queries, section_exemplos')
        .eq('dataset_id', datasetId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      context = ctx3;
    }

    if (!context) {
      console.log('[Chat] Nenhum contexto encontrado para connection:', connectionId, 'dataset:', datasetId);
      return null;
    }

    // Se tem seções parseadas e pergunta do usuário, usar contexto otimizado
    if (context.section_base && context.section_medidas && userQuestion) {
      const parsed: ParsedDocumentation = {
        raw: context.context_content || '',
        base: context.section_base,
        medidas: context.section_medidas,
        tabelas: context.section_tabelas,
        queries: context.section_queries,
        exemplos: context.section_exemplos,
        errors: [],
        metadata: {
          hasBase: true,
          hasMedidas: true,
          hasTabelas: !!context.section_tabelas,
          hasQueries: !!context.section_queries,
          hasExemplos: !!context.section_exemplos,
          totalMedidas: context.section_medidas?.length || 0,
          totalTabelas: context.section_tabelas?.length || 0,
          totalQueries: context.section_queries?.length || 0,
          totalExemplos: context.section_exemplos?.length || 0
        }
      };
      
      const optimized = generateOptimizedContext(parsed, userQuestion);
      console.log('[Chat] Contexto otimizado: ' + optimized.length + ' chars (de ' + (context.context_content?.length || 0) + ' total)');
      return optimized;
    }

    // Fallback: usar context_content bruto
    if (context.context_content) {
      return context.context_content.slice(0, 8000);
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao buscar contexto:', error);
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversation_id, screen_id } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Mensagem é obrigatória' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar tela e relatório associado
    let connectionId: string | null = null;
    let datasetId: string | null = null;
    let reportName: string | null = null;

    if (screen_id) {
      const { data: screen } = await supabase
        .from('powerbi_dashboard_screens')
        .select(`
          id,
          title,
          report:powerbi_reports(
            id,
            name,
            dataset_id,
            connection_id
          )
        `)
        .eq('id', screen_id)
        .single();

      if (screen?.report && !Array.isArray(screen.report)) {
        const report = screen.report as any;
        connectionId = report.connection_id;
        datasetId = report.dataset_id;
        reportName = report.name;
      }
    }

    // Buscar grupo do usuário
    let companyGroupId: string | null = null;
    
    // Primeiro tenta pelo membership
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.company_group_id) {
      companyGroupId = membership.company_group_id;
    } 
    // Se não encontrou, tenta pela conexão do relatório
    else if (connectionId) {
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('company_group_id')
        .eq('id', connectionId)
        .single();
      
      companyGroupId = connection?.company_group_id || null;
    }
    
    // Se ainda não tem, busca o primeiro grupo disponível
    if (!companyGroupId) {
      const { data: anyGroup } = await supabase
        .from('company_groups')
        .select('id')
        .limit(1)
        .single();
      
      companyGroupId = anyGroup?.id || null;
    }

    if (!companyGroupId) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 400 });
    }

    // Buscar contexto do modelo (com fallbacks por connection, dataset e grupo)
    const modelContext = connectionId ? await getModelContext(supabase, connectionId, message, datasetId, companyGroupId) : null;

    // Validar limite diário de mensagens do developer
    const { data: developerData } = await supabase
      .from('company_groups')
      .select('developer:developers(max_chat_messages_per_day)')
      .eq('id', companyGroupId)
      .single();

    // Tratar developer como objeto ou array (dependendo da relação do Supabase)
    const developer = Array.isArray(developerData?.developer) 
      ? developerData.developer[0] 
      : developerData?.developer;
    
    const messageLimit = developer?.max_chat_messages_per_day || 1000;

    // Contar mensagens do chat de hoje
    const today = new Date().toISOString().split('T')[0];

    // Buscar todas as conversas do grupo para contar mensagens
    const { data: groupConversations } = await supabase
      .from('ai_conversations')
      .select('id')
      .eq('company_group_id', companyGroupId);

    const conversationIds = groupConversations?.map(c => c.id) || [];

    let chatMessagesToday = 0;
    if (conversationIds.length > 0) {
      const { count } = await supabase
        .from('ai_messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .gte('created_at', `${today}T00:00:00Z`)
        .lt('created_at', `${today}T23:59:59Z`);

      chatMessagesToday = count || 0;
    }

    // Bloquear se limite atingido
    if (chatMessagesToday >= messageLimit) {
      return NextResponse.json({
        error: 'Limite diário de mensagens atingido. Entre em contato com o administrador.',
        limit_reached: true,
        current: chatMessagesToday,
        max: messageLimit
      }, { status: 429 });
    }

    // Verificar limite de perguntas do dia

    // Buscar plano do grupo
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', companyGroupId)
      .single();

    let maxQuestionsPerDay = 50; // default

    if (groupData?.plan_id) {
      const { data: plan } = await supabase
        .from('powerbi_plans')
        .select('max_ai_questions_per_day')
        .eq('id', groupData.plan_id)
        .single();
      
      if (plan?.max_ai_questions_per_day) {
        maxQuestionsPerDay = plan.max_ai_questions_per_day;
      }
    }

    // Buscar uso do dia
    const { data: usage } = await supabase
      .from('ai_usage')
      .select('questions_count')
      .eq('company_group_id', companyGroupId)
      .eq('usage_date', today)
      .single();

    const usedToday = usage?.questions_count || 0;

    // Verificar se excedeu (999999 = ilimitado)
    if (maxQuestionsPerDay < 999999 && usedToday >= maxQuestionsPerDay) {
      return NextResponse.json({ 
        error: `Limite diário de ${maxQuestionsPerDay} perguntas atingido. Tente novamente amanhã.`,
        limit_reached: true 
      }, { status: 429 });
    }

    // Buscar ou criar conversa
    let conversationId = conversation_id;
    if (!conversationId) {
      const { data: newConversation, error: convError } = await supabase
        .from('ai_conversations')
        .insert({
          company_group_id: companyGroupId,
          user_id: user.id,
          screen_id: screen_id || null,
          title: message.substring(0, 100)
        })
        .select()
        .single();

      if (convError) {
        console.error('Erro ao criar conversa:', convError);
        return NextResponse.json({ error: 'Erro ao criar conversa' }, { status: 500 });
      }
      conversationId = newConversation.id;
    }

    // Buscar histórico da conversa
    const { data: previousMessages } = await supabase
      .from('ai_messages')
      .select('role, content')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(20);

    // Definir tools para o Claude
    const tools: Anthropic.Tool[] = connectionId && datasetId ? [
      {
        name: 'execute_dax',
        description: 'Executa uma query DAX no Power BI para buscar dados. Use para responder perguntas sobre métricas, vendas, valores, etc.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'A query DAX a ser executada no Power BI'
            }
          },
          required: ['query']
        }
      }
    ] : [];

    // Construir system prompt
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentMonthNumber = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    
    const systemPrompt = `Você é um assistente de BI amigável e inteligente chamado "Assistente Aquarius".

## PERSONALIDADE
- Simpático, direto e prestativo
- Linguagem natural e acessível
- NUNCA mencione nomes técnicos de medidas, fórmulas DAX ou IDs ao usuário
- Use emojis moderadamente

## PERÍODO PADRÃO
Hoje: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Mês atual: ${currentMonth} (mês ${currentMonthNumber}, ano ${currentYear})
Quando o usuário NÃO especificar período, SEMPRE use ${currentMonth}.
SEMPRE mencione o período na resposta.
Mês anterior: ${currentMonthNumber - 1 || 12}/${currentMonthNumber === 1 ? currentYear - 1 : currentYear}

## FORMATO DAS RESPOSTAS
- Comece mencionando o período
- Destaque valores em **negrito**
- Conciso: máximo 3-4 frases antes das sugestões
- Valores monetários: R$ 1.234,56 | Percentuais: 12,5%
- Use contexto anterior para "detalhe" ou "mais"

${modelContext ? `## CONHECIMENTO DO MODELO DE DADOS
${modelContext}

IMPORTANTE: Use este conhecimento para gerar queries corretas, mas NUNCA mencione nomes técnicos ao usuário.` : ''}

${connectionId && datasetId ? `## ACESSO AOS DADOS
Relatório: "${reportName || 'atual'}"

Regras DAX (uso interno):
- EVALUATE ROW("Resultado", CALCULATE([Medida], filtros)) para valor único
- EVALUATE SUMMARIZECOLUMNS(Coluna, "Total", [Medida]) para agrupamentos
- TOPN(N, ...) para rankings
- SEMPRE filtre por período usando a tabela de datas do contexto
- NUNCA invente nomes de tabelas/colunas — use SOMENTE o que está no contexto acima
- Se a query falhar, analise o erro, corrija os nomes e tente novamente` : ''}

## SUGESTÕES (OBRIGATÓRIO)
SEMPRE termine com EXATAMENTE 4 sugestões no formato:

[SUGESTOES]
- Sugestão curta 1
- Sugestão curta 2
- Sugestão curta 3
- Sugestão curta 4
[/SUGESTOES]

Regras: relacionadas ao tema, máximo 5 palavras cada, SEMPRE incluir "Comparar com mês anterior".`;

    // Construir mensagens para o Claude
    const messages: Anthropic.MessageParam[] = [];

    // Adicionar histórico de mensagens
    if (previousMessages && previousMessages.length > 0) {
      previousMessages.forEach((msg: any) => {
        messages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content
        });
      });
    }

    // Adicionar mensagem atual
    messages.push({
      role: 'user',
      content: message
    });

    // Buscar queries que funcionaram (aprendizado)
    let learningContext = '';
    if (datasetId) {
      const questionIntent = identifyQuestionIntent(message);
      const workingQueries = await getWorkingQueries(supabase, datasetId, questionIntent);
      if (workingQueries.length > 0) {
        learningContext = `\n\n# QUERIES VALIDADAS (USE COMO BASE)\n${workingQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}\nSe a pergunta for similar, USE O MESMO PADRÃO DAX.\n`;
      }
    }
    
    const enhancedSystemPrompt = systemPrompt + learningContext;

    // Chamar Claude com retry (usa modelo rápido para primeira análise)
    let response;
    try {
      response = await callClaude({
        model: MODELS.DEFAULT,
        max_tokens: 2048,
        system: enhancedSystemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });
    } catch (error: any) {
      console.error('[Chat] Erro ao chamar Claude:', error);
      const errorInfo = classifyError(error);
      return NextResponse.json({ 
        error: errorInfo.userMessage 
      }, { status: errorInfo.isTemporary ? 503 : 500 });
    }

    // Processar tool calls em loop (máximo 3 iterações)
    let iterations = 0;
    const maxIterations = 3;
    let daxError: string | null = null;

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      console.log(`Tool call iteração ${iterations}`);

      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use' && toolUse.name === 'execute_dax' && connectionId && datasetId) {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;
          
          console.log('Executando DAX:', toolInput.query);
          
          const daxResult = await executeDaxQuery(
            connectionId,
            datasetId,
            toolInput.query,
            supabase
          );
          if (!daxResult.success) daxError = daxResult.error || 'Erro desconhecido';

          // Salvar resultado para aprendizado
          if (datasetId && companyGroupId) {
            const questionIntent = identifyQuestionIntent(message);
            await saveQueryResult(
              supabase,
              datasetId,
              companyGroupId,
              message,
              questionIntent,
              toolInput.query,
              daxResult.success,
              daxResult.error
            );
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: daxResult.success
              ? JSON.stringify(daxResult.results, null, 2)
              : `Erro: ${daxResult.error}`
          });
        }
      }

      if (toolResults.length === 0) break;

      // Adicionar resposta do assistente e resultados das tools
      messages.push({
        role: 'assistant',
        content: response.content
      });

      messages.push({
        role: 'user',
        content: toolResults
      });

      // Chamar Claude novamente com os resultados (com retry)
      try {
        response = await callClaude({
          model: MODELS.DEFAULT,
          max_tokens: 2048,
          system: enhancedSystemPrompt,
          messages,
          tools: tools.length > 0 ? tools : undefined
        });
      } catch (error: any) {
        console.error('[Chat] Erro na segunda chamada Claude:', error);
        const errorInfo = classifyError(error);
        return NextResponse.json({ 
          error: errorInfo.userMessage 
        }, { status: errorInfo.isTemporary ? 503 : 500 });
      }
    }

    // Extrair texto final da resposta
    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    // Se não teve resposta de texto, gerar uma mensagem padrão
    const wasEmptyResponse = !assistantMessage.trim();
    if (wasEmptyResponse) {
      assistantMessage = 'Desculpe, não consegui processar sua solicitação. Por favor, tente novamente com uma pergunta diferente.';
    }

    // Detectar e salvar perguntas não respondidas (para treinamento)
    const isEvasiveResponse = isFailureResponse(assistantMessage) || wasEmptyResponse;
    if (isEvasiveResponse || daxError) {
      try {
        let errorMessage = daxError ? `Erro DAX: ${daxError}` : `Resposta evasiva: ${assistantMessage.substring(0, 200)}`;
        const { data: existingQuestion } = await supabase
          .from('ai_unanswered_questions')
          .select('id, user_count, attempt_count')
          .eq('company_group_id', companyGroupId)
          .ilike('user_question', `%${message.substring(0, 50)}%`)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingQuestion) {
          await supabase
            .from('ai_unanswered_questions')
            .update({
              attempt_count: (existingQuestion.attempt_count || 0) + 1,
              last_asked_at: new Date().toISOString(),
              error_message: errorMessage,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingQuestion.id);
          console.log('[Chat] ✅ Pergunta pendente atualizada:', existingQuestion.id);
        } else {
          const { data: newQuestion, error: insertError } = await supabase
            .from('ai_unanswered_questions')
            .insert({
              company_group_id: companyGroupId,
              connection_id: connectionId || null,
              dataset_id: datasetId || null,
              user_question: message,
              phone_number: 'chat_web',
              attempted_dax: null,
              error_message: errorMessage,
              status: 'pending',
              attempt_count: 1,
              user_count: 1,
              first_asked_at: new Date().toISOString(),
              last_asked_at: new Date().toISOString(),
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();
          if (insertError) {
            console.error('[Chat] Erro ao criar pergunta pendente:', insertError.message);
          } else {
            console.log('[Chat] ✅ Nova pergunta pendente criada:', newQuestion?.id);
          }
        }
      } catch (saveError: any) {
        console.error('[Chat] Erro ao salvar pergunta pendente:', saveError.message);
      }
    }

    // Salvar mensagens no banco
    await supabase.from('ai_messages').insert([
      {
        conversation_id: conversationId,
        role: 'user',
        content: message
      },
      {
        conversation_id: conversationId,
        role: 'assistant',
        content: assistantMessage
      }
    ]);

    // Atualizar contador de uso
    const { data: existingUsage } = await supabase
      .from('ai_usage')
      .select('id, questions_count')
      .eq('company_group_id', companyGroupId)
      .eq('usage_date', today)
      .single();

    if (existingUsage) {
      await supabase
        .from('ai_usage')
        .update({ 
          questions_count: existingUsage.questions_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id);
    } else {
      await supabase
        .from('ai_usage')
        .insert({
          company_group_id: companyGroupId,
          user_id: user.id,
          usage_date: today,
          questions_count: 1
        });
    }

    return NextResponse.json({
      message: assistantMessage,
      conversation_id: conversationId
    });
  } catch (error: any) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar mensagem' }, { status: 500 });
  }
}

