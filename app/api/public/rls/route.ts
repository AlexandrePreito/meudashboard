import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');

    if (!apiKey) {
      return NextResponse.json({ error: 'Chave de API não informada' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: keyData } = await supabase
      .from('rls_api_keys')
      .select('id, company_group_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!keyData) {
      return NextResponse.json({ error: 'Chave inválida ou desativada' }, { status: 403 });
    }

    await supabase
      .from('rls_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const { data: companies, error } = await supabase
      .from('rls_user_companies')
      .select('user_email, company_code')
      .eq('company_group_id', keyData.company_group_id)
      .order('user_email')
      .order('company_code');

    if (error) throw error;

    return NextResponse.json(companies || []);
  } catch (error: unknown) {
    console.error('Erro na API pública RLS:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
