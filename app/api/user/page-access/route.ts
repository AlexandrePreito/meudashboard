import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar páginas permitidas para o usuário logado numa tela
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get('screen_id');

    if (!screenId) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar config de acesso por página
    const { data: savedAccess } = await supabase
      .from('user_screen_page_access')
      .select('page_name, is_allowed')
      .eq('user_id', user.id)
      .eq('screen_id', screenId);

    // Se não tem registros, significa "todas permitidas" (padrão)
    if (!savedAccess || savedAccess.length === 0) {
      return NextResponse.json({
        has_custom_config: false,
        allowed_pages: [], // vazio = todas permitidas
      });
    }

    // Tem config customizada — retornar apenas as permitidas
    const allowedPages = savedAccess
      .filter((p) => p.is_allowed)
      .map((p) => p.page_name);

    return NextResponse.json({
      has_custom_config: true,
      allowed_pages: allowedPages,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
