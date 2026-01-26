import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { resolveSession, generateFooter } from '@/lib/whatsapp-session';
import { 
  parseDocumentation, 
  generateOptimizedContext,
  ParsedDocumentation 
} from '@/lib/assistente-ia/documentation-parser';
import { generateWhatsAppPrompt } from '@/lib/prompts/system-prompt';
import { getQueryContext, formatQueryContextForPrompt, saveQueryLearning, markTrainingExampleUsed } from '@/lib/query-learning';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================
// FUNÇÃO PARA EXECUTAR DAX
// ============================================
export async function executeDaxQuery(connectionId: string, datasetId: string, query: string, supabase: any): Promise<{ success: boolean; results?: any[]; error?: string }> {
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
// FUNÇÃO PARA CLASSIFICAR ERROS
// ============================================
function classifyError(error: any): {
  isTemporary: boolean;
  shouldRetry: boolean;
  retryAfter?: number; // segundos
  userMessage: string;
} {
  const errorStatus = error.status || error.statusCode;
  const errorMessage = error.message || String(error);
  
  // Erros temporários (rate limit, timeout, server overload)
  if (errorStatus === 529 || errorStatus === 503 || errorStatus === 429) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: errorStatus === 429 ? 60 : 10, // 60s para rate limit, 10s para outros
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. ⏳\n\nVou tentar novamente em alguns segundos. Se não conseguir, te aviso para tentar mais tarde.'
    };
  }
  
  // Timeout
  if (errorMessage.includes('timeout') || errorMessage === 'Claude timeout') {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 5,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. ⏳\n\nVou tentar novamente em alguns segundos. Se não conseguir, te aviso para tentar mais tarde.'
    };
  }
  
  // Erros de rede temporários
  if (errorMessage.includes('ECONNRESET') || errorMessage.includes('ETIMEDOUT') || errorMessage.includes('network')) {
    return {
      isTemporary: true,
      shouldRetry: true,
      retryAfter: 3,
      userMessage: 'Estou processando sua pergunta, mas preciso de um momento. ⏳\n\nVou tentar novamente em alguns segundos. Se não conseguir, te aviso para tentar mais tarde.'
    };
  }
  
  // Erros permanentes (auth, invalid request, etc)
  if (errorStatus === 401 || errorStatus === 403 || errorStatus === 400) {
    return {
      isTemporary: false,
      shouldRetry: false,
      userMessage: 'Não consegui processar sua solicitação no momento. ❌\n\nPor favor, tente novamente mais tarde ou reformule sua pergunta.'
    };
  }
  
  // Erro desconhecido - tratar como temporário por segurança
  return {
    isTemporary: true,
    shouldRetry: true,
    retryAfter: 5,
    userMessage: 'Estou processando sua pergunta, mas preciso de um momento. ⏳\n\nVou tentar novamente em alguns segundos. Se não conseguir, te aviso para tentar mais tarde.'
  };
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
  maxRetries = 4,  // ← AUMENTADO de 2 para 4
  timeoutMs = 30000  // ← TIMEOUT de 30 segundos
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
      
      const errorInfo = classifyError(error);
      
      // Se não deve fazer retry ou é última tentativa, lançar erro
      if (!errorInfo.shouldRetry || attempt >= maxRetries) {
        throw error;
      }
      
      // Backoff exponencial: 2s, 5s, 10s, 20s
      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 20000);
      console.log(`[Claude] Aguardando ${waitTime}ms antes da tentativa ${attempt + 1}...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

// ============================================
// FUNÇÃO PARA GERAR ÁUDIO COM OPENAI TTS
// ============================================
export async function generateAudio(text: string): Promise<string | null> {
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
export async function sendWhatsAppAudio(instance: any, phone: string, audioBase64: string): Promise<boolean> {
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
export async function sendWhatsAppMessage(instance: any, phone: string, message: string): Promise<boolean> {
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
export async function getInstanceForAuthorizedNumber(authorizedNumber: any, supabase: any): Promise<any> {
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
// FUNÇÃO PARA IDENTIFICAR INTENÇÃO DA PERGUNTA
// ============================================
export function identifyQuestionIntent(question: string): string {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Faturamento
  if (q.match(/faturamento.*(filial|loja|unidade)/)) return 'faturamento_filial';
  if (q.match(/faturamento.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/faturamento.*(produto|item)/)) return 'faturamento_produto';
  if (q.match(/faturamento|faturou|receita total|vendeu quanto/)) return 'faturamento_total';
  
  // Vendas por
  if (q.match(/vendas?.*(filial|loja)/)) return 'faturamento_filial';
  if (q.match(/vendas?.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/vendas?.*(produto|item)/)) return 'faturamento_produto';
  
  // Rankings
  if (q.match(/top.*(vendedor|garcom|funcionario)|melhor vendedor|quem (mais )?vendeu/)) return 'top_vendedores';
  if (q.match(/top.*(produto|item)|produto.*(mais|melhor)/)) return 'top_produtos';
  if (q.match(/top.*(filial|loja)|filial.*(mais|melhor)/)) return 'top_filiais';
  
  // Métricas
  if (q.match(/ticket.*(medio|médio)/)) return 'ticket_medio';
  if (q.match(/margem|lucro/)) return 'margem';
  if (q.match(/cmv|custo/)) return 'cmv';
  
  // Financeiro
  if (q.match(/contas?.*(pagar|vencer)|a pagar/)) return 'contas_pagar';
  if (q.match(/contas?.*(receber)|a receber/)) return 'contas_receber';
  if (q.match(/saldo|caixa|banco/)) return 'saldo';
  
  return 'outros';
}

// ============================================
// FUNÇÃO PARA BUSCAR QUERIES QUE FUNCIONARAM
// ============================================
export async function getWorkingQueries(
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
// FUNÇÃO PARA SALVAR MENSAGEM NA FILA
// ============================================
async function saveMessageToQueue(
  supabase: any,
  phone: string,
  companyGroupId: string,
  messageContent: string,
  conversationHistory: any[],
  systemPrompt: string,
  connectionId: string | null,
  datasetId: string | null,
  errorInfo: { isTemporary: boolean; retryAfter?: number; errorMessage: string },
  respondWithAudio: boolean = false
): Promise<string | null> {
  try {
    const nextRetryAt = errorInfo.retryAfter 
      ? new Date(Date.now() + errorInfo.retryAfter * 1000).toISOString()
      : new Date(Date.now() + 5000).toISOString(); // Default 5 segundos
    
    // Adicionar flag de áudio no conversation_history como metadata
    const historyWithMetadata = {
      messages: conversationHistory,
      metadata: {
        respond_with_audio: respondWithAudio
      }
    };
    
    const { data, error } = await supabase
      .from('whatsapp_message_queue')
      .insert({
        phone_number: phone,
        company_group_id: companyGroupId,
        message_content: messageContent,
        conversation_history: historyWithMetadata,
        system_prompt: systemPrompt,
        connection_id: connectionId,
        dataset_id: datasetId,
        attempt_count: 0,
        max_attempts: 5,
        next_retry_at: nextRetryAt,
        status: 'pending',
        error_message: errorInfo.errorMessage,
        error_type: errorInfo.isTemporary ? 'temporary' : 'permanent'
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('[Queue] Erro ao salvar na fila:', error);
      return null;
    }
    
    console.log('[Queue] Mensagem salva na fila, ID:', data.id, 'Próximo retry:', nextRetryAt);
    return data.id;
  } catch (e) {
    console.error('[Queue] Erro ao salvar na fila:', e);
    return null;
  }
}

// ============================================
// FUNÇÃO PARA SALVAR RESULTADO DA QUERY
// ============================================
export async function saveQueryResult(
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
    
    // Verificar se query já existe
    const { data: existing } = await supabase
      .from('ai_query_learning')
      .select('id, times_reused')
      .eq('dataset_id', datasetId)
      .eq('dax_query_hash', queryHash)
      .maybeSingle();
    
    if (existing && success) {
      // Query já existe e deu sucesso: incrementar uso
      await supabase
        .from('ai_query_learning')
        .update({ 
          times_reused: existing.times_reused + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      console.log('[Learning] Query reutilizada, times_reused:', existing.times_reused + 1);
    } else if (!existing) {
      // Query nova: inserir
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
    
    // Log detalhado para debug de áudio
    if (body.data?.message?.audioMessage || body.message?.audioMessage || body.audioMessage) {
      console.log('[Webhook] 🔊 ÁUDIO DETECTADO NO BODY:', JSON.stringify({
        has_audioMessage: !!body.data?.message?.audioMessage || !!body.message?.audioMessage || !!body.audioMessage,
        body_keys: Object.keys(body),
        data_keys: body.data ? Object.keys(body.data) : [],
        message_keys: body.data?.message ? Object.keys(body.data.message) : []
      }));
    }

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

    // ========== BUSCAR INSTÂNCIA ==========
    instance = await getInstanceForAuthorizedNumber(authorizedNumber, supabase);
    if (!instance) {
      console.log('[Webhook] Sem instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

    // ========== BUSCAR INSTÂNCIA ==========
    instance = await getInstanceForAuthorizedNumber(authorizedNumber, supabase);
    if (!instance) {
      console.log('[Webhook] Sem instância conectada');
      return NextResponse.json({ status: 'error', reason: 'no instance' });
    }

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

    // ========== VERIFICAR ÁUDIO ==========
    const isAudioMessage = !!messageContent.audioMessage || !!messageData.audioMessage || body.data?.audioMessage;
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
      console.log('[Webhook] ✅ Áudio detectado - responderá com áudio');
    }

    // ========== SAUDAÇÃO ==========
    const greetings = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'eai', 'opa', 'fala'];
    const isGreeting = greetings.some(g => messageText.toLowerCase().trim() === g || messageText.toLowerCase().trim().startsWith(g + ' '));
    
    if (isGreeting) {
      // Resolver sessão para saber qual dataset está ativo
      const sessionResult = await resolveSession(supabase, phone, messageText, authorizedNumber);
      const datasetName = sessionResult.session?.dataset_name || 'sistema';
      
      const welcomeMessage = sessionResult.session
        ? `Olá ${authorizedNumber.name?.split(' ')[0] || ''}! 👋\n\nSou seu assistente de dados do *${datasetName}*. Pergunte sobre faturamento, vendas, produtos, etc.\n\n💡 Digite *trocar* para mudar de sistema.`
        : `Olá ${authorizedNumber.name?.split(' ')[0] || ''}! 👋\n\nSou seu assistente de dados. Pergunte sobre faturamento, vendas, produtos, etc.`;

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
      const helpMsg = `🤖 *Comandos:*\n/ajuda - Esta mensagem\n/limpar - Limpar histórico\n/status - Ver status\n/trocar - Trocar de sistema\n\n*Exemplos:*\n- Faturamento do mês\n- Top 5 produtos\n- Vendas por filial`;
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
      const sessionResult = await resolveSession(supabase, phone, messageText, authorizedNumber);
      const datasetName = sessionResult.session?.dataset_name || 'Nenhum';
      const statusMsg = `📊 *Status*\n*Usuário:* ${authorizedNumber.name || phone}\n*Dataset Ativo:* ${datasetName}\n*Sessão:* ${sessionResult.hasSession ? '✅ Ativa' : '❌ Nenhuma'}`;
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

    // =============================================
    // RESOLVER SESSÃO E DATASET
    // =============================================
    const sessionResult = await resolveSession(
      supabase,
      phone,
      messageText,
      authorizedNumber
    );

    // Se precisa mostrar menu ou confirmação
    if (sessionResult.menuMessage && !sessionResult.hasSession) {
      await sendWhatsAppMessage(instance, phone, sessionResult.menuMessage);
      
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: sessionResult.menuMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });

      return NextResponse.json({ 
        status: 'success', 
        action: sessionResult.needsSelection ? 'selection_menu' : 'selection_confirmed'
      });
    }

    // Se não tem sessão válida
    if (!sessionResult.session) {
      return NextResponse.json({ status: 'error', reason: 'no_session' });
    }

    // =============================================
    // USAR DADOS DA SESSÃO
    // =============================================
    const connectionId = sessionResult.session.connection_id;
    const datasetId = sessionResult.session.dataset_id;
    const datasetName = sessionResult.session.dataset_name;

    console.log('[Webhook] Sessão ativa:', {
      dataset: datasetName,
      connectionId,
      datasetId
    });

    // Buscar contexto específico
    let aiContext = null;
    if (sessionResult.session.context_id) {
      const { data: ctx } = await supabase
        .from('ai_model_contexts')
        .select('*')
        .eq('id', sessionResult.session.context_id)
        .maybeSingle();
      aiContext = ctx;
    } else {
      const { data: ctx } = await supabase
        .from('ai_model_contexts')
        .select('*')
        .eq('connection_id', connectionId)
        .eq('is_active', true)
        .maybeSingle();
      aiContext = ctx;
    }

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

    // ========== GERAR CONTEXTO OTIMIZADO ==========
    let modelContext = '';

    if (aiContext) {
      // Se tem seções parseadas, usar contexto inteligente
      if (aiContext.section_base && aiContext.section_medidas) {
        const parsed: ParsedDocumentation = {
          raw: aiContext.context_content || '',
          base: aiContext.section_base,
          medidas: aiContext.section_medidas,
          tabelas: aiContext.section_tabelas,
          queries: aiContext.section_queries,
          exemplos: aiContext.section_exemplos,
          errors: [],
          metadata: {
            hasBase: true,
            hasMedidas: true,
            hasTabelas: !!aiContext.section_tabelas,
            hasQueries: !!aiContext.section_queries,
            hasExemplos: !!aiContext.section_exemplos,
            totalMedidas: aiContext.section_medidas?.length || 0,
            totalTabelas: aiContext.section_tabelas?.length || 0,
            totalQueries: aiContext.section_queries?.length || 0,
            totalExemplos: aiContext.section_exemplos?.length || 0
          }
        };
        
        // Gera contexto com apenas medidas/queries relevantes para a pergunta
        modelContext = generateOptimizedContext(parsed, processedMessage);
        console.log(`[Webhook] Contexto otimizado: ${modelContext.length} chars (de ${aiContext.context_content?.length || 0} total)`);
      } else {
        // Fallback: usar context_content bruto
        modelContext = aiContext.context_content || '';
        console.log(`[Webhook] Contexto bruto: ${modelContext.length} chars`);
      }
    }

    // Fallback: buscar por connection_id se não encontrou
    if (!modelContext && connectionId) {
      const { data: fallbackContext } = await supabase
        .from('ai_model_contexts')
        .select('context_content, section_base, section_medidas, connection_id, dataset_id')
        .eq('connection_id', connectionId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (fallbackContext) {
        if (fallbackContext.section_base && fallbackContext.section_medidas) {
          // Tentar usar contexto otimizado do fallback
          const parsed: ParsedDocumentation = {
            raw: fallbackContext.context_content || '',
            base: fallbackContext.section_base,
            medidas: fallbackContext.section_medidas,
            tabelas: null,
            queries: null,
            exemplos: null,
            errors: [],
            metadata: {
              hasBase: true,
              hasMedidas: true,
              hasTabelas: false,
              hasQueries: false,
              hasExemplos: false,
              totalMedidas: fallbackContext.section_medidas?.length || 0,
              totalTabelas: 0,
              totalQueries: 0,
              totalExemplos: 0
            }
          };
          modelContext = generateOptimizedContext(parsed, processedMessage);
          console.log(`[Webhook] Contexto otimizado (fallback): ${modelContext.length} chars`);
        } else {
          modelContext = fallbackContext.context_content || '';
          console.log(`[Webhook] Contexto bruto (fallback): ${modelContext.length} chars`);
        }
      }
    }

    console.log('[Webhook] Contexto final:', modelContext ? modelContext.length + ' chars' : 'NENHUM');

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
      .limit(10);

    // ========== BUSCAR QUERIES SIMILARES E EXEMPLOS DE TREINAMENTO ==========
    const queryContext = await getQueryContext(
      supabase,
      processedMessage,
      connectionId,
      datasetId,
      5
    );
    const queryContextStr = formatQueryContextForPrompt(queryContext);

    // ========== GERAR SYSTEM PROMPT OTIMIZADO ==========
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentYear = new Date().getFullYear();
    const currentMonthNumber = new Date().getMonth() + 1;

    // Gerar system prompt usando função otimizada
    const systemPromptBase = generateWhatsAppPrompt({
      modelName: datasetName || aiContext?.context_name || 'Power BI',
      modelContext: modelContext, // Contexto otimizado do parser
      queryContext: queryContextStr, // Queries similares
      userName: authorizedNumber?.name,
      datasetName: datasetName
    });

    // Adicionar regras específicas do WhatsApp (período, formato, etc)
    const systemPrompt = `${systemPromptBase}

# ⚠️ REGRA CRÍTICA - FILTRO DE DATA OBRIGATÓRIO EM TODA QUERY
**NUNCA execute uma query DAX sem filtro de período.**

Quando o usuário NÃO especificar data/período:
- Mês atual: ${currentMonthNumber}
- Ano atual: ${currentYear}

## FORMATO OBRIGATÓRIO DAS QUERIES:
**IMPORTANTE: Os nomes de tabelas/colunas abaixo são EXEMPLOS. Use os nomes REAIS do CONTEXTO DO MODELO.**

Para valor único (exemplo de formato):
EVALUATE ROW("Nome", CALCULATE([Medida], TabelaData[ColunaMes] = ${currentMonthNumber}, TabelaData[ColunaAno] = ${currentYear}))

Para agrupamentos (exemplo de formato):
EVALUATE CALCULATETABLE(SUMMARIZECOLUMNS(Coluna, "Total", [Medida]), TabelaData[ColunaMes] = ${currentMonthNumber}, TabelaData[ColunaAno] = ${currentYear})

Para rankings Top N (exemplo de formato):
EVALUATE TOPN(N, CALCULATETABLE(SUMMARIZECOLUMNS(Coluna, "Total", [Medida]), TabelaData[ColunaMes] = ${currentMonthNumber}, TabelaData[ColunaAno] = ${currentYear}), [Total], DESC)

**Consulte o CONTEXTO DO MODELO acima para descobrir os nomes reais da tabela de datas e suas colunas.**

## VALIDAÇÃO
Se um valor individual for maior que o total, a query está ERRADA (faltou filtro de data).

## MANTER CONTEXTO TEMPORAL
Ao responder sugestões (1, 2, 3), use o MESMO período da resposta anterior.

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
      
      const errorInfo = classifyError(claudeError);
      
      // Se é erro temporário, salvar na fila
      if (errorInfo.isTemporary && errorInfo.shouldRetry) {
        const queueId = await saveMessageToQueue(
          supabase,
          phone,
          authorizedNumber.company_group_id,
          processedMessage,
          conversationHistory,
          systemPrompt,
          connectionId || null,
          datasetId || null,
          {
            isTemporary: true,
            retryAfter: errorInfo.retryAfter,
            errorMessage: claudeError.message || 'Erro desconhecido'
          },
          respondWithAudio
        );
        
        if (queueId) {
          // Enviar mensagem informando que vai tentar novamente
          const userName = authorizedNumber.name?.split(' ')[0] || '';
          await sendWhatsAppMessage(instance, phone, errorInfo.userMessage.replace('[Nome]', userName));
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: errorInfo.userMessage.replace('[Nome]', userName),
            direction: 'outgoing',
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
          return NextResponse.json({ status: 'queued', queue_id: queueId, reason: 'temporary_error' });
        }
      }
      
      // Se não conseguiu salvar na fila ou é erro permanente, enviar mensagem de erro
      const userName = authorizedNumber.name?.split(' ')[0] || '';
      const errorMsg = errorInfo.isTemporary 
        ? `Desculpe ${userName}, ainda estou com dificuldades técnicas. 🔧\n\nPor favor, tente novamente em alguns minutos. Se persistir, entre em contato com o suporte.`
        : errorInfo.userMessage.replace('[Nome]', userName);
      
      await sendWhatsAppMessage(instance, phone, errorMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: errorMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'error', reason: errorInfo.isTemporary ? 'temporary_error' : 'permanent_error' });
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

          // Salvar resultado para aprendizado (usando novo sistema)
          if (toolInput.query) {
            await saveQueryLearning(supabase, {
              company_group_id: authorizedNumber.company_group_id,
              connection_id: connectionId || undefined,
              dataset_id: datasetId,
              user_question: processedMessage,
              dax_query: toolInput.query,
              was_successful: daxResult.success,
              source: 'whatsapp',
              created_by: authorizedNumber.user_id || undefined
            });
          }

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
          console.error('[Webhook] Claude retry erro (2ª chamada):', retryError.message);
          
          // Se a segunda chamada falhar, tentar salvar na fila ou retornar resposta básica
          const errorInfo = classifyError(retryError);
          
          if (errorInfo.isTemporary && errorInfo.shouldRetry) {
            // Salvar na fila para retry posterior
            const queueId = await saveMessageToQueue(
              supabase,
              phone,
              authorizedNumber.company_group_id,
              processedMessage,
              messages, // Usar mensagens completas incluindo tool results
              systemPrompt,
              connectionId || null,
              datasetId || null,
              {
                isTemporary: true,
                retryAfter: errorInfo.retryAfter,
                errorMessage: retryError.message || 'Erro na segunda chamada'
              },
              respondWithAudio
            );
            
            if (queueId) {
              const userName = authorizedNumber.name?.split(' ')[0] || '';
              const msg = `Olá ${userName}! Processei os dados, mas estou com dificuldade para formatar a resposta. ⏳\n\nVou tentar novamente em alguns segundos.`;
              await sendWhatsAppMessage(instance, phone, msg);
              await supabase.from('whatsapp_messages').insert({
                company_group_id: authorizedNumber.company_group_id,
                phone_number: phone,
                message_content: msg,
                direction: 'outgoing',
                sender_name: 'Assistente IA',
                instance_id: instance.id
              });
              return NextResponse.json({ status: 'queued', queue_id: queueId, reason: 'second_call_error' });
            }
          }
          
          // Se não conseguiu salvar na fila, verificar se há toolResults com dados
          // Extrair dados dos toolResults se disponíveis
          let hasData = false;
          let dataToShow: any[] = [];
          
          if (toolResults.length > 0) {
            for (const toolResult of toolResults) {
              if (toolResult.content && !toolResult.content.includes('Erro:')) {
                try {
                  const parsed = JSON.parse(toolResult.content);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    hasData = true;
                    dataToShow = parsed;
                    break;
                  }
                } catch (e) {
                  // Ignorar erro de parsing
                }
              }
            }
          }
          
          if (hasData && dataToShow.length > 0) {
            const basicResponse = `📊 *Dados encontrados:*\n\n${JSON.stringify(dataToShow.slice(0, 5), null, 2)}\n\nDesculpe, tive dificuldade para formatar a resposta. Por favor, tente novamente.`;
            await sendWhatsAppMessage(instance, phone, basicResponse);
            await supabase.from('whatsapp_messages').insert({
              company_group_id: authorizedNumber.company_group_id,
              phone_number: phone,
              message_content: basicResponse,
              direction: 'outgoing',
              sender_name: 'Assistente IA',
              instance_id: instance.id
            });
            return NextResponse.json({ status: 'partial_success', reason: 'formatting_error' });
          }
          
          // Se não há dados, retornar erro
          const userName = authorizedNumber.name?.split(' ')[0] || '';
          const errorMsg = `Desculpe ${userName}, não consegui processar sua solicitação. Por favor, tente novamente.`;
          await sendWhatsAppMessage(instance, phone, errorMsg);
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: errorMsg,
            direction: 'outgoing',
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
          return NextResponse.json({ status: 'error', reason: 'second_call_failed' });
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

    // ========== MARCAR EXEMPLOS DE TREINAMENTO COMO USADOS ==========
    if (queryContext.trainingExamples && queryContext.trainingExamples.length > 0) {
      // Marcar o exemplo mais relevante como usado
      const mostRelevant = queryContext.trainingExamples[0];
      await markTrainingExampleUsed(supabase, mostRelevant.id);
      console.log(`[Webhook] Exemplo de treinamento marcado como usado: ${mostRelevant.id}`);
    }

    // ========== DETECTAR E SALVAR PERGUNTAS NÃO RESPONDIDAS ==========
    const evasivePatterns = [
      'não encontrei',
      'não consegui', 
      'não tenho acesso',
      'não possuo',
      'não foi possível',
      'não tenho informações',
      'não tenho dados',
      'sem dados',
      'dados não disponíveis',
      'informação não disponível',
      'não entendi',
      'não localizei',
      'não há dados',
      'não existe'
    ];

    const assistantMessageLower = assistantMessage.toLowerCase();
    const isEvasiveResponse = evasivePatterns.some(pattern => 
      assistantMessageLower.includes(pattern)
    );

    if (isEvasiveResponse || daxError) {
      console.log('[Webhook] 🔴 Resposta evasiva detectada, salvando pergunta pendente...');
      try {
        // Verificar se já existe pergunta similar pendente
        const { data: existingQuestion } = await supabase
          .from('ai_unanswered_questions')
          .select('id, user_count, attempt_count')
          .eq('company_group_id', authorizedNumber.company_group_id)
          .ilike('user_question', processedMessage)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingQuestion) {
          // Atualizar pergunta existente
          const { error: updateError } = await supabase
            .from('ai_unanswered_questions')
            .update({
              attempt_count: (existingQuestion.attempt_count || 0) + 1,
              user_count: (existingQuestion.user_count || 0) + 1,
              last_asked_at: new Date().toISOString(),
              error_message: daxError || 'Resposta evasiva da IA'
            })
            .eq('id', existingQuestion.id);
          
          if (updateError) {
            console.error('[Webhook] Erro ao atualizar pergunta pendente:', updateError.message);
          } else {
            console.log('[Webhook] ✅ Pergunta pendente atualizada:', existingQuestion.id);
          }
        } else {
          // Criar nova pergunta pendente
          const { data: newQuestion, error: insertError } = await supabase
            .from('ai_unanswered_questions')
            .insert({
              company_group_id: authorizedNumber.company_group_id,
              connection_id: connectionId || null,
              dataset_id: datasetId || null,
              user_question: processedMessage,
              phone_number: phone,
              attempted_dax: null,
              error_message: daxError || 'Resposta evasiva da IA',
              status: 'pending',
              attempt_count: 1,
              user_count: 1,
              first_asked_at: new Date().toISOString(),
              last_asked_at: new Date().toISOString()
            })
            .select('id')
            .single();
          
          if (insertError) {
            console.error('[Webhook] Erro ao criar pergunta pendente:', insertError.message, insertError.details);
          } else {
            console.log('[Webhook] ✅ Nova pergunta pendente criada:', newQuestion?.id, '| Pergunta:', processedMessage);
          }
        }
      } catch (saveError: any) {
        console.error('[Webhook] ❌ Erro ao salvar pergunta pendente:', saveError.message);
      }
    }
    // ========== FIM - DETECTAR E SALVAR PERGUNTAS NÃO RESPONDIDAS ==========

    // ========== ENVIAR RESPOSTA ==========
    let sent = false;
    
    // Adicionar rodapé com nome do dataset
    const messageWithFooter = assistantMessage + generateFooter(datasetName);
    
    console.log('[Webhook] Enviando resposta - respondWithAudio:', respondWithAudio, '| Mensagem length:', messageWithFooter.length);
    
    if (respondWithAudio) {
      console.log('[Webhook] 🎤 Gerando áudio com OpenAI TTS...');
      try {
        const audioBase64 = await generateAudio(assistantMessage);
        if (audioBase64) {
          console.log('[Webhook] ✅ Áudio gerado (', audioBase64.length, 'bytes), enviando via WhatsApp...');
          sent = await sendWhatsAppAudio(instance, phone, audioBase64);
          console.log('[Webhook] Áudio enviado?', sent);
          if (!sent) {
            console.log('[Webhook] ⚠️ Falha ao enviar áudio, enviando como texto...');
            sent = await sendWhatsAppMessage(instance, phone, messageWithFooter);
          } else {
            // Se áudio foi enviado, enviar rodapé como texto separado
            await sendWhatsAppMessage(instance, phone, generateFooter(datasetName));
          }
        } else {
          console.log('[Webhook] ❌ Falha ao gerar áudio (retornou null), enviando texto');
          sent = await sendWhatsAppMessage(instance, phone, messageWithFooter);
        }
      } catch (audioError: any) {
        console.error('[Webhook] ❌ Erro ao gerar/enviar áudio:', audioError.message);
        sent = await sendWhatsAppMessage(instance, phone, messageWithFooter);
      }
    } else {
      console.log('[Webhook] 📝 Enviando como texto');
      sent = await sendWhatsAppMessage(instance, phone, messageWithFooter);
    }

    // ========== SALVAR RESPOSTA ==========
    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: respondWithAudio ? `🔊 ${assistantMessage}` : messageWithFooter,
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