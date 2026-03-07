import { createAdminClient } from '@/lib/supabase/admin';

export type ActionType = 'login' | 'logout' | 'create' | 'update' | 'delete' | 'view' | 'export' | 'execute';
export type ModuleType = 'auth' | 'powerbi' | 'whatsapp' | 'assistente-ia' | 'alertas' | 'admin' | 'config' | 'dashboard';

export interface LogActivityParams {
  userId?: string;
  companyGroupId?: string;
  actionType: ActionType;
  module: ModuleType;
  description?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Grava log de atividade na tabela activity_logs (server-side, direto no Supabase).
 * Nunca lança exceção — falhas são apenas logadas no console.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from('activity_logs').insert({
      user_id: params.userId ?? null,
      company_group_id: params.companyGroupId ?? null,
      action_type: params.actionType,
      module: params.module,
      description: params.description ?? null,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
      ip_address: params.ipAddress ?? null,
      user_agent: params.userAgent ?? null,
    });
  } catch (error) {
    console.error('[ActivityLogger] Erro ao gravar log:', error);
    // Nunca lançar — logging não deve quebrar o fluxo principal
  }
}
