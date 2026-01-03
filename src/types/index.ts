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