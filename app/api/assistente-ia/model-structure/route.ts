import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dataset_id = searchParams.get('dataset_id');

    if (!dataset_id) {
      return NextResponse.json(
        { success: false, error: 'dataset_id é obrigatório' },
        { status: 400 }
      );
    }

    const groupId = membership.company_group_id;

    // Buscar conexão do grupo
    const { data: connections } = await supabase
      .from('powerbi_connections')
      .select('*')
      .eq('company_group_id', groupId)
      .eq('is_active', true)
      .limit(1);

    if (!connections || connections.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Nenhuma conexão Power BI encontrada'
      }, { status: 404 });
    }

    const connection = connections[0];

    // Buscar contexto salvo no banco
    const { data: modelContext } = await supabase
      .from('ai_model_contexts')
      .select('context_content')
      .eq('connection_id', connection.id)
      .eq('dataset_id', dataset_id)
      .single();

    if (!modelContext?.context_content) {
      return NextResponse.json({
        success: true,
        tables: [],
        source: 'empty',
        message: 'Nenhum contexto encontrado para este dataset'
      });
    }

    const tables = parseTablesFromMarkdown(modelContext.context_content);

    return NextResponse.json({
      success: true,
      tables,
      source: 'context'
    });

  } catch (error: any) {
    console.error('Erro na API model-structure:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    }, { status: 500 });
  }
}

function parseTablesFromMarkdown(markdown: string): any[] {
  const tables: any[] = [];
  const lines = markdown.split('\n');
  
  let currentTableName: string | null = null;
  let inColumnTable = false;
  let columns: { name: string; dataType: string }[] = [];
  let columnHeaderFound = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Detectar cabeçalho de seção: ### NomeTabela
    // Padrões: "### MovimentoFiscal", "### Filial (Empresas)", "### Calendario (Dimensão Data Principal)"
    const sectionMatch = trimmedLine.match(/^###\s+(\w+)(?:\s*\(|$|\s*$)/);
    
    if (sectionMatch) {
      // Salvar tabela anterior se tiver colunas
      if (currentTableName && columns.length > 0) {
        // Evitar duplicatas
        if (!tables.find(t => t.name === currentTableName)) {
          tables.push({ name: currentTableName, columns: [...columns] });
        }
      }
      
      currentTableName = sectionMatch[1];
      columns = [];
      inColumnTable = false;
      columnHeaderFound = false;
      continue;
    }

    // Se estamos em uma seção de tabela
    if (currentTableName) {
      // Detectar início de tabela markdown com colunas
      // Padrão: "| Coluna | Tipo |" ou "| Coluna | Tipo | Descrição |"
      if (trimmedLine.match(/^\|\s*Coluna\s*\|/i)) {
        columnHeaderFound = true;
        inColumnTable = true;
        continue;
      }

      // Pular linha de separação: |---|---|
      if (trimmedLine.match(/^\|[-:\s|]+\|$/)) {
        continue;
      }

      // Se encontramos o cabeçalho, extrair colunas das linhas seguintes
      if (columnHeaderFound && inColumnTable && trimmedLine.startsWith('|')) {
        const cells = trimmedLine.split('|').map(c => c.trim()).filter(c => c);
        
        if (cells.length >= 2) {
          const colName = cells[0].replace(/\*\*/g, '').trim();
          const colType = cells[1].trim();
          
          // Validar que é uma coluna válida
          if (colName && 
              colName.length > 0 && 
              colName !== 'Coluna' && 
              !colName.includes('---') &&
              !colName.match(/^[-:\s]+$/)) {
            columns.push({
              name: colName,
              dataType: mapDataType(colType)
            });
          }
        }
      }

      // Detectar fim da tabela de colunas (linha vazia ou nova seção)
      if (columnHeaderFound && inColumnTable && 
          (trimmedLine === '' || trimmedLine.startsWith('##') || trimmedLine.startsWith('**⚠️'))) {
        inColumnTable = false;
        // Não resetar columnHeaderFound para não pegar outras tabelas da mesma seção
      }
    }
  }

  // Salvar última tabela
  if (currentTableName && columns.length > 0) {
    if (!tables.find(t => t.name === currentTableName)) {
      tables.push({ name: currentTableName, columns: [...columns] });
    }
  }

  // Ordenar tabelas alfabeticamente
  tables.sort((a, b) => a.name.localeCompare(b.name));

  return tables;
}

function mapDataType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('int') || t.includes('double') || t.includes('decimal') || t.includes('number')) {
    return 'Number';
  }
  if (t.includes('date') || t.includes('time')) {
    return 'DateTime';
  }
  if (t.includes('bool')) {
    return 'Boolean';
  }
  return 'String';
}
