/**
 * HELPERS PARA CONSTRUÇÃO DO PROMPT
 */

import { createClient } from '@/lib/supabase/server';

// ===============================================
// Buscar contexto do modelo
// ===============================================
export async function getModelContext(
  companyGroupId: string,
  connectionId?: string,
  datasetId?: string
): Promise<string | null> {
  const supabase = await createClient();

  const query = supabase
    .from('ai_model_contexts')
    .select('context_content, context_name')
    .eq('company_group_id', companyGroupId)
    .eq('is_active', true);

  if (connectionId) {
    query.eq('connection_id', connectionId);
  }

  if (datasetId) {
    query.eq('dataset_id', datasetId);
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  // Limitar tamanho (10.000 caracteres)
  const content = data.context_content || '';
  return content.substring(0, 10000);
}

// ===============================================
// Buscar exemplos de treinamento
// ===============================================
export async function getTrainingExamples(
  companyGroupId: string,
  connectionId?: string,
  datasetId?: string,
  limit: number = 20
): Promise<any[]> {
  const supabase = await createClient();

  const query = supabase
    .from('ai_training_examples')
    .select('id, user_question, dax_query, formatted_response, validation_count')
    .eq('company_group_id', companyGroupId)
    .eq('is_validated', true)
    .order('validation_count', { ascending: false })
    .order('last_used_at', { ascending: false })
    .limit(limit);

  if (connectionId) {
    query.eq('connection_id', connectionId);
  }

  if (datasetId) {
    query.eq('dataset_id', datasetId);
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  return data;
}

// ===============================================
// Buscar histórico de conversa
// ===============================================
export async function getConversationHistory(
  companyGroupId: string,
  phoneNumber: string,
  limit: number = 10
): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('direction, message_content, created_at')
    .eq('company_group_id', companyGroupId)
    .eq('phone_number', phoneNumber)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  // Inverter ordem (mais antigas primeiro)
  return data.reverse().map(msg => ({
    role: msg.direction === 'incoming' ? 'user' : 'assistant',
    content: msg.message_content,
    timestamp: msg.created_at
  }));
}
