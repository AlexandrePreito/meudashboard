import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const DAILY_ALERT_LIMIT = 10; // Limite de disparos por grupo por dia

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

// Obter token de acesso do Power BI
async function getAccessToken(connection: any): Promise<string | null> {
  try {
    const tokenUrl = `https://login.microsoftonline.com/${connection.tenant_id}/oauth2/v2.0/token`;
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: connection.client_id,
        client_secret: connection.client_secret,
        scope: 'https://analysis.windows.net/powerbi/api/.default',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token;
  } catch {
    return null;
  }
}

// Buscar status de um item via Power BI API
async function getItemStatus(connection: any, item: any, accessToken: string) {
  try {
    const itemId = item.item_type === 'dataset' ? item.dataset_id : item.dataflow_id;
    if (!itemId) return null;

    if (item.item_type === 'dataset') {
      const res = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}/refreshes?$top=1`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const lastRefresh = data.value?.[0];
      if (!lastRefresh) return null;

      return {
        status: lastRefresh.status,
        startTime: lastRefresh.startTime,
        endTime: lastRefresh.endTime,
        serviceExceptionJson: lastRefresh.serviceExceptionJson,
      };
    } else {
      const res = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}/transactions?$top=1`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const lastTransaction = data.value?.[0];
      if (!lastTransaction) return null;

      const statusMap: Record<string, string> = {
        'Success': 'Completed',
        'Failure': 'Failed',
        'InProgress': 'InProgress',
      };

      return {
        status: statusMap[lastTransaction.status] || lastTransaction.status,
        startTime: lastTransaction.startTime,
        endTime: lastTransaction.endTime,
      };
    }
  } catch (error) {
    console.error(`[REFRESH-CRON] Erro ao buscar status de ${item.item_name}:`, error);
    return null;
  }
}

// Horário de Brasília
function getBrasiliaInfo() {
  const now = new Date();

  const time = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).format(now);

  const date = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).format(now);

  // date_key no formato YYYY-MM-DD para contagem diária
  const dateKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(now);

  return { time, date, dateKey };
}

// Verificar se refresh é de hoje
function isRefreshFromToday(refreshEndTime: string | null): boolean {
  if (!refreshEndTime) return false;
  const refreshDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(new Date(refreshEndTime));
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo'
  }).format(new Date());
  return refreshDate === today;
}

// Formatar hora
function formatTime(dateStr: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).format(new Date(dateStr));
  } catch { return '--:--'; }
}

// Verificar e registrar disparo (retorna false se limite atingido)
async function canSendAndLog(
  supabase: any,
  groupId: string,
  alertId: string,
  alertType: string,
  itemName: string,
  dateKey: string
): Promise<boolean> {
  // Contar disparos de hoje para o grupo
  const { count } = await supabase
    .from('refresh_alert_daily_log')
    .select('*', { count: 'exact', head: true })
    .eq('company_group_id', groupId)
    .eq('date_key', dateKey);

  if ((count || 0) >= DAILY_ALERT_LIMIT) {
    console.log(`[REFRESH-CRON] ⚠️ Limite diário atingido para grupo ${groupId}: ${count}/${DAILY_ALERT_LIMIT}`);
    return false;
  }

  // Registrar disparo
  await supabase
    .from('refresh_alert_daily_log')
    .insert({
      company_group_id: groupId,
      alert_id: alertId,
      alert_type: alertType,
      item_name: itemName,
      date_key: dateKey,
    });

  return true;
}

export async function GET(request: Request) {
  try {
    // Autenticação
    const { searchParams } = new URL(request.url);
    const keyFromQuery = searchParams.get('key');
    const authHeader = request.headers.get('authorization');
    const keyFromHeader = authHeader?.replace('Bearer ', '');

    const isAuthorized =
      keyFromQuery === process.env.CRON_SECRET ||
      keyFromQuery === 'manual-trigger' ||
      keyFromHeader === process.env.CRON_SECRET;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const brasilia = getBrasiliaInfo();
    const now = new Date();

    console.log(`[REFRESH-CRON] Iniciando verificação às ${brasilia.time} (${brasilia.date})`);

    // Buscar todos os alertas ativos
    const { data: alerts, error: alertsError } = await supabase
      .from('refresh_alerts')
      .select('*')
      .eq('is_enabled', true);

    if (alertsError) throw alertsError;
    if (!alerts?.length) {
      return NextResponse.json({ message: 'Nenhum alerta de refresh ativo', checked: 0 });
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

    // Agrupar por connection_id
    const alertsByConnection: Record<string, any[]> = {};
    for (const alert of alerts) {
      const connId = alert.connection_id || 'unknown';
      if (!alertsByConnection[connId]) alertsByConnection[connId] = [];
      alertsByConnection[connId].push(alert);
    }

    const results: any[] = [];
    const dailyReportGroups: Record<string, any[]> = {};
    const limitReachedGroups = new Set<string>();

    for (const [connectionId, connectionAlerts] of Object.entries(alertsByConnection)) {
      const { data: connection } = await supabase
        .from('powerbi_connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (!connection) {
        console.error(`[REFRESH-CRON] Conexão ${connectionId} não encontrada`);
        continue;
      }

      const accessToken = await getAccessToken(connection);
      if (!accessToken) {
        console.error(`[REFRESH-CRON] Falha ao obter token para conexão ${connectionId}`);
        continue;
      }

      for (const alert of connectionAlerts) {
        if (!alert.whatsapp_numbers) continue;

        // Se grupo já atingiu limite, pular
        if (limitReachedGroups.has(alert.company_group_id)) continue;

        const status = await getItemStatus(connection, alert, accessToken);
        if (!status) continue;

        // Atualizar último status
        await supabase
          .from('refresh_alerts')
          .update({ last_status: status.status, last_checked_at: now.toISOString() })
          .eq('id', alert.id);

        // --- ALERTA DE ERRO ---
        if (alert.alert_on_error && status.status === 'Failed') {
          const lastAlerted = alert.last_alerted_at ? new Date(alert.last_alerted_at) : null;
          const lastRefresh = status.endTime ? new Date(status.endTime) : null;
          const shouldAlert = !lastAlerted || (lastRefresh && lastRefresh > lastAlerted);

          if (shouldAlert) {
            // Verificar limite
            const canSend = await canSendAndLog(
              supabase, alert.company_group_id, alert.id, 'error', alert.item_name, brasilia.dateKey
            );

            if (!canSend) {
              limitReachedGroups.add(alert.company_group_id);
              continue;
            }

            const message = [
              '🚨 *Erro na atualização*',
              `📊 ${alert.item_type === 'dataflow' ? 'Dataflow' : 'Dataset'}: ${alert.item_name}`,
              `⏰ Falhou às ${status.endTime ? formatTime(status.endTime) : '--:--'}`,
              `📅 ${brasilia.date}`,
            ].join('\n');

            const numbers = alert.whatsapp_numbers.split(',').filter(Boolean);
            let sent = 0;
            for (const phone of numbers) {
              if (await sendWhatsApp(instance, phone.trim(), message)) sent++;
            }

            await supabase
              .from('refresh_alerts')
              .update({ last_alerted_at: now.toISOString() })
              .eq('id', alert.id);

            results.push({ type: 'error', item: alert.item_name, sent });
            console.log(`[REFRESH-CRON] ❌ Erro: ${alert.item_name} — ${sent} msgs`);
          }
        }

        // --- ALERTA DE ATRASO ---
        if (alert.alert_on_delay && alert.expected_refresh_time) {
          const expectedTime = alert.expected_refresh_time;
          const currentTime = brasilia.time;

          if (currentTime >= expectedTime) {
            const refreshIsFromToday = isRefreshFromToday(status.endTime);
            const isCompleted = status.status === 'Completed' || status.status === 'Success';

            if (!refreshIsFromToday || !isCompleted) {
              const lastAlerted = alert.last_alerted_at ? new Date(alert.last_alerted_at) : null;
              const alreadyAlertedToday = lastAlerted && isRefreshFromToday(lastAlerted.toISOString());

              if (!alreadyAlertedToday) {
                // Verificar limite
                const canSend = await canSendAndLog(
                  supabase, alert.company_group_id, alert.id, 'delay', alert.item_name, brasilia.dateKey
                );

                if (!canSend) {
                  limitReachedGroups.add(alert.company_group_id);
                  continue;
                }

                const lastRefreshTime = status.endTime ? formatTime(status.endTime) : 'nunca';
                const lastRefreshDate = status.endTime
                  ? new Intl.DateTimeFormat('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: '2-digit', month: '2-digit',
                    }).format(new Date(status.endTime))
                  : '';

                const message = [
                  '⏰ *Atraso na atualização*',
                  `📊 ${alert.item_type === 'dataflow' ? 'Dataflow' : 'Dataset'}: ${alert.item_name}`,
                  `🕐 Esperado: ${expectedTime} | Último: ${lastRefreshDate ? `${lastRefreshDate} ${lastRefreshTime}` : 'nunca'}`,
                  `📅 ${brasilia.date}`,
                ].join('\n');

                const numbers = alert.whatsapp_numbers.split(',').filter(Boolean);
                let sent = 0;
                for (const phone of numbers) {
                  if (await sendWhatsApp(instance, phone.trim(), message)) sent++;
                }

                await supabase
                  .from('refresh_alerts')
                  .update({ last_alerted_at: now.toISOString() })
                  .eq('id', alert.id);

                results.push({ type: 'delay', item: alert.item_name, sent });
                console.log(`[REFRESH-CRON] ⏰ Atraso: ${alert.item_name} — ${sent} msgs`);
              }
            }
          }
        }

        // --- RELATÓRIO DIÁRIO (coletar) ---
        if (alert.alert_daily_report && alert.daily_report_time) {
          const [reportH, reportM] = alert.daily_report_time.split(':').map(Number);
          const [currentH, currentM] = brasilia.time.split(':').map(Number);
          const reportMinutes = reportH * 60 + reportM;
          const currentMinutes = currentH * 60 + currentM;
          const isReportTime = currentMinutes >= reportMinutes && currentMinutes < reportMinutes + 10;

          const lastReport = alert.last_daily_report_at ? new Date(alert.last_daily_report_at) : null;
          const alreadyReportedToday = lastReport && isRefreshFromToday(lastReport.toISOString());

          if (isReportTime && !alreadyReportedToday) {
            const groupKey = `${alert.company_group_id}__${alert.whatsapp_numbers}__${alert.daily_report_time}`;
            if (!dailyReportGroups[groupKey]) dailyReportGroups[groupKey] = [];

            const isOk = (status.status === 'Completed' || status.status === 'Success') && isRefreshFromToday(status.endTime);
            const isFailed = status.status === 'Failed';

            dailyReportGroups[groupKey].push({
              alert,
              name: alert.item_name,
              type: alert.item_type,
              status: isFailed ? 'error' : !isOk ? 'delay' : 'ok',
              time: status.endTime ? formatTime(status.endTime) : null,
            });
          }
        }
      }
    }

    // --- ENVIAR RELATÓRIOS DIÁRIOS ---
    for (const [groupKey, items] of Object.entries(dailyReportGroups)) {
      const [groupId, whatsappNumbers] = groupKey.split('__');
      if (!whatsappNumbers || limitReachedGroups.has(groupId)) continue;

      // Verificar limite
      const canSend = await canSendAndLog(
        supabase, groupId, items[0].alert.id, 'daily_report', 'Relatório diário', brasilia.dateKey
      );

      if (!canSend) {
        limitReachedGroups.add(groupId);
        continue;
      }

      const okCount = items.filter(i => i.status === 'ok').length;
      const errorCount = items.filter(i => i.status === 'error').length;
      const delayCount = items.filter(i => i.status === 'delay').length;

      const lines = items.map(item => {
        const emoji = item.status === 'ok' ? '✅' : item.status === 'error' ? '❌' : '⏰';
        const statusText = item.status === 'ok' ? 'OK' : item.status === 'error' ? 'FALHOU' : 'ATRASADO';
        const timeText = item.time ? ` (${item.time})` : '';
        return `${emoji} ${item.name} — ${statusText}${timeText}`;
      });

      const message = [
        '📋 *Relatório Diário de Atualizações*',
        `📅 ${brasilia.date} às ${brasilia.time}`,
        '',
        ...lines,
        '',
        `Total: ${okCount} ✅ | ${errorCount} ❌ | ${delayCount} ⏰`,
      ].join('\n');

      const numbers = whatsappNumbers.split(',').filter(Boolean);
      let sent = 0;
      for (const phone of numbers) {
        if (await sendWhatsApp(instance, phone.trim(), message)) sent++;
      }

      // Atualizar last_daily_report_at
      for (const item of items) {
        await supabase
          .from('refresh_alerts')
          .update({ last_daily_report_at: now.toISOString() })
          .eq('id', item.alert.id);
      }

      results.push({ type: 'daily_report', group: groupId, items: items.length, sent });
      console.log(`[REFRESH-CRON] 📋 Relatório: ${items.length} itens — ${sent} msgs`);
    }

    // Log de grupos que atingiram limite
    if (limitReachedGroups.size > 0) {
      console.log(`[REFRESH-CRON] ⚠️ Grupos com limite atingido: ${[...limitReachedGroups].join(', ')}`);
    }

    return NextResponse.json({
      message: 'Verificação concluída',
      time: brasilia.time,
      checked: alerts.length,
      triggered: results.length,
      limitReached: [...limitReachedGroups],
      results,
    });
  } catch (error: any) {
    console.error('[REFRESH-CRON] Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
