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

// ============================================
// FUNÇÃO PARA EXECUTAR DAX
// ============================================
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

// ============================================
// FUNÇÃO PARA FORMATAR TEXTO PARA FALA
// ============================================
function formatTextForSpeech(text: string): string {
  let formatted = text;
  
  formatted = formatted.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[️⃣]/gu, '');
  formatted = formatted.replace(/[━─═]+/g, '');
  
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
  
  formatted = formatted.replace(/([\d.,]+)%/g, (match, value) => {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num)) return match;
    return `${num.toString().replace('.', ' vírgula ')} por cento`;
  });
  
  formatted = formatted.replace(/\b(\d{1,3}(?:\.\d{3})+)\b/g, (match) => {
    const num = parseInt(match.replace(/\./g, ''));
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace('.', ' vírgula ')} milhões`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(0)} mil`;
    }
    return match;
  });
  
  formatted = formatted.replace(/\n+/g, '. ');
  formatted = formatted.replace(/\s+/g, ' ');
  formatted = formatted.replace(/\.\s*\./g, '.');
  
  return formatted.trim();
}

// ============================================
// FUNÇÃO DE RETRY PARA CHAMADAS CLAUDE (COM TIMEOUT)
// ============================================
async function callClaudeWithRetry(
  params: {
    model: string;
    max_tokens: number;
    system: string;
    messages: any[];
    tools?: any[];
  },
  maxRetries = 2,  // ← REDUZIDO de 3 para 2
  timeoutMs = 25000  // ← TIMEOUT de 25 segundos
): Promise<Anthropic.Message> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Criar promise com timeout
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
      console.error(`[Claude] Tentativa ${attempt} falhou:`, error.message);
      
      if ((error.status === 529 || error.message === 'Claude timeout') && attempt < maxRetries) {
        const waitTime = attempt * 1500;
        console.log(`[Claude] Aguardando ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
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
    const speechText = formatTextForSpeech(text);
    const limitedText = speechText.slice(0, 4000);
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('[generateAudio] OPENAI_API_KEY não configurada');
      return null;
    }
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',  // ← Usar tts-1 (mais rápido) em vez de tts-1-hd
      voice: 'shimmer',
      input: limitedText,
      response_format: 'mp3',
      speed: 1.0
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error: any) {
    console.error('[generateAudio] Erro:', error.message);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA ENVIAR ÁUDIO VIA WHATSAPP
// ============================================
async function sendWhatsAppAudio(instance: any, phone: string, audioBase64: string): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Tentativa 1: sendWhatsAppAudio
    const url = `${apiUrl}/message/sendWhatsAppAudio/${instance.instance_name}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        audio: audioBase64
      }),
    });
    
    if (response.ok) {
      console.log('[sendWhatsAppAudio] ✅ Áudio enviado');
      return true;
    }
    
    // Tentativa 2: sendMedia (fallback)
    console.log('[sendWhatsAppAudio] Tentando sendMedia...');
    const mediaUrl = `${apiUrl}/message/sendMedia/${instance.instance_name}`;
    
    const mediaResponse = await fetch(mediaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'audio',
        mimetype: 'audio/mp3',
        media: `data:audio/mp3;base64,${audioBase64}`,
        fileName: 'audio.mp3'
      }),
    });
    
    if (mediaResponse.ok) {
      console.log('[sendWhatsAppAudio] ✅ Áudio enviado via sendMedia');
      return true;
    }
    
    console.error('[sendWhatsAppAudio] ❌ Falha ao enviar áudio');
    return false;
  } catch (error: any) {
    console.error('[sendWhatsAppAudio] Erro:', error.message);
    return false;
  }
}

// ============================================
// FUNÇÃO PARA ENVIAR MENSAGEM WHATSAPP
// ============================================
async function sendWhatsAppMessage(instance: any, phone: string, message: string): Promise<boolean> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const url = `${apiUrl}/message/sendText/${instance.instance_name}`;

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[sendWhatsAppMessage] Erro:', errorText);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('[sendWhatsAppMessage] Erro:', error.message);
    return false;
  }
}

// ============================================
// FUNÇÃO AUXILIAR: Buscar instância
// ============================================
async function getInstanceForAuthorizedNumber(authorizedNumber: any, supabase: any): Promise<any> {
  if (authorizedNumber?.instance_id) {
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', authorizedNumber.instance_id)
      .eq('is_connected', true)
      .maybeSingle();
    
    if (instance) return instance;
  }

  const { data: anyInstance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('is_connected', true)
    .limit(1)
    .maybeSingle();
  
  return anyInstance;
}

// ============================================
// POST - WEBHOOK DO EVOLUTION API
// ============================================
export async function POST(request: Request) {
  const startTime = Date.now();
  let instance: any = null;
  let phone: string = '';
  let authorizedNumber: any = null;
  
  // Supabase client
  const supabase = createAdminClient();
  
  try {
    const body = await request.json();
    console.log('[Webhook] Recebido:', JSON.stringify(body).substring(0, 300));

    // ========== EXTRAIR DADOS ==========
    const event = body.event || body.type;
    const messageData = body.data || body;
    
    if (event !== 'messages.upsert' && event !== 'message') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

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

    if (fromMe || !messageText.trim()) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe or empty' });
    }

    phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';
    console.log('[Webhook] De:', phone, '| Msg:', messageText.substring(0, 50));

    // ========== BUSCAR NÚMERO AUTORIZADO ==========
    const { data: authRecords } = await supabase
      .from('whatsapp_authorized_numbers')
      .select('id, name, phone_number, company_group_id, instance_id, is_active')
      .eq('phone_number', phone)
      .eq('is_active', true)
      .limit(1);
    
    authorizedNumber = authRecords?.[0] || null;
    
    if (!authorizedNumber) {
      console.log('[Webhook] Número não autorizado:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized' });
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
        return NextResponse.json({ status: 'ignored', reason: 'duplicate' });
      }
    }

    // ========== BUSCAR CONTEXTO E INSTÂNCIA EM PARALELO ==========
    const [allContextsResult, instanceResult] = await Promise.all([
      supabase
        .from('ai_model_contexts')
        .select('id, connection_id, dataset_id, context_content, context_name, dataset_name, company_group_id')
        .eq('company_group_id', authorizedNumber.company_group_id)
        .eq('is_active', true),
      getInstanceForAuthorizedNumber(authorizedNumber, supabase)
    ]);

    const allContexts = allContextsResult.data || [];
    const aiContext = allContexts[0] || null;
    instance = instanceResult;

    let connectionId = aiContext?.connection_id || null;
    let datasetId = aiContext?.dataset_id || null;

    // ========== SALVAR MENSAGEM INCOMING ==========
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

    if (!instance) {
      console.log('[Webhook] Sem instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    console.log('[Webhook] Instância:', instance.instance_name, '| Dataset:', datasetId || 'N/A');

    // ========== FALLBACK DE CONTEXTO ==========
    let modelContext = aiContext?.context_content || '';

    // Fallback: buscar por connection_id se não encontrou
    if (!modelContext && connectionId) {
      const { data: fallbackContext } = await supabase
        .from('ai_model_contexts')
        .select('context_content, connection_id, dataset_id')
        .eq('connection_id', connectionId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      if (fallbackContext?.context_content) {
        modelContext = fallbackContext.context_content;
        if (!connectionId) connectionId = fallbackContext.connection_id || null;
        if (!datasetId) datasetId = fallbackContext.dataset_id || null;
      }
    }

    console.log('[Webhook] Contexto carregado:', modelContext ? modelContext.length + ' chars' : 'NENHUM');

    // ========== VERIFICAR ÁUDIO ==========
    const isAudioMessage = !!messageContent.audioMessage;
    let respondWithAudio = false;
    
    if (isAudioMessage && !messageText.trim()) {
      const audioMsg = `Desculpe ${authorizedNumber?.name || ''}, não consigo processar áudios ainda. 🎤\n\nEnvie sua pergunta como *texto*!`;
      await sendWhatsAppMessage(instance, phone, audioMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: audioMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'ignored', reason: 'audio without transcription' });
    }
    
    if (isAudioMessage && messageText.trim()) {
      respondWithAudio = true;
    }

    // ========== SAUDAÇÃO ==========
    const greetings = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'eai', 'opa', 'fala'];
    const isGreeting = greetings.some(g => messageText.toLowerCase().trim() === g || messageText.toLowerCase().trim().startsWith(g + ' '));
    
    if (isGreeting) {
      const welcomeMessage = connectionId && datasetId
        ? `Olá ${authorizedNumber.name?.split(' ')[0] || ''}! 👋\n\nSou seu assistente de dados. Pergunte sobre faturamento, vendas, produtos, etc.`
        : `Olá ${authorizedNumber.name?.split(' ')[0] || ''}! 👋\n\nAinda não tenho acesso aos seus dados. Contate o suporte.`;

      await sendWhatsAppMessage(instance, phone, welcomeMessage);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: welcomeMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'success', reason: 'greeting' });
    }

    // ========== COMANDOS ==========
    const userCommand = messageText.toLowerCase().trim();

    if (userCommand === '/ajuda' || userCommand === 'ajuda') {
      const helpMsg = `🤖 *Comandos:*\n/ajuda - Esta mensagem\n/limpar - Limpar histórico\n/status - Ver status\n\n*Exemplos:*\n- Faturamento do mês\n- Top 5 produtos\n- Vendas por filial`;
      await sendWhatsAppMessage(instance, phone, helpMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: helpMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'success', reason: 'help' });
    }

    if (userCommand === '/limpar' || userCommand === 'limpar') {
      await supabase
        .from('whatsapp_messages')
        .update({ archived: true })
        .eq('phone_number', phone)
        .eq('company_group_id', authorizedNumber.company_group_id);

      const clearMsg = `🗑️ Histórico limpo! Como posso ajudar?`;
      await sendWhatsAppMessage(instance, phone, clearMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: clearMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'success', reason: 'cleared' });
    }

    if (userCommand === '/status' || userCommand === 'status') {
      const statusMsg = `📊 *Status*\n*Usuário:* ${authorizedNumber.name || phone}\n*Dataset:* ${datasetId ? '✅' : '❌'}\n*Conexão:* ${connectionId ? '✅' : '❌'}`;
      await sendWhatsAppMessage(instance, phone, statusMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: statusMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'success', reason: 'status' });
    }

    // ========== SEM CONEXÃO ==========
    if (!connectionId || !datasetId) {
      const noDataMsg = `Desculpe ${authorizedNumber.name?.split(' ')[0] || ''}, ainda não tenho acesso aos seus dados. Contate o suporte.`;
      await sendWhatsAppMessage(instance, phone, noDataMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: noDataMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'success', reason: 'no_connection' });
    }

    // ========== BUSCAR HISTÓRICO (LIMITADO) ==========
    const { data: recentMessages } = await supabase
      .from('whatsapp_messages')
      .select('message_content, direction, created_at')
      .eq('phone_number', phone)
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('archived', false)
      .order('created_at', { ascending: false })
      .limit(10);  // ← ALTERADO DE 4 PARA 10

    // ========== INTERPRETAR ESCOLHA DE OPÇÕES 1, 2, 3 ==========
    const userInput = messageText.trim();
    let processedMessage = messageText;

    if (['1', '2', '3'].includes(userInput)) {
      // Buscar última mensagem do assistente para extrair a sugestão
      const { data: lastAssistantMsg } = await supabase
        .from('whatsapp_messages')
        .select('message_content')
        .eq('phone_number', phone)
        .eq('company_group_id', authorizedNumber.company_group_id)
        .eq('direction', 'outgoing')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastAssistantMsg?.message_content) {
        const content = lastAssistantMsg.message_content;
        
        // Extrair as sugestões numeradas (1️⃣, 2️⃣, 3️⃣ ou 1., 2., 3.)
        const suggestionPatterns = [
          /1️⃣\s*([^\n]+)/,
          /2️⃣\s*([^\n]+)/,
          /3️⃣\s*([^\n]+)/,
        ];
        
        const choiceIndex = parseInt(userInput) - 1;
        const match = content.match(suggestionPatterns[choiceIndex]);
        
        if (match && match[1]) {
          processedMessage = match[1].trim();
          console.log(`[Webhook] Usuário escolheu opção ${userInput}: "${processedMessage}"`);
        }
      }
    }

    // ========== SYSTEM PROMPT (REGRAS WhatsApp + CONTEXTO DO BANCO) ==========
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentYear = new Date().getFullYear();
    const currentMonthNumber = new Date().getMonth() + 1;

    const systemPrompt = `Você é um assistente de análise de dados empresariais via WhatsApp.

# REGRA CRÍTICA DE PERÍODO
**SEMPRE que o usuário NÃO especificar data/período, use ${currentMonth} como padrão.**
- "Qual o faturamento?" → Faturamento de ${currentMonth}
- "Vendas por filial?" → Vendas de ${currentMonth}  
- "Top 10 produtos?" → Top 10 de ${currentMonth}
- "Ticket médio?" → Ticket médio de ${currentMonth}

**SEMPRE inicie a resposta informando o período:**
📅 *${currentMonth}*

# REGRA DE SUGESTÕES (OBRIGATÓRIO)
**SEMPRE termine TODA resposta com exatamente 3 sugestões de aprofundamento relacionadas ao tema.**

Formato:
━━━━━━━━━━━━━━━━━
📊 *Posso detalhar:*
1️⃣ [Análise relacionada 1]
2️⃣ [Análise relacionada 2]
3️⃣ [Análise relacionada 3]

Exemplos de sugestões por tema:
- Faturamento → Por filial, Por vendedor/garçom, Por produto
- Vendas → Por período, Por cliente, Por categoria
- Produtos → Mais vendidos, Margem de lucro, Por filial
- Clientes → Top clientes, Inadimplentes, Novos vs recorrentes

# INTERPRETAÇÃO DE NÚMEROS
Se o usuário responder apenas "1", "2" ou "3", ele está escolhendo uma das sugestões anteriores.
Consulte o histórico e execute a análise correspondente.

# QUANDO USUÁRIO ESCOLHE OPÇÃO
Se a mensagem do usuário for uma das sugestões anteriores (ex: "Faturamento por filial"), 
execute a consulta DAX correspondente usando o mesmo período da resposta anterior.

# FORMATAÇÃO WHATSAPP
- Use *negrito* para destaques
- Valores monetários COMPLETOS: R$ 1.234.567,89 (NUNCA abrevie)
- Máximo 800 caracteres por resposta
- Emojis com moderação (máx 5 por mensagem)
- Sem asteriscos duplos, use simples: *texto*

# FORMATO PADRÃO DE RESPOSTA
📅 *${currentMonth}*

💰 *[Métrica Principal]*
R$ X.XXX.XXX,XX

[Detalhes relevantes se houver]

━━━━━━━━━━━━━━━━━
📊 *Posso detalhar:*
1️⃣ [Sugestão 1]
2️⃣ [Sugestão 2]
3️⃣ [Sugestão 3]

# CONTEXTO DO MODELO DE DADOS
${modelContext.slice(0, 10000)}

# INSTRUÇÕES DAX
- Use a ferramenta execute_dax para buscar dados
- Leia o CONTEXTO DO MODELO DE DADOS acima para descobrir os nomes EXATOS de tabelas, colunas e medidas
- NUNCA invente nomes - use SOMENTE o que está documentado no contexto

## REGRA DE FILTRO DE DATA
- Quando o usuário NÃO especificar período, filtre pelo mês/ano atual
- Consulte a documentação da tabela de datas (Calendario ou similar) no contexto para saber os nomes corretos das colunas
- Mês atual: ${currentMonthNumber} | Ano atual: ${currentYear}
- SEMPRE aplique filtro de data nas queries (sem filtro = total histórico = ERRADO)

## FORMATO DAS QUERIES
- Use EVALUATE ROW(...) para valores únicos
- Use EVALUATE SUMMARIZECOLUMNS(...) para agrupamentos
- Use CALCULATE([Medida], filtros...) para aplicar filtros

# REFERÊNCIA TEMPORAL
Hoje: ${currentDate}
Mês: ${currentMonthNumber}
Ano: ${currentYear}`;

    // ========== TOOLS ==========
    const tools: Anthropic.Tool[] = [
      {
        name: 'execute_dax',
        description: 'Executa query DAX no Power BI',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'Query DAX' }
          },
          required: ['query']
        }
      }
    ];

    // ========== CONSTRUIR HISTÓRICO ==========
    const conversationHistory: any[] = [];

    if (recentMessages && recentMessages.length > 0) {
      const orderedMessages = [...recentMessages].reverse();
      
      for (const msg of orderedMessages) {
        // Ignorar mensagens de erro do sistema
        if (msg.message_content.includes('tive um problema') || 
            msg.message_content.includes('Desculpe') ||
            msg.message_content.includes('dificuldades técnicas') ||
            msg.message_content.includes('Erro técnico')) {
          continue;
        }
        
        conversationHistory.push({
          role: msg.direction === 'incoming' ? 'user' : 'assistant',
          content: msg.message_content.slice(0, 800)
        });
      }
    }

    conversationHistory.push({ role: 'user', content: processedMessage });

    console.log('[Webhook] Histórico:', conversationHistory.length, 'msgs | Tempo:', Date.now() - startTime, 'ms');
    console.log('[Webhook] System prompt length:', systemPrompt.length);
    console.log('[Webhook] Contexto carregado:', modelContext ? modelContext.length + ' chars' : 'NENHUM');

    // ========== CHAMAR CLAUDE ==========
    let response;
    let daxError: string | null = null;
    
    try {
      response = await callClaudeWithRetry({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,  // ← Espaço para respostas completas com 3 sugestões
        system: systemPrompt,
        messages: conversationHistory,
        tools
      });
      console.log('[Webhook] Claude respondeu | Tempo:', Date.now() - startTime, 'ms');
    } catch (claudeError: any) {
      console.error('[Webhook] Claude erro COMPLETO:', JSON.stringify({
        message: claudeError.message,
        status: claudeError.status,
        type: claudeError.type,
        stack: claudeError.stack?.substring(0, 500)
      }));
      
      const fallbackMsg = `Desculpe ${authorizedNumber.name?.split(' ')[0] || ''}, estou sobrecarregado. ⏳\n\nTente novamente em alguns segundos.`;
      await sendWhatsAppMessage(instance, phone, fallbackMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: fallbackMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'error', reason: 'claude_error' });
    }

    // ========== PROCESSAR TOOL CALLS (MÁXIMO 1 ITERAÇÃO) ==========
    const messages: any[] = [...conversationHistory];

    if (response.stop_reason === 'tool_use') {
      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use' && toolUse.name === 'execute_dax') {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;

          console.log('[Webhook] DAX query:', toolInput.query?.substring(0, 300));
          const daxResult = await executeDaxQuery(connectionId, datasetId, toolInput.query, supabase);
          console.log('[Webhook] DAX resultado:', daxResult.success ? `✅ ${daxResult.results?.length || 0} linhas` : `❌ ${daxResult.error}`);

          if (daxResult.success) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: JSON.stringify(daxResult.results?.slice(0, 20), null, 2)  // ← LIMITAR a 20 linhas
            });
          } else {
            daxError = daxResult.error || 'Erro desconhecido';
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUse.id,
              content: `Erro: ${daxError}. Tente outra medida.`
            });
          }
        }
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'assistant', content: response.content });
        messages.push({ role: 'user', content: toolResults });

        try {
          response = await callClaudeWithRetry({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1000,
            system: systemPrompt,
            messages,
            tools
          });
          console.log('[Webhook] Claude 2ª resposta | Tempo:', Date.now() - startTime, 'ms');
        } catch (retryError: any) {
          console.error('[Webhook] Claude retry erro:', retryError.message);
        }
      }
    }

    // ========== EXTRAIR RESPOSTA ==========
    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    if (!assistantMessage.trim()) {
      if (daxError) {
        assistantMessage = `📊 Não encontrei esses dados específicos.

📊 *Análises sugeridas:*
1️⃣ Qual o faturamento total?
2️⃣ Vendas por filial
3️⃣ Top 10 produtos vendidos`;
      } else {
        assistantMessage = `Não entendi sua pergunta. 🤔

📊 *Análises sugeridas:*
1️⃣ Faturamento do mês
2️⃣ Vendas por garçom
3️⃣ Ticket médio`;
      }
    }

    console.log('[Webhook] Resposta:', assistantMessage.length, 'chars | Total:', Date.now() - startTime, 'ms');

    // ========== ENVIAR RESPOSTA ==========
    let sent = false;

    if (respondWithAudio) {
      const audioBase64 = await generateAudio(assistantMessage);
      if (audioBase64) {
        sent = await sendWhatsAppAudio(instance, phone, audioBase64);
      }
      if (!sent) {
        sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
      }
    } else {
      sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
    }

    // ========== SALVAR RESPOSTA ==========
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: respondWithAudio ? `🔊 ${assistantMessage}` : assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
    }

    console.log('[Webhook] ✅ Finalizado | Tempo total:', Date.now() - startTime, 'ms');

    return NextResponse.json({
      status: 'success',
      sent,
      time_ms: Date.now() - startTime
    });

  } catch (error: any) {
    console.error('[Webhook] ❌ ERRO GERAL:', error.message);
    console.error('[Webhook] Stack:', error.stack);

    const errorMsg = '⚠️ Erro técnico. Tente novamente em instantes.';

    try {
      if (instance && phone) {
        await sendWhatsAppMessage(instance, phone, errorMsg);
        if (authorizedNumber) {
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: errorMsg,
            direction: 'outgoing',
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
        }
      }
    } catch (sendError) {
      console.error('[Webhook] Erro ao enviar erro:', sendError);
    }

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