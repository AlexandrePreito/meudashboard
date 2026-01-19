import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
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

// Função para formatar texto para fala
function formatTextForSpeech(text: string): string {
  let formatted = text;
  
  // Remover emojis (não fazem sentido em áudio)
  formatted = formatted.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[️⃣]/gu, '');
  
  // Remover linhas decorativas
  formatted = formatted.replace(/[━─═]+/g, '');
  
  // Formatar valores monetários para fala natural
  formatted = formatted.replace(/R\$\s*([\d.,]+)/g, (match, value) => {
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanValue);
    
    if (isNaN(num)) return match;
    
    if (num >= 1000000000) {
      const bilhoes = num / 1000000000;
      return `${bilhoes.toFixed(1).replace('.', ' vírgula ')} bilhões de reais`;
    } else if (num >= 1000000) {
      const milhoes = num / 1000000;
      if (milhoes === Math.floor(milhoes)) {
        return `${Math.floor(milhoes)} ${milhoes === 1 ? 'milhão' : 'milhões'} de reais`;
      }
      return `${milhoes.toFixed(1).replace('.', ' vírgula ')} ${milhoes >= 2 ? 'milhões' : 'milhão'} de reais`;
    } else if (num >= 1000) {
      const milhares = num / 1000;
      if (milhares === Math.floor(milhares)) {
        return `${Math.floor(milhares)} mil reais`;
      }
      return `${milhares.toFixed(1).replace('.', ' vírgula ')} mil reais`;
    } else {
      return `${num.toFixed(2).replace('.', ' reais e ')} centavos`;
    }
  });
  
  // Formatar porcentagens
  formatted = formatted.replace(/([\d.,]+)%/g, (match, value) => {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return match;
    return `${num.toString().replace('.', ' vírgula ')} por cento`;
  });
  
  // Formatar números grandes sozinhos
  formatted = formatted.replace(/\b(\d{1,3}(?:\.\d{3})+)\b/g, (match) => {
    const num = parseInt(match.replace(/\./g, ''));
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace('.', ' vírgula ')} milhões`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)} mil`;
    }
    return match;
  });
  
  // Limpar múltiplos espaços e quebras de linha
  formatted = formatted.replace(/\n+/g, '. ');
  formatted = formatted.replace(/\s+/g, ' ');
  formatted = formatted.replace(/\.\s*\./g, '.');
  
  return formatted.trim();
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
  maxRetries = 3
): Promise<Anthropic.Message> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: params.model,
        max_tokens: params.max_tokens,
        system: params.system,
        messages: params.messages,
        tools: params.tools,
      });
      return response;
    } catch (error: any) {
      console.error(`[Claude] Tentativa ${attempt} falhou:`, error.message);
      
      // Se é erro de overload e não é a última tentativa, esperar e retry
      if (error.status === 529 && attempt < maxRetries) {
        const waitTime = attempt * 2000; // 2s, 4s, 6s
        console.log(`[Claude] Aguardando ${waitTime}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Se é a última tentativa ou outro tipo de erro, throw
      throw error;
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

// ============================================
// FUNÇÃO PARA GERAR ÁUDIO COM OPENAI TTS
// ============================================
async function generateAudio(text: string): Promise<string | null> {
  try {
    // Formatar texto para fala
    const speechText = formatTextForSpeech(text);
    
    // Limitar tamanho do texto (OpenAI TTS tem limite)
    const truncatedText = speechText.length > 4000 ? speechText.substring(0, 4000) + '...' : speechText;
    
    console.log('🔊 Gerando áudio para:', truncatedText.substring(0, 100) + '...');
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova', // Voz feminina natural
      input: truncatedText,
      response_format: 'mp3',
    });
    
    // Converter para base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    
    console.log('✅ Áudio gerado com sucesso, tamanho:', base64Audio.length);
    
    return base64Audio;
  } catch (error: any) {
    console.error('❌ Erro ao gerar áudio:', error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA ENVIAR ÁUDIO VIA WHATSAPP
// ============================================
async function sendWhatsAppAudio(instance: any, phone: string, audioBase64: string): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const url = `${apiUrl}/message/sendWhatsAppAudio/${instance.instance_name}`;
    
    console.log('📤 Enviando áudio para:', phone);
    console.log('URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: phone,
        audio: `data:audio/mp3;base64,${audioBase64}`,
        encoding: true, // Indica que é PTT (push to talk)
      }),
    });
    
    const responseText = await response.text();
    console.log('Resposta Evolution API (áudio):', {
      status: response.status,
      ok: response.ok,
      body: responseText.substring(0, 300)
    });
    
    if (!response.ok) {
      console.error('Erro ao enviar áudio:', responseText);
      return false;
    }
    
    return true;
  } catch (error: any) {
    console.error('Erro ao enviar áudio:', error.message);
    return false;
  }
}

// Função para enviar mensagem WhatsApp
async function sendWhatsAppMessage(instance: any, phone: string, message: string): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const url = `${apiUrl}/message/sendText/${instance.instance_name}`;

    console.log('Enviando mensagem para:', phone);
    console.log('URL:', url);
    console.log('Instância:', instance.instance_name);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: phone,
        text: message,
      }),
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

// ============================================
// FUNÇÃO AUXILIAR: Buscar instância pelo authorizedNumber
// ============================================
async function getInstanceForAuthorizedNumber(
  authorizedNumber: any, 
  instanceName: string | null, 
  supabase: any
): Promise<any> {
  let instance = null;

  // 1. Primeiro tenta buscar pela instância que enviou o webhook
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

  // 2. Se não encontrou pelo nome, tenta pelo instance_id do número autorizado
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

  // 3. Fallback: qualquer instância conectada do mesmo grupo
  if (!instance && authorizedNumber?.company_group_id) {
    const { data: groupInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_connected', true)
      .limit(1)
      .maybeSingle();
    
    instance = groupInstance;
    console.log('Usando instância do grupo:', instance?.instance_name);
  }

  // 4. Último fallback: qualquer instância conectada
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

  return instance;
}

// POST - Webhook do Evolution API
export async function POST(request: Request) {
  // Variáveis declaradas no escopo da função para acesso no catch
  let instance: any = null;
  let phone: string = '';
  
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
                        messageContent.audioMessage?.caption ||
                        messageContent.audioMessage?.text ||
                        messageData.body ||
                        '';

    // Log para debug de áudio
    if (messageContent.audioMessage) {
      console.log('🎤 [AUDIO] Mensagem de áudio detectada');
      console.log('Audio data:', JSON.stringify(messageContent.audioMessage, null, 2));
    }

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
    phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    
    console.log('Mensagem recebida de:', phone);
    console.log('Texto:', messageText);

    // ========== BUSCAR NÚMERO AUTORIZADO (ANTES DA VERIFICAÇÃO DE DUPLICIDADE) ==========
    console.log('Buscando número autorizado...');
    const { data: authRecords, error } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('id, name, phone_number, company_group_id, instance_id, is_active')
      .eq('phone_number', phone)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Erro ao buscar número autorizado:', error);
      return NextResponse.json({ status: 'error', reason: 'db_error', error: error.message }, { status: 500 });
    }
    
    const authorizedNumber = authRecords?.[0] || null;
    
    if (!authorizedNumber) {
      console.log('Número não autorizado:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized number' });
    }

    // ========== CONTROLE DE DUPLICIDADE ==========
    const externalId = messageData?.key?.id;
    if (externalId) {
      const { data: existingMessage } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .eq('external_id', externalId)
        .maybeSingle();
      
      if (existingMessage) {
        console.log('[Webhook] Mensagem já processada, ignorando:', externalId);
        return NextResponse.json({ status: 'ignored', reason: 'duplicate' });
      }
    }
    // Mensagem será salva após determinar o authorizedNumber correto

    // ========== BUSCAR CONTEXTO DO GRUPO ESPECÍFICO ==========
    const { data: aiContextData } = await supabase
      .from('ai_model_contexts')
      .select('id, connection_id, dataset_id, context_content, context_name, dataset_name')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    // ========== DETERMINAR CONEXÃO E DATASET ==========
    let connectionId: string | null = null;
    let datasetId: string | null = null;
    let aiContext: any = null;

    if (aiContextData) {
      connectionId = aiContextData.connection_id;
      datasetId = aiContextData.dataset_id;
      aiContext = aiContextData;
      console.log('📌 Contexto encontrado para o grupo:', authorizedNumber.company_group_id);
    } else {
      console.log('📌 Nenhum contexto configurado para o grupo');
    }

    // ========== SALVAR MENSAGEM INCOMING (APÓS DETERMINAR AUTHORIZEDNUMBER CORRETO) ==========
    let incomingMessageSaved = false;
    if (!incomingMessageSaved) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: messageText,
        direction: 'incoming',
        sender_name: authorizedNumber.name || phone,
        external_id: externalId || null,
        instance_id: authorizedNumber.instance_id || null,
        authorized_number_id: authorizedNumber.id
      });
      incomingMessageSaved = true;
    }

    // ========== BUSCAR INSTÂNCIA ==========
    instance = await getInstanceForAuthorizedNumber(authorizedNumber, instanceName, supabase);

    if (!instance) {
      console.log('Nenhuma instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    console.log('═══════════════════════════════════════');
    console.log('✅ CONFIGURAÇÃO FINAL:');
    console.log('   Grupo:', authorizedNumber.company_group_id);
    console.log('   Instância:', instance.instance_name);
    console.log('   Dataset:', datasetId || 'N/A');
    console.log('═══════════════════════════════════════');

    // ========== VERIFICAR LIMITES ==========
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

    const { data: groupData } = await supabase
      .from('company_groups')
      .select('plan_id')
      .eq('id', authorizedNumber.company_group_id)
      .single();

    let maxWhatsappPerMonth = 100;

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

    const { count: messagesThisMonth } = await supabase
      .from('whatsapp_messages')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('direction', 'outgoing')
      .gte('created_at', firstDayOfMonth);

    if (maxWhatsappPerMonth < 999999 && (messagesThisMonth || 0) >= maxWhatsappPerMonth) {
      console.log('Limite de mensagens WhatsApp atingido para o grupo');
      return NextResponse.json({
        status: 'limit_reached',
        reason: 'monthly whatsapp limit reached'
      });
    }

    // ========== VERIFICAR ÁUDIO ==========
    const isAudioMessage = !!messageContent.audioMessage;
    let respondWithAudio = false;
    
    if (isAudioMessage && !messageText.trim()) {
      console.log('⚠️ Áudio sem transcrição - ignorando');
      const audioMessage = `Desculpe ${authorizedNumber?.name || ''}, não consigo processar mensagens de áudio ainda. 🎤

Por favor, envie sua pergunta como *texto* para que eu possa ajudar! 😊`;
      
      const sent = await sendWhatsAppMessage(instance, phone, audioMessage);
      
      if (sent) {
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: audioMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
      }
      
      return NextResponse.json({ status: 'ignored', reason: 'audio message without transcription' });
    }
    
    if (isAudioMessage && messageText.trim()) {
      respondWithAudio = true;
      console.log('🎤 Mensagem de áudio recebida com transcrição - responderá com áudio');
    }

    // ========== SAUDAÇÃO ==========
    const greetings = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'eai', 'opa', 'fala'];
    const isGreeting = greetings.some(g => messageText.toLowerCase().trim() === g || messageText.toLowerCase().trim().startsWith(g + ' '));
    
    if (isGreeting) {
      const welcomeMessage = connectionId && datasetId
        ? `Olá ${authorizedNumber.name || ''}! 👋

Sou o assistente IA da sua empresa. Posso te ajudar com análises e consultas sobre seus dados em tempo real! 📊

*Como posso te ajudar hoje?*
Exemplos do que você pode perguntar:
1️⃣ Qual o faturamento do mês?
2️⃣ Quais os produtos mais vendidos?
3️⃣ Como estão as vendas por região?`
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
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
      }

      return NextResponse.json({ status: 'success', sent, reason: 'greeting_response' });
    }

    // ========== COMANDOS ESPECIAIS ==========
    const userCommand = messageText.toLowerCase().trim();

    // /ajuda
    if (userCommand === '/ajuda' || userCommand === 'ajuda') {
      const helpMessage = `🤖 *Assistente IA - Comandos*

*Comandos disponíveis:*
/ajuda - Mostra esta mensagem
/limpar - Limpar histórico de conversa
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
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
      }

      return NextResponse.json({ status: 'success', reason: 'help_command' });
    }

    // /limpar
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
          instance_id: instance.id
        });
      }

      return NextResponse.json({ status: 'success', reason: 'history_cleared' });
    }

    // /status
    if (userCommand === '/status' || userCommand === 'status') {
      // Buscar nome do grupo
      const { data: groupInfo } = await supabase
        .from('company_groups')
        .select('name')
        .eq('id', authorizedNumber.company_group_id)
        .single();

      const statusMessage = `📊 *Status da Conexão*

*Usuário:* ${authorizedNumber.name || phone}
*Agente:* ${aiContext?.dataset_name || 'N/A'}
*Grupo:* ${groupInfo?.name || authorizedNumber.company_group_id}
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
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
      }

      return NextResponse.json({ status: 'success', reason: 'status_command' });
    }

    // ========== SEM CONEXÃO CONFIGURADA ==========
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
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
      }

      return NextResponse.json({ status: 'success', sent, reason: 'no_connection_configured' });
    }

    // ========== BUSCAR HISTÓRICO (FILTRADO POR GRUPO!) ==========
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('message_content, direction, created_at')
      .eq('phone_number', phone)
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('Histórico encontrado:', recentMessages?.length || 0, 'mensagens do grupo', authorizedNumber.company_group_id);

    // ========== CONTEXTO DA IA ==========
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

    // Buscar alerta como contexto adicional
    const { data: alerts } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_enabled', true)
      .order('updated_at', { ascending: false })
      .limit(1);

    const recentAlert = alerts?.[0] || null;

    // ========== SYSTEM PROMPT ==========
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
- Listas curtas com emojis: ✔ ✗ → •

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

${recentAlert ? `
## ALERTA RECENTE CONFIGURADO
Nome: ${recentAlert.name}
Dataset: ${recentAlert.dataset_id}
Conexão: ${recentAlert.connection_id}
` : ''}

## REGRAS PARA PERÍODOS E DATAS (CRÍTICO - SEMPRE SEGUIR)
**REGRA OBRIGATÓRIA:** Quando o usuário perguntar sobre dados SEM especificar período:
1. SEMPRE usar o MÊS e ANO ATUAIS como filtro padrão
2. SEMPRE informar o período usado NO INÍCIO da resposta

**Mês/Ano vigente:** ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

**Aplicação automática:**
- "Qual o faturamento?" → Faturamento de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
- "Quantas vendas?" → Vendas de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
- "Top produtos" → Top produtos de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
- "Como está o estoque?" → Estoque atual
- "Inadimplência?" → Inadimplência de ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}

**SEMPRE comece a resposta com o período:**
"📅 *${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}*"

**Se o usuário especificar período, use o que ele pediu:**
- "janeiro" → janeiro/${new Date().getFullYear()}
- "ano passado" → ${new Date().getFullYear() - 1}
- "último trimestre" → últimos 3 meses
- "ontem/semana passada/mês passado" → calcular a partir de hoje

**Para perguntas de acompanhamento:**
Se o usuário perguntar "e por região?" ou "e os top 10?", MANTENHA o mesmo período da pergunta anterior.

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

    // Tools para Claude
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

    // ========== CONSTRUIR HISTÓRICO ==========
    const conversationHistory: any[] = [];

    if (recentMessages && recentMessages.length > 0) {
      const orderedMessages = [...recentMessages].reverse();
      for (const msg of orderedMessages) {
        conversationHistory.push({
          role: msg.direction === 'incoming' ? 'user' : 'assistant',
          content: msg.message_content
        });
      }
    }

    conversationHistory.push({
      role: 'user',
      content: messageText
    });

    console.log('Histórico construído:', conversationHistory.length, 'mensagens');

    // ========== CHAMAR CLAUDE ==========
    let response = await callClaudeWithRetry({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1200,
      system: systemPrompt,
      messages: conversationHistory,
      tools: tools.length > 0 ? tools : undefined
    });

    // Processar tool calls
    let iterations = 0;
    const maxIterations = 2;
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

      response = await callClaudeWithRetry({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1200,
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

    // ========== TRATAR RESPOSTA VAZIA ==========
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

    // ========== DIVIDIR MENSAGENS LONGAS ==========
    if (assistantMessage.length > 2000) {
      console.log('Mensagem longa detectada, dividindo em partes...');

      const paragraphs = assistantMessage.split('\n\n');
      let currentPart = '';
      const parts: string[] = [];

      for (const paragraph of paragraphs) {
        if ((currentPart + paragraph).length > 1800) {
          if (currentPart) {
            parts.push(currentPart.trim());
            currentPart = paragraph;
          } else {
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
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
        }

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

    // ========== ENVIAR RESPOSTA ==========
    let sent = false;

    if (respondWithAudio) {
      console.log('🔊 MODO ÁUDIO ATIVADO - Gerando resposta em áudio...');

      const audioBase64 = await generateAudio(assistantMessage);

      if (audioBase64) {
        console.log('✅ Áudio gerado, enviando...');
        sent = await sendWhatsAppAudio(instance, phone, audioBase64);
        console.log('🔊 Resultado do envio de áudio:', sent ? '✅ SUCESSO' : '❌ FALHOU');
      } else {
        console.log('❌ Falha ao gerar áudio, enviando como texto');
      }

      if (!sent) {
        console.log('📝 Fallback: Enviando como mensagem de texto');
        sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
      }
    } else {
      console.log('📝 Enviando mensagem de texto');
      sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
    }

    console.log('Mensagem enviada:', sent);

    // Salvar mensagem enviada
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: respondWithAudio ? `🔊 [Áudio]: ${assistantMessage}` : assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
    }

    return NextResponse.json({
      status: 'success',
      sent,
      response: assistantMessage.substring(0, 100) + '...'
    });

  } catch (error: any) {
    console.error('[Webhook] Erro:', error);

    const errorMessage =
      '⚠️ Desculpe, estou com dificuldades técnicas no momento.\n\n' +
      'Por favor, tente novamente em alguns instantes.';

    try {
      if (instance && phone) {
        await sendWhatsAppMessage(instance, phone, errorMessage);
      }
    } catch (sendError) {
      console.error('[Webhook] Erro ao enviar mensagem de erro:', sendError);
    }

    return NextResponse.json({
      error: 'Erro ao processar mensagem',
      details: error.message
    }, { status: 500 });
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