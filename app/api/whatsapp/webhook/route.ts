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
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Erro ao buscar número autorizado:', error);
        return NextResponse.json({ status: 'error', reason: 'db_error', error: error.message }, { status: 500 });
      }
      
      authorizedNumber = data?.[0] || null;
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

    // Verificar se é uma saudação genérica
    const greetings = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'eai', 'opa', 'fala'];
    const isGreeting = greetings.some(g => messageText.toLowerCase().trim() === g || messageText.toLowerCase().trim().startsWith(g + ' '));

    // Buscar conexão Power BI do grupo
    const { data: groupConnection } = await supabase
      .from('powerbi_connections')
      .select('id, name')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .limit(1)
      .maybeSingle();

    // Buscar TODOS os contextos disponíveis do grupo
    const { data: allContexts } = await supabase
      .from('ai_model_contexts')
      .select('id, connection_id, dataset_id, context_content, name')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_active', true);

    console.log('Contextos encontrados:', allContexts?.length || 0);

    // Verificar se usuário já tem uma seleção ativa (últimas 24h)
    const { data: userSelection } = await supabase
      .from('whatsapp_user_selections')
      .select('*')
      .eq('phone_number', phone)
      .eq('company_group_id', authorizedNumber.company_group_id)
      .gte('created_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .maybeSingle();

    console.log('Seleção do usuário:', userSelection ? 'SIM' : 'NÃO');

    // Comando "trocar" para resetar seleção (verificar ANTES de processar cenários)
    if (messageText.toLowerCase().trim() === 'trocar') {
      if (allContexts && allContexts.length > 1) {
        // Deletar seleção atual
        await supabase
          .from('whatsapp_user_selections')
          .delete()
          .eq('phone_number', phone)
          .eq('company_group_id', authorizedNumber.company_group_id);

        // Mostrar opções novamente
        let optionsList = '🔄 *Vamos escolher novamente!*\n\n';
        allContexts.forEach((ctx, idx) => {
          optionsList += `${idx + 1}️⃣ ${ctx.name || 'Dataset ' + (idx + 1)}\n`;
        });
        optionsList += '\n_Digite o número para selecionar._';

        const sent = await sendWhatsAppMessage(instance, phone, optionsList);

        if (sent) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: optionsList,
            direction: 'outgoing',
            sender_name: 'Assistente IA'
          });
        }

        return NextResponse.json({ status: 'success', reason: 'selection_reset' });
      } else {
        const noMultipleMessage = 'Você tem apenas um agente configurado. Não há o que trocar! 😊';
        await sendWhatsAppMessage(instance, phone, noMultipleMessage);
        return NextResponse.json({ status: 'success', reason: 'no_multiple_datasets' });
      }
    }

    // Buscar alerta como fallback
    const { data: alerts } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const recentAlert = alerts?.[0] || null;

    let connectionId: string | null = null;
    let datasetId: string | null = null;
    let aiContext: any = null;

    // CENÁRIO 1: Usuário tem seleção prévia
    if (userSelection) {
      connectionId = userSelection.selected_connection_id;
      datasetId = userSelection.selected_dataset_id;
      aiContext = allContexts?.find(ctx => 
        ctx.connection_id === userSelection.selected_connection_id && 
        ctx.dataset_id === userSelection.selected_dataset_id
      );
      console.log('Usando seleção prévia do usuário');
    }
    // CENÁRIO 2: Múltiplos datasets disponíveis e usuário NÃO tem seleção
    else if (allContexts && allContexts.length > 1) {
      const userInput = messageText.trim();
      const choice = parseInt(userInput);  // Verificar se usuário digitou um número válido
      if (!isNaN(choice) && choice >= 1 && choice <= allContexts.length) {
        // Usuário escolheu um dataset
        const selectedContext = allContexts[choice - 1];

        // SALVAR a escolha
        const { error: insertError } = await supabase
          .from('whatsapp_user_selections')
          .insert({
            phone_number: phone,
            company_group_id: authorizedNumber.company_group_id,
            selected_connection_id: selectedContext.connection_id,
            selected_dataset_id: selectedContext.dataset_id
          });

        if (insertError) {
          console.error('Erro ao salvar seleção:', insertError);
        }

        // Mensagem de confirmação
        const confirmMessage = `✅ *${selectedContext.name || 'Agente ' + choice}* selecionado!

Agora pode fazer suas perguntas. 😊

Digite "trocar" para mudar de agente.`;

        const sent = await sendWhatsAppMessage(instance, phone, confirmMessage);

        if (sent) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: confirmMessage,
            direction: 'outgoing',
            sender_name: 'Assistente IA'
          });
        }

        return NextResponse.json({ status: 'success', reason: 'dataset_selected' });
      } 
      // Usuário NÃO digitou número válido - mostrar opções
      else {
        let optionsList = '📊 *Escolha o agente:*\n\n';
        allContexts.forEach((ctx, idx) => {
          optionsList += `${idx + 1}️⃣ ${ctx.name || 'Dataset ' + (idx + 1)}\n`;
        });
        optionsList += '\n_Digite o número para selecionar._';

        const sent = await sendWhatsAppMessage(instance, phone, optionsList);

        if (sent) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: optionsList,
            direction: 'outgoing',
            sender_name: 'Assistente IA'
          });
        }

        return NextResponse.json({ status: 'success', reason: 'awaiting_dataset_selection' });
      }
    }
    // CENÁRIO 3: Apenas 1 dataset disponível
    else if (allContexts && allContexts.length === 1) {
      aiContext = allContexts[0];
      connectionId = aiContext.connection_id;
      datasetId = aiContext.dataset_id;
      console.log('Usando único dataset disponível');
    }
    // CENÁRIO 4: Nenhum contexto, tentar alerta
    else if (recentAlert) {
      connectionId = recentAlert.connection_id;
      datasetId = recentAlert.dataset_id;
      console.log('Usando alerta como fallback');
    }

    console.log('Conexão encontrada:', connectionId ? 'SIM' : 'NÃO');
    console.log('Dataset encontrado:', datasetId ? 'SIM' : 'NÃO');
    console.log('É saudação:', isGreeting);

    // ============================================
    // PROCESSAR COMANDOS ESPECIAIS
    // ============================================
    const userCommand = messageText.toLowerCase().trim();

    // Comando: /ajuda
    if (userCommand === '/ajuda' || userCommand === 'ajuda') {
      const helpMessage = `🤖 *Assistente IA - Comandos*

*Comandos disponíveis:*
/ajuda - Mostra esta mensagem
/limpar - Limpar histórico de conversa
/trocar - Trocar agente/dataset
/status - Ver status da conexão

📊 *Exemplos de perguntas:*
- Qual o faturamento hoje?
- Mostre os top 5 produtos
- Compare vendas deste mês vs mês passado
- Quem são meus maiores clientes?
- Como está o estoque?

💡 *Dica:* Seja específico nas perguntas para respostas mais precisas!`;

      const sent = await sendWhatsAppMessage(instance, phone, helpMessage);

      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: helpMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
      }

      return NextResponse.json({ status: 'success', reason: 'help_command' });
    }

    // Comando: /limpar
    if (userCommand === '/limpar' || userCommand === 'limpar') {
      await supabase
        .from('whatsapp_messages')
        .update({ archived: true })
        .eq('phone_number', phone)
        .eq('company_group_id', authorizedNumber.company_group_id);

      const clearMessage = `🗑️ *Histórico limpo!*

Agora podemos começar uma conversa do zero. Como posso ajudar? 😊`;

      const sent = await sendWhatsAppMessage(instance, phone, clearMessage);

      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: clearMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA',
          archived: false
        });
      }

      return NextResponse.json({ status: 'success', reason: 'history_cleared' });
    }

    // Comando: /status
    if (userCommand === '/status' || userCommand === 'status') {
      const statusMessage = `📊 *Status da Conexão*

*Usuário:* ${authorizedNumber.name || phone}
*Grupo:* ${authorizedNumber.company_group_id}
*Dataset:* ${datasetId ? '✅ Conectado' : '❌ Não configurado'}
*Conexão:* ${connectionId ? '✅ Ativa' : '❌ Inativa'}
*Instância WhatsApp:* ${instance.instance_name}

${connectionId && datasetId 
  ? '✅ Tudo pronto! Pode fazer suas perguntas.' 
  : '⚠️ Configure a conexão para usar o assistente.'}`;

      const sent = await sendWhatsAppMessage(instance, phone, statusMessage);

      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: statusMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
      }

      return NextResponse.json({ status: 'success', reason: 'status_command' });
    }

    // Se é uma saudação, responder com boas-vindas
    if (isGreeting) {
      // Se há múltiplos datasets e usuário não tem seleção, mostrar opções
      if (allContexts && allContexts.length > 1 && !userSelection) {
        let optionsList = `Olá ${authorizedNumber.name || ''}! 👋\n\n📊 *Escolha o agente:*\n\n`;
        allContexts.forEach((ctx, idx) => {
          optionsList += `${idx + 1}️⃣ ${ctx.name || 'Dataset ' + (idx + 1)}\n`;
        });
        optionsList += '\n_Digite o número para selecionar._';

        const sent = await sendWhatsAppMessage(instance, phone, optionsList);

        if (sent) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: optionsList,
            direction: 'outgoing',
            sender_name: 'Assistente IA'
          });
        }

        return NextResponse.json({ status: 'success', sent, reason: 'greeting_with_selection' });
      }

      // Saudação normal quando já tem seleção ou apenas 1 dataset
      const welcomeMessage = connectionId && datasetId
        ? `Olá ${authorizedNumber.name || ''}! 👋

Sou o assistente IA da sua empresa. Posso te ajudar com análises e consultas sobre seus dados em tempo real! 📊

*Como posso te ajudar hoje?*
Exemplos do que você pode perguntar:
- Qual o faturamento do mês?
- Quais os produtos mais vendidos?
- Como estão as vendas por região?`
        : `Olá ${authorizedNumber.name || ''}! 👋

Sou o assistente IA da sua empresa, mas ainda não tenho acesso aos seus dados configurado.

📞 *Entre em contato com o suporte* para configurar a conexão com seus dados.`;

      const sent = await sendWhatsAppMessage(instance, phone, welcomeMessage);

      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: welcomeMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
      }

      return NextResponse.json({ status: 'success', sent, reason: 'greeting_response' });
    }

    // Se não tem conexão configurada para perguntas reais, responder educadamente
    if (!connectionId || !datasetId) {
      const noDataMessage = `Desculpe ${authorizedNumber.name || ''}, ainda não tenho acesso aos dados da sua empresa para responder essa pergunta.

Entre em contato com o suporte para configurar a conexão! 📞`;

      const sent = await sendWhatsAppMessage(instance, phone, noDataMessage);

      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: noDataMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
      }

      return NextResponse.json({ status: 'success', sent, reason: 'no_connection_configured' });
    }

    // ============================================
    // BUSCAR HISTÓRICO DE CONVERSAÇÃO (últimas 10 mensagens)
    // ============================================
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('message_content, direction, created_at')
      .eq('phone_number', phone)
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Histórico encontrado:', recentMessages?.length || 0, 'mensagens');

    // Usar contexto já buscado ou buscar novamente
    let modelContext = aiContext?.context_content?.slice(0, 6000) || '';

    if (!modelContext && connectionId) {
      const { data: context } = await supabase
        .from('ai_model_contexts')
        .select('context_content')
        .eq('connection_id', connectionId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (context?.context_content) {
        modelContext = context.context_content.slice(0, 6000);
      }
    }

    // Construir prompt melhorado para a IA
    const systemPrompt = `Você é o assistente IA da empresa do usuário, integrado via WhatsApp. 

## SUA PERSONALIDADE
- Profissional mas amigável e acessível
- Direto ao ponto, sem enrolação
- Usa emojis com moderação (máximo 3 por mensagem)
- LEMBRA do contexto da conversa anterior
- Nunca repete informações já fornecidas
- Adapta o nível de detalhe ao interesse do usuário

## CONTEXTO DO MODELO DE DADOS
${modelContext ? `${modelContext.slice(0, 6000)}\n` : 'Nenhum contexto de dados disponível no momento.\n'}

## FORMATAÇÃO PARA WHATSAPP
- Use *negrito* para destaques importantes
- Use _itálico_ para ênfases sutis
- Valores monetários: R$ 1.234,56
- Porcentagens: 15,5%
- Use quebras de linha para separar seções
- Máximo 3 emojis por mensagem
- Listas curtas com emojis: ✓ ✗ → • 

## REGRAS PARA DADOS E ANÁLISES
- Se precisar buscar dados, use a função execute_dax
- NUNCA mencione termos técnicos como "tabela fato", "medida DAX", "coluna calculada"
- Apresente dados de forma visual usando emojis como mini-gráficos
- Sempre contextualize os números (compare, mostre tendências)
- Se não tiver certeza dos dados, peça esclarecimento ao usuário
- Formate valores grandes: 1,2M (milhão), 1,5K (mil)

## REGRAS DE RESPOSTA
1. Respostas entre 100-800 palavras (ideal: 300-400)
2. Para perguntas complexas, divida a resposta em seções claras
3. Sempre termine com próximos passos ou sugestões relevantes
4. Se não tiver dados suficientes, seja honesto mas sugira alternativas
5. LEMBRE o contexto: se o usuário perguntou sobre janeiro, mantenha esse contexto
6. Se o usuário fizer pergunta de acompanhamento, continue a conversa naturalmente

## SUGESTÕES INTELIGENTES E CONTEXTUAIS
Após CADA resposta, sugira 2-3 análises relacionadas ao tema discutido:

━━━━━━━━━━━━━━━━━
💡 *Posso analisar:*
1️⃣ [Análise relacionada 1]
2️⃣ [Análise relacionada 2]

Exemplos de sugestões por contexto:
- Faturamento → Comparativo com mês anterior, Por vendedor, Por produto, Por região
- Vendas → Top clientes, Ticket médio, Meta vs realizado, Produtos mais vendidos
- Clientes → Inadimplência, Novos clientes, Taxa de churn, Clientes inativos
- Produtos → Mais vendidos, Margem de lucro, Giro de estoque, Análise ABC
- Períodos → Comparar com ano anterior, Tendência trimestral, Sazonalidade

${recentAlert ? `
## ALERTA RECENTE CONFIGURADO
Nome: ${recentAlert.name}
Dataset: ${recentAlert.dataset_id}
Conexão: ${recentAlert.connection_id}
` : ''}

## DATA E HORA ATUAL
${new Date().toLocaleString('pt-BR', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Sao_Paulo'
})} (Horário de Brasília)

## IMPORTANTE
- Você TEM memória das mensagens anteriores desta conversa
- Use esse contexto para dar respostas mais inteligentes e personalizadas
- Se o usuário fizer referência a algo que você disse antes, lembre-se disso
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

    // ============================================
    // CONSTRUIR HISTÓRICO DE CONVERSAÇÃO
    // ============================================
    const conversationHistory: any[] = [];
    
    if (recentMessages && recentMessages.length > 0) {
      // Inverter ordem para cronológica (mais antiga primeiro)
      const orderedMessages = [...recentMessages].reverse();
      
      for (const msg of orderedMessages) {
        conversationHistory.push({
          role: msg.direction === 'incoming' ? 'user' : 'assistant',
          content: msg.message_content
        });
      }
    }

    // Adicionar mensagem atual
    conversationHistory.push({ 
      role: 'user', 
      content: messageText 
    });

    console.log('Histórico construído:', conversationHistory.length, 'mensagens');

    // Chamar Claude COM HISTÓRICO
    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,  // ← AUMENTADO DE 500 PARA 1200
      system: systemPrompt,
      messages: conversationHistory,  // ← USANDO HISTÓRICO
      tools: tools.length > 0 ? tools : undefined
    });

    // Processar tool calls
    let iterations = 0;
    const maxIterations = 2;
    // Usar histórico completo para manter contexto nas iterações de tools
    const messages: any[] = [...conversationHistory];

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      
      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use' && toolUse.name === 'execute_dax' && connectionId && datasetId) {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;

          console.log('Executando DAX via WhatsApp:', toolInput.query);

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
        max_tokens: 1200,  // ← AUMENTADO DE 500 PARA 1200
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

    // ============================================
    // TRATAR MENSAGENS LONGAS
    // ============================================
    if (!assistantMessage.trim()) {
      assistantMessage = `Desculpe ${authorizedNumber.name || ''}, tive um problema ao processar sua pergunta. 😕

*Pode tentar:*
- Reformular a pergunta
- Ser mais específico
- Usar o comando /ajuda

Estou aqui para ajudar! 💪`;
    }

    console.log('Resposta IA:', assistantMessage.substring(0, 200) + '...');
    console.log('Tamanho da resposta:', assistantMessage.length, 'caracteres');

    // Dividir mensagens muito longas em múltiplas partes
    if (assistantMessage.length > 2000) {
      console.log('Mensagem longa detectada, dividindo em partes...');
      
      // Dividir por parágrafos primeiro
      const paragraphs = assistantMessage.split('\n\n');
      let currentPart = '';
      const parts: string[] = [];

      for (const paragraph of paragraphs) {
        if ((currentPart + paragraph).length > 1800) {
          if (currentPart) {
            parts.push(currentPart.trim());
            currentPart = paragraph;
          } else {
            // Parágrafo individual muito longo, forçar quebra
            const chunks = paragraph.match(/.{1,1800}/g) || [];
            parts.push(...chunks);
          }
        } else {
          currentPart += (currentPart ? '\n\n' : '') + paragraph;
        }
      }

      if (currentPart) {
        parts.push(currentPart.trim());
      }

      console.log('Mensagem dividida em', parts.length, 'partes');

      // Enviar cada parte com delay
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const partPrefix = parts.length > 1 ? `📄 *Parte ${i + 1}/${parts.length}*\n\n` : '';
        const fullPart = partPrefix + part;

        const sent = await sendWhatsAppMessage(instance, phone, fullPart);

        if (sent) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: fullPart,
            direction: 'outgoing',
            sender_name: 'Assistente IA'
          });
        }

        // Delay entre mensagens para não sobrecarregar
        if (i < parts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      return NextResponse.json({ 
        status: 'success', 
        sent: true,
        parts: parts.length,
        reason: 'long_message_split'
      });
    }

    // Log da instância que será usada
    console.log('Instância para envio:', {
      id: instance.id,
      name: instance.instance_name,
      api_url: instance.api_url,
      is_connected: instance.is_connected
    });

    // Enviar resposta normal (não dividida)
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

