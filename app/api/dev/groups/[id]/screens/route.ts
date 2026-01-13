/**
 * API Route - Developer Group Screens
 * Gerenciamento de telas Power BI do grupo pelo desenvolvedor
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Listar telas do grupo
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_screens')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Buscar telas do grupo
    const { data: screens, error } = await supabase
      .from('powerbi_dashboard_screens')
      .select('*')
      .eq('company_group_id', id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Para cada tela, buscar usuários com acesso
    const screensWithUsers = await Promise.all(
      (screens || []).map(async (screen) => {
        const { data: screenUsers } = await supabase
          .from('powerbi_screen_users')
          .select('user_id')
          .eq('screen_id', screen.id);

        return {
          ...screen,
          allowed_users: screenUsers?.map(su => su.user_id) || [],
        };
      })
    );

    return NextResponse.json({
      screens: screensWithUsers,
      quota: group.quota_screens,
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Criar tela
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const developerId = await getUserDeveloperId(user.id);
    if (!developerId) {
      return NextResponse.json({ error: 'Você não é um desenvolvedor' }, { status: 403 });
    }

    const { id } = await params;
    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id, quota_screens')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    // Verificar quota de telas
    const { count: currentScreens } = await supabase
      .from('powerbi_dashboard_screens')
      .select('*', { count: 'exact', head: true })
      .eq('company_group_id', id);

    if (group.quota_screens && currentScreens && currentScreens >= group.quota_screens) {
      return NextResponse.json(
        { error: `Limite de telas atingido (${group.quota_screens})` },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, report_id, page_name, description, is_active, is_first, allowed_users } = body;

    if (!title || !report_id) {
      return NextResponse.json(
        { error: 'Título e Report ID são obrigatórios' },
        { status: 400 }
      );
    }

    // Inserir tela
    const { data: screen, error: screenError } = await supabase
      .from('powerbi_dashboard_screens')
      .insert({
        company_group_id: id,
        title,
        report_id,
        page_name: page_name || null,
        description: description || null,
        is_active: is_active !== undefined ? is_active : true,
        is_first: is_first !== undefined ? is_first : false,
      })
      .select()
      .single();

    if (screenError) {
      console.error('Erro ao criar tela:', screenError);
      return NextResponse.json({ error: 'Erro ao criar tela' }, { status: 500 });
    }

    // Inserir usuários com acesso (se fornecidos)
    if (allowed_users && allowed_users.length > 0) {
      const screenUsersData = allowed_users.map((userId: string) => ({
        screen_id: screen.id,
        user_id: userId,
      }));

      const { error: usersError } = await supabase
        .from('powerbi_screen_users')
        .insert(screenUsersData);

      if (usersError) {
        console.error('Erro ao vincular usuários:', usersError);
        // Não falha a operação, apenas loga o erro
      }
    }

    return NextResponse.json({
      screen,
      message: 'Tela criada com sucesso',
    });
  } catch (error: any) {
    console.error('Erro:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Atualizar tela
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

    const { id } = await params;
    const body = await request.json();
    const { screen_id, title, report_id, page_name, description, is_active, is_first, allowed_users } = body;

    if (!screen_id) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor e se tela pertence ao grupo
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', id)
      .eq('developer_id', developerId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 });
    }

    const { data: existingScreen } = await supabase
      .from('powerbi_dashboard_screens')
      .select('id')
      .eq('id', screen_id)
      .eq('company_group_id', id)
      .single();

    if (!existingScreen) {
      return NextResponse.json({ error: 'Tela não encontrada' }, { status: 404 });
    }

    // Atualizar tela
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (report_id !== undefined) updateData.report_id = report_id;
    if (page_name !== undefined) updateData.page_name = page_name || null;
    if (description !== undefined) updateData.description = description || null;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_first !== undefined) updateData.is_first = is_first;

    const { data: screen, error: updateError } = await supabase
      .from('powerbi_dashboard_screens')
      .update(updateData)
      .eq('id', screen_id)
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
        .eq('screen_id', screen_id);

      // Inserir novos usuários (se fornecidos)
      if (allowed_users.length > 0) {
        const screenUsersData = allowed_users.map((userId: string) => ({
          screen_id: screen_id,
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

// DELETE - Excluir tela
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

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const screenId = searchParams.get('screen_id');

    if (!screenId) {
      return NextResponse.json({ error: 'screen_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verificar se grupo pertence ao desenvolvedor
    const { data: group } = await supabase
      .from('company_groups')
      .select('id')
      .eq('id', id)
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
      .eq('company_group_id', id)
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
