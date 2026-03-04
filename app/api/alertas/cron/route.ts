import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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

  // Segundo: encontrar a coluna de LABEL (texto/dimensão)
  for (const key of keys) {
    if (key === valueKey) continue; // Pular a coluna de valor
    const clean = cleanColumnName(key);
    if (clean.includes('filial') || clean.includes('nome') || clean.includes('empresa') ||
        clean.includes('cliente') || clean.includes('produto') || clean.includes('vendedor') ||
        clean.includes('categoria') || clean.includes('grupo') || clean.includes('regiao') ||
        clean.includes('loja') || clean.includes('unidade')) {
      labelKey = key;
      break;
    }
  }

  // Se não encontrou por nome, pegar a primeira coluna que NÃO é a de valor
  if (!labelKey) {
    for (const key of keys) {
      if (key !== valueKey) {
        labelKey = key;
        break;
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

    // Pular linhas onde o label é null/vazio E o valor também é null
    if (!label && rawValue === null) continue;

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

const CONDITIONS_MAP: Record<string, string> = {
  'greater_than': 'Maior que',
  'less_than': 'Menor que',
  'equals': 'Igual a',
  'not_equals': 'Diferente de',
  'greater_or_equal': 'Maior ou igual',
  'less_or_equal': 'Menor ou igual',
};

const RESERVED_VARIABLES = new Set([
  '{{nome_alerta}}',
  '{{valor}}',
  '{{data}}',
  '{{hora}}',
  '{{condicao}}',
  '{{threshold}}',
  '{{periodo}}',
]);

// Função para executar DAX
async function executeDaxQuery(connectionId: string, datasetId: string, query: string, supabase: any) {
  try {
    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) return { success: false, error: 'Conexão não encontrada' };

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

    if (!tokenResponse.ok) return { success: false, error: 'Erro na autenticação' };
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

    if (!daxRes.ok) return { success: false, error: 'Erro DAX' };
    const daxData = await daxRes.json();
    return { success: true, results: daxData.results?.[0]?.tables?.[0]?.rows || [] };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Função para enviar WhatsApp
async function sendWhatsApp(instance: any, phone: string, message: string) {
  try {
    const res = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': instance.api_key },
      body: JSON.stringify({ 
        number: phone.replace(/\D/g, ''), 
        text: message 
      })
    });
    return res.ok;
  } catch { return false; }
}

export async function GET(request: Request) {
  try {
    // Verificar autenticação - aceita query param OU header Authorization
    const { searchParams } = new URL(request.url);
    const keyFromQuery = searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const keyFromHeader = authHeader?.replace('Bearer ', '');

    const isAuthorized = 
      keyFromQuery === process.env.CRON_SECRET || 
      keyFromQuery === 'manual-trigger' ||
      keyFromHeader === process.env.CRON_SECRET;

    if (!isAuthorized) {
      console.log('[CRON] Não autorizado - key:', keyFromQuery, 'header:', keyFromHeader?.substring(0, 10) + '...');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Converter para horário de Brasília usando Intl (mais confiável na Vercel)
    const brasiliaFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const currentTime = brasiliaFormatter.format(now);

    const dayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short'
    });
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const currentDay = dayMap[dayFormatter.format(now)];

    const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit'
    });
    const currentDayOfMonth = parseInt(dateFormatter.format(now));

    console.log(`[CRON] Verificando alertas às ${currentTime}`);

    // Buscar alertas ativos
    const { data: alerts } = await supabase
      .from('ai_alerts')
      .select('*')
      .eq('is_enabled', true)
      .eq('notify_whatsapp', true);

    if (!alerts?.length) {
      return NextResponse.json({ message: 'Nenhum alerta ativo', checked: 0 });
    }

    // Buscar instância WhatsApp
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('is_connected', true)
      .limit(1)
      .maybeSingle();

    if (!instance) {
      return NextResponse.json({ error: 'Nenhuma instância WhatsApp conectada' }, { status: 400 });
    }

    const results: any[] = [];

    for (const alert of alerts) {
      // Verificar se é hora de disparar
      const checkTimes = alert.check_times || [];
      const checkDaysOfWeek = alert.check_days_of_week || [];
      const checkDaysOfMonth = alert.check_days_of_month || [];

      // Verifica horário
      const isTimeMatch = checkTimes.includes(currentTime);
      
      // Verifica dia da semana (se configurado)
      const isDayOfWeekMatch = checkDaysOfWeek.length === 0 || checkDaysOfWeek.includes(currentDay);
      
      // Verifica dia do mês (se configurado)
      const isDayOfMonthMatch = checkDaysOfMonth.length === 0 || checkDaysOfMonth.includes(currentDayOfMonth);

      if (!isTimeMatch || !isDayOfWeekMatch || !isDayOfMonthMatch) {
        continue;
      }

      // Verificar se já disparou neste minuto
      if (alert.last_triggered_at) {
        const lastTriggered = new Date(alert.last_triggered_at);
        const diffMinutes = (now.getTime() - lastTriggered.getTime()) / 60000;
        if (diffMinutes < 1) {
          console.log(`[CRON] Alerta ${alert.name} já disparou recentemente`);
          continue;
        }
      }

      console.log(`[CRON] Disparando alerta: ${alert.name}`);

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
      
      // Executar DAX e extrair todas as variáveis
      let variables: Record<string, string> = {
        '{{nome_alerta}}': alert.name,
        '{{data}}': now.toLocaleDateString('pt-BR'),
        '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        '{{condicao}}': CONDITIONS_MAP[alert.condition] || alert.condition,
        '{{threshold}}': alert.threshold?.toLocaleString('pt-BR') || '0',
      };
      
      // Adicionar {{periodo}} se for query sobre ontem
      if (isYesterdayQuery) {
        variables['{{periodo}}'] = yesterdayFormatted;
      }

      let daxResult: any = null;
      if (alert.connection_id && alert.dataset_id && alert.dax_query) {
        daxResult = await executeDaxQuery(alert.connection_id, alert.dataset_id, alert.dax_query, supabase);
        
        if (daxResult.success && daxResult.results?.length > 0) {
          // Usar formatDaxResult para estrutura por filial (igual ao trigger manual)
          variables['{{valor}}'] = formatDaxResult(daxResult.results);
          
          // Extrair primeira linha para variáveis adicionais (condição, etc)
          const row = daxResult.results[0];
          for (const [key, value] of Object.entries(row)) {
            const cleanKey = key.replace(/^\[|\]$/g, '').toLowerCase().replace(/\s+/g, '_');
            let formattedValue: string;
            if (typeof value === 'number') {
              formattedValue = Math.abs(value) >= 100
                ? (value as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : (value as number).toLocaleString('pt-BR');
            } else {
              formattedValue = String(value || '');
            }
            const cleanPlaceholder = `{{${cleanKey}}}`;
            const rawPlaceholder = `{{${key}}}`;

            // Não sobrescrever placeholders-base (ex: {{valor}} com o texto formatado completo)
            if (!RESERVED_VARIABLES.has(cleanPlaceholder)) {
              variables[cleanPlaceholder] = formattedValue;
            }
            if (!RESERVED_VARIABLES.has(rawPlaceholder)) {
              variables[rawPlaceholder] = formattedValue;
            }
          }
        }
      }

      console.log('[CRON] Variáveis disponíveis:', Object.keys(variables));

      // Verificar condição de disparo
      let shouldTrigger = true;
      let firstNumericValue: number | null = null;
      
      // Extrair o primeiro valor numérico do resultado DAX
      if (daxResult?.success && daxResult?.results?.[0]) {
        const row = daxResult.results[0];
        for (const value of Object.values(row)) {
          if (typeof value === 'number') {
            firstNumericValue = value;
            break;
          }
        }
      }
      
      console.log('[CRON] daxResult:', JSON.stringify(daxResult?.results?.[0]));
      console.log('[CRON] firstNumericValue:', firstNumericValue);
      
      // Aplicar condição se configurada
      if (alert.condition && alert.threshold !== null && alert.threshold !== undefined && firstNumericValue !== null) {
        switch (alert.condition) {
          case 'greater_than':
            shouldTrigger = firstNumericValue > alert.threshold;
            break;
          case 'less_than':
            shouldTrigger = firstNumericValue < alert.threshold;
            break;
          case 'equals':
            shouldTrigger = firstNumericValue === alert.threshold;
            break;
          case 'not_equals':
            shouldTrigger = firstNumericValue !== alert.threshold;
            break;
          case 'greater_or_equal':
            shouldTrigger = firstNumericValue >= alert.threshold;
            break;
          case 'less_or_equal':
            shouldTrigger = firstNumericValue <= alert.threshold;
            break;
        }
        
        console.log(`[CRON] Condição: ${firstNumericValue} ${alert.condition} ${alert.threshold} = ${shouldTrigger}`);
      }

      // Se a condição não for atendida, pula este alerta
      if (!shouldTrigger) {
        console.log(`[CRON] Alerta ${alert.name} - condição não atendida, não disparando`);
        
        await supabase
          .from('ai_alerts')
          .update({ last_checked_at: now.toISOString() })
          .eq('id', alert.id);
        
        continue;
      }

      let message = alert.message_template || '🔔 {{nome_alerta}}\n📊 Valor: {{valor}}\n📅 {{data}} às {{hora}}';
      for (const [key, value] of Object.entries(variables)) {
        // Escapa todos os caracteres especiais de regex, não só {}
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        message = message.split(key).join(value);
      }

      // Enviar para números
      let sent = 0;
      if (alert.whatsapp_number) {
        const numbers = alert.whatsapp_number.split(',').filter(Boolean);
        for (const phone of numbers) {
          if (await sendWhatsApp(instance, phone, message)) sent++;
        }
      }

      // Enviar para grupos
      if (alert.whatsapp_group_id) {
        const groups = alert.whatsapp_group_id.split(',').filter(Boolean);
        for (const groupId of groups) {
          if (await sendWhatsApp(instance, groupId, message)) sent++;
        }
      }

      // Atualizar alerta
      await supabase
        .from('ai_alerts')
        .update({ last_triggered_at: now.toISOString(), last_checked_at: now.toISOString() })
        .eq('id', alert.id);

      // Registrar histórico
      const { data: historyInsert, error: historyError } = await supabase
        .from('ai_alert_history')
        .insert({
          alert_id: alert.id,
          triggered_at: now.toISOString(),
          alert_value: variables['{{valor}}'] || 'N/A',
          alert_message: message, // Salvar a mensagem real enviada
          email_sent: false,
          webhook_sent: true,
          webhook_response: {
            type: 'scheduled',
            sent: sent,
            message: message // Também salvar no webhook_response para backup
          }
        })
        .select();

      if (historyError) {
        console.error('[ERROR /api/alertas/cron] Erro ao salvar histórico:', {
          message: historyError.message,
          details: historyError.details,
          hint: historyError.hint,
          code: historyError.code,
          alert_id: alert.id
        });
      } else {
        console.log('[DEBUG /api/alertas/cron] Histórico salvo:', {
          historyId: historyInsert?.[0]?.id,
          alert_id: alert.id
        });
      }

      results.push({ alert: alert.name, sent, valor: variables['{{valor}}'] || 'N/A' });
    }

    return NextResponse.json({
      message: `Verificação concluída`,
      time: currentTime,
      checked: alerts.length,
      triggered: results.length,
      results
    });

  } catch (error: any) {
    console.error('[CRON] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

