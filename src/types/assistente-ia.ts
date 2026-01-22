/**
 * TIPOS DO SISTEMA DE TREINAMENTO DA IA
 */

// ===============================================
// EXEMPLO DE TREINAMENTO VALIDADO
// ===============================================
export interface TrainingExample {
  id: string;
  company_group_id: string;
  company_group?: {
    id: string;
    name: string;
  } | Array<{
    id: string;
    name: string;
  }>;
  connection_id?: string;
  dataset_id?: string;
  
  // Pergunta e Resposta
  user_question: string;
  dax_query: string;
  formatted_response: string;
  
  // Metadados
  category?: string;
  tags?: string[];
  
  // Validação
  is_validated: boolean;
  validation_count: number;
  last_used_at?: string;
  
  // Auditoria
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// ===============================================
// PERGUNTA SEM RESPOSTA (FILA)
// ===============================================
export interface UnansweredQuestion {
  id: string;
  company_group_id: string;
  connection_id?: string;
  dataset_id?: string;
  
  // Pergunta
  user_question: string;
  phone_number: string;
  
  // Tentativas
  attempted_dax?: string;
  error_message?: string;
  attempt_count: number;
  
  // Priorização
  priority_score: number;
  user_count: number;
  
  // Status
  status: 'pending' | 'in_progress' | 'resolved' | 'ignored';
  resolved_at?: string;
  resolved_by?: string;
  training_example_id?: string;
  
  // Auditoria
  first_asked_at: string;
  last_asked_at: string;
  created_at: string;
}

// ===============================================
// ESTATÍSTICAS DO ASSISTENTE
// ===============================================
export interface AssistantStats {
  id: string;
  company_group_id: string;
  stat_date: string;
  
  // Métricas
  questions_asked: number;
  questions_answered: number;
  questions_failed: number;
  avg_response_time_ms?: number;
  
  // Taxas
  success_rate?: number;
  
  created_at: string;
  updated_at: string;
}

// ===============================================
// RESULTADO DE TESTE
// ===============================================
export interface TestResult {
  success: boolean;
  message?: string;
  
  // Query executada
  dax_query?: string;
  execution_time_ms?: number;
  
  // Resultado
  data?: any;
  formatted_response?: string;
  
  // Erro (se houver)
  error?: string;
  error_details?: string;
}

// ===============================================
// FORMULÁRIO DE TREINAMENTO
// ===============================================
export interface TrainingFormData {
  user_question: string;
  dax_query: string;
  formatted_response: string;
  category?: string;
  tags?: string[];
  connection_id?: string;
  dataset_id?: string;
}

// ===============================================
// ESTATÍSTICAS DE EVOLUÇÃO
// ===============================================
export interface EvolutionStats {
  period: string; // data ou período
  
  // Métricas gerais
  total_questions: number;
  answered_questions: number;
  failed_questions: number;
  success_rate: number;
  
  // Treinamento
  training_examples_added: number;
  pending_questions: number;
  
  // Performance
  avg_response_time_ms?: number;
}

// ===============================================
// PERGUNTA AGRUPADA (PARA DASHBOARD)
// ===============================================
export interface GroupedQuestion {
  question_pattern: string; // padrão identificado
  count: number; // quantas vezes foi perguntada
  first_asked: string;
  last_asked: string;
  status: 'pending' | 'resolved' | 'ignored';
  priority_score: number;
  example_questions: string[]; // exemplos específicos
}

// ===============================================
// FILTROS DE BUSCA
// ===============================================
export interface TrainingFilters {
  search?: string;
  category?: string;
  tags?: string[];
  connection_id?: string;
  dataset_id?: string;
  validated_only?: boolean;
  order_by?: 'validation_count' | 'last_used' | 'created_at';
  order_direction?: 'asc' | 'desc';
}

export interface QuestionFilters {
  search?: string;
  status?: 'pending' | 'in_progress' | 'resolved' | 'ignored';
  phone_number?: string;
  connection_id?: string;
  dataset_id?: string;
  priority_min?: number;
  order_by?: 'priority_score' | 'user_count' | 'last_asked' | 'created_at';
  order_direction?: 'asc' | 'desc';
}

// ===============================================
// RESPOSTA DE API
// ===============================================
export interface TrainingAPIResponse {
  success: boolean;
  message?: string;
  data?: TrainingExample | TrainingExample[];
  error?: string;
}

export interface QuestionAPIResponse {
  success: boolean;
  message?: string;
  data?: UnansweredQuestion | UnansweredQuestion[];
  error?: string;
}

export interface StatsAPIResponse {
  success: boolean;
  data?: {
    daily: EvolutionStats[];
    weekly: EvolutionStats[];
    monthly: EvolutionStats[];
    summary: {
      total_examples: number;
      total_pending: number;
      success_rate_7d: number;
      success_rate_30d: number;
    };
  };
  error?: string;
}

// ===============================================
// AÇÃO DE TREINAMENTO
// ===============================================
export interface TrainingAction {
  type: 'save' | 'test' | 'edit' | 'delete';
  data?: TrainingFormData;
  example_id?: string;
}

export interface QuestionAction {
  type: 'resolve' | 'ignore' | 'reopen';
  question_id: string;
  training_example_id?: string;
}
