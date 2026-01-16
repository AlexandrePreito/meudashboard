import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser, getUserDeveloperId } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params;
    const user = await getAuthUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    // Buscar o relatório
    const { data: report, error: reportError } = await supabase
      .from('powerbi_reports')
      .select(`
        *,
        connection:powerbi_connections(id, name, company_group_id, workspace_id)
      `)
      .eq('id', reportId)
      .single();

    if (reportError || !report) {
      return NextResponse.json(
        { error: 'Relatório não encontrado' },
        { status: 404 }
      );
    }

    // Verificar permissão de acesso ao relatório
    if (!user.is_master) {
      const developerId = await getUserDeveloperId(user.id);
      
      if (developerId) {
        // Developer: verificar se o grupo pertence ao developer
        if (report.connection?.company_group_id) {
          const { data: group } = await supabase
            .from('company_groups')
            .select('id')
            .eq('id', report.connection.company_group_id)
            .eq('developer_id', developerId)
            .single();

          if (!group) {
            return NextResponse.json(
              { error: 'Sem permissão para acessar este relatório' },
              { status: 403 }
            );
          }
        }
      } else {
        // Usuário comum: verificar membership
        if (report.connection?.company_group_id) {
          const { data: membership } = await supabase
            .from('user_group_membership')
            .select('id')
            .eq('user_id', user.id)
            .eq('company_group_id', report.connection.company_group_id)
            .eq('is_active', true)
            .single();

          if (!membership) {
            return NextResponse.json(
              { error: 'Sem permissão para acessar este relatório' },
              { status: 403 }
            );
          }
        }
      }
    }

    // Buscar as telas/páginas deste relatório
    const { data: screens, error: screensError } = await supabase
      .from('powerbi_dashboard_screens')
      .select('page_name')
      .eq('report_id', reportId)
      .not('page_name', 'is', null)
      .order('page_name');

    if (screensError) {
      console.error('Erro ao buscar páginas:', screensError);
      return NextResponse.json(
        { error: 'Erro ao buscar páginas' },
        { status: 500 }
      );
    }

    // Extrair nomes únicos de páginas
    const uniquePages = [...new Set(
      (screens || [])
        .map(s => s.page_name)
        .filter(name => name && name.trim() !== '')
    )];

    // Se não houver páginas cadastradas, retornar páginas de exemplo baseadas no Power BI
    // (você pode ajustar isso depois para buscar do Power BI API)
    if (uniquePages.length === 0) {
      // Por enquanto, retorna array vazio
      // No futuro, pode integrar com Power BI API para buscar páginas reais
      return NextResponse.json({ 
        pages: [],
        message: 'Nenhuma página encontrada. Você pode digitar o nome da página manualmente.'
      });
    }

    return NextResponse.json({ 
      pages: uniquePages 
    });

  } catch (error) {
    console.error('Erro na API de páginas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
