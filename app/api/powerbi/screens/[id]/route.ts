import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar tela por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { data: screen, error } = await supabase
      .from('powerbi_dashboard_screens')
      .select(`
        *,
        company_group:company_groups(id, name),
        report:powerbi_reports(*, connection:powerbi_connections(*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    const { data: screenUsers } = await supabase
      .from('powerbi_screen_users')
      .select('user_id')
      .eq('screen_id', id);

    const { data: screenCompanies } = await supabase
      .from('powerbi_screen_companies')
      .select('company_id')
      .eq('screen_id', id);

    return NextResponse.json({ 
      screen,
      user_ids: screenUsers?.map(u => u.user_id) || [],
      company_ids: screenCompanies?.map(c => c.company_id) || []
    });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar tela
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { title, icon, is_first, is_active, is_public, user_ids, company_ids, company_group_id } = body;

    const supabase = createAdminClient();

    const { data: currentScreen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('company_group_id')
      .eq('id', id)
      .single();

    if (is_first && currentScreen) {
      await supabase
        .from('powerbi_dashboard_screens')
        .update({ is_first: false })
        .eq('company_group_id', currentScreen.company_group_id)
        .neq('id', id);
    }

    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title;
    if (icon !== undefined) updateData.icon = icon;
    if (is_first !== undefined) updateData.is_first = is_first;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (company_group_id !== undefined) updateData.company_group_id = company_group_id;

    const { data: screen, error } = await supabase
      .from('powerbi_dashboard_screens')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Erro ao atualizar tela:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (user_ids !== undefined) {
      await supabase.from('powerbi_screen_users').delete().eq('screen_id', id);
      if (user_ids.length > 0) {
        const userInserts = user_ids.map((uid: string) => ({
          screen_id: id,
          user_id: uid
        }));
        await supabase.from('powerbi_screen_users').insert(userInserts);
      }
    }

    if (company_ids !== undefined) {
      await supabase.from('powerbi_screen_companies').delete().eq('screen_id', id);
      if (company_ids.length > 0) {
        const companyInserts = company_ids.map((cid: string) => ({
          screen_id: id,
          company_id: cid
        }));
        await supabase.from('powerbi_screen_companies').insert(companyInserts);
      }
    }

    return NextResponse.json({ screen });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir tela
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('powerbi_dashboard_screens')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erro ao excluir tela:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}




