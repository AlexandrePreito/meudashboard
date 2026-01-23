import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// Formatar valor como moeda brasileira
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Formatar resultado da DAX para mensagem
function formatDaxResult(results: any[]): string {
  if (!results || results.length === 0) {
    return 'Sem dados';
  }

  // Se for só uma linha com um valor, retorna o valor formatado
  if (results.length === 1) {
    const row = results[0];
    const keys = Object.keys(row);
    
    // Procurar coluna de valor (geralmente contém "Valor" ou é numérica)
    const valueKey = keys.find(k => k.toLowerCase().includes('valor') || typeof row[k] === 'number');
    if (valueKey && typeof row[valueKey] === 'number') {
      return formatCurrency(row[valueKey]);
    }
    return String(Object.values(row)[0] || 'Sem dados');
  }

  // Múltiplas linhas - formatar como tabela
  const lines: string[] = [];
  let totalLine: string | null = null;

  // Identificar colunas
  const firstRow = results[0];
  const keys = Object.keys(firstRow);
  
  // Procurar coluna de label (Filial, Nome, etc) e valor
  const labelKey = keys.find(k => 
    k.toLowerCase().includes('filial') || 
    k.toLowerCase().includes('nome') || 
    k.toLowerCase().includes('empresa') ||
    k.toLowerCase().includes('cliente') ||
    !k.toLowerCase().includes('valor')
  );
  const valueKey = keys.find(k => 
    k.toLowerCase().includes('valor') || 
    typeof firstRow[k] === 'number'
  );

  for (const row of results) {
    // Pular linhas com valores null
    if (labelKey && row[labelKey] === null) continue;
    
    const label = labelKey ? String(row[labelKey] || '') : '';
    const value = valueKey ? row[valueKey] : null;
    
    // Formatar valor
    let formattedValue = '';
    if (typeof value === 'number') {
      formattedValue = formatCurrency(value);
    } else if (value !== null && value !== undefined) {
      formattedValue = String(value);
    }

    // Verificar se é linha de total
    if (label.toUpperCase() === 'TOTAL' || label.toUpperCase().includes('TOTAL')) {
      totalLine = `━━━━━━━━━━━━━━\n*${label}*: ${formattedValue}`;
    } else if (label && formattedValue) {
      lines.push(`${label}: ${formattedValue}`);
    }
  }

  // Montar resultado final
  let result = lines.join('\n');
  if (totalLine) {
    result += '\n' + totalLine;
  }

  return result || 'Sem dados';
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

    console.log('[DEBUG /api/alertas/[id]/trigger] Alerta encontrado:', {
      id: alert.id,
      name: alert.name,
      company_group_id: alert.company_group_id,
      is_enabled: alert.is_enabled
    });

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
        // Formatar todas as linhas do resultado
        valorReal = formatDaxResult(daxResult.results);
        console.log('Valor DAX formatado:', valorReal);
      } else {
        console.error('Erro ao executar DAX:', daxResult.error);
      }
    }

    // Variáveis para a mensagem
    const now = new Date();
    
    // Detectar se a query é sobre "ontem" para substituir {{periodo}}
    const daxQueryLower = (alert.dax_query || '').toLowerCase();
    const isYesterdayQuery = 
      daxQueryLower.includes('today() - 1') ||
      daxQueryLower.includes('today()-1') ||
      daxQueryLower.includes('dateadd(today(), -1') ||
      daxQueryLower.includes('dateadd(today(),-1') ||
      daxQueryLower.includes('ontem') ||
      daxQueryLower.includes('yesterday') ||
      daxQueryLower.includes('dia anterior');
    
    // Data de ontem formatada
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayFormatted = yesterday.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    const variables: Record<string, string> = {
      '{{nome_alerta}}': alert.name,
      '{{valor}}': valorReal,
      '{{data}}': now.toLocaleDateString('pt-BR'),
      '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      '{{condicao}}': alert.condition || '-',
      '{{threshold}}': alert.threshold?.toLocaleString('pt-BR') || '-',
    };
    
    // Adicionar {{periodo}} se for query sobre ontem
    if (isYesterdayQuery) {
      variables['{{periodo}}'] = yesterdayFormatted;
    }

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
    const successCount = 
      results.numbers.filter(r => r.success).length + 
      results.groups.filter(r => r.success).length;
    const totalCount = results.numbers.length + results.groups.length;
    
    console.log('[DEBUG /api/alertas/[id]/trigger] Mensagem que será salva:', {
      messageLength: message.length,
      messagePreview: message.substring(0, 100),
      fullMessage: message
    });
    
    const { data: historyInsert, error: historyError } = await supabase
      .from('ai_alert_history')
      .insert({
        alert_id: id,
        triggered_at: new Date().toISOString(),
        alert_value: valorReal,
        alert_message: message, // Salvar a mensagem real enviada (texto completo)
        email_sent: false,
        webhook_sent: alert.notify_whatsapp,
        webhook_response: {
          type: 'manual',
          success_count: successCount,
          total_count: totalCount,
          results: results,
          message: message // Também salvar no webhook_response para backup (texto completo)
        }
      })
      .select();

    if (historyError) {
      console.error('[ERROR /api/alertas/[id]/trigger] Erro ao salvar histórico:', {
        message: historyError.message,
        details: historyError.details,
        hint: historyError.hint,
        code: historyError.code,
        alert_id: id,
        company_group_id: alert.company_group_id
      });
    } else {
      console.log('[DEBUG /api/alertas/[id]/trigger] Histórico salvo com sucesso:', {
        historyId: historyInsert?.[0]?.id,
        alert_id: id,
        company_group_id: alert.company_group_id,
        triggered_at: historyInsert?.[0]?.triggered_at
      });
    }

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

