// src/lib/whatsapp/audio.ts
import OpenAI from 'openai';
import createLogger from '@/lib/logger';

const log = createLogger('Audio');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Formatar texto para fala (remover emojis, linhas, etc)
function formatTextForSpeech(text: string): string {
  let formatted = text;

  // Remover emojis
  formatted = formatted.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[️⃣]/gu, '');
  // Remover linhas decorativas
  formatted = formatted.replace(/[━─═]+/g, '');

  // Converter valores monetários para fala
  formatted = formatted.replace(/R\$\s*([\d.,]+)/g, (match, value) => {
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    const num = parseFloat(cleanValue);

    if (isNaN(num)) return match;

    if (num >= 1000000000) {
      const bilhoes = num / 1000000000;
      return `${bilhoes.toFixed(1).replace('.', ',')} bilhões de reais`;
    }
    if (num >= 1000000) {
      const milhoes = num / 1000000;
      return `${milhoes.toFixed(1).replace('.', ',')} milhões de reais`;
    }
    if (num >= 1000) {
      const milhares = num / 1000;
      return `${milhares.toFixed(1).replace('.', ',')} mil reais`;
    }
    return `${num.toFixed(2).replace('.', ',')} reais`;
  });

  // Remover formatação markdown
  formatted = formatted.replace(/\*\*/g, '').replace(/\*/g, '');
  // Remover múltiplas quebras de linha
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  // Remover numeração de sugestões
  formatted = formatted.replace(/[1-9]️⃣/g, '');

  return formatted.trim();
}

// Gerar áudio com OpenAI TTS
export async function generateAudio(text: string): Promise<string | null> {
  try {
    if (!text || text.trim().length < 5) {
      log.warn('Texto muito curto ou vazio');
      return null;
    }

    const speechText = formatTextForSpeech(text);

    if (!speechText || speechText.trim().length < 5) {
      log.warn('Texto após formatação ficou vazio');
      return null;
    }

    const limitedText = speechText.slice(0, 4000);

    if (!process.env.OPENAI_API_KEY) {
      log.warn('OPENAI_API_KEY não configurada');
      return null;
    }

    const response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'nova',
      input: limitedText,
      response_format: 'mp3',
      speed: 0.95,
    });

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error: any) {
    log.error('Erro ao gerar áudio', error.message);
    return null;
  }
}

export async function downloadWhatsAppAudio(instance: any, messageData: any): Promise<Buffer | null> {
  const maxRetries = 2;

  const audioMessage = messageData?.message?.audioMessage
    || messageData?.audioMessage
    || messageData?.data?.message?.audioMessage;

  const messageKey = messageData?.key || messageData?.data?.key;
  const messageObj = messageData?.message || messageData?.data?.message;

  console.log('[downloadAudio] Paths:', {
    hasAudioMessage: !!audioMessage,
    hasMessageKey: !!messageKey,
    hasMessageObj: !!messageObj,
  });

  if (!instance?.api_url || !instance?.api_key || !instance?.instance_name) {
    console.error('[downloadAudio] Instance incompleta');
    return null;
  }

  const apiUrl = instance.api_url.replace(/\/$/, '');

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[downloadAudio] Tentativa ${attempt}/${maxRetries}`);

      // 1. Verificar se já veio base64 direto no webhook
      const base64Audio = audioMessage?.base64
        || messageData?.base64
        || messageData?.data?.base64;

      if (base64Audio) {
        console.log('[downloadAudio] ✅ Base64 direto do webhook');
        return Buffer.from(base64Audio, 'base64');
      }

      // 2. PRINCIPAL: Evolution API getBase64FromMediaMessage (descriptografa o áudio)
      if (messageKey && messageObj) {
        try {
          const url = `${apiUrl}/chat/getBase64FromMediaMessage/${instance.instance_name}`;
          console.log('[downloadAudio] Chamando getBase64FromMediaMessage...');

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instance.api_key,
            },
            body: JSON.stringify({
              message: {
                key: messageKey,
                message: messageObj
              }
            }),
            signal: AbortSignal.timeout(20000)
          });

          console.log('[downloadAudio] getBase64 status:', response.status);

          if (response.ok) {
            const data = await response.json();
            const b64 = data.base64 || data.data?.base64 || data.mediaBase64;
            if (b64) {
              console.log('[downloadAudio] ✅ Base64 via Evolution API, length:', b64.length);
              return Buffer.from(b64, 'base64');
            } else {
              console.log('[downloadAudio] Resposta sem base64:', Object.keys(data));
            }
          } else {
            const errText = await response.text().catch(() => '');
            console.log('[downloadAudio] getBase64 falhou:', response.status, errText.substring(0, 200));
          }
        } catch (apiError: any) {
          console.log('[downloadAudio] getBase64 erro:', apiError.message);
        }
      }

      // 3. Fallback: Evolution API findMessages
      if (messageKey?.id) {
        try {
          const url = `${apiUrl}/chat/findMessages/${instance.instance_name}`;
          console.log('[downloadAudio] Tentando findMessages...');

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instance.api_key,
            },
            body: JSON.stringify({
              where: { key: { id: messageKey.id } }
            }),
            signal: AbortSignal.timeout(15000)
          });

          if (response.ok) {
            const data = await response.json();
            const messages = Array.isArray(data) ? data : data.data || data.messages || [];

            if (messages.length > 0) {
              const foundMsg = messages[0];
              const foundBase64 = foundMsg.base64 || foundMsg.media?.base64;
              if (foundBase64) {
                console.log('[downloadAudio] ✅ Base64 via findMessages');
                return Buffer.from(foundBase64, 'base64');
              }
            }
          }
        } catch (findError: any) {
          console.log('[downloadAudio] findMessages erro:', findError.message);
        }
      }

      // NÃO tentar download direto da URL do WhatsApp — arquivo é criptografado

    } catch (error: any) {
      console.error(`[downloadAudio] Tentativa ${attempt} falhou:`, error.message);
    }

    if (attempt < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.error('[downloadAudio] ❌ Todas as tentativas falharam');
  return null;
}

// Transcrever áudio com Whisper
export async function transcribeAudio(audioBuffer: Buffer): Promise<string | null> {
  try {
    console.log('[transcribeAudio] Iniciando transcrição, buffer size:', audioBuffer.length);

    if (!process.env.OPENAI_API_KEY) {
      console.error('[transcribeAudio] OPENAI_API_KEY não configurada');
      return null;
    }

    if (audioBuffer.length < 100) {
      console.error('[transcribeAudio] Buffer muito pequeno:', audioBuffer.length);
      return null;
    }

    // WhatsApp envia áudio como OGG Opus — Whisper aceita .ogg
    const blob = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg' });
    const file = new File([blob], 'audio.ogg', { type: 'audio/ogg' });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'pt',
    });

    console.log('[transcribeAudio] ✅ Transcrição:', transcription.text?.substring(0, 100));
    return transcription.text || null;
  } catch (error: any) {
    console.error('[transcribeAudio] Erro:', error.message);

    // Fallback: tentar com extensão .oga (outro formato aceito)
    try {
      console.log('[transcribeAudio] Tentando com .oga...');
      const blob2 = new Blob([new Uint8Array(audioBuffer)], { type: 'audio/ogg; codecs=opus' });
      const file = new File([blob2], 'audio.oga', { type: 'audio/ogg; codecs=opus' });

      const transcription = await openai.audio.transcriptions.create({
        file: file,
        model: 'whisper-1',
        language: 'pt',
      });

      console.log('[transcribeAudio] ✅ Transcrição via .oga:', transcription.text?.substring(0, 100));
      return transcription.text || null;
    } catch (fallbackError: any) {
      console.error('[transcribeAudio] Fallback .oga também falhou:', fallbackError.message);
      return null;
    }
  }
}
