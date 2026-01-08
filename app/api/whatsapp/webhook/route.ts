import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

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
    const url = `${instance.api_url}/message/sendText/${instance.instance_name}`;
    const body = {
      number: phone.replace(/\D/g, ''),
      text: message
    };

    console.log('Enviando mensagem WhatsApp:', {
      url,
      instanceName: instance.instance_name,
      phone: body.number,
      messageLength: message.length
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key
      },
      body: JSON.stringify(body)
    });

    const responseText = await response.text();
    console.log('Resposta Evolution API:', {
      status: response.status,
      ok: response.ok,
      body: responseText.substring(0, 500)
    });

    if (!response.ok) {
      console.error('Erro Evolution API:', responseText);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error.message);
    return false;
  }
}

// POST - Webhook do Evolution API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook recebido:', JSON.stringify(body).substring(0, 500));

    const supabase = createAdminClient();

    // Extrair dados da mensagem (formato Evolution API v2)
    const event = body.event || body.type;
    const messageData = body.data || body;
    const instanceName = body.instance || ''; // Nome da instância que recebeu a mensagem
    
    // Só processa mensagens recebidas
    if (event !== 'messages.upsert' && event !== 'message') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

    // Extrair key e message corretamente do Evolution API
    const keyData = messageData.key || {};
    const messageContent = messageData.message || {};

    const remoteJid = keyData.remoteJid || messageData.remoteJid || '';
    const fromMe = keyData.fromMe || false;
    const messageText = messageContent.conversation ||
                        messageContent.extendedTextMessage?.text ||
                        messageContent.imageMessage?.caption ||
                        messageContent.videoMessage?.caption ||
                        messageContent.documentMessage?.caption ||
                        messageData.body ||
                        '';

    // Log detalhado para debug
    console.log('Dados extraídos:', {
      event,
      remoteJid,
      fromMe,
      messageText: messageText.substring(0, 100),
      hasKey: !!messageData.key,
      hasMessage: !!messageData.message
    });

    // Ignora mensagens enviadas por mim ou vazias
    if (fromMe || !messageText.trim()) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe or empty' });
    }

    // Extrair número do telefone
    const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    
    console.log('Mensagem recebida de:', phone);
    console.log('Texto:', messageText);

    // Verificar se o número é autorizado
    console.log('Buscando número autorizado...');
    let authorizedNumber = null;
    try {
      const { data, error } = await supabase
        .from('whatsapp_authorized_numbers')
        .select('*, company_group_id')
        .eq('phone_number', phone)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) {
        console.error('Erro ao buscar número autorizado:', error);
        return NextResponse.json({ status: 'error', reason: 'db_error', error: error.message }, { status: 500 });
      }
      
      authorizedNumber = data;
      console.log('Número autorizado encontrado:', authorizedNumber ? 'SIM' : 'NÃO', authorizedNumber?.name);
    } catch (dbError: any) {
      console.error('Exceção ao buscar número:', dbError.message);
      return NextResponse.json({ status: 'error', reason: 'exception', error: dbError.message }, { status: 500 });
    }

    if (!authorizedNumber) {
      console.log('Número não autorizado:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized number' });
    }

    // Salvar mensagem recebida
    await supabase.from('whatsapp_messages').insert({
      company_group_id: authorizedNumber.company_group_id,
      phone_number: phone,
      message_content: messageText,
      direction: 'incoming',
      sender_name: authorizedNumber.name || phone
    });

    // Verificar limite de mensagens WhatsApp do mês
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    // Buscar plano do grupo
    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', authorizedNumber.company_group_id)
      .single();

    let maxWhatsappPerMonth = 100; // default

    if (groupData?.plan_id) {
      const { data: plan } = await supabase
        .from('powerbi_plans')
        .select('max_whatsapp_messages_per_month')
        .eq('id', groupData.plan_id)
        .single();
      
      if (plan?.max_whatsapp_messages_per_month) {
        maxWhatsappPerMonth = plan.max_whatsapp_messages_per_month;
      }
    }

    // Contar mensagens enviadas (outgoing) no mês
    const { count: messagesThisMonth } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('direction', 'outgoing')
      .gte('created_at', firstDayOfMonth);

    // Verificar se excedeu (999999 = ilimitado)
    if (maxWhatsappPerMonth < 999999 && (messagesThisMonth || 0) >= maxWhatsappPerMonth) {
      console.log('Limite de mensagens WhatsApp atingido para o grupo');
      return NextResponse.json({ 
        status: 'limit_reached',
        reason: 'monthly whatsapp limit reached'
      });
    }

    // Buscar instância WhatsApp pela que recebeu a mensagem
    let instance = null;

    // Primeiro tenta buscar pela instância que enviou o webhook
    if (instanceName) {
      const { data: instanceByName } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('instance_name', instanceName)
        .eq('is_connected', true)
        .maybeSingle();
      
      instance = instanceByName;
      console.log('Instância encontrada pelo nome:', instanceName, instance ? 'SIM' : 'NÃO');
    }

    // Se não encontrou pelo nome, tenta pelo instance_id do número autorizado
    if (!instance && authorizedNumber?.instance_id) {
      const { data: instanceById } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('id', authorizedNumber.instance_id)
        .eq('is_connected', true)
        .maybeSingle();
      
      instance = instanceById;
      console.log('Instância encontrada pelo ID:', authorizedNumber.instance_id, instance ? 'SIM' : 'NÃO');
    }

    // Fallback: qualquer instância conectada
    if (!instance) {
      const { data: anyInstance } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_connected', true)
        .limit(1)
        .maybeSingle();
      
      instance = anyInstance;
      console.log('Usando instância fallback:', instance?.instance_name);
    }

    if (!instance) {
      console.log('Nenhuma instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    // Buscar alerta configurado para este número
    // O campo whatsapp_number é uma string separada por vírgula, não um array
    console.log('Buscando alertas para o número:', phone);

    const { data: alerts, error: alertError } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false });

    if (alertError) {
      console.error('Erro ao buscar alertas:', alertError);
    }

    // Filtrar alertas que contêm o número de telefone
    const recentAlert = alerts?.find(alert => {
      const numbers = alert.whatsapp_number || '';
      return numbers.includes(phone);
    }) || null;

    console.log('Alerta encontrado:', recentAlert ? recentAlert.name : 'NENHUM');
    console.log('Connection ID:', recentAlert?.connection_id);
    console.log('Dataset ID:', recentAlert?.dataset_id);

    // Se não tem conexão configurada, enviar mensagem de suporte
    if (!recentAlert?.connection_id || !recentAlert?.dataset_id) {
      console.log('Sem conexão/dataset configurado - enviando mensagem de suporte');
      
      const supportMessage = `Olá ${authorizedNumber.name || ''}! 👋

Sou o assistente IA da sua empresa, mas ainda não tenho acesso aos seus dados configurado.

📞 *Entre em contato com o suporte* para configurar:
- Conexão com seus dados
- Alertas personalizados
- Consultas via WhatsApp

Assim que estiver configurado, poderei te ajudar com análises e consultas em tempo real! 🚀`;

      // Enviar mensagem de suporte
      const sent = await sendWhatsAppMessage(instance, phone, supportMessage);
      
      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: supportMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
      }

      return NextResponse.json({ 
        status: 'success', 
        sent,
        reason: 'no_connection_configured'
      });
    }

    // Buscar contexto do modelo (se houver alerta com conexão)
    let modelContext = '';
    if (recentAlert?.connection_id) {
      const { data: context } = await supabase
        .from('ai_model_contexts')
        .select('context_content')
        .eq('connection_id', recentAlert.connection_id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (context?.context_content) {
        modelContext = context.context_content.slice(0, 6000);
      }
    }

    // Construir prompt para a IA
    const systemPrompt = `Você é o assistente IA da empresa do usuário, integrado via WhatsApp. Responda de forma concisa e direta.

${modelContext ? `## CONTEXTO DO MODELO DE DADOS\n${modelContext}\n` : ''}

## REGRAS
- Respostas curtas e objetivas (máximo 500 caracteres)
- Use emojis moderadamente
- Formate valores: R$ 1.234,56
- Se precisar de dados, use a função execute_dax
- Não mencione nomes técnicos de medidas ou tabelas
- Sempre formate a resposta para WhatsApp (use *negrito* e _itálico_)

## CONTEXTO DO ALERTA
${recentAlert ? `
Último alerta: ${recentAlert.name}
Query DAX: ${recentAlert.dax_query}
Dataset: ${recentAlert.dataset_id}
Conexão: ${recentAlert.connection_id}
` : 'Nenhum alerta recente encontrado.'}

## DATA ATUAL
${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
`;

    // Definir tools para o Claude
    const tools: Anthropic.Tool[] = recentAlert?.connection_id && recentAlert?.dataset_id ? [
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

    // Chamar Claude
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: messageText }],
      tools: tools.length > 0 ? tools : undefined
    });

    // Processar tool calls
    let iterations = 0;
    const maxIterations = 2;
    const messages: any[] = [{ role: 'user', content: messageText }];

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      
      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use' && toolUse.name === 'execute_dax' && recentAlert) {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;

          console.log('Executando DAX via WhatsApp:', toolInput.query);

          const daxResult = await executeDaxQuery(
            recentAlert.connection_id,
            recentAlert.dataset_id,
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
        max_tokens: 500,
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

    if (!assistantMessage.trim()) {
      assistantMessage = 'Desculpe, não consegui processar sua pergunta. Tente novamente!';
    }

    // Limitar tamanho da mensagem
    if (assistantMessage.length > 1000) {
      assistantMessage = assistantMessage.substring(0, 997) + '...';
    }

    console.log('Resposta IA:', assistantMessage);

    // Log da instância que será usada
    console.log('Instância para envio:', {
      id: instance.id,
      name: instance.instance_name,
      api_url: instance.api_url,
      is_connected: instance.is_connected
    });

    // Enviar resposta
    const sent = await sendWhatsAppMessage(instance, phone, assistantMessage);

    console.log('Mensagem enviada:', sent);

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

