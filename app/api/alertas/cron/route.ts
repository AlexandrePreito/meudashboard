import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const CONDITIONS_MAP: Record<string, string> = {
  'greater_than': 'Maior que',
  'less_than': 'Menor que',
  'equals': 'Igual a',
  'not_equals': 'Diferente de',
  'greater_or_equal': 'Maior ou igual',
  'less_or_equal': 'Menor ou igual',
};

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

      // Executar DAX e extrair todas as variáveis
      let variables: Record<string, string> = {
        '{{nome_alerta}}': alert.name,
        '{{data}}': now.toLocaleDateString('pt-BR'),
        '{{hora}}': now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        '{{condicao}}': CONDITIONS_MAP[alert.condition] || alert.condition,
        '{{threshold}}': alert.threshold?.toLocaleString('pt-BR') || '0',
      };

      let daxResult: any = null;
      if (alert.connection_id && alert.dataset_id && alert.dax_query) {
        daxResult = await executeDaxQuery(alert.connection_id, alert.dataset_id, alert.dax_query, supabase);
        
        if (daxResult.success && daxResult.results?.length > 0) {
          const row = daxResult.results[0];
          
          // Extrair todas as colunas do resultado DAX como variáveis
          for (const [key, value] of Object.entries(row)) {
            // Remove colchetes do nome da coluna: [Valor] -> Valor
            const cleanKey = key.replace(/^\[|\]$/g, '').toLowerCase().replace(/\s+/g, '_');
            
            // Formata o valor
            let formattedValue: string;
            if (typeof value === 'number') {
              // Se parece ser valor monetário (maior que 100), formata como moeda
              if (Math.abs(value) >= 100) {
                formattedValue = value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
              } else {
                formattedValue = value.toLocaleString('pt-BR');
              }
            } else {
              formattedValue = String(value || '');
            }
            
            // Adiciona como variável (várias formas de acessar)
            variables[`{{${cleanKey}}}`] = formattedValue;
            variables[`{{${key}}}`] = formattedValue;
          }
          
          // Garantir que {{valor}} pegue o primeiro valor numérico
          const firstNumericValue = Object.values(row).find(v => typeof v === 'number');
          if (firstNumericValue !== undefined) {
            variables['{{valor}}'] = (firstNumericValue as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        message = message.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value);
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
      await supabase.from('ai_alert_history').insert({
        alert_id: alert.id,
        triggered_at: now.toISOString(),
        trigger_type: 'scheduled',
        value_at_trigger: variables['{{valor}}'] || 'N/A',
        notification_sent: true,
        notification_details: JSON.stringify({ sent })
      });

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

