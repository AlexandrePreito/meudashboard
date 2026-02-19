// src/lib/ai/learning.ts
import createLogger from '@/lib/logger';

const log = createLogger('Learning');

// Re-export para manter compatibilidade
export { identifyQuestionIntent } from '@/lib/query-learning';

// Buscar queries que funcionaram (versão simplificada)
export async function getWorkingQueries(
  supabase: any,
  datasetId: string,
  intent: string
): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('ai_query_learning')
      .select('dax_query, times_reused')
      .eq('dataset_id', datasetId)
      .eq('question_intent', intent)
      .eq('success', true)
      .order('times_reused', { ascending: false })
      .limit(3);

    return data?.map((r: any) => r.dax_query) || [];
  } catch (e: any) {
    log.error('Erro ao buscar queries', e?.message ?? e);
    return [];
  }
}

// Salvar resultado da query para aprendizado
export async function saveQueryResult(
  supabase: any,
  datasetId: string,
  companyGroupId: string,
  userQuestion: string,
  intent: string,
  daxQuery: string,
  success: boolean,
  errorMessage?: string,
  executionTimeMs?: number,
  resultRows?: number
): Promise<void> {
  try {
    const crypto = require('crypto');
    const queryHash = crypto.createHash('md5').update(daxQuery).digest('hex');

    const { data: existing } = await supabase
      .from('ai_query_learning')
      .select('id, times_reused')
      .eq('dataset_id', datasetId)
      .eq('dax_query_hash', queryHash)
      .maybeSingle();

    if (existing && success) {
      await supabase
        .from('ai_query_learning')
        .update({
          times_reused: existing.times_reused + 1,
          last_used_at: new Date().toISOString()
        })
        .eq('id', existing.id);
    } else if (!existing) {
      await supabase
        .from('ai_query_learning')
        .insert({
          dataset_id: datasetId,
          company_group_id: companyGroupId,
          user_question: userQuestion.substring(0, 500),
          question_intent: intent,
          dax_query: daxQuery,
          dax_query_hash: queryHash,
          success,
          error_message: errorMessage?.substring(0, 500),
          execution_time_ms: executionTimeMs,
          result_rows: resultRows
        });
    }
  } catch (e: any) {
    log.error('Erro ao salvar', e?.message ?? e);
  }
}

// Detectar se a resposta da IA é uma falha
export function isFailureResponse(response: string): boolean {
  const normalized = response.toLowerCase();

  const strongFailureIndicators = [
    'não encontrei', // Inclui "não encontrei esses dados específicos", "não encontrei dados", etc.
    'não encontrei dados',
    'não consegui encontrar',
    'não tenho acesso aos dados',
    'não possuo acesso',
    'não foi possível consultar',
    'não tenho informações sobre',
    'não tenho dados sobre',
    'dados não disponíveis',
    'informação não disponível',
    'não localizei dados',
    'não há dados disponíveis',
    'não sei responder',
    'não posso responder a essa',
    'não consegui processar sua',
    'não foi possível encontrar dados',
    'não localizei informações sobre',
    'não tenho essa informação disponível'
  ];

  // Encontrar qual indicador bateu e em qual posição
  let failureIndicatorPos = -1;
  for (const indicator of strongFailureIndicators) {
    const pos = normalized.indexOf(indicator);
    if (pos !== -1) {
      failureIndicatorPos = pos;
      break;
    }
  }
  const hasStrongFailure = failureIndicatorPos !== -1;
  if (!hasStrongFailure) return false;

  // Se "não encontrei" (ou similar) aparece no INÍCIO da resposta, é falha mesmo com números depois
  // (a IA costuma dizer "não encontrei X" e em seguida listar sugestões como "R$ 4.449,00")
  const failureAtStart = failureIndicatorPos >= 0 && failureIndicatorPos < 250;
  if (failureAtStart) return true;

  const hasNumericData = /r\$\s*[\d.,]+/.test(normalized) || /\d{1,3}(\.\d{3})+(,\d{2})?/.test(normalized);
  if (hasNumericData) return false;

  return true;
}

// Identificar razão da falha
export function identifyFailureReason(response: string, hasDaxError: boolean): string {
  if (hasDaxError) return 'execution_error';

  const normalized = response.toLowerCase();
  if (normalized.includes('não encontrei') || normalized.includes('não encontrei dados') || normalized.includes('sem dados')) return 'no_data';
  if (normalized.includes('não localizei query') || normalized.includes('não entendi')) return 'no_query_match';
  if (normalized.includes('erro ao executar') || normalized.includes('erro dax')) return 'execution_error';

  return 'unknown';
}
