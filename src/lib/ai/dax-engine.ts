// src/lib/ai/dax-engine.ts
import createLogger from '@/lib/logger';

const log = createLogger('DAX');

// Cache de tokens Power BI (evita gerar token novo a cada chamada)
const tokenCache: Map<string, { token: string; expiresAt: number }> = new Map();

async function getAccessToken(connection: any): Promise<string> {
  const cacheKey = connection.id;
  const cached = tokenCache.get(cacheKey);

  // Token válido por mais 5 minutos? Reutilizar
  if (cached && cached.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cached.token;
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
    const errorText = await tokenResponse.text();
    throw new Error(`Erro na autenticação Power BI: ${tokenResponse.status} - ${errorText.substring(0, 200)}`);
  }

  const tokenData = await tokenResponse.json();

  // Cachear por 50 minutos (token dura 60min)
  tokenCache.set(cacheKey, {
    token: tokenData.access_token,
    expiresAt: Date.now() + 50 * 60 * 1000
  });

  return tokenData.access_token;
}

export interface DaxResult {
  success: boolean;
  results?: any[];
  error?: string;
  executionTimeMs?: number;
}

export async function executeDaxQuery(
  connectionId: string,
  datasetId: string,
  query: string,
  supabase: any
): Promise<DaxResult> {
  const startTime = Date.now();

  try {
    const { data: connection } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (!connection) {
      return { success: false, error: 'Conexão não encontrada' };
    }

    const accessToken = await getAccessToken(connection);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout

    try {
      const daxRes = await fetch(
        `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
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

        // Se erro 401, limpar cache e tentar uma vez com token novo
        if (daxRes.status === 401) {
          tokenCache.delete(connection.id);
          log.warn('Token expirado, tentando com token novo');

          const newToken = await getAccessToken(connection);
          const retryRes = await fetch(
            `https://api.powerbi.com/v1.0/myorg/groups/${connection.workspace_id}/datasets/${datasetId}/executeQueries`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${newToken}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                queries: [{ query }],
                serializerSettings: { includeNulls: true }
              })
            }
          );

          if (!retryRes.ok) {
            const retryError = await retryRes.text();
            return {
              success: false,
              error: `Erro DAX: ${retryError.substring(0, 300)}`,
              executionTimeMs: Date.now() - startTime
            };
          }

          const retryData = await retryRes.json();
          const results = retryData.results?.[0]?.tables?.[0]?.rows || [];
          return { success: true, results, executionTimeMs: Date.now() - startTime };
        }

        return {
          success: false,
          error: `Erro DAX: ${errorText.substring(0, 300)}`,
          executionTimeMs: Date.now() - startTime
        };
      }

      const daxData = await daxRes.json();
      const results = daxData.results?.[0]?.tables?.[0]?.rows || [];

      return { success: true, results, executionTimeMs: Date.now() - startTime };
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'Timeout: consulta DAX demorou mais de 20 segundos', executionTimeMs: Date.now() - startTime };
      }
      throw fetchError;
    }
  } catch (e: any) {
    return { success: false, error: e.message, executionTimeMs: Date.now() - startTime };
  }
}
