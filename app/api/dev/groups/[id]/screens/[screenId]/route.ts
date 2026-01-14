import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; screenId: string }>;
}

// PUT - Atualizar tela específica
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id: groupId, screenId } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Verificar se tela pertence ao grupo
    const { data: existingScreen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('id', screenId)
      .eq('company_group_id', groupId)
      .single();

    if (!existingScreen) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    const body = await request.json();
    const { title, report_id, is_active, is_first, allowed_users, icon } = body;

    // Montar dados para atualizar
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (report_id !== undefined) updateData.report_id = report_id;
    if (icon !== undefined) updateData.icon = icon;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_first !== undefined) updateData.is_first = is_first;

    // Se is_first = true, desmarcar outras telas do grupo
    if (is_first === true) {
      await supabase
        .from('powerbi_dashboard_screens')
        .update({ is_first: false })
        .eq('company_group_id', groupId)
        .neq('id', screenId);
    }

    const { data: screen, error: updateError } = await supabase
      .from('powerbi_dashboard_screens')
      .update(updateData)
      .eq('id', screenId)
      .select()
      .single();

    if (updateError) {
      console.error('Erro ao atualizar tela:', updateError);
      return NextResponse.json({ error: 'Erro ao atualizar tela' }, { status: 500 });
    }

    // Atualizar usuários com acesso
    if (allowed_users !== undefined) {
      // Deletar usuários existentes
      await supabase
        .from('powerbi_screen_users')
        .delete()
        .eq('screen_id', screenId);

      // Inserir novos usuários (se fornecidos)
      if (allowed_users.length > 0) {
        const screenUsersData = allowed_users.map((userId: string) => ({
          screen_id: screenId,
          user_id: userId,
        }));

        const { error: usersError } = await supabase
          .from('powerbi_screen_users')
          .insert(screenUsersData);

        if (usersError) {
          console.error('Erro ao atualizar usuários:', usersError);
        }
      }
    }

    return NextResponse.json({
      screen,
      message: 'Tela atualizada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Excluir tela específica
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id: groupId, screenId } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', groupId)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Verificar se tela pertence ao grupo
    const { data: existingScreen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('id', screenId)
      .eq('company_group_id', groupId)
      .single();

    if (!existingScreen) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    // Deletar usuários da tela primeiro
    await supabase
      .from('powerbi_screen_users')
      .delete()
      .eq('screen_id', screenId);

    // Deletar tela
    const { error: deleteError } = await supabase
      .from('powerbi_dashboard_screens')
      .delete()
      .eq('id', screenId);

    if (deleteError) {
      console.error('Erro ao excluir tela:', deleteError);
      return NextResponse.json({ error: 'Erro ao excluir tela' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Tela excluída com sucesso',
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
