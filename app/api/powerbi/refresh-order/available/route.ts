import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthUser } from '@/lib/auth';

// GET - Buscar itens disponíveis (datasets e dataflows) para um grupo
export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('group_id');

    if (!groupId) {
      return NextResponse.json({ error: 'group_id é obrigatório' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Buscar datasets (modelos semânticos) do grupo
    const { data: datasets, error: datasetsError } = await supabase
      .from('powerbi_reports')
      .select(`
        id,
        name,
        dataset_id,
        powerbi_screens (
          company_group_id
        )
      `)
      .not('dataset_id', 'is', null);

    if (datasetsError) {
      console.error('Erro ao buscar datasets:', datasetsError);
      console.error('Código:', datasetsError.code);
      console.error('Detalhes:', datasetsError.details);
      console.error('Mensagem:', datasetsError.message);
      // Retorna array vazio em caso de erro
      return NextResponse.json({ 
        items: [],
        error: datasetsError.message,
        debug: {
          code: datasetsError.code,
          details: datasetsError.details
        }
      });
    }

    // Filtrar datasets do grupo e remover duplicatas
    const groupDatasets = datasets
      ?.filter((d: any) => d.powerbi_screens?.some((s: any) => s.company_group_id === groupId))
      .reduce((acc: any[], current: any) => {
        const exists = acc.find(item => item.dataset_id === current.dataset_id);
        if (!exists) {
          acc.push({
            id: current.id,
            name: current.name,
            dataset_id: current.dataset_id,
            type: 'dataset'
          });
        }
        return acc;
      }, []) || [];

    // TODO: Adicionar busca de dataflows quando houver tabela configurada
    // Por enquanto, retornar apenas datasets
    const allItems = [
      ...groupDatasets
    ];

    return NextResponse.json({ items: allItems });

  } catch (error: any) {
    console.error('Erro ao buscar itens disponíveis:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

