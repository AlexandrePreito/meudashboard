/**
 * Resolução de recursos compartilhados no nível do developer.
 * Regra: se o grupo tem recurso próprio, usa o dele (override). Se não tem, herda do developer.
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Retorna o developer_id do grupo (company_groups.developer_id).
 */
export async function getDeveloperIdForGroup(groupId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('company_groups')
    .select('developer_id')
    .eq('id', groupId)
    .single();
  return data?.developer_id || null;
}

/**
 * Resolve conexão Power BI para um grupo.
 * Prioridade: conexão do grupo → conexão compartilhada do developer.
 */
export async function resolveConnectionForGroup(
  groupId: string,
  developerId: string | null
): Promise<(Record<string, unknown> & { _source?: 'group' | 'developer' }) | null> {
  if (!developerId) return null;
  const supabase = createAdminClient();

  const { data: groupConn } = await supabase
    .from('powerbi_connections')
    .select('*')
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (groupConn) return { ...groupConn, _source: 'group' as const };

  const { data: devConn } = await supabase
    .from('powerbi_connections')
    .select('*')
    .eq('developer_id', developerId)
    .is('company_group_id', null)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle();

  if (devConn) return { ...devConn, _source: 'developer' as const };

  return null;
}

/**
 * Resolve instância WhatsApp para um grupo.
 * Prioridade: instância do grupo → instância compartilhada do developer.
 */
export async function resolveWhatsAppForGroup(
  groupId: string,
  developerId: string | null
): Promise<(Record<string, unknown> & { _source?: 'group' | 'developer' }) | null> {
  if (!developerId) return null;
  const supabase = createAdminClient();

  const { data: groupInstance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('company_group_id', groupId)
    .limit(1)
    .maybeSingle();

  if (groupInstance) return { ...groupInstance, _source: 'group' as const };

  const { data: devInstance } = await supabase
    .from('whatsapp_instances')
    .select('*')
    .eq('developer_id', developerId)
    .is('company_group_id', null)
    .eq('is_connected', true)
    .limit(1)
    .maybeSingle();

  if (devInstance) return { ...devInstance, _source: 'developer' as const };

  return null;
}

/**
 * Resolve treinamento/contextos de IA para um grupo.
 * Retorna exemplos do grupo + exemplos compartilhados do developer (merge).
 * Herança é ADITIVA: exemplos do developer são base, exemplos do grupo complementam.
 */
export async function resolveAITrainingForGroup(
  groupId: string,
  developerId: string | null
): Promise<{
  groupExamples: Record<string, unknown>[];
  developerExamples: Record<string, unknown>[];
  allExamples: Record<string, unknown>[];
}> {
  const supabase = createAdminClient();

  const { data: groupExamples } = await supabase
    .from('ai_training_examples')
    .select('*')
    .eq('company_group_id', groupId);

  const developerExamples: Record<string, unknown>[] = [];
  if (developerId) {
    const { data: devExamples } = await supabase
      .from('ai_training_examples')
      .select('*')
      .eq('developer_id', developerId)
      .is('company_group_id', null);
    if (devExamples) developerExamples.push(...devExamples);
  }

  const allExamples = [
    ...developerExamples,
    ...(groupExamples || []),
  ];

  return {
    groupExamples: groupExamples || [],
    developerExamples,
    allExamples,
  };
}

/**
 * Resolve contexto de modelo de IA (ai_model_contexts) para um grupo.
 * Prioridade: contexto do grupo → contexto compartilhado do developer.
 * Opcionalmente filtra por dataset_id.
 */
export async function resolveAIContextForGroup(
  groupId: string,
  developerId: string | null,
  datasetId?: string | null
): Promise<(Record<string, unknown> & { _source?: 'group' | 'developer' }) | null> {
  if (!developerId) return null;
  const supabase = createAdminClient();

  let groupQuery = supabase
    .from('ai_model_contexts')
    .select('*')
    .eq('company_group_id', groupId)
    .eq('is_active', true)
    .limit(1);

  if (datasetId) groupQuery = groupQuery.eq('dataset_id', datasetId);
  const { data: groupCtx } = await groupQuery.maybeSingle();
  if (groupCtx) return { ...groupCtx, _source: 'group' as const };

  let devQuery = supabase
    .from('ai_model_contexts')
    .select('*')
    .eq('developer_id', developerId)
    .is('company_group_id', null)
    .eq('is_active', true)
    .limit(1);

  if (datasetId) devQuery = devQuery.eq('dataset_id', datasetId);
  const { data: devCtx } = await devQuery.maybeSingle();
  if (devCtx) return { ...devCtx, _source: 'developer' as const };

  return null;
}

/**
 * Lista todas as conexões Power BI disponíveis para um grupo
 * (próprias do grupo + compartilhadas do developer).
 * Útil para dropdowns de seleção.
 */
export async function listAvailableConnections(
  groupId: string,
  developerId: string | null
): Promise<Array<Record<string, unknown> & { _source?: 'group' | 'developer'; _label?: string }>> {
  if (!developerId) return [];
  const supabase = createAdminClient();

  const { data: connections } = await supabase
    .from('powerbi_connections')
    .select('*')
    .or(`company_group_id.eq.${groupId},and(developer_id.eq.${developerId},company_group_id.is.null)`)
    .eq('is_active', true)
    .order('created_at');

  return (connections || []).map((c: Record<string, unknown>) => ({
    ...c,
    _source: (c.company_group_id ? 'group' : 'developer') as 'group' | 'developer',
    _label: c.company_group_id
      ? String(c.name)
      : `${c.name} (compartilhada)`,
  }));
}
