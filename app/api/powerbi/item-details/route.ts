import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

const DAY_NAME_TO_NUM: Record<string, number> = {
  Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6
};

const TZ_MAP: Record<string, string> = {
  'E. South America Standard Time': 'America/Sao_Paulo',
  'Central Brazilian Standard Time': 'America/Cuiaba',
  'Pacific SA Standard Time': 'America/Santiago',
};

function getTzOffsetMinutes(tz: string, date: Date): number {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longOffset' });
    const parts = fmt.formatToParts(date);
    const offsetPart = parts.find(p => p.type === 'timeZoneName');
    const str = offsetPart?.value || '';
    const match = str.match(/GMT([+-])(\d+):?(\d*)/);
    if (!match) return 0;
    const sign = match[1] === '+' ? 1 : -1;
    const h = parseInt(match[2], 10);
    const m = parseInt(match[3] || '0', 10);
    return sign * (h * 60 + m);
  } catch {
    return 0;
  }
}

function calculateNextScheduledRefresh(
  schedule: { enabled?: boolean; days?: (string | number)[]; times?: string[]; localTimeZoneId?: string },
  lastRefreshIso: string | null
): string | null {
  if (!schedule?.enabled || !schedule?.days?.length || !schedule?.times?.length) return null;
  const tzRaw = schedule.localTimeZoneId || 'America/Sao_Paulo';
  const tz = TZ_MAP[tzRaw] || tzRaw;
  const refDate = lastRefreshIso ? new Date(lastRefreshIso) : new Date();
  const dayNums = schedule.days.map((d: string | number) =>
    typeof d === 'number' ? d : (DAY_NAME_TO_NUM[String(d)] ?? -1)
  ).filter((n: number) => n >= 0 && n <= 6);
  if (dayNums.length === 0) return null;

  const refParts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(refDate);
  const getPart = (type: string) => parseInt(refParts.find(p => p.type === type)?.value || '0', 10);
  const refYear = getPart('year');
  const refMonth = getPart('month') - 1;
  const refDay = getPart('day');
  const refMins = getPart('hour') * 60 + getPart('minute');

  let bestNext: Date | null = null;
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const d = new Date(refYear, refMonth, refDay + dayOffset);
    const dayOfWeek = d.getDay();
    if (!dayNums.includes(dayOfWeek)) continue;
    for (const timeStr of schedule.times) {
      const [h, m] = (timeStr || '00:00').split(':').map(Number);
      const candMins = (h || 0) * 60 + (m || 0);
      if (dayOffset === 0 && candMins <= refMins) continue;
      const candDate = new Date(refYear, refMonth, refDay + dayOffset);
      const offsetMin = getTzOffsetMinutes(tz, candDate);
      const utcMins = candMins - offsetMin;
      const utcH = Math.floor(utcMins / 60);
      const utcM = utcMins % 60;
      const candidate = new Date(Date.UTC(refYear, refMonth, refDay + dayOffset, utcH, utcM, 0, 0));
      if (candidate.getTime() > refDate.getTime() && (!bestNext || candidate.getTime() < bestNext.getTime())) {
        bestNext = candidate;
      }
    }
  }
  return bestNext ? bestNext.toISOString() : null;
}

// GET - Buscar detalhes de um dataflow ou dataset
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type'); // 'dataflow' ou 'dataset'
    const itemId = searchParams.get('id'); // ID do item no Power BI (dataflow_id ou dataset_id)
    const connectionId = searchParams.get('connection_id');

    if (!itemType || !itemId || !connectionId) {
      return NextResponse.json({ error: 'type, id e connection_id são obrigatórios' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar conexão
    const { data: connection, error: connError } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (connError || !connection) {
      return NextResponse.json({ error: 'Conexão não encontrada' }, { status: 404 });
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
      return NextResponse.json({ error: 'Falha na autenticação Power BI' }, { status: 401 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    let details: any = {
      type: itemType,
      id: itemId,
      connectionName: connection.name,
      workspaceId: connection.workspace_id
    };

    if (itemType === 'dataflow') {
      // Buscar detalhes do dataflow
      const dataflowRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (dataflowRes.ok) {
        const dataflowData = await dataflowRes.json();
        details.name = dataflowData.name;
        details.description = dataflowData.description;
        details.configuredBy = dataflowData.configuredBy;
        details.modifiedBy = dataflowData.modifiedBy;
        details.modifiedDateTime = dataflowData.modifiedDateTime;
        
        // Schedule do dataflow: o GET dataflow não retorna refreshSchedule, buscar em endpoint separado
        const dfScheduleRes = await fetch(
          `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}/refreshSchedule`,
          { headers: { 'Authorization': `Bearer ${accessToken}` } }
        );
        if (dfScheduleRes.ok) {
          const scheduleData = await dfScheduleRes.json();
          const s = scheduleData.value ?? scheduleData;
          details.powerbiSchedule = {
            enabled: s.enabled,
            days: s.days,
            times: s.times,
            localTimeZoneId: s.localTimeZoneId,
            notifyOption: s.notifyOption
          };
        } else if (dataflowData.refreshSchedule) {
          details.powerbiSchedule = {
            enabled: dataflowData.refreshSchedule.enabled,
            days: dataflowData.refreshSchedule.days,
            times: dataflowData.refreshSchedule.times,
            localTimeZoneId: dataflowData.refreshSchedule.localTimeZoneId,
            notifyOption: dataflowData.refreshSchedule.notifyOption
          };
        }
      }

      // Buscar histórico de transações
      const transactionsRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/dataflows/${itemId}/transactions?$top=10`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json();
        const transactions = (transactionsData.value || []).map((t: any) => ({
          id: t.id,
          status: t.status === 'Success' || t.status === 'Completed' ? 'Completed' : t.status,
          startTime: t.startTime,
          endTime: t.endTime
        }));
        // Ordenar por data mais recente primeiro (a API não garante ordem)
        details.refreshHistory = transactions.sort((a: any, b: any) => {
          const aTime = new Date(a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.startTime || 0).getTime();
          return bTime - aTime;
        });
      }
      const lastRefreshDf = details.refreshHistory?.[0]?.endTime || details.refreshHistory?.[0]?.startTime;
      details.nextScheduledRefresh = calculateNextScheduledRefresh(details.powerbiSchedule, lastRefreshDf);

    } else if (itemType === 'dataset') {
      // Buscar detalhes do dataset
      const datasetRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (datasetRes.ok) {
        const datasetData = await datasetRes.json();
        details.name = datasetData.name;
        details.configuredBy = datasetData.configuredBy;
        details.createdDate = datasetData.createdDate;
        details.isRefreshable = datasetData.isRefreshable;
        details.isOnPremGatewayRequired = datasetData.isOnPremGatewayRequired;
      }

      // Buscar schedule do dataset
      const scheduleRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}/refreshSchedule`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (scheduleRes.ok) {
        const scheduleData = await scheduleRes.json();
        details.powerbiSchedule = {
          enabled: scheduleData.enabled,
          days: scheduleData.days,
          times: scheduleData.times,
          localTimeZoneId: scheduleData.localTimeZoneId,
          notifyOption: scheduleData.notifyOption
        };
      }

      // Buscar histórico de refresh
      const refreshesRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${itemId}/refreshes?$top=10`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (refreshesRes.ok) {
        const refreshesData = await refreshesRes.json();
        const refreshes = (refreshesData.value || []).map((r: any) => ({
          id: r.requestId,
          status: r.status,
          startTime: r.startTime,
          endTime: r.endTime,
          refreshType: r.refreshType
        }));
        // Ordenar por data mais recente primeiro (a API não garante ordem)
        details.refreshHistory = refreshes.sort((a: any, b: any) => {
          const aTime = new Date(a.endTime || a.startTime || 0).getTime();
          const bTime = new Date(b.endTime || b.startTime || 0).getTime();
          return bTime - aTime;
        });
      }
      const lastRefreshDs = details.refreshHistory?.[0]?.endTime || details.refreshHistory?.[0]?.startTime;
      details.nextScheduledRefresh = calculateNextScheduledRefresh(details.powerbiSchedule, lastRefreshDs);
    }

    return NextResponse.json(details);

  } catch (error: any) {
    console.error('Erro ao buscar detalhes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

