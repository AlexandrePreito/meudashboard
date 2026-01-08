import { createAdminClient } from '@/lib/supabase/admin';

interface LogParams {
  userId?: string | null;
  companyGroupId?: string | null;
  actionType: 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'query' | 'alert' | 'message';
  module: 'auth' | 'powerbi' | 'whatsapp' | 'alertas' | 'chat_ia' | 'config';
  description: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
}

export async function logActivity(params: LogParams): Promise<void> {
  try {
    const supabase = createAdminClient();

    await supabase.from('activity_logs').insert({
      user_id: params.userId || null,
      company_group_id: params.companyGroupId || null,
      action_type: params.actionType,
      module: params.module,
      description: params.description,
      entity_type: params.entityType || null,
      entity_id: params.entityId || null,
      metadata: params.metadata || {},
      ip_address: params.ipAddress || null
    });
  } catch (error) {
    console.error('Erro ao registrar log:', error);
  }
}

// Helper para pegar o grupo do usuário
export async function getUserGroupId(userId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    
    const { data: membership } = await supabase
      .from('user_group_membership')
      .select('company_group_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    return membership?.company_group_id || null;
  } catch {
    return null;
  }
}
