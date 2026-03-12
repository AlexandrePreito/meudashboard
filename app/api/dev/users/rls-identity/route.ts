import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

// GET - Buscar email RLS de um usuário para uma tela (ou todas as telas)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const screenId = searchParams.get('screen_id');
    const groupId = searchParams.get('group_id');

    if (!userId) {
      return NextResponse.json({ error: 'user_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    let query = supabase
      .from('user_rls_identity')
      .select('screen_id, rls_email')
      .eq('user_id', userId);

    if (screenId) query = query.eq('screen_id', screenId);
    if (groupId) query = query.eq('company_group_id', groupId);

    const { data } = await query;

    return NextResponse.json({ identities: data || [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - Salvar email RLS de um usuário para uma tela
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

    const body = await request.json();
    const { user_id, screen_id, group_id, rls_email } = body;

    if (!user_id || !screen_id || !group_id) {
      return NextResponse.json({
        error: 'user_id, screen_id e group_id são obrigatórios',
      }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (!rls_email || String(rls_email).trim() === '') {
      await supabase
        .from('user_rls_identity')
        .delete()
        .eq('user_id', user_id)
        .eq('screen_id', screen_id);
    } else {
      const { error } = await supabase
        .from('user_rls_identity')
        .upsert(
          {
            user_id,
            screen_id,
            company_group_id: group_id,
            rls_email: String(rls_email).trim().toLowerCase(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,screen_id' }
        );

      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
