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

// Palavras que indicam análise complexa
const COMPLEX_KEYWORDS = [
  'analis', 'análise', 'analise', 'comparar', 'comparativo', 'comparação',
  'tendência', 'tendencia', 'evolução', 'evolucao', 'por que', 'porque',
  'motivo', 'explicar', 'explicação', 'detalhar', 'detalhado', 'profundo',
  'investigar', 'diagnosticar', 'diagnóstico', 'problema', 'queda',
  'crescimento', 'variação', 'variacao', 'diferença', 'diferenca',
  'histórico', 'historico', 'período', 'periodo', 'trimestre', 'semestre',
  'ano todo', 'últimos meses', 'ultimos meses', 'correlação', 'correlacao',
  'impacto', 'causa', 'efeito', 'projeção', 'projecao', 'previsão', 'previsao'
];

// Função para detectar se é análise complexa
function isComplexAnalysis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return COMPLEX_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

// Função para estimar tempo de análise
function estimateAnalysisTime(message: string): number {
  const lowerMessage = message.toLowerCase();
  let complexity = 0;
  
  COMPLEX_KEYWORDS.forEach(keyword => {
    if (lowerMessage.includes(keyword)) complexity++;
  });
  
  if (lowerMessage.includes('vs') || lowerMessage.includes('versus')) complexity += 2;
  if (/\d{4}/.test(message)) complexity++;
  if (lowerMessage.includes('todos') || lowerMessage.includes('cada')) complexity += 2;
  
  if (complexity >= 5) return 3;
  if (complexity >= 3) return 2;
  if (complexity >= 1) return 1;
  return 0;
}

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
      return context.context_content.slice(0, 15000);
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

// Função para enviar mensagem de texto via WhatsApp
async function sendWhatsAppMessage(instance: any, phone: string, message: string) {
  try {
    const url = `${instance.api_url}/message/sendText/${instance.instance_name}`;
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
    return response.ok;
  } catch (error) {
    console.error('[sendWhatsAppMessage] Erro:', error);
    return false;
  }
}

// Função para enviar áudio via WhatsApp
async function sendWhatsAppAudio(instance: any, phone: string, audioBase64: string) {
  try {
    const url = `${instance.api_url}/message/sendWhatsAppAudio/${instance.instance_name}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key || ''
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        audio: audioBase64
      })
    });
    
    if (!response.ok) {
      const url2 = `${instance.api_url}/message/sendMedia/${instance.instance_name}`;
      const response2 = await fetch(url2, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': instance.api_key || ''
        },
        body: JSON.stringify({
          number: phone.replace(/\D/g, ''),
          mediatype: 'audio',
          media: `data:audio/mp3;base64,${audioBase64}`,
          fileName: 'audio.mp3'
        })
      });
      return response2.ok;
    }
    return true;
  } catch (error) {
    console.error('[sendWhatsAppAudio] Erro:', error);
    return false;
  }
}

// Função para transcrever áudio com Whisper
async function transcribeAudio(audioUrl: string): Promise<string | null> {
  try {
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      console.error('[transcribeAudio] Erro ao baixar áudio:', audioResponse.status);
      return null;
    }
    
    const audioBuffer = await audioResponse.arrayBuffer();
    
    // WhatsApp envia áudio em formato OGG/OPUS
    // Whisper aceita: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
    const file = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });
    
    // Usar FormData para envio correto
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[transcribeAudio] Erro da OpenAI:', errorText);
      return null;
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('[transcribeAudio] Erro:', error);
    return null;
  }
}

// Função para gerar áudio com TTS
async function generateAudio(text: string): Promise<string | null> {
  try {
    const limitedText = text.slice(0, 4000);
    
    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: 'nova',
      input: limitedText,
      response_format: 'mp3'
    });
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('[generateAudio] Erro:', error);
    return null;
  }
}

// Função para verificar/obter contexto do usuário
async function getUserContext(supabase: any, phone: string) {
  const { data: context } = await supabase
    .from('whatsapp_user_context')
    .select('*')
    .eq('phone_number', phone)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();
  
  return context;
}

// Função para salvar contexto do usuário
async function saveUserContext(supabase: any, phone: string, datasetId: string, connectionId: string, datasetName: string, companyGroupId: string) {
  const expiresAt = new Date();
  expiresAt.setHours(23, 59, 59, 999);
  
  await supabase
    .from('whatsapp_user_context')
    .upsert({
      phone_number: phone,
      dataset_id: datasetId,
      connection_id: connectionId,
      dataset_name: datasetName,
      company_group_id: companyGroupId,
      selected_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'phone_number' });
}

// Função para limpar contexto do usuário
async function clearUserContext(supabase: any, phone: string) {
  await supabase
    .from('whatsapp_user_context')
    .delete()
    .eq('phone_number', phone);
}

// POST - Webhook do Evolution API
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Webhook recebido:', JSON.stringify(body).substring(0, 500));

    const supabase = createAdminClient();
    const event = body.event;
    const data = body.data;

    if (event !== 'messages.upsert') {
      return NextResponse.json({ status: 'ignored', reason: 'not a message event' });
    }

    const remoteJid = data?.key?.remoteJid;
    const fromMe = data?.key?.fromMe || false;
    
    const isAudioMessage = !!(data?.message?.audioMessage);
    const messageText = data?.message?.conversation ||
                        data?.message?.extendedTextMessage?.text ||
                        '';
    const audioUrl = data?.message?.audioMessage?.url || null;

    if (fromMe) {
      return NextResponse.json({ status: 'ignored', reason: 'fromMe' });
    }

    if (!messageText.trim() && !isAudioMessage) {
      return NextResponse.json({ status: 'ignored', reason: 'empty or unsupported' });
    }

    const phone = remoteJid?.replace('@s.whatsapp.net', '').replace('@g.us', '') || '';

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

    if (authError || !authorizedNumber || !authorizedNumber.instance) {
      console.log('Número não autorizado ou sem instância:', phone);
      return NextResponse.json({ status: 'ignored', reason: 'unauthorized' });
    }

    const instance = authorizedNumber.instance;
    let finalMessageText = messageText;
    let respondWithAudio = false;

    if (isAudioMessage && audioUrl) {
      console.log('🎤 Áudio recebido, transcrevendo...');
      const transcription = await transcribeAudio(audioUrl as string);
      if (transcription) {
        finalMessageText = transcription;
        respondWithAudio = true;
        console.log('✅ Transcrição:', transcription);
      } else {
        await sendWhatsAppMessage(instance, phone, '❌ Não consegui entender o áudio. Pode tentar novamente ou digitar sua pergunta?');
        return NextResponse.json({ status: 'audio_transcription_failed' });
      }
    }

    await supabase.from('whatsapp_messages').insert({
      company_group_id: authorizedNumber.company_group_id,
      phone_number: phone,
      message_content: isAudioMessage ? `🎤 [Áudio]: ${finalMessageText}` : finalMessageText,
      direction: 'incoming',
      sender_name: authorizedNumber.name || phone
    });

    const trimmedMessage = finalMessageText.trim().toLowerCase();
    if (['0', 'menu', 'sair', 'trocar'].includes(trimmedMessage)) {
      await clearUserContext(supabase, phone);
      
      const { data: numberDatasets } = await supabase
        .from('whatsapp_number_datasets')
        .select('connection_id, dataset_id, dataset_name')
        .eq('authorized_number_id', authorizedNumber.id);

      if (!numberDatasets || numberDatasets.length === 0) {
        await sendWhatsAppMessage(instance, phone, '📊 Você não tem dashboards configurados.');
        return NextResponse.json({ status: 'no_datasets' });
      }

      if (numberDatasets.length === 1) {
        await saveUserContext(supabase, phone, numberDatasets[0].dataset_id, numberDatasets[0].connection_id, numberDatasets[0].dataset_name, authorizedNumber.company_group_id);
        await sendWhatsAppMessage(instance, phone, `✅ Você está no dashboard: ${numberDatasets[0].dataset_name}\n\nPode fazer suas perguntas!`);
        return NextResponse.json({ status: 'single_dataset_selected' });
      }

      let menuMessage = '📊 *Selecione o dashboard:*\n\n';
      const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
      numberDatasets.forEach((ds, idx) => {
        menuMessage += `${emojis[idx] || `${idx + 1}.`} ${ds.dataset_name || 'Dashboard'}\n`;
      });
      menuMessage += '\n_Digite o número para selecionar._\n_Digite "0" ou "menu" para trocar._';

      await sendWhatsAppMessage(instance, phone, menuMessage);
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: menuMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA'
      });

      return NextResponse.json({ status: 'menu_shown' });
    }

    let userContext = await getUserContext(supabase, phone);
    
    const { data: numberDatasets } = await supabase
      .from('whatsapp_number_datasets')
      .select('connection_id, dataset_id, dataset_name')
      .eq('authorized_number_id', authorizedNumber.id);

    let connectionId: string | null = userContext?.connection_id || null;
    let datasetId: string | null = userContext?.dataset_id || null;
    let datasetName: string | null = userContext?.dataset_name || null;

    if (!userContext) {
      if (!numberDatasets || numberDatasets.length === 0) {
        const { data: firstConnection } = await supabase
          .from('powerbi_connections')
          .select('id')
          .limit(1)
          .maybeSingle();
        
        if (firstConnection) {
          connectionId = firstConnection.id;
          const { data: report } = await supabase
            .from('powerbi_reports')
            .select('dataset_id')
            .eq('connection_id', connectionId)
            .limit(1)
            .maybeSingle();
          datasetId = report?.dataset_id || null;
        }
      } else if (numberDatasets.length === 1) {
        connectionId = numberDatasets[0].connection_id;
        datasetId = numberDatasets[0].dataset_id;
        datasetName = numberDatasets[0].dataset_name;
        if (datasetId && connectionId && datasetName) {
          await saveUserContext(supabase, phone, datasetId, connectionId, datasetName, authorizedNumber.company_group_id);
        }
      } else {
        const isNumericSelection = /^[1-9]$/.test(trimmedMessage);
        
        if (isNumericSelection) {
          const selectedIndex = parseInt(trimmedMessage) - 1;
          if (selectedIndex >= 0 && selectedIndex < numberDatasets.length) {
            connectionId = numberDatasets[selectedIndex].connection_id;
            datasetId = numberDatasets[selectedIndex].dataset_id;
            datasetName = numberDatasets[selectedIndex].dataset_name;
            if (datasetId && connectionId && datasetName) {
              await saveUserContext(supabase, phone, datasetId, connectionId, datasetName, authorizedNumber.company_group_id);
            }
            
            const confirmMsg = `✅ *${datasetName}* selecionado!\n\nAgora pode fazer suas perguntas.\n_Digite "0" ou "menu" para trocar de dashboard._`;
            await sendWhatsAppMessage(instance, phone, confirmMsg);
            await supabase.from('whatsapp_messages').insert({
              company_group_id: authorizedNumber.company_group_id,
              phone_number: phone,
              message_content: confirmMsg,
              direction: 'outgoing',
              sender_name: 'Assistente IA'
            });
            return NextResponse.json({ status: 'dataset_selected' });
          }
        }

        let menuMessage = '📊 *Selecione o dashboard:*\n\n';
        const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣'];
        numberDatasets.forEach((ds, idx) => {
          menuMessage += `${emojis[idx] || `${idx + 1}.`} ${ds.dataset_name || 'Dashboard'}\n`;
        });
        menuMessage += '\n_Digite o número para selecionar._';

        await sendWhatsAppMessage(instance, phone, menuMessage);
        await supabase.from('whatsapp_messages').insert({
          company_group_id: authorizedNumber.company_group_id,
          phone_number: phone,
          message_content: menuMessage,
          direction: 'outgoing',
          sender_name: 'Assistente IA'
        });
        return NextResponse.json({ status: 'asking_dataset_selection' });
      }
    }

    const isComplex = isComplexAnalysis(finalMessageText);
    const estimatedMinutes = estimateAnalysisTime(finalMessageText);

    if (isComplex && estimatedMinutes > 0) {
      const waitMessages = [
        '🔍 Análise complexa detectada! Aguarde enquanto processo os dados...',
        '🧠 Estou analisando profundamente os dados. Isso pode levar alguns instantes...',
        '📊 Preparando uma análise detalhada para você. Um momento...'
      ];
      const waitMsg = waitMessages[Math.floor(Math.random() * waitMessages.length)];
      await sendWhatsAppMessage(instance, phone, waitMsg);
      console.log('⏳ Análise complexa detectada, estimativa:', estimatedMinutes, 'min');
    }

    let modelContext = '';
    if (connectionId) {
      const context = await getModelContext(supabase, connectionId);
      if (context) {
        modelContext = context;
      }
    }

    const historyLimit = isComplex ? 15 : 10;
    const { data: messageHistory } = await supabase
      .from('whatsapp_messages')
      .select('direction, message_content, created_at')
      .eq('phone_number', phone)
      .order('created_at', { ascending: false })
      .limit(historyLimit);

    let conversationContext = '';
    if (messageHistory && messageHistory.length > 0) {
      const reversedHistory = messageHistory.reverse();
      conversationContext = '\n## HISTÓRICO RECENTE DA CONVERSA\n';
      for (const msg of reversedHistory) {
        const role = msg.direction === 'incoming' ? 'Usuário' : 'Assistente';
        conversationContext += `${role}: ${msg.message_content}\n`;
      }
    }

    const systemPrompt = `Você é um Assistente de BI via WhatsApp, especializado em consultar e ANALISAR dados.

## REGRA DE CONFIDENCIALIDADE
⚠️ NUNCA mencione nomes de empresas, grupos ou sistemas internos.
⚠️ Se perguntarem quem é você, diga: "Sou um assistente de BI que ajuda a consultar dados."

## REGRA MAIS IMPORTANTE
⚠️ NUNCA invente valores! Use SEMPRE a função execute_dax para buscar dados reais.
⚠️ SEMPRE consulte a DOCUMENTAÇÃO DO MODELO para saber os nomes EXATOS das tabelas, colunas e medidas.

## INTERPRETAÇÃO DE NÚMEROS
Se o usuário digitar apenas "1", "2", "3" ou "4", verifique no HISTÓRICO qual foi a última pergunta e quais opções foram oferecidas. O número corresponde à opção sugerida anteriormente.

${isComplex ? `
## MODO ANÁLISE PROFUNDA ATIVADO
O usuário pediu uma análise complexa. Você deve:
1. Executar MÚLTIPLAS queries DAX para coletar dados de diferentes ângulos
2. Comparar períodos diferentes se relevante
3. Identificar padrões, tendências e anomalias
4. Fornecer insights acionáveis
5. Sugerir possíveis causas para variações
6. Ser mais detalhado na resposta (até 1500 caracteres)
` : ''}

## FORMATAÇÃO WHATSAPP
- NÃO use asteriscos (*) para negrito
- Use emojis organizados
- Separe seções com: ━━━━━━━━━━━━━━━━━
- ${isComplex ? 'Seja detalhado (máximo 1500 caracteres)' : 'Seja conciso (máximo 1000 caracteres)'}
- Sempre ofereça 2-3 opções de continuidade numeradas

${conversationContext}

${modelContext ? `## DOCUMENTAÇÃO DO MODELO\n${modelContext}` : '## SEM DOCUMENTAÇÃO\nInforme que não foi possível acessar os dados.'}

## DASHBOARD ATUAL
${datasetName || 'Não especificado'}

## DATA ATUAL
${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Mês atual: ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
`;

    const tools: Anthropic.Tool[] = connectionId && datasetId ? [
      {
        name: 'execute_dax',
        description: 'Executa uma query DAX no Power BI para buscar dados. Para análises complexas, execute múltiplas queries.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: { type: 'string', description: 'A query DAX a ser executada' }
          },
          required: ['query']
        }
      }
    ] : [];

    const maxTokens = isComplex ? 1500 : 800;
    const maxIterations = isComplex ? 5 : 2;

    let response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: finalMessageText }],
      tools: tools.length > 0 ? tools : undefined
    });

    let iterations = 0;
    const messages: any[] = [{ role: 'user', content: finalMessageText }];

    while (response.stop_reason === 'tool_use' && iterations < maxIterations) {
      iterations++;
      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        if (toolUse.type === 'tool_use' && (toolUse as any).name === 'execute_dax' && connectionId && datasetId) {
          const toolInput = toolUse.input as { query?: string };
          if (!toolInput.query) continue;

          console.log(`=== QUERY DAX (${iterations}/${maxIterations}) ===\n`, toolInput.query);

          const daxResult = await executeDaxQuery(connectionId, datasetId, toolInput.query, supabase);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: daxResult.success ? JSON.stringify(daxResult.results, null, 2) : `Erro: ${daxResult.error}`
          });
        }
      }

      if (toolResults.length === 0) break;

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });
    }

    let assistantMessage = '';
    for (const block of response.content) {
      if (block.type === 'text') {
        assistantMessage += block.text;
      }
    }

    assistantMessage = assistantMessage
      .replace(/```dax[\s\S]*?```/gi, '')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/EVALUATE[\s\S]*?(?=\n\n|\n📊|$)/gi, '')
      .replace(/Error:.*?(?=\n|$)/gi, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    if (!assistantMessage || assistantMessage.length < 20) {
      assistantMessage = '📊 Não consegui processar essa consulta. Pode reformular a pergunta?';
    }

    const maxLength = isComplex ? 1500 : 1000;
    if (assistantMessage.length > maxLength) {
      assistantMessage = assistantMessage.substring(0, maxLength - 3) + '...';
    }

    let sent = false;
    
    if (respondWithAudio) {
      console.log('🔊 Gerando resposta em áudio...');
      const audioBase64 = await generateAudio(assistantMessage);
      if (audioBase64) {
        sent = await sendWhatsAppAudio(instance, phone, audioBase64);
        console.log('🔊 Áudio enviado:', sent ? 'SIM' : 'NÃO');
      }
      
      if (!sent) {
        sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
      }
    } else {
      sent = await sendWhatsAppMessage(instance, phone, assistantMessage);
    }

    if (sent) {
      await supabase.from('whatsapp_messages').insert({
        company_group_id: authorizedNumber.company_group_id,
        phone_number: phone,
        message_content: respondWithAudio ? `🔊 [Áudio]: ${assistantMessage}` : assistantMessage,
        direction: 'outgoing',
        sender_name: 'Assistente IA'
      });
    }

    return NextResponse.json({ 
      status: 'success', 
      sent,
      complex_analysis: isComplex,
      iterations_used: iterations
    });

  } catch (error: any) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Verificação do webhook
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Webhook WhatsApp ativo',
    timestamp: new Date().toISOString()
  });
}
