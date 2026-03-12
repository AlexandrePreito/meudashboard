import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Suporte a Basic Auth (Power BI Desktop)
    const authHeader = request.headers.get('authorization');
    let apiKey = searchParams.get('key');

    if (!apiKey && authHeader?.startsWith('Basic ')) {
      try {
        const base64 = authHeader.slice(6);
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        const username = decoded.split(':')[0];
        if (username) apiKey = username;
      } catch {
        // ignore
      }
    }

    // Se não tem key, retornar 200 com array vazio (compatibilidade Power BI)
    // O Power BI faz uma requisição de teste sem credenciais antes de enviar a key
    if (!apiKey) {
      return NextResponse.json([], { status: 200, headers: corsHeaders });
    }

    const supabase = createAdminClient();

    const { data: keyData } = await supabase
      .from('rls_api_keys')
      .select('id, company_group_id')
      .eq('api_key', apiKey)
      .eq('is_active', true)
      .single();

    if (!keyData) {
      // Retornar 200 vazio em vez de 403 (Power BI interpreta qualquer erro como falha de auth)
      return NextResponse.json([], { status: 200, headers: corsHeaders });
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

    return NextResponse.json(companies || [], { status: 200, headers: corsHeaders });
  } catch (error: unknown) {
    console.error('Erro na API pública RLS:', error);
    // Mesmo em erro, retornar 200 vazio para não bloquear Power BI
    return NextResponse.json([], { status: 200, headers: corsHeaders });
  }
}