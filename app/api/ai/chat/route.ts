import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const FAST_MODEL = 'claude-haiku-3-5-20241022';

// Função para buscar contexto do modelo
async function getModelContext(supabase: any, connectionId: string): Promise<string | null> {
  try {
    const { data: context } = await supabase
      .from('ai_model_contexts')
      .select('context_content')
      .eq('connection_id', connectionId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (context?.context_content) {
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

      if (screen?.report) {
        connectionId = screen.report.connection_id;
        datasetId = screen.report.dataset_id;
        reportName = screen.report.name;
      }
    }

    // Buscar contexto do modelo
    const modelContext = connectionId ? await getModelContext(supabase, connectionId) : null;

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

    // Chamar Claude (usa modelo rápido para primeira análise)
    let response = await anthropic.messages.create({
      model: tools.length > 0 ? DEFAULT_MODEL : FAST_MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined
    });

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

      // Chamar Claude novamente com os resultados
      response = await anthropic.messages.create({
        model: DEFAULT_MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });
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

    return NextResponse.json({
      message: assistantMessage,
      conversation_id: conversationId
    });
  } catch (error: any) {
    console.error('Erro no chat:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar mensagem' }, { status: 500 });
  }
}

