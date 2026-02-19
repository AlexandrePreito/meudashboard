// src/lib/query-learning.ts
// Sistema de aprendizado de queries DAX

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryLearningData {
  company_group_id: string;
  connection_id?: string;
  dataset_id: string;
  user_question: string;
  dax_query?: string;
  measures_used?: string[];
  columns_used?: string[];
  was_successful: boolean;
  source?: 'whatsapp' | 'chat' | 'api';
  created_by?: string;
}

export interface SimilarQuery {
  id: string;
  user_question: string;
  dax_query: string;
  measures_used?: string[];
  columns_used?: string[];
  times_reused: number;
  success: boolean;
  similarity_score?: number;
}

export interface TrainingExample {
  id: string;
  user_question: string;
  dax_query: string;
  formatted_response: string;
  category: string;
  tags: string[];
  similarity_score?: number;
  measures_used?: string[];
  concept_match?: number;
}

export interface QueryContext {
  similarQueries: SimilarQuery[];
  trainingExamples: TrainingExample[];
  suggestedMeasures: string[];
  suggestedApproach?: string;
}

/**
 * Identifica intenção da pergunta para buscar queries similares
 */
export function identifyQuestionIntent(question: string): string {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Faturamento
  if (q.match(/faturamento.*(filial|loja|unidade)/)) return 'faturamento_filial';
  if (q.match(/faturamento.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/faturamento.*(produto|item)/)) return 'faturamento_produto';
  if (q.match(/faturamento|faturou|receita total|vendeu quanto/)) return 'faturamento_total';
  
  // Vendas por
  if (q.match(/vendas?.*(filial|loja)/)) return 'faturamento_filial';
  if (q.match(/vendas?.*(vendedor|garcom|funcionario)/)) return 'faturamento_vendedor';
  if (q.match(/vendas?.*(produto|item)/)) return 'faturamento_produto';
  
  // Rankings
  if (q.match(/top.*(vendedor|garcom|funcionario)|melhor vendedor|quem (mais )?vendeu/)) return 'top_vendedores';
  if (q.match(/top.*(produto|item)|produto.*(mais|melhor)/)) return 'top_produtos';
  if (q.match(/top.*(filial|loja)|filial.*(mais|melhor)/)) return 'top_filiais';
  
  // Métricas
  if (q.match(/ticket.*(medio|médio)/)) return 'ticket_medio';
  if (q.match(/margem|lucro/)) return 'margem';
  if (q.match(/cmv|custo/)) return 'cmv';
  
  // Financeiro
  if (q.match(/contas?.*(pagar|vencer)|a pagar/)) return 'contas_pagar';
  if (q.match(/contas?.*(receber)|a receber/)) return 'contas_receber';
  if (q.match(/saldo|caixa|banco/)) return 'saldo';
  
  return 'outros';
}

/**
 * Mapeamento de conceitos para busca semântica
 */
const conceptMapping: Record<string, string[]> = {
  'pagar': ['pagar', 'pagamento', 'despesa', 'saída', 'contas a pagar', 'cp', 'fornecedor', 'a pagar', 'vencer'],
  'receber': ['receber', 'recebimento', 'receita', 'entrada', 'contas a receber', 'cr', 'cliente', 'a receber'],
  'inadimplencia': ['inadimplência', 'inadimplencia', 'atraso', 'atrasado', 'vencido', 'devendo', 'dívida', 'devedor'],
  'saldo': ['saldo', 'banco', 'disponível', 'caixa', 'conta bancária', 'posição'],
  'fluxo': ['fluxo', 'movimentação', 'entradas e saídas', 'dfc', 'fluxo de caixa'],
  'vencimento': ['vence', 'vencimento', 'vencer', 'vencida', 'vencidas'],
  'tempo': ['hoje', 'amanhã', 'ontem', 'semana', 'mês', 'ano', 'dia', 'período', 'data'],
  'ranking': ['top', 'melhor', 'pior', 'maior', 'menor', 'ranking', 'mais', 'menos'],
  'faturamento': ['faturamento', 'faturou', 'vendas', 'receita', 'vendeu'],
  'margem': ['margem', 'lucro', 'lucratividade', 'rentabilidade']
};

/**
 * Identifica conceitos da pergunta
 */
function identifyConcept(question: string): string[] {
  const normalized = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const concepts: string[] = [];
  
  for (const [concept, keywords] of Object.entries(conceptMapping)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      concepts.push(concept);
    }
  }
  
  return concepts;
}

/**
 * Extrai palavras-chave de uma pergunta (remove stopwords)
 */
function extractKeywords(question: string): string[] {
  const stopwords = new Set([
    'qual', 'quais', 'quanto', 'quantos', 'quantas', 'como', 'onde', 'quando',
    'de', 'da', 'do', 'das', 'dos', 'em', 'na', 'no', 'nas', 'nos',
    'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
    'é', 'são', 'foi', 'foram', 'ser', 'estar',
    'para', 'por', 'com', 'sem', 'sobre', 'entre',
    'que', 'quem', 'cujo', 'cuja', 'cujos', 'cujas',
    'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas',
    'me', 'te', 'se', 'nos', 'vos', 'lhe', 'lhes',
    'meu', 'minha', 'meus', 'minhas', 'teu', 'tua', 'teus', 'tuas',
    'seu', 'sua', 'seus', 'suas', 'nosso', 'nossa', 'nossos', 'nossas',
    'deles', 'delas', 'dela', 'dele'
  ]);

  const words = question
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));

  return [...new Set(words)];
}

/**
 * Calcula similaridade entre duas perguntas (simples, baseado em palavras-chave)
 */
function calculateSimilarity(question1: string, question2: string): number {
  const words1 = question1.toLowerCase().split(/\s+/);
  const words2 = question2.toLowerCase().split(/\s+/);
  
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

/**
 * Busca exemplos de treinamento relevantes para a pergunta (por CONCEITO)
 */
export async function findTrainingExamples(
  supabase: SupabaseClient,
  question: string,
  datasetId: string,
  limit: number = 5
): Promise<TrainingExample[]> {
  try {
    const keywords = extractKeywords(question);
    const concepts = identifyConcept(question);
    
    const { data, error } = await supabase
      .from('ai_training_examples')
      .select('id, user_question, dax_query, formatted_response, category, tags')
      .eq('dataset_id', datasetId)
      .eq('is_validated', true)
      .limit(50);

    if (error || !data) {
      console.error('[findTrainingExamples] Erro ao buscar:', error);
      return [];
    }

    // Calcular similaridade por CONCEITO e keywords
    const scored = data.map(example => {
      const exampleKeywords = extractKeywords(example.user_question);
      const exampleConcepts = identifyConcept(example.user_question);
      
      let score = 0;
      
      // Match por CONCEITO (peso maior - 5 pontos por conceito)
      const matchingConcepts = concepts.filter(c => exampleConcepts.includes(c));
      score += matchingConcepts.length * 5;
      
      // Match por keywords da pergunta (peso médio - 2 pontos)
      keywords.forEach(kw => {
        if (exampleKeywords.includes(kw)) score += 2;
      });
      
      // Match por tags (peso baixo - 1 ponto)
      if (example.tags && Array.isArray(example.tags)) {
        keywords.forEach(kw => {
          if (example.tags.some((tag: string) => tag.toLowerCase().includes(kw))) {
            score += 1;
          }
        });
      }

      // Match por categoria (peso baixo - 1 ponto)
      if (example.category) {
        const categoryLower = example.category.toLowerCase();
        keywords.forEach(kw => {
          if (categoryLower.includes(kw)) score += 1;
        });
      }

      return { 
        ...example, 
        similarity_score: score,
        concept_match: matchingConcepts.length,
        tags: example.tags || []
      };
    });

    // Filtrar e ordenar (priorizar matches de conceito)
    const filtered = scored
      .filter(e => e.similarity_score > 0)
      .sort((a, b) => {
        // Primeiro por número de conceitos matchados
        if (b.concept_match !== a.concept_match) {
          return b.concept_match - a.concept_match;
        }
        // Depois por score total
        return (b.similarity_score || 0) - (a.similarity_score || 0);
      })
      .slice(0, limit);

    if (filtered.length > 0) {
      console.log(`[findTrainingExamples] Encontrados ${filtered.length} exemplos (conceitos: ${concepts.join(', ')})`);
    }

    return filtered;
  } catch (err: any) {
    console.error('[findTrainingExamples] Erro:', err);
    return [];
  }
}

/**
 * Formata exemplos de treinamento para o prompt (compacto, sem regras duplicadas)
 */
export function formatTrainingExamplesForPrompt(examples: TrainingExample[]): string {
  if (examples.length === 0) return '';

  const parts: string[] = [];
  parts.push('\n## EXEMPLOS DE TREINAMENTO (ADAPTE conforme a pergunta)\n');

  examples.forEach((ex, i) => {
    const measures = (ex as any).measures_used || extractMeasuresAndColumns(ex.dax_query).measures;
    const measuresText = measures.length > 0 ? measures.join(', ') : '';
    
    parts.push(`### ${i + 1}. "${ex.user_question}"`);
    if (measuresText) parts.push(`Medidas: ${measuresText}`);
    parts.push('```dax');
    parts.push(ex.dax_query);
    parts.push('```');
    if (ex.formatted_response) {
      parts.push(`Resposta: "${ex.formatted_response}"`);
    }
    parts.push('');
  });

  parts.push('Mantenha a MEDIDA do exemplo. Adapte FILTRO e AGRUPADOR conforme a pergunta.');

  return parts.join('\n');
}

/**
 * Atualiza last_used_at quando um exemplo é usado
 */
export async function markTrainingExampleUsed(
  supabase: SupabaseClient,
  exampleId: string
): Promise<void> {
  try {
    await supabase
      .from('ai_training_examples')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', exampleId);
  } catch (err) {
    console.error('[markTrainingExampleUsed] Erro:', err);
  }
}

/**
 * Busca queries similares para uma pergunta
 */
export async function getQueryContext(
  supabase: SupabaseClient,
  question: string,
  connectionId: string | null,
  datasetId: string | null,
  limit: number = 5
): Promise<QueryContext> {
  try {
    if (!datasetId) {
      return {
        similarQueries: [],
        trainingExamples: [],
        suggestedMeasures: [],
        suggestedApproach: undefined
      };
    }

    const intent = identifyQuestionIntent(question);
    
    // Buscar queries que funcionaram para a mesma intenção
    const { data: queries, error } = await supabase
      .from('ai_query_learning')
      .select('id, user_question, dax_query, times_reused, success')
      .eq('dataset_id', datasetId)
      .eq('question_intent', intent)
      .eq('success', true)
      .order('times_reused', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .limit(limit * 2); // Buscar mais para filtrar por similaridade

    if (error || !queries) {
      console.error('[QueryLearning] Erro ao buscar queries:', error);
      // Continuar mesmo com erro, retornar contexto vazio
      const trainingExamples = datasetId 
        ? await findTrainingExamples(supabase, question, datasetId, 3)
        : [];
      
      return {
        similarQueries: [],
        trainingExamples,
        suggestedMeasures: [],
        suggestedApproach: undefined
      };
    }

    // Calcular similaridade e ordenar
    const queriesWithSimilarity = queries.map(q => ({
      ...q,
      similarity_score: calculateSimilarity(question, q.user_question)
    }));

    // Filtrar por similaridade mínima (0.3) e ordenar
    const similarQueries = queriesWithSimilarity
      .filter(q => q.similarity_score >= 0.3)
      .sort((a, b) => b.similarity_score! - a.similarity_score!)
      .slice(0, limit)
      .map(q => ({
        id: q.id,
        user_question: q.user_question,
        dax_query: q.dax_query,
        times_reused: q.times_reused || 0,
        success: q.success,
        similarity_score: q.similarity_score
      }));

    if (similarQueries.length > 0) {
      console.log(`[QueryLearning] Encontradas ${similarQueries.length} queries similares para intent: ${intent}`);
    }

    // Buscar exemplos de treinamento
    const trainingExamples = datasetId 
      ? await findTrainingExamples(supabase, question, datasetId, 3)
      : [];

    // Extrair medidas sugeridas de ambas as fontes
    const measureCounts = new Map<string, number>();
    
    similarQueries.forEach(q => {
      const extracted = extractMeasuresAndColumns(q.dax_query);
      extracted.measures.forEach(m => {
        measureCounts.set(m, (measureCounts.get(m) || 0) + 1);
      });
    });

    // Extrair medidas dos exemplos de treinamento também (peso maior)
    trainingExamples.forEach(ex => {
      const extracted = extractMeasuresAndColumns(ex.dax_query);
      extracted.measures.forEach(m => {
        measureCounts.set(m, (measureCounts.get(m) || 0) + 2); // Peso maior para exemplos treinados
      });
    });

    const suggestedMeasures = Array.from(measureCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([measure]) => measure);

    return {
      similarQueries,
      trainingExamples,
      suggestedMeasures,
      suggestedApproach: undefined
    };
  } catch (error: any) {
    console.error('[QueryLearning] Erro ao buscar contexto:', error);
    return {
      similarQueries: [],
      trainingExamples: [],
      suggestedMeasures: [],
      suggestedApproach: undefined
    };
  }
}

/**
 * Formata contexto completo para incluir no prompt (compacto)
 */
export function formatQueryContextForPrompt(context: QueryContext): string {
  const parts: string[] = [];

  // Exemplos de treinamento (prioridade alta)
  if (context.trainingExamples && context.trainingExamples.length > 0) {
    parts.push(formatTrainingExamplesForPrompt(context.trainingExamples));
  }

  // Queries similares do histórico
  if (context.similarQueries.length > 0) {
    parts.push('\n## QUERIES QUE FUNCIONARAM\n');
    
    context.similarQueries.slice(0, 3).forEach((q, i) => {
      parts.push(`${i + 1}. "${q.user_question}" (usada ${q.times_reused}x)`);
      parts.push('```dax');
      parts.push(q.dax_query);
      parts.push('```');
    });

    parts.push('Adapte estas queries para a pergunta atual.');
  }

  // Medidas sugeridas
  if (context.suggestedMeasures.length > 0) {
    parts.push(`\nMedidas recomendadas: ${context.suggestedMeasures.join(', ')}`);
  }

  return parts.join('\n');
}

/**
 * Extrai medidas e colunas de uma query DAX
 */
export function extractMeasuresAndColumns(daxQuery: string): {
  measures: string[];
  columns: string[];
} {
  const measures: string[] = [];
  const columns: string[] = [];

  // Padrão para medidas: [NomeMedida]
  const measurePattern = /\[([A-Za-z_][A-Za-z0-9_]*)\]/g;
  const measureMatches = daxQuery.matchAll(measurePattern);

  for (const match of measureMatches) {
    const name = match[1];
    // Heurística: medidas geralmente começam com QA_, Soma_, Media_, etc
    if (name.startsWith('QA_') || name.startsWith('Soma_') || name.startsWith('Media_') || 
        name.startsWith('Conta_') || name.startsWith('Max_') || name.startsWith('Min_')) {
      if (!measures.includes(name)) {
        measures.push(name);
      }
    } else {
      // Pode ser coluna ou medida, adicionar em columns
      if (!columns.includes(name)) {
        columns.push(name);
      }
    }
  }

  // Padrão para colunas: 'Tabela'[Coluna]
  const columnPattern = /'([^']+)'\[([^\]]+)\]/g;
  const columnMatches = daxQuery.matchAll(columnPattern);

  for (const match of columnMatches) {
    const table = match[1];
    const column = match[2];
    const fullName = `${table}.${column}`;
    if (!columns.includes(fullName)) {
      columns.push(fullName);
    }
  }

  return { measures, columns };
}

/**
 * Salva query no sistema de aprendizado
 */
export async function saveQueryLearning(
  supabase: SupabaseClient,
  data: QueryLearningData
): Promise<string | null> {
  try {
    const intent = identifyQuestionIntent(data.user_question);
    
    // Se não tem query DAX, não salvar
    if (!data.dax_query) {
      return null;
    }

    // Gerar hash da query
    const crypto = require('crypto');
    const queryHash = crypto.createHash('md5').update(data.dax_query).digest('hex');

    // Extrair medidas e colunas se não foram fornecidas
    let measuresUsed = data.measures_used || [];
    let columnsUsed = data.columns_used || [];
    
    if (measuresUsed.length === 0 && columnsUsed.length === 0) {
      const extracted = extractMeasuresAndColumns(data.dax_query);
      measuresUsed = extracted.measures;
      columnsUsed = extracted.columns;
    }

    // Verificar se query já existe
    const { data: existing } = await supabase
      .from('ai_query_learning')
      .select('id, times_reused')
      .eq('dataset_id', data.dataset_id)
      .eq('dax_query_hash', queryHash)
      .maybeSingle();

    if (existing) {
      // Atualizar query existente
      await supabase
        .from('ai_query_learning')
        .update({
          times_reused: (existing.times_reused || 0) + 1,
          last_used_at: new Date().toISOString(),
          success: data.was_successful
        })
        .eq('id', existing.id);
      
      console.log(`[QueryLearning] Query atualizada, times_reused: ${(existing.times_reused || 0) + 1}`);
      return existing.id;
    } else {
      // Inserir nova query
      const { data: newQuery, error } = await supabase
        .from('ai_query_learning')
        .insert({
          dataset_id: data.dataset_id,
          company_group_id: data.company_group_id,
          user_question: data.user_question.substring(0, 500),
          question_intent: intent,
          dax_query: data.dax_query,
          dax_query_hash: queryHash,
          success: data.was_successful,
          execution_time_ms: null,
          result_rows: null
        })
        .select('id')
        .single();

      if (error) {
        console.error('[QueryLearning] Erro ao salvar:', error);
        return null;
      }

      console.log(`[QueryLearning] Nova query salva, success: ${data.was_successful}`);
      return newQuery.id;
    }
  } catch (error: any) {
    console.error('[QueryLearning] Erro ao salvar query:', error);
    return null;
  }
}

/**
 * Registra feedback do usuário sobre uma query
 */
export async function registerFeedback(
  supabase: SupabaseClient,
  queryId: string,
  feedback: 'positive' | 'negative',
  comment?: string
): Promise<boolean> {
  try {
    // Buscar query atual
    const { data: query } = await supabase
      .from('ai_query_learning')
      .select('id, success, times_reused')
      .eq('id', queryId)
      .single();

    if (!query) {
      console.error('[QueryLearning] Query não encontrada:', queryId);
      return false;
    }

    // Atualizar baseado no feedback
    const updates: any = {
      last_used_at: new Date().toISOString()
    };

    if (feedback === 'positive') {
      // Feedback positivo: marcar como sucesso e incrementar uso
      updates.success = true;
      updates.times_reused = (query.times_reused || 0) + 1;
    } else {
      // Feedback negativo: marcar como falha
      updates.success = false;
      if (comment) {
        updates.error_message = comment.substring(0, 500);
      }
    }

    const { error } = await supabase
      .from('ai_query_learning')
      .update(updates)
      .eq('id', queryId);

    if (error) {
      console.error('[QueryLearning] Erro ao atualizar feedback:', error);
      return false;
    }

    console.log(`[QueryLearning] Feedback ${feedback} registrado para query ${queryId}`);
    return true;
  } catch (error: any) {
    console.error('[QueryLearning] Erro ao registrar feedback:', error);
    return false;
  }
}

/**
 * Busca queries mais usadas para um dataset
 */
export async function getTopQueries(
  supabase: SupabaseClient,
  datasetId: string,
  limit: number = 10
): Promise<SimilarQuery[]> {
  try {
    const { data: queries, error } = await supabase
      .from('ai_query_learning')
      .select('id, user_question, dax_query, times_reused, success')
      .eq('dataset_id', datasetId)
      .eq('success', true)
      .order('times_reused', { ascending: false })
      .limit(limit);

    if (error || !queries) {
      return [];
    }

    return queries.map(q => ({
      id: q.id,
      user_question: q.user_question,
      dax_query: q.dax_query,
      times_reused: q.times_reused || 0,
      success: q.success
    }));
  } catch (error) {
    console.error('[QueryLearning] Erro ao buscar top queries:', error);
    return [];
  }
}
