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
      return context.context_content.slice(0, 12000);
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
    console.log('[sendWhatsAppMessage] Iniciando envio...');
    console.log('[sendWhatsAppMessage] Instância:', instance.instance_name);
    console.log('[sendWhatsAppMessage] API URL:', instance.api_url);
    console.log('[sendWhatsAppMessage] Número formatado:', phone.replace(/\D/g, ''));
    
    const url = `${instance.api_url}/message/sendText/${instance.instance_name}`;
    console.log('[sendWhatsAppMessage] URL completa:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key || ''
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        text: message
      })
    });
    
    console.log('[sendWhatsAppMessage] Status HTTP:', response.status);
    console.log('[sendWhatsAppMessage] Response OK:', response.ok);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendWhatsAppMessage] Erro da Evolution API:', errorText);
    } else {
      const responseData = await response.json();
      console.log('[sendWhatsAppMessage] Resposta da API:', JSON.stringify(responseData));
    }
    
    return response.ok;
  } catch (error) {
    console.error('[sendWhatsAppMessage] EXCEÇÃO ao enviar mensagem:', error);
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

    // Verificar se o número é autorizado e buscar instância vinculada
    const { data: authorizedNumber, error: authError } = await supabase
      .from('whatsapp_authorized_numbers')
      .select(`
        *,
        company_group_id,
        instance:whatsapp_instances(
          id,
          name,
          instance_name,
          api_url,
          api_key,
          is_connected
        )
      `)
      .eq('phone_number', phone)
      .eq('is_active', true)
      .single();

    if (authError || !authorizedNumber) {
      console.log('Número não autorizado:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized number' });
    }

    // Verificar se número tem instância vinculada
    if (!authorizedNumber.instance) {
      console.error('❌ Número autorizado não tem instância vinculada!');
      return NextResponse.json({ status: 'error', reason: 'no instance linked to number' });
    }

    console.log('━━━━━━━━━ INSTÂNCIA VINCULADA AO NÚMERO ━━━━━━━━━');
    console.log('Instância:', authorizedNumber.instance.name);
    console.log('Instance Name:', authorizedNumber.instance.instance_name);
    console.log('API URL:', authorizedNumber.instance.api_url);
    console.log('Conectada?', authorizedNumber.instance.is_connected ? '✅ SIM' : '❌ NÃO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Buscar histórico de mensagens recentes deste número (últimas 20 mensagens)
    const { data: messageHistory } = await supabase
      .from('whatsapp_messages')
      .select('direction, message_content, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(20);

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

    // Usar a instância vinculada ao número autorizado
    const instance = authorizedNumber.instance;
    
    // Verificar se a instância está conectada
    if (!instance.is_connected) {
      console.warn('⚠️ AVISO: Instância não está conectada:', instance.name);
      // Continua mesmo assim, pois pode ter desconectado temporariamente
    }

    // Buscar datasets vinculados ao número
    const { data: numberDatasets } = await supabase
      .from('whatsapp_number_datasets')
      .select('connection_id, dataset_id, dataset_name')
      .eq('authorized_number_id', authorizedNumber.id);

    console.log('━━━━━━━━━ DATASETS VINCULADOS ━━━━━━━━━');
    console.log('Número autorizado ID:', authorizedNumber.id);
    console.log('Datasets encontrados:', numberDatasets?.length || 0);
    if (numberDatasets && numberDatasets.length > 0) {
      console.log('Datasets:', JSON.stringify(numberDatasets, null, 2));
    } else {
      console.log('⚠️ NENHUM dataset vinculado - usando fallback');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    let modelContext = '';
    let connectionId: string | null = null;
    let datasetId: string | null = null;

    // LÓGICA DE SELEÇÃO DE DATASET
    if (!numberDatasets || numberDatasets.length === 0) {
      // Comportamento atual: buscar por alerta ou primeira conexão
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAlert } = await supabase
        .from('ai_alerts')
        .select('*')
        .contains('whatsapp_number', [phone])
        .gte('last_triggered_at', oneDayAgo)
        .order('last_triggered_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      connectionId = recentAlert?.connection_id || null;
      datasetId = recentAlert?.dataset_id || null;
      
      if (!connectionId) {
        const { data: firstConnection } = await supabase
          .from('powerbi_connections')
          .select('id')
          .limit(1)
          .maybeSingle();
        connectionId = firstConnection?.id || null;
      }
      
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
    } 
    else if (numberDatasets.length === 1) {
      // Se tem apenas 1 dataset, usar diretamente
      connectionId = numberDatasets[0].connection_id;
      datasetId = numberDatasets[0].dataset_id;
      console.log('✅ Usando dataset único vinculado:', numberDatasets[0].dataset_name);
    } 
    else {
      // Se tem múltiplos datasets
      console.log('🔀 Múltiplos datasets encontrados:', numberDatasets.length);
      const trimmedMessage = messageText.trim();
      const isSelectingDataset = /^[1-9]$/.test(trimmedMessage);
      console.log('Mensagem é seleção numérica?', isSelectingDataset, '(mensagem:', trimmedMessage, ')');
      
      // Buscar última mensagem do sistema
      const { data: lastBotMessage } = await supabase
        .from('whatsapp_messages')
        .select('message_content')
        .eq('phone_number', phone)
        .eq('direction', 'outgoing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      const wasAskingForDataset = lastBotMessage?.message_content?.includes('Sobre qual base você quer consultar?');
      console.log('Última mensagem do bot perguntava sobre dataset?', wasAskingForDataset);
      
      if (isSelectingDataset && wasAskingForDataset) {
        // Usuário está selecionando um dataset
        const selectedIndex = parseInt(trimmedMessage) - 1;
        console.log('👆 Usuário selecionou opção:', selectedIndex + 1);
        if (selectedIndex >= 0 && selectedIndex < numberDatasets.length) {
          connectionId = numberDatasets[selectedIndex].connection_id;
          datasetId = numberDatasets[selectedIndex].dataset_id;
          console.log('✅ Dataset selecionado:', numberDatasets[selectedIndex].dataset_name);
        } else {
          // Índice inválido
          console.log('❌ Seleção inválida:', trimmedMessage);
          const invalidMessage = `❌ Opção inválida. Digite um número de 1 a ${numberDatasets.length}.`;
          await sendWhatsAppMessage(instance, phone, invalidMessage);
          return NextResponse.json({ status: 'invalid_selection' });
        }
      } else if (!wasAskingForDataset) {
        // Perguntar qual dataset usar
        console.log('❓ Perguntando ao usuário qual dataset usar...');
        let datasetMenu = '📊 Sobre qual base você quer consultar?\n\n';
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        numberDatasets.forEach((ds, idx) => {
          const emoji = emojis[idx] || `${idx + 1}.`;
          datasetMenu += `${emoji} ${ds.dataset_name || ds.dataset_id}\n`;
        });
        datasetMenu += '\nDigite o número da opção.';
        
        console.log('📤 Enviando menu de seleção...');
        await sendWhatsAppMessage(instance, phone, datasetMenu);
        
        // Salvar pergunta do usuário
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: messageText,
          direction: 'incoming',
          sender_name: authorizedNumber.name || phone
        });
        
        // Salvar resposta do bot
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: datasetMenu,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
        
        console.log('✅ Menu de seleção enviado e salvo');
        return NextResponse.json({ status: 'asking_dataset_selection' });
      } else {
        // wasAskingForDataset mas não é seleção válida - usar primeiro dataset
        console.log('⚠️ Não é seleção válida, usando primeiro dataset (fallback)');
        connectionId = numberDatasets[0].connection_id;
        datasetId = numberDatasets[0].dataset_id;
        console.log('Usando primeiro dataset (fallback):', numberDatasets[0].dataset_name);
      }
    }
    
    if (connectionId) {
      const context = await getModelContext(supabase, connectionId);
      if (context) {
        modelContext = context;
        console.log('Contexto do modelo carregado:', modelContext.substring(0, 200) + '...');
      } else {
        console.log('⚠️ AVISO: Nenhum contexto encontrado para connectionId:', connectionId);
      }
    }

    // Se não tem contexto, avisar no log
    if (!modelContext) {
      console.log('⚠️ AVISO: Assistente vai responder SEM contexto do modelo');
    }

    // Construir prompt para a IA
    const systemPrompt = `Você é um Assistente de BI via WhatsApp, especializado em consultar dados e responder perguntas sobre indicadores de negócio.

## REGRA DE CONFIDENCIALIDADE
⚠️ NUNCA mencione nomes de empresas, grupos ou sistemas internos (como Aquarius, Hospcom, Vion, VionFlow, etc).
⚠️ Se os dados contiverem nomes de empresas do grupo, apresente apenas os valores sem revelar que são empresas relacionadas.
⚠️ Você é apenas "Assistente de BI" - não tem nome específico.
⚠️ Se perguntarem quem é você ou para quem trabalha, diga apenas: "Sou um assistente de BI que ajuda a consultar dados e indicadores."

## REGRA MAIS IMPORTANTE
⚠️ NUNCA invente valores! Use SEMPRE a função execute_dax para buscar dados reais.
⚠️ Se não conseguir executar a query, diga que não encontrou os dados.
⚠️ SEMPRE consulte a seção "DOCUMENTAÇÃO DO MODELO" abaixo para saber os nomes EXATOS das tabelas, colunas e medidas. NUNCA adivinhe nomes.

## COMO USAR A DOCUMENTAÇÃO
1. Leia a documentação do modelo ANTES de criar qualquer query
2. Use EXATAMENTE os nomes de tabelas, colunas e medidas documentados
3. Aplique os filtros obrigatórios indicados (ex: Intercompany = "N")
4. Se uma coluna/medida não estiver na documentação, NÃO USE

## FORMATAÇÃO DAS MENSAGENS WHATSAPP
- NÃO use asteriscos (*) para negrito
- Use emojis de forma limpa e organizada
- Separe seções com linha: ━━━━━━━━━━━━━━━━━
- Seja conciso (máximo 1200 caracteres)

## FORMATO PARA VALORES/FATURAMENTO
📊 [Título do que foi pedido]

💰 R$ X.XXX.XXX,XX

📈 Comparativo se relevante

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ Opção 1
2️⃣ Opção 2
3️⃣ Opção 3

## FORMATO PARA RANKINGS/TOP N
🏆 [Título]

🥇 Primeiro: R$ X.XXX,XX
🥈 Segundo: R$ X.XXX,XX
🥉 Terceiro: R$ X.XXX,XX
4️⃣ Quarto: R$ X.XXX,XX
5️⃣ Quinto: R$ X.XXX,XX

━━━━━━━━━━━━━━━━━
💡 Quer saber mais?
1️⃣ Opção 1
2️⃣ Opção 2

## INTERPRETAÇÃO DE NÚMEROS
Se usuário digitar apenas 1, 2, 3 ou 4, interprete como a opção sugerida anteriormente.

## HISTÓRICO DA CONVERSA
${conversationContext || 'Início da conversa'}

${modelContext ? `## DOCUMENTAÇÃO DO MODELO (USE EXATAMENTE COMO ESTÁ AQUI)
${modelContext}
` : `## SEM DOCUMENTAÇÃO
Não há documentação do modelo disponível. Informe ao usuário que não foi possível acessar os dados.`}

## DATA ATUAL
${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Mês atual: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
Mês número: ${new Date().getMonth() + 1}
Ano: ${new Date().getFullYear()}
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

    // Se a resposta ficou muito curta ou vazia, dar mensagem mais útil
    if (!assistantMessage || assistantMessage.length < 20) {
      if (!modelContext) {
        assistantMessage = '⚠️ Não foi possível acessar os dados. Por favor, verifique se o contexto do modelo está configurado.';
      } else {
        assistantMessage = '📊 Não consegui processar essa consulta. Pode reformular a pergunta?';
      }
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

    console.log('━━━━━━━━━ ENVIANDO MENSAGEM ━━━━━━━━━');
    console.log('Para:', phone);
    console.log('Instância:', instance.instance_name);
    console.log('URL:', `${instance.api_url}/message/sendText/${instance.instance_name}`);
    console.log('Tamanho da mensagem:', assistantMessage.length, 'caracteres');
    console.log('Primeiros 100 chars:', assistantMessage.substring(0, 100));
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Enviar resposta
    const sent = await sendWhatsAppMessage(instance, phone, assistantMessage);

    console.log('━━━━━━━━━ RESULTADO DO ENVIO ━━━━━━━━━');
    console.log('Status de envio:', sent ? '✅ SUCESSO' : '❌ FALHOU');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Salvar mensagem enviada
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA'
      });
      console.log('✅ Mensagem salva no banco de dados');
    } else {
      console.error('❌ ERRO: Mensagem NÃO foi enviada e NÃO foi salva!');
    }

    console.log('━━━━━━━━━ WEBHOOK FINALIZADO ━━━━━━━━━');
    console.log('Status final:', sent ? 'SUCESSO' : 'FALHA');
    console.log('Mensagem foi enviada?', sent);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return NextResponse.json({ 
      status: 'success', 
      sent,
      response: assistantMessage.substring(0, 100) + '...'
    });

  } catch (error: any) {
    console.error('━━━━━━━━━ ERRO NO WEBHOOK ━━━━━━━━━');
    console.error('Tipo:', error.name);
    console.error('Mensagem:', error.message);
    console.error('Stack:', error.stack);
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

