/**
 * API Route - Processar Fila de Mensagens WhatsApp
 * Processa mensagens pendentes da fila com retry automático
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
// Importar funções do webhook principal
// Note: Estas funções precisam ser exportadas do route.ts
import { 
  getInstanceForAuthorizedNumber, 
  sendWhatsAppMessage, 
  sendWhatsAppAudio,
  generateAudio,
  executeDaxQuery, 
  identifyQuestionIntent, 
  getWorkingQueries, 
  saveQueryResult 
} from '../route';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Função de retry para Claude (mesma do webhook principal)
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
      
      const waitTime = Math.min(2000 * Math.pow(2, attempt - 1), 20000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  
  try {
    // Buscar mensagens pendentes prontas para processar (até 10 por vez)
    const now = new Date().toISOString();
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('whatsapp_message_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('next_retry_at', now)
      .order('created_at', { ascending: true })
      .limit(10);
    
    // Filtrar mensagens que ainda não excederam max_attempts (filtro manual)
    const validMessages = pendingMessages?.filter(msg => 
      msg.attempt_count < msg.max_attempts
    ) || [];
    
    if (fetchError) {
      console.error('[Queue] Erro ao buscar mensagens:', fetchError);
      return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
    }
    
    if (!validMessages || validMessages.length === 0) {
      return NextResponse.json({ processed: 0, message: 'Nenhuma mensagem pendente' });
    }
    
    console.log(`[Queue] Processando ${validMessages.length} mensagens...`);
    
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    
    for (const queueItem of validMessages) {
      try {
        // Marcar como processando
        await supabase
          .from('whatsapp_message_queue')
          .update({ 
            status: 'processing',
            attempt_count: queueItem.attempt_count + 1
          })
          .eq('id', queueItem.id);
        
        // Buscar instância e número autorizado
        const { data: authorizedNumber } = await supabase
          .from('whatsapp_authorized_numbers')
          .select('*')
          .eq('phone_number', queueItem.phone_number)
          .eq('company_group_id', queueItem.company_group_id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (!authorizedNumber) {
          throw new Error('Número autorizado não encontrado');
        }
        
        const instance = await getInstanceForAuthorizedNumber(authorizedNumber, supabase);
        if (!instance) {
          throw new Error('Instância não encontrada');
        }
        
        // Buscar contexto e queries que funcionaram
        const questionIntent = identifyQuestionIntent(queueItem.message_content);
        let learningContext = '';
        
        if (queueItem.dataset_id) {
          const workingQueries = await getWorkingQueries(supabase, queueItem.dataset_id, questionIntent);
          if (workingQueries.length > 0) {
            learningContext = `\n\n# QUERIES QUE FUNCIONARAM PARA PERGUNTAS SIMILARES\nUse estas queries como referência:\n${workingQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n`;
          }
        }
        
        const systemPrompt = (queueItem.system_prompt || '') + learningContext;
        
        // Extrair conversation_history e metadata
        let conversationHistory: any[] = [];
        let respondWithAudio = false;
        
        if (queueItem.conversation_history) {
          if (Array.isArray(queueItem.conversation_history)) {
            // Formato antigo (array direto)
            conversationHistory = queueItem.conversation_history;
          } else if (queueItem.conversation_history.messages) {
            // Formato novo (com metadata)
            conversationHistory = queueItem.conversation_history.messages;
            respondWithAudio = queueItem.conversation_history.metadata?.respond_with_audio || false;
          }
        }
        
        // Chamar Claude
        const tools: Anthropic.Tool[] = queueItem.connection_id && queueItem.dataset_id ? [
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
        ] : [];
        
        let response = await callClaudeWithRetry({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: conversationHistory,
          tools: tools.length > 0 ? tools : undefined
        });
        
        // Processar tool calls se houver
        const messages: any[] = [...conversationHistory];
        
        if (response.stop_reason === 'tool_use' && queueItem.connection_id && queueItem.dataset_id) {
          const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
          const toolResults: any[] = [];
          
          for (const toolUse of toolUseBlocks) {
            if (toolUse.type === 'tool_use' && toolUse.name === 'execute_dax') {
              const toolInput = toolUse.input as { query?: string };
              if (toolInput.query) {
                const daxResult = await executeDaxQuery(
                  queueItem.connection_id,
                  queueItem.dataset_id,
                  toolInput.query,
                  supabase
                );
                
                // Salvar resultado para aprendizado
                await saveQueryResult(
                  supabase,
                  queueItem.dataset_id,
                  queueItem.company_group_id,
                  queueItem.message_content,
                  questionIntent,
                  toolInput.query,
                  daxResult.success,
                  daxResult.error
                );
                
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolUse.id,
                  content: daxResult.success
                    ? JSON.stringify(daxResult.results?.slice(0, 20), null, 2)
                    : `Erro: ${daxResult.error}`
                });
              }
            }
          }
          
          if (toolResults.length > 0) {
            messages.push({ role: 'assistant', content: response.content });
            messages.push({ role: 'user', content: toolResults });
            
            response = await callClaudeWithRetry({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              system: systemPrompt,
              messages,
              tools: tools.length > 0 ? tools : undefined
            });
          }
        }
        
        // Extrair resposta
        let assistantMessage = '';
        for (const block of response.content) {
          if (block.type === 'text') {
            assistantMessage += block.text;
          }
        }
        
        if (!assistantMessage.trim()) {
          assistantMessage = 'Desculpe, não consegui processar sua solicitação. Por favor, tente novamente.';
        }
        
        // Enviar mensagem (com suporte a áudio)
        let sent = false;
        
        console.log(`[Queue] Processando mensagem ${queueItem.id} - respondWithAudio: ${respondWithAudio}`);
        
        if (respondWithAudio) {
          // Tentar enviar como áudio
          console.log('[Queue] Gerando áudio para resposta...');
          try {
            const audioBase64 = await generateAudio(assistantMessage);
            if (audioBase64) {
              console.log('[Queue] Áudio gerado, enviando...');
              sent = await sendWhatsAppAudio(instance, queueItem.phone_number, audioBase64);
              console.log('[Queue] Áudio enviado?', sent);
            } else {
              console.log('[Queue] ❌ Falha ao gerar áudio');
            }
          } catch (audioError: any) {
            console.error('[Queue] Erro ao gerar/enviar áudio:', audioError.message);
          }
        }
        
        // Se não enviou como áudio, enviar como texto
        if (!sent) {
          console.log('[Queue] Enviando como texto...');
          sent = await sendWhatsAppMessage(instance, queueItem.phone_number, assistantMessage);
        }
        
        if (sent) {
          // Salvar mensagem no banco
          await supabase.from('whatsapp_messages').insert({
            company_group_id: queueItem.company_group_id,
            phone_number: queueItem.phone_number,
            message_content: respondWithAudio ? `🔊 ${assistantMessage}` : assistantMessage,
            direction: 'outgoing',
            sender_name: 'Assistente IA',
            instance_id: instance.id
          });
          
          // Marcar como concluído
          await supabase
            .from('whatsapp_message_queue')
            .update({ status: 'completed' })
            .eq('id', queueItem.id);
          
          succeeded++;
          console.log(`[Queue] Mensagem ${queueItem.id} processada com sucesso`);
        } else {
          throw new Error('Falha ao enviar mensagem WhatsApp');
        }
        
      } catch (error: any) {
        console.error(`[Queue] Erro ao processar mensagem ${queueItem.id}:`, error.message);
        
        // Calcular próximo retry com backoff exponencial
        const nextAttempt = queueItem.attempt_count + 1;
        const backoffSeconds = Math.min(5 * Math.pow(2, nextAttempt - 1), 300); // Max 5 minutos
        const nextRetryAt = new Date(Date.now() + backoffSeconds * 1000).toISOString();
        
        if (nextAttempt >= queueItem.max_attempts) {
          // Esgotou tentativas - marcar como falhado
          await supabase
            .from('whatsapp_message_queue')
            .update({ 
              status: 'failed',
              error_message: error.message?.substring(0, 500)
            })
            .eq('id', queueItem.id);
          
          // Enviar mensagem de erro final
          try {
            const { data: authorizedNumber } = await supabase
              .from('whatsapp_authorized_numbers')
              .select('*')
              .eq('phone_number', queueItem.phone_number)
              .eq('company_group_id', queueItem.company_group_id)
              .maybeSingle();
            
            if (authorizedNumber) {
              const instance = await getInstanceForAuthorizedNumber(authorizedNumber, supabase);
              if (instance) {
                const userName = authorizedNumber.name?.split(' ')[0] || '';
                const errorMsg = `Desculpe ${userName}, ainda estou com dificuldades técnicas. 🔧\n\nPor favor, tente novamente em alguns minutos. Se persistir, entre em contato com o suporte.`;
                await sendWhatsAppMessage(instance, queueItem.phone_number, errorMsg);
                await supabase.from('whatsapp_messages').insert({
                  company_group_id: queueItem.company_group_id,
                  phone_number: queueItem.phone_number,
                  message_content: errorMsg,
                  direction: 'outgoing',
                  sender_name: 'Assistente IA',
                  instance_id: instance.id
                });
              }
            }
          } catch (notifyError) {
            console.error('[Queue] Erro ao notificar usuário:', notifyError);
          }
          
          failed++;
        } else {
          // Reagendar para retry
          await supabase
            .from('whatsapp_message_queue')
            .update({ 
              status: 'pending',
              next_retry_at: nextRetryAt,
              error_message: error.message?.substring(0, 500)
            })
            .eq('id', queueItem.id);
        }
      }
      
      processed++;
    }
    
    return NextResponse.json({
      processed,
      succeeded,
      failed,
      message: `Processadas ${processed} mensagens: ${succeeded} sucesso, ${failed} falhas`
    });
    
  } catch (error: any) {
    console.error('[Queue] Erro geral:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'Use POST para processar a fila' });
}
