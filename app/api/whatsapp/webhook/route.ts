import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callClaude, classifyError, extractTextFromResponse, hasToolUse, getToolUseBlocks } from '@/lib/ai/claude-client';
import Anthropic from '@anthropic-ai/sdk';
import { resolveSession, generateFooter } from '@/lib/whatsapp-session';
import { 
  parseDocumentation, 
  generateOptimizedContext,
  ParsedDocumentation 
} from '@/lib/assistente-ia/documentation-parser';
import { generateWhatsAppPrompt } from '@/lib/prompts/system-prompt';
import { getQueryContext, formatQueryContextForPrompt, saveQueryLearning, markTrainingExampleUsed } from '@/lib/query-learning';
import { executeDaxQuery } from '@/lib/ai/dax-engine';
import { sendWhatsAppMessage, sendWhatsAppAudio, sendTypingIndicator, getInstanceForAuthorizedNumber } from '@/lib/whatsapp/messaging';
import { generateAudio, downloadWhatsAppAudio, transcribeAudio } from '@/lib/whatsapp/audio';
import { identifyQuestionIntent, getWorkingQueries, saveQueryResult, isFailureResponse, identifyFailureReason } from '@/lib/ai/learning';
import { getDeveloperIdForGroup, resolveAIContextForGroup } from '@/lib/shared-resources';
import { logActivity } from '@/lib/activity-logger';

// Modelos para estratégia híbrida de custo
const MODEL_FAST = 'claude-haiku-4-5-20251001'; // Rápido e barato - primeira tentativa
const MODEL_SMART = 'claude-sonnet-4-20250514'; // Inteligente - fallback quando Haiku falha

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

    // Verificar se é mensagem de áudio (para não ignorar por estar vazia)
    const hasAudioMessage = !!messageContent.audioMessage || !!messageData.message?.audioMessage || !!body.data?.message?.audioMessage;

    // DEBUG TEMPORÁRIO - Remover após resolver áudio
    if (hasAudioMessage) {
      console.log('[AUDIO-DEBUG] ===== DADOS DO ÁUDIO =====');
      console.log('[AUDIO-DEBUG] messageText:', messageText ? messageText.substring(0, 100) : 'VAZIO');
      console.log('[AUDIO-DEBUG] messageContent keys:', Object.keys(messageContent));
      console.log('[AUDIO-DEBUG] audioMessage keys:', Object.keys(messageContent.audioMessage || {}));
      console.log('[AUDIO-DEBUG] audioMessage:', JSON.stringify(messageContent.audioMessage, null, 2)?.substring(0, 500));
      console.log('[AUDIO-DEBUG] messageData keys:', Object.keys(messageData));
      console.log('[AUDIO-DEBUG] body.data keys:', Object.keys(body.data || {}));
      console.log('[AUDIO-DEBUG] messageData.body:', messageData.body);
      console.log('[AUDIO-DEBUG] ===========================');
    }

    // Ignorar mensagens enviadas por mim OU mensagens vazias que NÃO são áudio
    if (fromMe || (!messageText.trim() && !hasAudioMessage)) {
      console.log('[Webhook] Ignorando:', { fromMe, emptyText: !messageText.trim(), isAudio: hasAudioMessage });
      return NextResponse.json({ status: 'ignored', reason: 'fromMe or empty (not audio)' });
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

    // ========== VERIFICAR ÁUDIO ==========
    const isAudioMessage = hasAudioMessage;
    let respondWithAudio = false;
    let processedMessageText = messageText;

    if (isAudioMessage && !messageText.trim()) {
      // Áudio sem transcrição da Evolution API — tentar transcrever manualmente
      console.log('[Webhook] 🎤 Áudio sem transcrição, tentando Whisper...');

      try {
        const audioBuffer = await downloadWhatsAppAudio(instance, messageData);
        if (audioBuffer) {
          const transcription = await transcribeAudio(audioBuffer);
          if (transcription) {
            processedMessageText = transcription;
            // respondWithAudio = true; — áudio sempre responde em texto
            console.log('[Webhook] ✅ Áudio transcrito via Whisper:', transcription.substring(0, 50));
          }
        }
      } catch (whisperError: any) {
        console.log('[Webhook] Whisper falhou:', whisperError.message);
      }

      // Se não conseguiu transcrever de jeito nenhum
      if (!processedMessageText.trim()) {
        const audioMsg = `Desculpe ${authorizedNumber?.name || ''}, não consegui entender o áudio. 🎤\n\nPode enviar novamente ou digitar sua pergunta?`;
        await sendWhatsAppMessage(instance, phone, audioMsg);
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: audioMsg,
          direction: 'outgoing',
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
        return NextResponse.json({ status: 'error', reason: 'transcription_failed' });
      }
    }

    // Se áudio COM transcrição da Evolution API — usar texto (responder em texto, não áudio)
    if (isAudioMessage && messageText.trim()) {
      // respondWithAudio = true; — áudio sempre responde em texto
      processedMessageText = messageText;
      console.log('[Webhook] 🎤 Áudio com transcrição da Evolution API - responderá com áudio');
    }

    // Verificar se tem mensagem para processar
    if (!processedMessageText.trim()) {
      return NextResponse.json({ status: 'ignored', reason: 'empty_message' });
    }

    // ========== SALVAR MENSAGEM INCOMING ==========
    await supabase.from('whatsapp_messages').insert({
      company_group_id: authorizedNumber.company_group_id,
      phone_number: phone,
      message_content: processedMessageText, // Usar processedMessageText para incluir transcrição
      direction: 'incoming',
      sender_name: authorizedNumber.name || phone,
      external_id: externalId || null,
      instance_id: authorizedNumber.instance_id || null,
      authorized_number_id: authorizedNumber.id
    });

    // Enviar indicador de "digitando..." para o usuário
    await sendTypingIndicator(instance, phone);

    // ========== SAUDAÇÃO ==========
    const greetings = ['oi', 'olá', 'ola', 'hey', 'hi', 'hello', 'bom dia', 'boa tarde', 'boa noite', 'e aí', 'eai', 'opa', 'fala'];
    const isGreeting = greetings.some(g => processedMessageText.toLowerCase().trim() === g || processedMessageText.toLowerCase().trim().startsWith(g + ' '));
    
    if (isGreeting) {
      // Resolver sessão para saber qual dataset está ativo
      const sessionResult = await resolveSession(supabase, phone, processedMessageText, authorizedNumber);
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
    const userCommand = processedMessageText.toLowerCase().trim();

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
      const sessionResult = await resolveSession(supabase, phone, processedMessageText, authorizedNumber);
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
      processedMessageText,
      authorizedNumber
    );

    // Se selecionou dataset e tem sessão, continuar processando (não parar na confirmação)
    if (sessionResult.hasSession && sessionResult.session) {
      // Sessão válida, seguir para processamento da IA
      console.log('[Webhook] Sessão ativa:', sessionResult.session.dataset_name);
    }

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

    // Buscar contexto específico (grupo ou herança do developer)
    const developerId = await getDeveloperIdForGroup(authorizedNumber.company_group_id);
    let aiContext = null;
    if (sessionResult.session.context_id) {
      const { data: ctx } = await supabase
        .from('ai_model_contexts')
        .select('*')
        .eq('id', sessionResult.session.context_id)
        .maybeSingle();
      aiContext = ctx;
      // DEBUG - remover depois
      console.log('[Webhook] DEBUG aiContext via context_id:', {
        found: !!ctx,
        context_id: sessionResult.session.context_id,
        has_section_base: !!ctx?.section_base,
        has_section_medidas: !!ctx?.section_medidas,
        section_base_type: typeof ctx?.section_base,
        section_medidas_type: typeof ctx?.section_medidas,
        section_medidas_length: ctx?.section_medidas?.length,
        section_queries_length: ctx?.section_queries?.length,
        section_exemplos_length: ctx?.section_exemplos?.length,
      });
    } else {
      const { data: ctx } = await supabase
        .from('ai_model_contexts')
        .select('*')
        .eq('dataset_id', datasetId)
        .eq('company_group_id', authorizedNumber.company_group_id)
        .eq('context_type', 'chat')
        .eq('is_active', true)
        .maybeSingle();
      aiContext = ctx;
      // DEBUG - remover depois
      console.log('[Webhook] DEBUG aiContext via dataset_id:', {
        found: !!ctx,
        has_section_base: !!ctx?.section_base,
        has_section_medidas: !!ctx?.section_medidas,
        section_base_type: typeof ctx?.section_base,
        section_medidas_type: typeof ctx?.section_medidas,
        section_medidas_length: ctx?.section_medidas?.length,
        section_queries_length: ctx?.section_queries?.length,
      });
      if (!aiContext && developerId) {
        aiContext = await resolveAIContextForGroup(
          authorizedNumber.company_group_id,
          developerId,
          datasetId
        );
      }
    }

    // ========== INTERPRETAR ESCOLHA DE OPÇÕES 1, 2, 3 ==========
    const userInput = processedMessageText.trim();
    let processedMessage = processedMessageText;

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

    // Fallback: buscar por dataset_id e company_group_id ou herança do developer
    if (!modelContext && datasetId) {
      const fallbackResolved = await resolveAIContextForGroup(
        authorizedNumber.company_group_id,
        developerId,
        datasetId
      );
      if (fallbackResolved) {
        const fc = fallbackResolved;
        if (fc.section_base && fc.section_medidas) {
          const parsed: ParsedDocumentation = {
            raw: (fc.context_content as string) || '',
            base: fc.section_base as string,
            medidas: fc.section_medidas as any,
            tabelas: (fc.section_tabelas as any) || null,
            queries: (fc.section_queries as any) || null,
            exemplos: (fc.section_exemplos as any) || null,
            errors: [],
            metadata: {
              hasBase: true,
              hasMedidas: true,
              hasTabelas: !!fc.section_tabelas,
              hasQueries: !!fc.section_queries,
              hasExemplos: !!fc.section_exemplos,
              totalMedidas: (fc.section_medidas as any)?.length || 0,
              totalTabelas: (fc.section_tabelas as any)?.length || 0,
              totalQueries: (fc.section_queries as any)?.length || 0,
              totalExemplos: (fc.section_exemplos as any)?.length || 0
            }
          };
          modelContext = generateOptimizedContext(parsed, processedMessage);
          console.log(`[Webhook] Contexto otimizado (herança developer): ${modelContext.length} chars`);
        } else {
          modelContext = (fc.context_content as string) || '';
          console.log(`[Webhook] Contexto bruto (herança developer): ${modelContext.length} chars`);
        }
      } else {
        const { data: fallbackContext } = await supabase
          .from('ai_model_contexts')
          .select('context_content, section_base, section_medidas, connection_id, dataset_id')
          .eq('dataset_id', datasetId)
          .eq('company_group_id', authorizedNumber.company_group_id)
          .eq('context_type', 'chat')
          .eq('is_active', true)
          .limit(1)
          .maybeSingle();

        if (fallbackContext) {
          if (fallbackContext.section_base && fallbackContext.section_medidas) {
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
      .limit(6);

    // ========== BUSCAR QUERIES SIMILARES E EXEMPLOS DE TREINAMENTO ==========
    const queryContext = await getQueryContext(
      supabase,
      processedMessage,
      connectionId,
      datasetId,
      5,
      authorizedNumber.company_group_id,
      developerId
    );
    const queryContextStr = formatQueryContextForPrompt(queryContext);

    // ========== GERAR SYSTEM PROMPT OTIMIZADO ==========
    const currentMonth = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const currentDate = new Date().toLocaleDateString('pt-BR');
    const currentYear = new Date().getFullYear();
    const currentMonthNumber = new Date().getMonth() + 1;

    // Formatar exemplos treinados de forma compacta
    let exemplosFormatados = '';
    if (queryContext && queryContext.trainingExamples && queryContext.trainingExamples.length > 0) {
      exemplosFormatados = queryContext.trainingExamples.map((ex: any, i: number) =>
        `${i + 1}. "${ex.user_question}" → ${ex.dax_query}`
      ).join('\n');
    }

    // System prompt base (da função generateWhatsAppPrompt)
    const systemPromptBase = generateWhatsAppPrompt({
      modelName: datasetName || aiContext?.context_name || 'Power BI',
      modelContext: modelContext,
      queryContext: queryContextStr,
      userName: authorizedNumber?.name,
      datasetName: datasetName
    });

// System prompt final — complementa o base sem duplicar
    const systemPrompt = `${systemPromptBase}

${exemplosFormatados ? `# EXEMPLOS VALIDADOS (USE COMO BASE)\n${exemplosFormatados}\nSe a pergunta for similar, USE O MESMO PADRÃO DAX.\n` : ''}
# PERÍODO PADRÃO
Hoje: ${currentDate} | Mês: ${currentMonthNumber} | Ano: ${currentYear}
Mês anterior: ${currentMonthNumber - 1 || 12}/${currentMonthNumber === 1 ? currentYear - 1 : currentYear}
Quando o usuário NÃO especificar período, use ${currentMonth}.
SEMPRE inicie a resposta com: 📅 *${currentMonth}*

# REGRAS DAX OBRIGATÓRIAS
- **REGRA CRÍTICA DE DATA:** TODA query DEVE ter filtro de período dentro de CALCULATE(). NUNCA use [Medida] diretamente sem CALCULATE com filtro de mês/ano. Formato: CALCULATE([Medida], MONTH(Calendario[Data]) = N, YEAR(Calendario[Data]) = AAAA)
- EVALUATE ROW("Nome", CALCULATE([Medida], MONTH(Calendario[Data]) = ${currentMonthNumber}, YEAR(Calendario[Data]) = ${currentYear})) para valor único
- EVALUATE TOPN(N, SUMMARIZECOLUMNS(Coluna, "Total", CALCULATE([Medida], MONTH(Calendario[Data]) = ${currentMonthNumber}, YEAR(Calendario[Data]) = ${currentYear})), [Total], DESC) para rankings
- EVALUATE SUMMARIZECOLUMNS(Coluna, "Total", CALCULATE([Medida], MONTH(Calendario[Data]) = ${currentMonthNumber}, YEAR(Calendario[Data]) = ${currentYear})) para agrupamentos
- NUNCA invente nomes de colunas ou medidas – use SOMENTE o que está no contexto
- Se a query falhar, analise o erro, corrija e tente novamente
- Se valores parecem muito altos (milhões quando deveria ser milhares), provavelmente FALTOU filtro de data — adicione CALCULATE com MONTH/YEAR

# FORMATAÇÃO
- *negrito* para destaques (asterisco simples)
- Valores monetários COMPLETOS: R$ 1.234.567,89
- Máximo 800 caracteres
- Emojis com moderação (máx 5)

# SUGESTÕES (OBRIGATÓRIO)
SEMPRE termine com 3 sugestões:
━━━━━━━━━━━━━━━━━
📊 *Posso detalhar:*
1️⃣ [Análise 1]
2️⃣ [Análise 2]
3️⃣ [Análise 3]

Se o usuário responder "1", "2" ou "3", execute a sugestão usando o MESMO período.

# CONTEXTO DO MODELO DE DADOS
${modelContext ? modelContext.slice(0, 12000) : 'Nenhum contexto disponível.'}

Use a ferramenta execute_dax para consultar dados. Leia o contexto acima para nomes exatos.`;

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
          content: msg.message_content.slice(0, 400)
        });
      }
    }

    conversationHistory.push({ role: 'user', content: processedMessage });

    console.log('[Webhook] Histórico:', conversationHistory.length, 'msgs | Tempo:', Date.now() - startTime, 'ms');
    console.log('[Webhook] System prompt length:', systemPrompt.length);
    console.log('[Webhook] Contexto carregado:', modelContext ? modelContext.length + ' chars' : 'NENHUM');

    // ========== CHAMAR CLAUDE (ESTRATÉGIA HÍBRIDA) ==========
    // 1ª tentativa: Haiku (barato) | Se falhar: Sonnet (inteligente)
    let response;
    let daxError: string | null = null;
    let currentModel = MODEL_FAST;
    let escalatedToSmart = false;

    try {
      response = await callClaude({
        model: currentModel,
        max_tokens: 1024,
        system: systemPrompt,
        messages: conversationHistory,
        tools
      });
      console.log(`[Webhook] Claude (${currentModel}) respondeu | Tempo: ${Date.now() - startTime} ms`);
    } catch (claudeError: any) {
      console.error('[Webhook] Claude erro COMPLETO:', JSON.stringify({
        message: claudeError.message,
        status: claudeError.status,
        stack: claudeError.stack?.substring(0, 200)
      }));

      // Detectar erro de créditos da API
      const errorMsg = (claudeError?.message || '').toLowerCase();
      const isCreditError = errorMsg.includes('credit balance') ||
                            errorMsg.includes('purchase credits') ||
                            errorMsg.includes('insufficient_quota');

      if (isCreditError) {
        const creditErrorMsg = `⚠️ O assistente está temporariamente indisponível por questões técnicas.\n\nPor favor, entre em contato com o administrador do sistema.`;
        await sendWhatsAppMessage(instance, phone, creditErrorMsg);
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: creditErrorMsg,
          direction: 'outgoing',
          sender_name: 'Assistente IA',
          instance_id: instance.id
        });
        return NextResponse.json({ status: 'error', reason: 'api_credits_exhausted' });
      }

      // Salvar na fila para retry
      const errorInfo = classifyError(claudeError);
      if (errorInfo.isTemporary && errorInfo.shouldRetry) {
        const queueId = await saveMessageToQueue(
          supabase, phone, authorizedNumber.company_group_id,
          processedMessage, conversationHistory, systemPrompt,
          connectionId || null, datasetId || null,
          {
            isTemporary: true,
            retryAfter: errorInfo.retryAfter,
            errorMessage: claudeError.message || 'Erro desconhecido'
          },
          respondWithAudio
        );
        if (queueId) {
          const userName = authorizedNumber.name?.split(' ')[0] || '';
          await sendWhatsAppMessage(instance, phone, errorInfo.userMessage?.replace('[Nome]', userName) || `Desculpe ${userName}, tive um problema. Vou tentar novamente em breve.`);
          await supabase.from('whatsapp_messages').insert({
            company_group_id: authorizedNumber.company_group_id,
            phone_number: phone,
            message_content: errorInfo.userMessage?.replace('[Nome]', userName) || `Desculpe, tive um problema. Vou tentar novamente em breve.`,
            direction: 'outgoing',
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
          return NextResponse.json({ status: 'queued', queue_id: queueId, reason: 'temporary_error' });
        }
      }

      const errorResponseMsg = `Desculpe ${authorizedNumber.name?.split(' ')[0] || ''}, tive um problema técnico. Sua pergunta foi salva e será respondida em breve. 🔄`;
      await sendWhatsAppMessage(instance, phone, errorResponseMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: errorResponseMsg,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });
      return NextResponse.json({ status: 'error', reason: 'claude_error' });
    }

    // ========== LOOP DE TOOL USE (DAX) ==========
    const MAX_ITERATIONS = 3;
    let iteration = 0;

    while (hasToolUse(response) && iteration < MAX_ITERATIONS) {
      iteration++;
      const toolBlocks = getToolUseBlocks(response);

      const toolResults: any[] = [];
      let hadDaxError = false;

      for (const toolBlock of toolBlocks) {
        if (toolBlock.name === 'execute_dax') {
          const query = toolBlock.input?.query;
          console.log(`[Webhook] DAX query (iteração ${iteration}/${MAX_ITERATIONS}):`, query?.substring(0, 300));

          if (query) {
            const daxResult = await executeDaxQuery(connectionId, datasetId, query, supabase);

            if (daxResult.success) {
              console.log(`[Webhook] DAX resultado: ✅ ${daxResult.results?.length || 0} linhas`);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify(daxResult.results?.slice(0, 50) || [])
              });

              await saveQueryLearning(supabase, {
                company_group_id: authorizedNumber.company_group_id,
                connection_id: connectionId || undefined,
                dataset_id: datasetId,
                user_question: processedMessage,
                dax_query: query,
                was_successful: true,
                source: 'whatsapp',
                created_by: authorizedNumber.user_id || undefined
              });
            } else {
              console.log(`[Webhook] DAX resultado: ❌ ${daxResult.error?.substring(0, 200)}`);
              hadDaxError = true;
              daxError = daxResult.error || 'Erro desconhecido';
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: `Erro: ${daxResult.error}`,
                is_error: true
              });

              await saveQueryLearning(supabase, {
                company_group_id: authorizedNumber.company_group_id,
                connection_id: connectionId || undefined,
                dataset_id: datasetId,
                user_question: processedMessage,
                dax_query: query,
                was_successful: false,
                source: 'whatsapp',
                created_by: authorizedNumber.user_id || undefined
              });
            }
          }
        }
      }

      // Se Haiku errou a DAX E ainda não escalou → escalar para Sonnet
      if (hadDaxError && !escalatedToSmart && currentModel === MODEL_FAST) {
        console.log(`[Webhook] 🔄 Haiku errou DAX na iteração ${iteration}, escalando para Sonnet...`);
        currentModel = MODEL_SMART;
        escalatedToSmart = true;

        const messagesWithError = [
          ...conversationHistory,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults }
        ];

        try {
          response = await callClaude({
            model: currentModel,
            max_tokens: 1024,
            system: systemPrompt,
            messages: messagesWithError,
            tools
          });
          console.log(`[Webhook] Claude (${currentModel}) resposta após escalação | Tempo: ${Date.now() - startTime} ms`);
          continue;
        } catch (smartError: any) {
          console.error(`[Webhook] Sonnet também falhou:`, smartError.message?.substring(0, 200));
        }
      }

      const messagesForNextIteration = [
        ...conversationHistory,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ];

      try {
        response = await callClaude({
          model: currentModel,
          max_tokens: 1024,
          system: systemPrompt,
          messages: messagesForNextIteration,
          tools
        });
        console.log(`[Webhook] Claude (${currentModel}) resposta iteração ${iteration} | Tempo: ${Date.now() - startTime} ms`);
      } catch (iterError: any) {
        console.error(`[Webhook] Erro na iteração ${iteration}:`, iterError.message?.substring(0, 200));
        break;
      }
    }

    console.log(`[Webhook] Modelo final: ${currentModel} | Escalou: ${escalatedToSmart} | Iterações: ${iteration}`);

    // ========== EXTRAIR RESPOSTA ==========
    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    // Se a resposta está vazia, considerar como falha
    const isEmptyResponse = !assistantMessage.trim();
    
    if (isEmptyResponse) {
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
      // Resposta vazia também é considerada falha
      console.log('[Webhook] ⚠️ Resposta vazia detectada, será salva como pendente');
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

    // Verificar se foi falha (incluindo resposta vazia)
    // IMPORTANTE: Verificar DEPOIS de preencher a resposta vazia
    const isEvasiveResponse = isFailureResponse(assistantMessage) || isEmptyResponse;
    const failureReason = identifyFailureReason(assistantMessage, !!daxError);
    
    // Debug: Log da resposta para verificar detecção
    console.log('[Webhook] DEBUG - Verificando resposta:', {
      length: assistantMessage.length,
      preview: assistantMessage.substring(0, 100),
      isEmpty: isEmptyResponse,
      isEvasive: isFailureResponse(assistantMessage),
      hasDaxError: !!daxError,
      failureReason
    });
    
    // Construir mensagem de erro completa
    let errorMessage = '';
    if (daxError) {
      errorMessage = `Erro DAX: ${daxError}`;
    } else if (isEmptyResponse) {
      errorMessage = 'Resposta vazia da IA';
    } else if (isEvasiveResponse) {
      errorMessage = `Resposta evasiva: ${assistantMessage.substring(0, 200)}`;
    }

    if (isEvasiveResponse || daxError || isEmptyResponse) {
      console.log('[Webhook] 🔴 Resposta evasiva/falha detectada, salvando pergunta pendente...');
      console.log('[Webhook] Razão da falha:', failureReason);
      console.log('[Webhook] DEBUG - Resposta:', assistantMessage.substring(0, 100));
      console.log('[Webhook] DEBUG - É evasiva?', isEvasiveResponse);
      
      // Buscar company_group_id do dataset ativo (não do authorizedNumber)
      let companyGroupId = authorizedNumber.company_group_id; // Fallback
      
      if (datasetId && phone) {
        try {
          const { data: datasetInfo } = await supabase
            .from('whatsapp_available_datasets')
            .select('company_group_id')
            .eq('dataset_id', datasetId)
            .eq('phone_number', phone)
            .maybeSingle();
          
          if (datasetInfo?.company_group_id) {
            companyGroupId = datasetInfo.company_group_id;
            console.log('[Webhook] ✅ company_group_id do dataset:', companyGroupId);
          } else {
            console.log('[Webhook] ⚠️ Não encontrou company_group_id no dataset, usando do authorizedNumber:', companyGroupId);
          }
        } catch (err: any) {
          console.error('[Webhook] Erro ao buscar company_group_id do dataset:', err.message);
        }
      }
      
      console.log('[Webhook] DEBUG - Context:', {
        group_authorized: authorizedNumber?.company_group_id,
        group_dataset: companyGroupId,
        dataset: datasetId,
        connection: connectionId,
        phone: phone,
        question: processedMessage.substring(0, 50)
      });
      
      try {
        // Salvar em ai_unanswered_questions
        // Verificar se já existe pergunta similar pendente (busca mais flexível)
        const { data: existingQuestion } = await supabase
          .from('ai_unanswered_questions')
          .select('id, user_count, attempt_count, phone_number')
          .eq('company_group_id', companyGroupId) // ✅ Usar do dataset ativo!
          .ilike('user_question', `%${processedMessage.substring(0, 50)}%`) // Busca parcial
          .eq('status', 'pending')
          .maybeSingle();

        if (existingQuestion) {
          // Verificar se é o mesmo usuário ou diferente
          const isSameUser = existingQuestion.phone_number === phone;
          const newUserCount = isSameUser 
            ? existingQuestion.user_count 
            : (existingQuestion.user_count || 1) + 1;
          
          // Atualizar pergunta existente
          const { error: updateError } = await supabase
            .from('ai_unanswered_questions')
            .update({
              attempt_count: (existingQuestion.attempt_count || 0) + 1,
              user_count: newUserCount,
              last_asked_at: new Date().toISOString(),
              error_message: errorMessage || 'Resposta evasiva da IA',
              updated_at: new Date().toISOString()
            })
            .eq('id', existingQuestion.id);
          
          if (updateError) {
            console.error('[Webhook] Erro ao atualizar pergunta em ai_unanswered_questions:', updateError.message);
          } else {
            console.log('[Webhook] ✅ Pergunta atualizada em ai_unanswered_questions:', existingQuestion.id, `| Tentativas: ${(existingQuestion.attempt_count || 0) + 1}`);
          }
        } else {
          // Criar nova pergunta pendente
          const { data: newQuestion, error: insertError } = await supabase
            .from('ai_unanswered_questions')
            .insert({
              company_group_id: companyGroupId,
              connection_id: connectionId || null,
              dataset_id: datasetId || null,
              user_question: processedMessage,
              phone_number: phone,
              attempted_dax: null, // Pode ser preenchido depois se tiver
              error_message: errorMessage || 'Resposta evasiva da IA',
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
            console.error('[Webhook] Erro ao criar pergunta em ai_unanswered_questions:', insertError.message, insertError.details);
          } else {
            console.log('[Webhook] ✅ Nova pergunta criada em ai_unanswered_questions:', newQuestion?.id, '| Pergunta:', processedMessage.substring(0, 50));
          }
        }
      } catch (saveError: any) {
        console.error('[Webhook] ❌ Erro ao salvar pergunta pendente:', saveError.message);
        console.error('[Webhook] Stack:', saveError.stack);
      }
    } else {
      console.log('[Webhook] ✅ Resposta OK, não é evasiva. Não salvando como pendente.');
    }
    // ========== FIM - DETECTAR E SALVAR PERGUNTAS NÃO RESPONDIDAS ==========

    // ========== ENVIAR RESPOSTA ==========
    let sent = false;
    
    // Remover rodapé duplicado se já existir na mensagem
    const footerPattern = /─────────────[\s\S]*?📊.*?\|.*?_trocar_/;
    const cleanAssistantMessage = assistantMessage.replace(footerPattern, '').trim();
    
    // Adicionar footer APENAS se a resposta não já contém o nome do dataset
    const datasetLabel = datasetName || '';
    const alreadyHasFooter = cleanAssistantMessage.includes(datasetLabel) && cleanAssistantMessage.includes('━━━');
    const footer = alreadyHasFooter ? '' : generateFooter(datasetLabel);
    const messageWithFooter = cleanAssistantMessage + footer;
    
    console.log('[Webhook] Enviando resposta - respondWithAudio:', respondWithAudio, '| Mensagem length:', messageWithFooter.length);
    
    if (respondWithAudio) {
      console.log('[Webhook] 🎤 Gerando áudio com OpenAI TTS...');
      try {
        const audioBase64 = await generateAudio(cleanAssistantMessage);
        if (audioBase64) {
          console.log('[Webhook] ✅ Áudio gerado (', audioBase64.length, 'bytes), enviando via WhatsApp...');
          sent = await sendWhatsAppAudio(instance, phone, audioBase64);
          console.log('[Webhook] Áudio enviado?', sent);
          if (!sent) {
            console.log('[Webhook] ⚠️ Falha ao enviar áudio, enviando como texto...');
            sent = await sendWhatsAppMessage(instance, phone, messageWithFooter);
          }
          // NÃO enviar footer separado após áudio — fica poluído
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
      // Para áudio, salvar mensagem sem rodapé (rodapé foi enviado separadamente)
      const messageToSave = respondWithAudio 
        ? `🔊 ${cleanAssistantMessage}\n\n${footer}` 
        : messageWithFooter;
      
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: messageToSave,
        direction: 'outgoing',
        sender_name: 'Assistente IA',
        instance_id: instance.id
      });

      try {
        await logActivity({
          companyGroupId: authorizedNumber.company_group_id,
          actionType: 'execute',
          module: 'whatsapp',
          description: 'Mensagem IA processada via WhatsApp',
          metadata: { phone, model: currentModel, escalated: escalatedToSmart },
        });
      } catch (_) {}

      try {
        await supabase.rpc('increment_daily_usage', {
          p_group_id: authorizedNumber.company_group_id,
          p_whatsapp: 1,
          p_tokens_in: 0,
          p_tokens_out: 0,
        });
      } catch (_) {}
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
