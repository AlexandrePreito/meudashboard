import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Buscar grupo do usuário
    let companyGroupId: string | null = null;
    
    if (!user.is_master) {
      const { data: membership } = await supabase
        .from('user_group_membership')
        .select('company_group_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();
      
      companyGroupId = membership?.company_group_id || null;
    }

    // Buscar resumo de uso por usuário
    let query = supabase
      .from('user_usage_summary')
      .select('*');

    if (!user.is_master && companyGroupId) {
      query = query.eq('company_group_id', companyGroupId);
    }

    const { data: summary, error } = await query;

    if (error) {
      console.error('Erro ao buscar resumo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ summary: summary || [] });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
