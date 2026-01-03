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