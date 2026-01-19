/**
 * Helper Functions - Admin Group Access
 * Funções auxiliares para verificar grupos onde o usuário é admin
 */

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Busca IDs dos grupos onde o usuário é admin
 */
export async function getUserAdminGroups(userId: string): Promise<string[]> {
  const supabase = createAdminClient();
  
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select('company_group_id')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true);

  return memberships?.map((m: any) => m.company_group_id) || [];
}

/**
 * Verifica se usuário é admin de um grupo específico
 */
export async function isUserAdminOfGroup(userId: string, groupId: string): Promise<boolean> {
  const supabase = createAdminClient();
  
  const { data } = await supabase
    .from('user_group_membership')
    .select('id')
    .eq('user_id', userId)
    .eq('company_group_id', groupId)
    .eq('role', 'admin')
    .eq('is_active', true)
    .maybeSingle();

  return !!data;
}

/**
 * Busca dados completos dos grupos onde usuário é admin
 */
export async function getUserAdminGroupsWithData(userId: string) {
  const supabase = createAdminClient();
  
  const { data: memberships } = await supabase
    .from('user_group_membership')
    .select(`
      company_group_id,
      company_groups:company_group_id (
        id,
        name,
        slug,
        status,
        logo_url,
        primary_color,
        secondary_color,
        quota_users,
        quota_screens,
        quota_alerts,
        quota_whatsapp_per_day,
        quota_ai_credits_per_day,
        quota_alert_executions_per_day,
        created_at
      )
    `)
    .eq('user_id', userId)
    .eq('role', 'admin')
    .eq('is_active', true);

  // Filtrar apenas grupos ativos (não excluídos ou inativos)
  return memberships
    ?.map((m: any) => m.company_groups)
    .filter((group: any) => 
      group !== null && 
      group.status === 'active' && 
      group.status !== 'deleted' && 
      group.status !== 'inactive'
    ) || [];
}
