// =============================================
// TIPOS BASE DO MEUDASHBOARD
// =============================================

// Usuário do sistema
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  role: 'admin' | 'user' | 'viewer';
  created_at: string;
  updated_at: string;
}

// Empresa/Tenant
export interface Company {
  id: string;
  name: string;
  cnpj?: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

// Dashboard do Power BI
export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  embed_url: string;
  company_id: string;
  is_active: boolean;
  created_at: string;
}

// Mensagem do Chat IA
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

// Alerta WhatsApp
export interface Alert {
  id: string;
  title: string;
  message: string;
  phone_number: string;
  status: 'pending' | 'sent' | 'failed';
  scheduled_at?: string;
  sent_at?: string;
  created_at: string;
}

// =============================================
// TIPOS DE AUTENTICAÇÃO
// =============================================

// Payload do token JWT
export interface JWTPayload {
  id: string;
  email: string;
  is_master: boolean;
  session_id: string;
  iat?: number;
  exp?: number;
}

// Usuário autenticado (retornado pelo middleware)
export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  is_master: boolean;
  is_developer?: boolean;
  status: 'active' | 'suspended' | 'pending';
  avatar_url?: string;
}

// Resposta do login
export interface LoginResponse {
  success: boolean;
  message: string;
  user?: AuthUser;
}

// Grupo de empresas
export interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  status: 'active' | 'suspended' | 'trial';
  max_users: number;
  max_companies: number;
  created_at: string;
}

// Membership do usuário em um grupo
export interface UserGroupMembership {
  id: string;
  user_id: string;
  company_group_id: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  is_active: boolean;
  company_group?: CompanyGroup;
}

// =============================================
// TIPOS DE DESENVOLVEDOR
// =============================================

// Desenvolvedor/Revendedor
export interface Developer {
  id: string;
  name: string;
  slug: string;
  document?: string;
  email: string;
  phone?: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  use_developer_logo: boolean;
  use_developer_colors: boolean;
  plan_id?: string;
  plan?: DeveloperPlan;
  status: 'active' | 'suspended' | 'trial' | 'cancelled';
  suspended_at?: string;
  suspended_reason?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Plano de Desenvolvedor
export interface DeveloperPlan {
  id: string;
  name: string;
  description?: string;
  max_groups: number;
  max_users: number;
  max_screens: number;
  max_alerts: number;
  max_whatsapp_messages_per_day: number;
  max_alert_executions_per_day: number;
  max_ai_credits_per_day: number;
  max_dataset_refreshes_per_day?: number;
  ai_enabled: boolean;
  is_active: boolean;
  display_order: number;
  price_monthly?: number;
  price_yearly?: number;
  created_at: string;
  updated_at: string;
}

// Vínculo Usuário-Desenvolvedor
export interface DeveloperUser {
  id: string;
  developer_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'viewer';
  is_active: boolean;
  developer?: Developer;
  user?: AuthUser;
  created_at: string;
  updated_at: string;
}

// Uso Diário do Grupo
export interface DailyUsage {
  id: string;
  company_group_id: string;
  usage_date: string;
  whatsapp_messages_sent: number;
  alert_executions: number;
  ai_credits_used: number;
  ai_tokens_input: number;
  ai_tokens_output: number;
  dataset_refreshes: number;
  created_at: string;
  updated_at: string;
}

// Quotas do Grupo
export interface GroupQuotas {
  quota_whatsapp_per_day?: number;
  quota_alert_executions_per_day?: number;
  quota_ai_credits_per_day?: number;
  quota_dataset_refreshes_per_day?: number;
  quota_users?: number;
  quota_screens?: number;
  quota_alerts?: number;
}

// Resumo de uso para exibição
export interface UsageSummary {
  whatsapp: { used: number; limit: number; percentage: number };
  ai: { used: number; limit: number; percentage: number };
  alerts: { used: number; limit: number; percentage: number };
  executions: { used: number; limit: number; percentage: number };
}