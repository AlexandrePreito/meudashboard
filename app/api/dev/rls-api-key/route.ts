import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';
import { randomUUID } from 'crypto';

// GET - Buscar api_key do grupo
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!(user as { is_master?: boolean }).is_master) {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', groupId)
        .eq('developer_id', developerId)
        .single();

      if (!group) return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    const { data: keyData } = await supabase
      .from('rls_api_keys')
      .select('api_key, is_active, created_at, last_used_at')
      .eq('company_group_id', groupId)
      .maybeSingle();

    return NextResponse.json({
      api_key: keyData?.api_key ?? null,
      is_active: keyData?.is_active ?? false,
      created_at: keyData?.created_at ?? null,
      last_used_at: keyData?.last_used_at ?? null,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Gerar ou regenerar api_key
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId && !(user as { is_master?: boolean }).is_master) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { group_id, action } = body;

    if (!group_id) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!(user as { is_master?: boolean }).is_master) {
      const { data: group } = await supabase
        .from('company_groups')
        .select('id')
        .eq('id', group_id)
        .eq('developer_id', developerId)
        .single();

      if (!group) return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    if (action === 'deactivate') {
      await supabase
        .from('rls_api_keys')
        .update({ is_active: false })
        .eq('company_group_id', group_id);

      return NextResponse.json({ success: true, is_active: false });
    }

    if (action === 'activate') {
      await supabase
        .from('rls_api_keys')
        .update({ is_active: true })
        .eq('company_group_id', group_id);

      return NextResponse.json({ success: true, is_active: true });
    }

    const newKey = randomUUID();

    const { data: existing } = await supabase
      .from('rls_api_keys')
      .select('id')
      .eq('company_group_id', group_id)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('rls_api_keys')
        .update({
          api_key: newKey,
          is_active: true,
          created_at: new Date().toISOString(),
          last_used_at: null,
        })
        .eq('company_group_id', group_id);

      if (error) throw error;
    } else {
      const { error } = await supabase.from('rls_api_keys').insert({
        company_group_id: group_id,
        api_key: newKey,
        is_active: true,
      });

      if (error) throw error;
    }

    return NextResponse.json({ success: true, api_key: newKey });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
