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

// Detectar se a resposta da IA é uma falha/evasiva
export function isFailureResponse(response: string): boolean {
  const normalized = response.toLowerCase();

  // ============================================
  // INDICADORES FORTES DE FALHA (presença = falha)
  // ============================================
  const strongFailureIndicators = [
    // Não encontrou dados
    'não encontrei',
    'não consegui encontrar',
    'não tenho acesso aos dados',
    'não possuo acesso',
    'não foi possível consultar',
    'não tenho informações sobre',
    'não tenho dados sobre',
    'dados não disponíveis',
    'informação não disponível',
    'não localizei dados',
    'não localizei informações',
    'não há dados disponíveis',
    'não sei responder',
    'não posso responder',
    'não consegui processar',
    'não foi possível encontrar',
    'não tenho essa informação',

    // Não entendeu a pergunta
    'não entendi sua mensagem',
    'não entendi sua pergunta',
    'não entendi o que',
    'não compreendi',
    'parece que houve algum problema na digitação',

    // Produto/item não existe
    'não existe no sistema',
    'não existe no banco',
    'não encontrei nenhum produto',
    'não encontrei nenhum cliente',
    'não encontrei nenhum registro',
    'produto não existe',
    'cliente não existe',

    // IA admitindo que errou ou não sabe
    'este valor parece representar',
    'pode não estar correto',
    'não foi possível identificar',
    'não consegui identificar',
    'não reconheço esse',
    'não reconheci esse',
  ];

  // ============================================
  // INDICADORES DE EVASÃO (a IA desvia da pergunta)
  // ============================================
  const evasionIndicators = [
    'posso analisar:',
    'posso verificar:',
    'posso te ajudar com',
    'talvez você queira',
    'você quis dizer',
    'tente perguntar de outra forma',
    'reformule sua pergunta',
    'pode me dar mais detalhes',
  ];

  // Verificar indicadores fortes
  let hasStrongFailure = false;
  let failurePos = -1;
  for (const indicator of strongFailureIndicators) {
    const pos = normalized.indexOf(indicator);
    if (pos !== -1) {
      hasStrongFailure = true;
      failurePos = pos;
      log.info(`[isFailureResponse] ⚠️ Indicador forte encontrado: "${indicator}" na posição ${pos}`);
      break;
    }
  }

  // Verificar indicadores de evasão
  let hasEvasion = false;
  for (const indicator of evasionIndicators) {
    if (normalized.includes(indicator)) {
      hasEvasion = true;
      log.info(`[isFailureResponse] ⚠️ Indicador de evasão encontrado: "${indicator}"`);
      break;
    }
  }

  // Se não tem nenhum indicador, não é falha
  if (!hasStrongFailure && !hasEvasion) return false;

  // Se tem indicador forte no início (primeiros 300 chars), é falha MESMO com valores numéricos
  if (hasStrongFailure && failurePos >= 0 && failurePos < 300) {
    log.info('[isFailureResponse] 🔴 Falha forte no início da resposta');
    return true;
  }

  // Se tem EVASÃO + NÃO tem dados numéricos relevantes → é falha
  if (hasEvasion) {
    const hasSubstantialData = /r\$\s*[\d.,]+/.test(normalized) && !normalized.includes('parece representar') && !normalized.includes('pode não estar');
    if (!hasSubstantialData) {
      log.info('[isFailureResponse] 🔴 Evasão sem dados substanciais');
      return true;
    }
  }

  // Se tem indicador forte + admissão de erro junto com valor numérico → é falha
  if (hasStrongFailure) {
    const admitsError = normalized.includes('parece representar') ||
                        normalized.includes('pode não estar correto') ||
                        normalized.includes('pode ser que') ||
                        normalized.includes('observação');
    if (admitsError) {
      log.info('[isFailureResponse] 🔴 Tem valor numérico mas admite erro');
      return true;
    }

    // Se tem dado numérico e NÃO admite erro, provavelmente respondeu algo útil
    const hasNumericData = /r\$\s*[\d.,]+/.test(normalized) || /\d{1,3}(\.\d{3})+(,\d{2})?/.test(normalized);
    if (hasNumericData) {
      log.info('[isFailureResponse] ✅ Tem dados numéricos sem admissão de erro, considerando OK');
      return false;
    }

    return true;
  }

  return false;
}

// Identificar razão da falha
export function identifyFailureReason(response: string, hasDaxError: boolean): string {
  if (hasDaxError) return 'execution_error';

  const normalized = response.toLowerCase();

  if (normalized.includes('não entendi') || normalized.includes('não compreendi')) return 'not_understood';
  if (normalized.includes('não encontrei') || normalized.includes('sem dados') || normalized.includes('não localizei')) return 'no_data';
  if (normalized.includes('não existe no sistema') || normalized.includes('produto não existe')) return 'entity_not_found';
  if (normalized.includes('parece representar') || normalized.includes('pode não estar correto')) return 'incorrect_data';
  if (normalized.includes('posso analisar') || normalized.includes('talvez você queira')) return 'evasive_response';
  if (normalized.includes('erro ao executar') || normalized.includes('erro dax')) return 'execution_error';

  return 'unknown';
}
