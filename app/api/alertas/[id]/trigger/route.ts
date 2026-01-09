import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

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

    // Obter token
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

    // Executar DAX
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
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
          }),
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);

      if (!daxRes.ok) {
        const errorText = await daxRes.text();
        return { success: false, error: `Erro DAX: ${errorText}` };
      }

      const daxData = await daxRes.json();
      const results = daxData.results?.[0]?.tables?.[0]?.rows || [];

      return { success: true, results };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'Timeout: A consulta DAX demorou mais de 30 segundos' };
      }
      throw fetchError;
    }
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// POST - Disparar alerta manualmente
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Buscar o alerta
    const { data: alert, error: alertError } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('id', id)
      .single();

    if (alertError || !alert) {
      return NextResponse.json({ error: 'Alerta não encontrado' }, { status: 404 });
    }

    if (!alert.is_enabled) {
      return NextResponse.json({ error: 'Alerta está desativado' }, { status: 400 });
    }

    // Executar query DAX para obter valor real
    let valorReal = 'Valor não disponível';
    
    if (alert.connection_id && alert.dataset_id && alert.dax_query) {
      console.log('Executando DAX para alerta:', alert.name);
      const daxResult = await executeDaxQuery(
        alert.connection_id,
        alert.dataset_id,
        alert.dax_query,
        supabase
      );
      
      console.log('Resultado DAX completo:', JSON.stringify(daxResult));
      
      if (daxResult.success && daxResult.results && daxResult.results.length > 0) {
        // Pegar o primeiro valor do resultado
        const firstRow = daxResult.results[0];
        console.log('Primeira linha:', JSON.stringify(firstRow));
        const firstValue = Object.values(firstRow)[0];
        console.log('Primeiro valor:', firstValue, 'Tipo:', typeof firstValue);
        
        // Formatar como moeda se for número
        if (typeof firstValue === 'number') {
          valorReal = firstValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        } else {
          valorReal = String(firstValue);
        }
        console.log('Valor DAX obtido:', valorReal);
      } else {
        console.error('Erro ao executar DAX:', daxResult.error);
      }
    }

    // Variáveis para a mensagem
    const now = new Date();
    const variables: Record<string, string> = {
      '{{nome_alerta}}': alert.name,
      '{{valor}}': valorReal,
      '{{data}}': now.toLocaleDateString('pt-BR'),
      '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      '{{condicao}}': alert.condition || '-',
      '{{threshold}}': alert.threshold?.toLocaleString('pt-BR') || '-',
    };

    // Substituir variáveis no template
    let message = alert.message_template || '🔔 *{{nome_alerta}}*\n\nDisparo manual realizado em {{data}} às {{hora}}';
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
    }

    // Resultados do envio
    const results = {
      numbers: [] as { phone: string; success: boolean; error?: string }[],
      groups: [] as { groupId: string; success: boolean; error?: string }[]
    };

    console.log('Configuração do alerta:', {
      notify_whatsapp: alert.notify_whatsapp,
      whatsapp_number: alert.whatsapp_number,
      whatsapp_group_id: alert.whatsapp_group_id
    });

    // Buscar instância WhatsApp ativa
    let instanceData: any = null;
    if (alert.notify_whatsapp) {
      const { data: instance, error: instanceError } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('is_connected', true)
        .limit(1)
        .maybeSingle();
      
      if (instanceError) {
        console.error('Erro ao buscar instância:', instanceError);
      }
      
      instanceData = instance;
      console.log('Instância WhatsApp encontrada:', instanceData ? {
        id: instanceData.id,
        name: instanceData.instance_name,
        api_url: instanceData.api_url
      } : 'NENHUMA');
    } else {
      console.log('WhatsApp não está habilitado para este alerta');
    }

    // Enviar para números
    if (alert.notify_whatsapp && alert.whatsapp_number && instanceData) {
      const numbers = alert.whatsapp_number.split(',').filter(Boolean);
      console.log('Enviando para números:', numbers);
      
      for (const phone of numbers) {
        console.log('Enviando para:', phone);
        try {
          const response = await fetch(`${instanceData.api_url}/message/sendText/${instanceData.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instanceData.api_key
            },
            body: JSON.stringify({
              number: phone.replace(/\D/g, ''),
              text: message
            })
          });

          const responseText = await response.text();
          console.log('Resposta do envio:', { status: response.status, ok: response.ok, body: responseText.substring(0, 300) });

          if (response.ok) {
            results.numbers.push({ phone, success: true });
          } else {
            try {
              const errorData = JSON.parse(responseText);
              results.numbers.push({ phone, success: false, error: errorData.message || responseText });
            } catch {
              results.numbers.push({ phone, success: false, error: responseText || 'Erro ao enviar' });
            }
          }
        } catch (err: any) {
          results.numbers.push({ phone, success: false, error: err.message });
        }
      }
    }

    // Enviar para grupos
    if (alert.notify_whatsapp && alert.whatsapp_group_id && instanceData) {
      const groups = alert.whatsapp_group_id.split(',').filter(Boolean);
      console.log('Enviando para grupos:', groups);
      
      for (const groupId of groups) {
        console.log('Enviando para grupo:', groupId);
        try {
          const response = await fetch(`${instanceData.api_url}/message/sendText/${instanceData.instance_name}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': instanceData.api_key
            },
            body: JSON.stringify({
              number: groupId,
              text: message
            })
          });

          const responseTextGroup = await response.text();
          console.log('Resposta do envio para grupo:', { status: response.status, ok: response.ok, body: responseTextGroup.substring(0, 300) });

          if (response.ok) {
            results.groups.push({ groupId, success: true });
          } else {
            try {
              const errorData = JSON.parse(responseTextGroup);
              results.groups.push({ groupId, success: false, error: errorData.message || responseTextGroup });
            } catch {
              results.groups.push({ groupId, success: false, error: responseTextGroup || 'Erro ao enviar' });
            }
          }
        } catch (err: any) {
          results.groups.push({ groupId, success: false, error: err.message });
        }
      }
    }

    // Atualizar timestamp
    await supabase
      .from('ai_alerts')
      .update({ 
        last_triggered_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString()
      })
      .eq('id', id);

    // Registrar no histórico
    await supabase
      .from('ai_alert_history')
      .insert({
        alert_id: id,
        triggered_at: new Date().toISOString(),
        trigger_type: 'manual',
        value_at_trigger: null,
        notification_sent: alert.notify_whatsapp,
        notification_details: JSON.stringify(results)
      });

    // Contar sucessos
    const successCount = 
      results.numbers.filter(r => r.success).length + 
      results.groups.filter(r => r.success).length;
    
    const totalCount = results.numbers.length + results.groups.length;

    console.log('Resultado final do trigger:', {
      successCount,
      totalCount,
      results
    });

    if (!alert.notify_whatsapp) {
      return NextResponse.json({ 
        success: true, 
        message: 'Alerta disparado! (WhatsApp não configurado)'
      });
    }

    if (totalCount === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Alerta disparado! (Nenhum destinatário configurado)'
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Alerta disparado! ${successCount}/${totalCount} mensagens enviadas.`,
      results
    });

  } catch (error: any) {
    console.error('Erro ao disparar alerta:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

