import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Listar módulos
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();
    
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ modules: modules || [] });
  } catch (error: any) {
    console.error('Erro ao buscar módulos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

