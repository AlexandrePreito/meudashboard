import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt, formatTrainingExamples, formatConversationHistory } from '@/lib/ai/system-prompt';
import { getModelContext, getTrainingExamples, getConversationHistory } from '@/lib/ai/prompt-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('=== WEBHOOK MESSAGES-UPSERT CHAMADO ===');
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient();
    const body = await request.json();
    console.log('Body recebido:', JSON.stringify(body, null, 2));

    // Extrair dados da mensagem
    const data = body?.data;
    const remoteJid = data?.key?.remoteJid;
    const fromMe = data?.key?.fromMe;
    const messageText = data?.message?.conversation || 
                       data?.message?.extendedTextMessage?.text;

    // Ignorar mensagens próprias ou sem texto
    if (fromMe || !messageText || !remoteJid) {
      return NextResponse.json({ status: 'ignored' });
    }

    // Extrair número de telefone
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const isGroup = remoteJid.includes('@g.us');

    // Verificar autorização
    const authQuery = isGroup
      ? supabase
          .from('whatsapp_authorized_groups')
          .select('*, company_group_id')
          .eq('group_id', remoteJid)
          .eq('is_active', true)
      : supabase
          .from('whatsapp_authorized_numbers')
          .select('*, company_group_id')
          .eq('phone_number', phone)
          .eq('is_active', true);

    const { data: authorized } = await authQuery.maybeSingle();

    if (!authorized) {
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized' });
    }

    // Verificar permissão de chat
    if (!isGroup && !authorized.can_use_chat) {
      return NextResponse.json({ status: 'ignored', reason: 'chat_disabled' });
    }

    const companyGroupId = authorized.company_group_id;

    // Salvar mensagem recebida
    await supabase.from('whatsapp_messages').insert({
      company_group_id: companyGroupId,
      phone_number: phone,
      message_content: messageText,
      direction: 'incoming',
      sender_name: data?.pushName || phone
    });

    // Buscar conexão Power BI ativa
    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('id, dataset_id')
      .eq('company_group_id', companyGroupId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!connection) {
      const errorMsg = '⚠️ Nenhuma conexão Power BI configurada. Entre em contato com o administrador.';
      await sendWhatsAppMessage(remoteJid, errorMsg);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: companyGroupId,
        phone_number: phone,
        message_content: errorMsg,
        direction: 'outgoing'
      });
      return NextResponse.json({ status: 'error', message: 'no_connection' });
    }

    // Buscar contexto do modelo
    const modelContext = await getModelContext(
      companyGroupId,
      connection.id,
      connection.dataset_id
    );

    // Buscar exemplos de treinamento
    const examples = await getTrainingExamples(
      companyGroupId,
      connection.id,
      connection.dataset_id,
      20
    );

    const trainingExamples = formatTrainingExamples(examples);

    // Buscar histórico de conversa
    const history = await getConversationHistory(
      companyGroupId,
      phone,
      10
    );

    const conversationHistory = formatConversationHistory(history);

    // Montar prompt usando o sistema genérico
    const systemPrompt = buildSystemPrompt({
      modelContext: modelContext || '',
      trainingExamples,
      conversationHistory
    });

    // Chamar Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    let assistantMessage = '';
    let daxQuery = '';
    let hadError = false;
    let errorMessage = '';

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: messageText
          }
        ],
        tools: [
          {
            name: 'execute_dax',
            description: 'Executa uma query DAX no Power BI para buscar dados.',
            input_schema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'A query DAX a ser executada'
                }
              },
              required: ['query']
            }
          }
        ]
      });

      // Extrair resposta
      for (const block of response.content) {
        if (block.type === 'text') {
          assistantMessage += block.text;
        } else if (block.type === 'tool_use' && block.name === 'execute_dax') {
          daxQuery = (block.input as any).query || '';
        }
      }

      // Se a resposta ficou muito curta ou vazia, considerar como erro
      if (assistantMessage.length < 20) {
        hadError = true;
        errorMessage = 'Resposta muito curta ou vazia';
        assistantMessage = '⚠️ Não consegui processar essa consulta. Pode reformular a pergunta?';
      }

    } catch (error: any) {
      hadError = true;
      errorMessage = error.message || 'Erro ao processar com Claude';
      assistantMessage = '⚠️ Ocorreu um erro ao processar sua pergunta. Tente novamente em instantes.';
    }

    // Limpar resposta (remover DAX, XML, etc)
    const cleanResponse = assistantMessage
      .replace(/```dax[\s\S]*?```/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<execute_dax>[\s\S]*?<\/execute_dax>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/EVALUATE[\s\S]*?(?=\n\n|\n📊|$)/gi, '')
      .replace(/DAX\([^)]+\)/gi, '')
      .replace(/Error:.*?(?=\n|$)/gi, '')
      .trim();

    // Padrões evasivos que indicam que a IA não conseguiu responder
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
      'informação não disponível'
    ];

    // Verificar se a resposta contém algum padrão evasivo (case-insensitive)
    const cleanResponseLower = cleanResponse.toLowerCase();
    const isEvasiveResponse = evasivePatterns.some(pattern => 
      cleanResponseLower.includes(pattern.toLowerCase())
    );

    // Se a resposta for evasiva, atualizar hadError e errorMessage
    if (isEvasiveResponse && !hadError) {
      hadError = true;
      errorMessage = 'Resposta evasiva da IA - não conseguiu encontrar os dados';
    }

    // Se houve erro OU a resposta é muito curta OU é evasiva, registrar como pergunta não respondida
    if (hadError || cleanResponse.length < 20 || isEvasiveResponse) {
      // Verificar se já existe pergunta similar pendente
      const { data: existingQuestion } = await supabaseAdmin
        .from('ai_unanswered_questions')
        .select('id, user_count, attempt_count')
        .eq('company_group_id', companyGroupId)
        .eq('user_question', messageText)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingQuestion) {
        // Atualizar pergunta existente
        await supabaseAdmin
          .from('ai_unanswered_questions')
          .update({
            attempt_count: existingQuestion.attempt_count + 1,
            user_count: existingQuestion.user_count + 1,
            last_asked_at: new Date().toISOString(),
            attempted_dax: daxQuery || null,
            error_message: errorMessage || 'Resposta evasiva da IA'
          })
          .eq('id', existingQuestion.id);
      } else {
        // Criar nova pergunta pendente
        await supabaseAdmin
          .from('ai_unanswered_questions')
          .insert({
            company_group_id: companyGroupId,
            connection_id: connection.id,
            dataset_id: connection.dataset_id,
            user_question: messageText,
            phone_number: phone,
            attempted_dax: daxQuery || null,
            error_message: errorMessage || (isEvasiveResponse ? 'Resposta evasiva da IA' : null),
            status: 'pending'
          });
      }
    } else {
      // Se respondeu com sucesso, atualizar last_used_at dos exemplos similares
      if (examples.length > 0) {
        const exampleIds = examples.slice(0, 3).map(e => e.id);
        await supabase
          .from('ai_training_examples')
          .update({ last_used_at: new Date().toISOString() })
          .in('id', exampleIds);
      }
    }

    // Enviar resposta ao usuário
    await sendWhatsAppMessage(remoteJid, cleanResponse);

    // Salvar resposta no banco
    await supabase.from('whatsapp_messages').insert({
      company_group_id: companyGroupId,
      phone_number: phone,
      message_content: cleanResponse,
      direction: 'outgoing'
    });

    // Atualizar estatísticas do dia
    await updateDailyStats(supabase, companyGroupId, !hadError);

    return NextResponse.json({ 
      status: 'success',
      message: 'Mensagem processada'
    });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
}

// Helper: Enviar mensagem WhatsApp
async function sendWhatsAppMessage(remoteJid: string, message: string) {
  const supabase = await createClient();

  // Buscar instância ativa
  const { data: instance } = await supabase
    .from('whatsapp_instances')
    .select('instance_name, api_url, api_key_encrypted')
    .eq('is_connected', true)
    .limit(1)
    .maybeSingle();

  if (!instance) {
    throw new Error('Nenhuma instância WhatsApp conectada');
  }

  const number = remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');

  const response = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': instance.api_key_encrypted
    },
    body: JSON.stringify({
      number: remoteJid,
      text: message
    })
  });

  if (!response.ok) {
    throw new Error('Erro ao enviar mensagem WhatsApp');
  }

  return response.json();
}

// Helper: Atualizar estatísticas diárias
async function updateDailyStats(
  supabase: any,
  companyGroupId: string,
  wasSuccessful: boolean
) {
  const today = new Date().toISOString().split('T')[0];

  const { data: existing } = await supabase
    .from('ai_assistant_stats')
    .select('*')
    .eq('company_group_id', companyGroupId)
    .eq('stat_date', today)
    .maybeSingle();

  if (existing) {
    const questions_asked = existing.questions_asked + 1;
    const questions_answered = wasSuccessful ? existing.questions_answered + 1 : existing.questions_answered;
    const questions_failed = !wasSuccessful ? existing.questions_failed + 1 : existing.questions_failed;
    const success_rate = questions_asked > 0 ? (questions_answered / questions_asked) * 100 : 0;

    await supabase
      .from('ai_assistant_stats')
      .update({
        questions_asked,
        questions_answered,
        questions_failed,
        success_rate
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('ai_assistant_stats')
      .insert({
        company_group_id: companyGroupId,
        stat_date: today,
        questions_asked: 1,
        questions_answered: wasSuccessful ? 1 : 0,
        questions_failed: wasSuccessful ? 0 : 1,
        success_rate: wasSuccessful ? 100 : 0
      });
  }
}

export const GET = () => new Response('Webhook OK', { status: 200 });
