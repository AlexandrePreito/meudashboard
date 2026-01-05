import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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
        })
      }
    );

    if (!daxRes.ok) {
      const errorText = await daxRes.text();
      return { success: false, error: `Erro DAX: ${errorText}` };
    }

    const daxData = await daxRes.json();
    const results = daxData.results?.[0]?.tables?.[0]?.rows || [];

    return { success: true, results };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Função para enviar mensagem via WhatsApp
async function sendWhatsAppMessage(instance: any, phone: string, message: string) {
  try {
    const response = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        text: message
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error);
    return false;
  }
}

// POST - Webhook do Evolution API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook recebido:', JSON.stringify(body).substring(0, 500));
    console.log('Evento:', body.event);
    console.log('Data keys:', Object.keys(body.data || {}));

    const supabase = createAdminClient();

    // Extrair dados da mensagem (formato Evolution API v2)
    const event = body.event;
    const data = body.data;
    
    // Só processa mensagens recebidas
    if (event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

    // Extrair informações da mensagem - Evolution v2 usa data.key
    const remoteJid = data?.key?.remoteJid;
    const fromMe = data?.key?.fromMe || false;
    const messageText = data?.message?.conversation || 
                        data?.message?.extendedTextMessage?.text ||
                        '';

    console.log('remoteJid:', remoteJid);
    console.log('fromMe:', fromMe);
    console.log('messageText:', messageText);

    // Ignora mensagens enviadas por mim ou vazias
    if (fromMe || !messageText.trim()) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe or empty' });
    }

    // Extrair número do telefone
    const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    
    console.log('phone extraído:', phone);

    // Verificar se o número é autorizado
    const { data: authorizedNumber } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('*, company_group_id')
      .eq('phone_number', phone)
      .eq('is_active', true)
      .maybeSingle();

    if (!authorizedNumber) {
      console.log('Número não autorizado:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized number' });
    }

    // Buscar histórico de mensagens recentes deste número (últimas 10 mensagens)
    const { data: messageHistory } = await supabase
      .from('whatsapp_messages')
      .select('direction, message_content, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(10);

    // Montar contexto de conversa
    let conversationContext = '';
    if (messageHistory && messageHistory.length > 0) {
      const reversedHistory = messageHistory.reverse();
      conversationContext = '\n## HISTÓRICO DA CONVERSA\n';
      for (const msg of reversedHistory) {
        const role = msg.direction === 'incoming' ? 'Usuário' : 'Assistente';
        conversationContext += `${role}: ${msg.message_content}\n`;
      }
    }

    // Salvar mensagem recebida
    await supabase.from('whatsapp_messages').insert({
      company_group_id: authorizedNumber.company_group_id,
      phone_number: phone,
      message_content: messageText,
      direction: 'incoming',
      sender_name: authorizedNumber.name || phone
    });

    // Buscar instância WhatsApp ativa
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('is_connected', true)
      .limit(1)
      .maybeSingle();

    if (!instance) {
      console.log('Nenhuma instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    // Buscar último alerta disparado para este número (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentAlert } = await supabase
      .from('ai_alerts')
      .select('*')
      .contains('whatsapp_number', [phone])
      .gte('last_triggered_at', oneDayAgo)
      .order('last_triggered_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Buscar contexto do modelo (da conexão do alerta ou primeira conexão ativa)
    let modelContext = '';
    let connectionId = recentAlert?.connection_id || null;
    let datasetId = recentAlert?.dataset_id || null;
    
    // Se não tem alerta recente, buscar primeira conexão ativa
    if (!connectionId) {
      const { data: firstConnection } = await supabase
        .from('powerbi_connections')
        .select('id')
        .limit(1)
        .maybeSingle();
      connectionId = firstConnection?.id || null;
    }
    
    // Se tem conexão mas não tem dataset, buscar o primeiro dataset da conexão
    if (connectionId && !datasetId) {
      const { data: report } = await supabase
        .from('powerbi_reports')
        .select('dataset_id')
        .eq('connection_id', connectionId)
        .limit(1)
        .maybeSingle();
      
      if (report?.dataset_id) {
        datasetId = report.dataset_id;
      }
    }
    
    // Se ainda não tem dataset, tentar buscar do alerta mais recente (qualquer um)
    if (!datasetId) {
      const { data: anyAlert } = await supabase
        .from('ai_alerts')
        .select('dataset_id, connection_id')
        .not('dataset_id', 'is', null)
        .limit(1)
        .maybeSingle();
      
      if (anyAlert?.dataset_id) {
        datasetId = anyAlert.dataset_id;
        if (!connectionId && anyAlert.connection_id) {
          connectionId = anyAlert.connection_id;
        }
      }
    }
    
    if (connectionId) {
      const context = await getModelContext(supabase, connectionId);
      if (context) {
        modelContext = context;
        console.log('Contexto do modelo carregado:', modelContext.substring(0, 200) + '...');
      }
    }

    // Construir prompt para a IA
    const systemPrompt = `Você é o Assistente Aquarius, um analista de BI via WhatsApp.

## REGRA MAIS IMPORTANTE - LEIA COM ATENÇÃO!
⚠️ NUNCA, EM HIPÓTESE ALGUMA, invente valores ou dados!
⚠️ Você DEVE usar a função execute_dax para QUALQUER pergunta sobre números, vendas, valores, rankings, etc.
⚠️ Se não conseguir executar a query ou o resultado for vazio, diga: "Não encontrei dados para essa consulta."
⚠️ NUNCA responda com valores fictícios como R$ 892.458,73 ou nomes inventados.

## COMO RESPONDER
1. Quando o usuário perguntar sobre dados, PRIMEIRO execute a query DAX
2. AGUARDE o resultado real da query
3. SÓ ENTÃO formate a resposta com os dados REAIS retornados
4. Se o resultado for null ou vazio, informe que não há dados

## HISTÓRICO DA CONVERSA (use para entender o contexto)
${conversationContext || 'Início da conversa'}

## QUANDO USUÁRIO DIGITAR APENAS UM NÚMERO (1, 2, 3, 4)
Interprete como a opção sugerida na mensagem anterior:
- Se sugeriu "1️⃣ Detalhar por filial" e usuário digitou "1", execute query de vendas por filial
- Se sugeriu "2️⃣ Top vendedores" e usuário digitou "2", execute query de ranking vendedores
- Mantenha o mesmo período/contexto da pergunta anterior

${modelContext ? `## DOCUMENTAÇÃO DO MODELO - USE ESSES NOMES E TABELAS!
${modelContext}
` : ''}

## QUERIES DAX DE EXEMPLO (adapte conforme necessário)
- Vendas total: EVALUATE ROW("Total", [QA_Faturamento])
- Vendas por filial: EVALUATE SUMMARIZECOLUMNS(Filial[Filial], "Vendas", [QA_Faturamento])
- Vendas por mês: EVALUATE SUMMARIZECOLUMNS(Calendario[Mes], "Vendas", [QA_Faturamento])
- Top vendedores: EVALUATE TOPN(5, SUMMARIZECOLUMNS(Vendedor[Nome], "Vendas", [QA_Faturamento]), [Vendas], DESC)
- Top produtos: EVALUATE TOPN(10, SUMMARIZECOLUMNS(Produto[Descricao], "Vendas", [QA_Faturamento]), [Vendas], DESC)

## ALERTA ATIVO
${recentAlert ? `Query base do alerta: ${recentAlert.dax_query}` : 'Nenhum alerta configurado'}

## FORMATO DA RESPOSTA (só após ter dados reais!)
📊 *Título*
[dados reais aqui]

━━━━━━━━━━━━━━━━━━━━
💡 *Quer saber mais?*
1️⃣ Opção
2️⃣ Opção
3️⃣ Opção
4️⃣ Opção

## DATA ATUAL
${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}

LEMBRE-SE: SEM DADOS REAIS DO execute_dax = SEM RESPOSTA COM NÚMEROS!
`;

    // Definir tools para o Claude
    const tools: Anthropic.Tool[] = connectionId && datasetId ? [
      {
        name: 'execute_dax',
        description: 'Executa uma query DAX no Power BI para buscar dados.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'A query DAX a ser executada'
            }
          },
          required: ['query']
        }
      }
    ] : [];

    console.log('=== DEBUG TOOLS ===');
    console.log('recentAlert:', recentAlert?.name || 'NENHUM');
    console.log('connectionId:', connectionId || 'NENHUM');
    console.log('datasetId:', datasetId || 'NENHUM');
    console.log('Tools configuradas:', tools.length);
    console.log('==================');

    // Chamar Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageText }],
      tools: tools.length > 0 ? tools : undefined
    });

    // Processar tool calls
    let iterations = 0;
    const maxIterations = 2;
    const messages: any[] = [{ role: 'user', content: messageText }];

    console.log('Stop reason:', response.stop_reason);
    console.log('Content blocks:', response.content.map((b: any) => b.type));

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      
      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log('Processando tool:', (toolUse as any).name);
        if (toolUse.type === 'tool_use' && (toolUse as any).name === 'execute_dax' && connectionId && datasetId) {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;

          console.log('=== QUERY DAX EXECUTADA ===');
          console.log(toolInput.query);
          console.log('===========================');

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

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });
    }

    // Extrair resposta final
    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    // Limpar resposta - remover código, erros e texto técnico
    assistantMessage = assistantMessage
      // Remover blocos de código DAX
      .replace(/```dax[\s\S]*?```/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      // Remover tags XML
      .replace(/<execute_dax>[\s\S]*?<\/execute_dax>/gi, '')
      .replace(/<[^>]+>/g, '')
      // Remover queries DAX expostas
      .replace(/EVALUATE[\s\S]*?(?=\n\n|\n📊|$)/gi, '')
      .replace(/DAX\([^)]+\)/gi, '')
      // Remover mensagens de erro
      .replace(/Error:.*?(?=\n|$)/gi, '')
      .replace(/Deixe-me ajustar.*?(?=\n|$)/gi, '')
      .replace(/Para consultar.*?sistema\.?\n?/gi, '')
      .replace(/Deixe-me buscar.*?(?=\n|$)/gi, '')
      // Remover informações técnicas de tabela
      .replace(/Table with \d+ rows.*?(?=\n|$)/gi, '')
      .replace(/[A-Za-z_ ]+: [\d.]+\n/g, '')
      // Limpar linhas vazias múltiplas
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Se a resposta ficou muito curta ou vazia, não enviar
    if (!assistantMessage || assistantMessage.length < 20) {
      assistantMessage = '📊 Consultei os dados mas houve um problema ao formatar. Pode repetir a pergunta?';
    }

    // Garantir que começa com emoji se não começar
    if (!assistantMessage.startsWith('📊') && !assistantMessage.startsWith('🎯') && !assistantMessage.startsWith('💰')) {
      // Encontrar onde começa o conteúdo útil (geralmente com emoji)
      const emojiStart = assistantMessage.search(/[📊🎯💰🏪🥇✨]/);
      if (emojiStart > 0) {
        assistantMessage = assistantMessage.substring(emojiStart);
      }
    }

    console.log('Resposta limpa:', assistantMessage.substring(0, 200));

    // Limitar tamanho da mensagem
    if (assistantMessage.length > 1200) {
      assistantMessage = assistantMessage.substring(0, 1197) + '...';
    }

    // Enviar resposta
    const sent = await sendWhatsAppMessage(instance, phone, assistantMessage);

    // Salvar mensagem enviada
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA'
      });
    }

    return NextResponse.json({ 
      status: 'success', 
      sent,
      response: assistantMessage.substring(0, 100) + '...'
    });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Verificação do webhook
export async function GET(request: Request) {
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Webhook WhatsApp ativo',
    timestamp: new Date().toISOString()
  });
}

