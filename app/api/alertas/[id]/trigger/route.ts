import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';
import { logActivity } from '@/lib/activity-logger';

// Formatar valor como moeda brasileira
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Limpar nome da coluna removendo colchetes e prefixos de tabela
// Ex: "[Valor]" → "valor", "Empresa[Filial]" → "filial", "[Empresa[Filial]]" → "filial"
function cleanColumnName(key: string): string {
  return key
    .replace(/^.*\[/, '')  // Remove tudo antes do último [, incluindo prefixo de tabela
    .replace(/\]$/, '')    // Remove ] final
    .toLowerCase()
    .trim();
}

// Formatar resultado DAX para mensagem WhatsApp
function formatDaxResult(results: any[]): string {
  if (!results || results.length === 0) return 'Sem dados';

  const firstRow = results[0];
  const keys = Object.keys(firstRow);

  // Log para debug
  console.log('[formatDaxResult] Keys do resultado:', keys);
  console.log('[formatDaxResult] Primeiro row:', JSON.stringify(firstRow));

  // Se for só uma linha com um valor, retorna o valor formatado
  if (results.length === 1) {
    // Procurar qualquer valor numérico
    for (const key of keys) {
      const val = firstRow[key];
      if (typeof val === 'number') {
        return formatCurrency(val);
      }
    }
    // Se não achou número, retorna o primeiro valor
    const firstVal = Object.values(firstRow)[0];
    return firstVal !== null && firstVal !== undefined ? String(firstVal) : 'Sem dados';
  }

  // Múltiplas linhas - identificar colunas por nome limpo
  let labelKey: string | null = null;
  let valueKey: string | null = null;

  // Primeiro: encontrar a coluna de VALOR (numérica)
  for (const key of keys) {
    const clean = cleanColumnName(key);
    if (clean.includes('valor') || clean.includes('value') || clean.includes('amount') || clean.includes('total')) {
      valueKey = key;
      break;
    }
  }

  // Se não encontrou por nome, pegar a primeira coluna numérica
  if (!valueKey) {
    for (const key of keys) {
      // Verificar em TODOS os rows, não só o primeiro (que pode ser null)
      const hasNumber = results.some(row => typeof row[key] === 'number');
      if (hasNumber) {
        valueKey = key;
        break;
      }
    }
  }

  // Segundo: encontrar a coluna de LABEL (texto/dimensão) - 2 passadas por prioridade
  // Prioridade 1: colunas que são claramente labels formatados
  const highPriorityLabels = ['periodo', 'descricao', 'label', 'nome', 'filial', 'empresa',
    'cliente', 'produto', 'vendedor', 'categoria', 'regiao', 'loja', 'unidade'];
  // Prioridade 2: colunas temporais (menos ideais como label pois podem ser formato raw)
  const lowPriorityLabels = ['mes', 'dia', 'semana', 'ano', 'tipo', 'status', 'grupo'];

  for (const key of keys) {
    if (key === valueKey) continue;
    const clean = cleanColumnName(key);
    if (highPriorityLabels.some(term => clean.includes(term))) {
      labelKey = key;
      break;
    }
  }

  // Se não achou com alta prioridade, tentar baixa prioridade
  if (!labelKey) {
    for (const key of keys) {
      if (key === valueKey) continue;
      const clean = cleanColumnName(key);
      if (lowPriorityLabels.some(term => clean.includes(term))) {
        labelKey = key;
        break;
      }
    }
  }

  // Se não encontrou por nome, preferir coluna com valores string
  if (!labelKey) {
    for (const key of keys) {
      if (key === valueKey) continue;
      const hasString = results.some(row => typeof row[key] === 'string' && row[key] !== null);
      if (hasString) {
        labelKey = key;
        break;
      }
    }
    // Último fallback: primeira coluna que não é valor
    if (!labelKey) {
      for (const key of keys) {
        if (key !== valueKey) {
          labelKey = key;
          break;
        }
      }
    }
  }

  console.log('[formatDaxResult] labelKey:', labelKey, '| valueKey:', valueKey);

  // Formatar linhas
  const lines: string[] = [];
  let totalLine: string | null = null;

  for (const row of results) {
    const label = labelKey ? String(row[labelKey] ?? '') : '';
    const rawValue = valueKey ? row[valueKey] : null;

    // Pular linhas onde TODOS os campos são null/vazio
    if (!label && (rawValue === null || rawValue === undefined)) {
      // Verificar se alguma outra coluna tem valor de TOTAL
      const allValues = Object.values(row);
      const hasTotalMarker = allValues.some(v => typeof v === 'string' && v.toUpperCase().includes('TOTAL'));
      if (!hasTotalMarker) continue;
      // Se tem marcador TOTAL em outra coluna, usar como label
      const totalVal = allValues.find(v => typeof v === 'string' && v.toUpperCase().includes('TOTAL'));
      if (totalVal) {
        const adjustedLabel = String(totalVal);
        const formattedVal = typeof rawValue === 'number' ? formatCurrency(rawValue) : 'R$ 0,00';
        totalLine = `━━━━━━━━━━━━━━\n*${adjustedLabel}*: ${formattedVal}`;
        continue;
      }
    }
    // Se label vazio mas existe TOTAL em outra coluna (e tem valor), tratar como linha de total
    if (!label && rawValue !== null && rawValue !== undefined) {
      const allValues = Object.values(row);
      const totalVal = allValues.find(v => typeof v === 'string' && v.toUpperCase().includes('TOTAL'));
      if (totalVal) {
        const adjustedLabel = String(totalVal);
        const formattedVal = typeof rawValue === 'number' ? formatCurrency(rawValue) : String(rawValue);
        totalLine = `━━━━━━━━━━━━━━\n*${adjustedLabel}*: ${formattedVal}`;
        continue;
      }
    }

    // Formatar valor
    let formattedValue = '';
    if (typeof rawValue === 'number') {
      formattedValue = formatCurrency(rawValue);
    } else if (rawValue !== null && rawValue !== undefined) {
      formattedValue = String(rawValue);
    } else {
      formattedValue = 'R$ 0,00'; // Valor null = zero
    }

    // Separar linha de TOTAL das demais
    const isTotal = label.toUpperCase() === 'TOTAL' || label.toUpperCase().includes('TOTAL');

    if (isTotal) {
      totalLine = `━━━━━━━━━━━━━━\n*${label}*: ${formattedValue}`;
    } else if (label) {
      lines.push(`• ${label}: ${formattedValue}`);
    }
  }

  // Montar resultado: linhas normais + total no final
  let result = lines.join('\n');
  if (totalLine) {
    result += '\n' + totalLine;
  }

  return result || 'Sem dados';
}

// Função para executar DAX
async function executeDaxQuery(connectionId: string, datasetId: string, query: string, supabase: any): Promise<{ success: boolean; results?: any[]; error?: string; elapsedMs?: number }> {
  const startTime = Date.now();
  try {
    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexão não encontrada', elapsedMs: Date.now() - startTime };
    }

    console.log('[DAX] Obtendo token para tenant:', connection.tenant_id);
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
      const errText = await tokenResponse.text();
      console.error('[DAX] Erro token:', errText);
      return { success: false, error: `Erro na autenticação: ${tokenResponse.status}`, elapsedMs: Date.now() - startTime };
    }

    const tokenData = await tokenResponse.json();
    const tokenElapsed = Date.now() - startTime;
    console.log(`[DAX] Token obtido em ${tokenElapsed}ms. Executando query no dataset ${datasetId}...`);

    const controller = new AbortController();
    const DAX_TIMEOUT_MS = 120000;
    const timeoutId = setTimeout(() => controller.abort(), DAX_TIMEOUT_MS);

    try {
      const daxStart = Date.now();
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
      const daxElapsed = Date.now() - daxStart;
      console.log(`[DAX] Resposta Power BI em ${daxElapsed}ms - Status: ${daxRes.status}`);

      if (!daxRes.ok) {
        const errorText = await daxRes.text();
        console.error('[DAX] Erro resposta:', errorText.substring(0, 500));
        return { success: false, error: `Erro DAX (${daxRes.status}): ${errorText.substring(0, 300)}`, elapsedMs: Date.now() - startTime };
      }

      const daxData = await daxRes.json();
      const results = daxData.results?.[0]?.tables?.[0]?.rows || [];
      console.log(`[DAX] Query OK - ${results.length} linhas retornadas em ${daxElapsed}ms`);

      return { success: true, results, elapsedMs: Date.now() - startTime };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      const elapsed = Date.now() - startTime;
      if (fetchError.name === 'AbortError') {
        console.error(`[DAX] TIMEOUT após ${elapsed}ms (limite: ${DAX_TIMEOUT_MS}ms)`);
        return { success: false, error: `Timeout: A consulta DAX demorou mais de ${DAX_TIMEOUT_MS / 1000} segundos`, elapsedMs: elapsed };
      }
      throw fetchError;
    }
  } catch (e: any) {
    return { success: false, error: e.message, elapsedMs: Date.now() - startTime };
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

    try {
      await logActivity({
        userId: user.id,
        companyGroupId: alert.company_group_id,
        actionType: 'execute',
        module: 'alertas',
        description: `Alerta disparado: ${alert.name}`,
        entityType: 'alert',
        entityId: alert.id,
        metadata: { trigger: 'manual' },
      });
    } catch (_) {}

    try {
      await supabase.rpc('increment_daily_usage', {
        p_group_id: alert.company_group_id,
        p_alerts: 1,
      });
    } catch (_) {}

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

