import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { 
  generateOptimizedContext,
  ParsedDocumentation 
} from '@/lib/assistente-ia/documentation-parser';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-3-5-20241022';

// ============================================
// FUNÇÃO PARA CLASSIFICAR ERROS
// ============================================
function classifyError(error: any): {
  isTemporary: boolean;
  shouldRetry: boolean;
  retryAfter?: number;
  userMessage: string;
} {
  const errorStatus = error.status || error.statusCode;
  const errorMessage = error.message || String(error);
  
  if (errorStatus === 529 || errorStatus === 503 || errorStatus === 429) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: errorStatus === 429 ? 60 : 10,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }
  
  if (errorMessage.includes('timeout') || errorMessage === 'Claude timeout') {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 5,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }
  
  if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 3,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
    };
  }
  
  if (errorStatus === 401 || errorStatus === 403 || errorStatus === 400) {
    return {
      isTemporary: false,
      shouldRetry: false,
      userMessage: 'Não consegui processar sua solicitação no momento. Por favor, tente novamente mais tarde ou reformule sua pergunta.'
    };
  }
  
  return {
    isTemporary: true,
    shouldRetry: true,
    retryAfter: 5,
    userMessage: 'Estou processando sua pergunta, mas preciso de um momento. Vou tentar novamente em alguns segundos.'
  };
}

// ============================================
// FUNÇÃO DE RETRY PARA CHAMADAS CLAUDE
// ============================================
async function callClaudeWithRetry(
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: any[];
    tools?: any[];
  },
  maxRetries = 4,
  timeoutMs = 30000
): Promise<Anthropic.Message> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const claudePromise = anthropic.messages.create({
        model: params.model,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
      });
      
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Claude timeout')), timeoutMs);
      });
      
      const response = await Promise.race([claudePromise, timeoutPromise]);
      return response as Anthropic.Message;
    } catch (error: any) {
      if (attempt >= maxRetries) throw error;
      
      const errorInfo = classifyError(error);
      if (!errorInfo.shouldRetry) throw error;
      
      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 20000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

// ============================================
// FUNÇÃO PARA IDENTIFICAR INTENÇÃO DA PERGUNTA
// ============================================
function identifyQuestionIntent(question: string): string {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (q.match(/faturamento.*(filial|loja|unidade)/)) return 'faturamento_filial';
  if (q.match(/faturamento.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/faturamento.*(produto|item)/)) return 'faturamento_produto';
  if (q.match(/faturamento|faturou|receita total|vendeu quanto/)) return 'faturamento_total';
  
  if (q.match(/vendas?.*(filial|loja)/)) return 'faturamento_filial';
  if (q.match(/vendas?.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/vendas?.*(produto|item)/)) return 'faturamento_produto';
  
  if (q.match(/top.*(vendedor|garcom|funcionario)|melhor vendedor|quem (mais )?vendeu/)) return 'top_vendedores';
  if (q.match(/top.*(produto|item)|produto.*(mais|melhor)/)) return 'top_produtos';
  if (q.match(/top.*(filial|loja)|filial.*(mais|melhor)/)) return 'top_filiais';
  
  if (q.match(/ticket.*(medio|médio)/)) return 'ticket_medio';
  if (q.match(/margem|lucro/)) return 'margem';
  if (q.match(/cmv|custo/)) return 'cmv';
  
  if (q.match(/contas?.*(pagar|vencer)|a pagar/)) return 'contas_pagar';
  if (q.match(/contas?.*(receber)|a receber/)) return 'contas_receber';
  if (q.match(/saldo|caixa|banco/)) return 'saldo';
  
  return 'outros';
}

// ============================================
// FUNÇÃO PARA BUSCAR QUERIES QUE FUNCIONARAM
// ============================================
async function getWorkingQueries(
  supabase: any, 
  datasetId: string, 
  intent: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('ai_query_learning')
      .select('dax_query, times_reused')
      .eq('dataset_id', datasetId)
      .eq('question_intent', intent)
      .eq('success', true)
      .order('times_reused', { ascending: false })
      .limit(3);
    
    return data?.map((r: any) => r.dax_query) || [];
  } catch (e) {
    console.error('[Learning] Erro ao buscar queries:', e);
    return [];
  }
}

// ============================================
// FUNÇÃO PARA SALVAR RESULTADO DA QUERY
// ============================================
async function saveQueryResult(
  supabase: any,
  datasetId: string,
  companyGroupId: string,
  userQuestion: string,
  intent: string,
  daxQuery: string,
  success: boolean,
  errorMessage?: string,
  executionTimeMs?: number,
  resultRows?: number
): Promise<void> {
  try {
    const crypto = require('crypto');
    const queryHash = crypto.createHash('md5').update(daxQuery).digest('hex');
    
    const { data: existing } = await supabase
      .from('ai_query_learning')
      .select('id, times_reused')
      .eq('dataset_id', datasetId)
      .eq('dax_query_hash', queryHash)
      .maybeSingle();
    
    if (existing && success) {
      await supabase
        .from('ai_query_learning')
        .update({ 
          times_reused: existing.times_reused + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      console.log('[Learning] Query reutilizada, times_reused:', existing.times_reused + 1);
    } else if (!existing) {
      await supabase
        .from('ai_query_learning')
        .insert({
          dataset_id: datasetId,
          company_group_id: companyGroupId,
          user_question: userQuestion.substring(0, 500),
          question_intent: intent,
          dax_query: daxQuery,
          dax_query_hash: queryHash,
          success,
          error_message: errorMessage?.substring(0, 500),
          execution_time_ms: executionTimeMs,
          result_rows: resultRows
        });
      console.log('[Learning] Nova query salva, success:', success);
    }
  } catch (e) {
    console.error('[Learning] Erro ao salvar:', e);
  }
}

// Função para buscar contexto do modelo (com otimização)
async function getModelContext(
  supabase: any, 
  connectionId: string, 
  userQuestion?: string
): Promise<string | null> {
  try {
    const { data: context } = await supabase
      .from('ai_model_contexts')
      .select('context_content, section_base, section_medidas, section_tabelas, section_queries, section_exemplos')
      .eq('connection_id', connectionId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (!context) return null;

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
      console.log(`[Chat] Contexto otimizado: ${optimized.length} chars (de ${context.context_content?.length || 0} total)`);
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

// Função para executar DAX
async function executeDaxQuery(connectionId: string, datasetId: string, query: string, supabase: any): Promise<{ success: boolean; results?: any[]; error?: string }> {
  try {
    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexão não encontrada' };
    }

    // Obter token
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });

    if (!tokenResponse.ok) {
      return { success: false, error: 'Erro na autenticação' };
    }

    const tokenData = await tokenResponse.json();

    // Executar DAX
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const daxRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokenData.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            queries: [{ query }],
            serializerSettings: { includeNulls: true }
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!daxRes.ok) {
        const errorText = await daxRes.text();
        return { success: false, error: `Erro DAX: ${errorText}` };
      }

      const daxData = await daxRes.json();
      const results = daxData.results?.[0]?.tables?.[0]?.rows || [];

      return { success: true, results };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'Timeout: A consulta DAX demorou mais de 15 segundos' };
      }
      throw fetchError;
    }
  } catch (e: any) {
    return { success: false, error: e.message };
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

    // Buscar contexto do modelo (com otimização baseada na pergunta)
    const modelContext = connectionId ? await getModelContext(supabase, connectionId, message) : null;

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
- Seja simpático, direto e prestativo
- Use linguagem natural e acessível
- NUNCA mencione nomes técnicos de medidas, fórmulas DAX ou IDs
- Apresente os dados de forma clara e humanizada
- Use emojis moderadamente para tornar a conversa agradável

## REGRA DE PERÍODO PADRÃO (MUITO IMPORTANTE!)
- Quando o usuário NÃO especificar um período, SEMPRE use o MÊS ATUAL (${currentMonth})
- Filtre os dados pelo mês ${currentMonthNumber} e ano ${currentYear}
- SEMPRE mencione o período na resposta: "No mês de ${currentMonth}..."
- Se o usuário pedir "mês anterior", use o mês ${currentMonthNumber - 1 || 12}/${currentMonthNumber === 1 ? currentYear - 1 : currentYear}
- Só use outro período se o usuário especificar explicitamente

## FORMATO DAS RESPOSTAS
- Comece SEMPRE mencionando o período dos dados
- Destaque o valor principal em **negrito**
- Seja conciso: máximo 3-4 frases
- Formate valores monetários: R$ 1.234,56
- Formate percentuais: 12,5%

## CONTEXTO DA CONVERSA
- Lembre-se do que foi perguntado anteriormente
- Use o contexto para dar respostas mais relevantes
- Se o usuário pedir "detalhe" ou "mais", use o contexto anterior
- Mantenha o mesmo período ao dar detalhes, a menos que o usuário mude

## DATA ATUAL
Hoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.
Mês atual: ${currentMonth}

${modelContext ? `
## CONHECIMENTO DO MODELO DE DADOS
${modelContext}

IMPORTANTE: Use este conhecimento para responder, mas NUNCA mencione nomes técnicos de medidas ou tabelas para o usuário.
` : ''}

${connectionId && datasetId ? `
## ACESSO AOS DADOS
Você tem acesso ao relatório "${reportName || 'atual'}" e pode buscar dados reais.
Dataset: ${datasetId}

Regras para queries DAX (uso interno, nunca mencione ao usuário):
- Use EVALUATE para retornar dados
- Para métricas: EVALUATE ROW("Resultado", [Medida])
- Para agrupar: EVALUATE SUMMARIZE(Tabela, Coluna, "Total", SUM(Valor))
- SEMPRE filtre pelo período adequado usando CALCULATE com filtro de data
` : ''}

## SUGESTÕES OBRIGATÓRIAS
SEMPRE termine sua resposta com EXATAMENTE 4 sugestões relevantes no formato:

[SUGESTOES]
- Sugestão curta e clara 1
- Sugestão curta e clara 2
- Sugestão curta e clara 3
- Sugestão curta e clara 4
[/SUGESTOES]

As sugestões devem:
- Ser relacionadas ao que foi perguntado
- SEMPRE incluir "Comparar com mês anterior" como uma das opções
- Oferecer diferentes perspectivas (por período, por categoria, comparativo, ranking)
- Ser curtas (máximo 5 palavras cada)
- Exemplos bons: "Ver por filial", "Comparar com mês anterior", "Top 10 produtos", "Detalhes por vendedor"

## EXEMPLO DE RESPOSTA IDEAL
"📊 No mês de ${currentMonth}, o faturamento total foi de **R$ 85.234,56**

Este valor representa um crescimento em relação ao período anterior.

[SUGESTOES]
- Comparar com mês anterior
- Ver por filial
- Top 10 produtos
- Detalhes por vendedor
[/SUGESTOES]"`;

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
        learningContext = `\n\n# QUERIES QUE FUNCIONARAM PARA PERGUNTAS SIMILARES\nUse estas queries como referência:\n${workingQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
      }
    }
    
    const enhancedSystemPrompt = systemPrompt + learningContext;

    // Chamar Claude com retry (usa modelo rápido para primeira análise)
    let response;
    try {
      response = await callClaudeWithRetry({
        model: tools.length > 0 ? DEFAULT_MODEL : FAST_MODEL,
        max_tokens: 1024,
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
        response = await callClaudeWithRetry({
          model: DEFAULT_MODEL,
          max_tokens: 1024,
          system: enhancedSystemPrompt || systemPrompt,
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
    if (!assistantMessage.trim()) {
      assistantMessage = 'Desculpe, não consegui processar sua solicitação. Por favor, tente novamente com uma pergunta diferente.';
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

