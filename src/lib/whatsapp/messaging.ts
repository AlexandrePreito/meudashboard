// src/lib/whatsapp/messaging.ts
import createLogger from '@/lib/logger';

const log = createLogger('WhatsApp');

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
      log.error('Erro ao enviar mensagem', errorText.substring(0, 200));
      return false;
    }

    return true;
  } catch (error: any) {
    log.error('Erro ao enviar mensagem', error.message);
    return false;
  }
}

export async function sendWhatsAppAudio(instance: any, phone: string, audioBase64: string): Promise<boolean> {
  const apiUrl = instance.api_url?.replace(/\/$/, '');
  const cleanPhone = phone.replace(/\D/g, '');

  // Tentativa 1: sendWhatsAppAudio (formato nativo Evolution API v2)
  try {
    const url = `${apiUrl}/message/sendWhatsAppAudio/${instance.instance_name}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        audio: `data:audio/mp3;base64,${audioBase64}`,
      }),
    });

    if (response.ok) {
      log.info('Áudio enviado via sendWhatsAppAudio');
      return true;
    }

    const errorText = await response.text();
    log.warn('Tentativa 1 sendWhatsAppAudio falhou', { status: response.status, error: errorText.substring(0, 200) });
  } catch (error: any) {
    log.error('Tentativa 1 sendWhatsAppAudio erro', error.message);
  }

  // Tentativa 2: sendMedia com mediatype audio
  try {
    const url = `${apiUrl}/message/sendMedia/${instance.instance_name}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'audio',
        mimetype: 'audio/mpeg',
        media: `data:audio/mpeg;base64,${audioBase64}`,
        fileName: 'audio.mp3'
      }),
    });

    if (response.ok) {
      log.info('Áudio enviado via sendMedia');
      return true;
    }

    const errorText = await response.text();
    log.warn('Tentativa 2 sendMedia falhou', { status: response.status, error: errorText.substring(0, 200) });
  } catch (error: any) {
    log.error('Tentativa 2 sendMedia erro', error.message);
  }

  // Tentativa 3: sendMedia com base64 puro
  try {
    const url = `${apiUrl}/message/sendMedia/${instance.instance_name}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: cleanPhone,
        mediatype: 'audio',
        mimetype: 'audio/mpeg',
        media: audioBase64,
        fileName: 'audio.mp3'
      }),
    });

    if (response.ok) {
      log.info('Áudio enviado via sendMedia (base64 puro)');
      return true;
    }

    const errorText = await response.text();
    log.warn('Tentativa 3 sendMedia base64 falhou', { status: response.status, error: errorText.substring(0, 200) });
  } catch (error: any) {
    log.error('Tentativa 3 sendMedia erro', error.message);
  }

  log.error('Todas as tentativas de envio de áudio falharam');
  return false;
}

export async function sendTypingIndicator(instance: any, phone: string): Promise<void> {
  try {
    const apiUrl = instance.api_url?.replace(/\/$/, '');
    const url = `${apiUrl}/chat/presence/${instance.instance_name}`;

    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': instance.api_key,
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ''),
        presence: 'composing'
      }),
    });
  } catch (error) {
    log.warn('Não foi possível enviar indicador de digitação');
  }
}

export async function getInstanceForAuthorizedNumber(authorizedNumber: any, supabase: any): Promise<any> {
  // 1. Tentar pela instância específica do número autorizado
  if (authorizedNumber?.instance_id) {
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', authorizedNumber.instance_id)
      .eq('is_connected', true)
      .maybeSingle();

    if (instance) return instance;
  }

  // 2. Fallback: buscar instância do MESMO grupo
  if (authorizedNumber?.company_group_id) {
    const { data: groupInstance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('company_group_id', authorizedNumber.company_group_id)
      .eq('is_connected', true)
      .limit(1)
      .maybeSingle();

    if (groupInstance) return groupInstance;
  }

  log.error('Nenhuma instância encontrada', { groupId: authorizedNumber?.company_group_id });
  return null;
}
