// =============================================
// CONFIGURAÇÃO DO SUPABASE
// =============================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cliente para uso no browser
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos do banco de dados (vamos expandir depois)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string;
          role: string;
          created_at: string;
        };
      };
      companies: {
        Row: {
          id: string;
          name: string;
          cnpj: string | null;
          is_active: boolean;
          created_at: string;
        };
      };
    };
  };
};