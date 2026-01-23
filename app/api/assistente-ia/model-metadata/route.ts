import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getUserGroupMembership } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const membership = await getUserGroupMembership();

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dataset_id = searchParams.get('dataset_id');

    if (!dataset_id) {
      return NextResponse.json({ success: false, error: 'dataset_id é obrigatório' }, { status: 400 });
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
      return NextResponse.json({ success: false, error: 'Nenhuma conexão Power BI encontrada' }, { status: 404 });
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
        measures: [],
        groupers: [],
        filters: [],
        source: 'empty'
      });
    }

    const content = modelContext.context_content;
    
    // Extrair metadados da documentação
    const measures = extractMeasures(content);
    const groupers = extractGroupers(content);
    const filters = extractFilters(content);

    return NextResponse.json({
      success: true,
      measures,
      groupers,
      filters,
      source: 'context'
    });

  } catch (error: any) {
    console.error('Erro na API model-metadata:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

interface Measure {
  name: string;
  label: string;
  description: string;
  category: string;
  categoryIcon: string;
  formula?: string;
}

interface Grouper {
  table: string;
  column: string;
  label: string;
  icon: string;
  type: string;
}

interface Filter {
  table: string;
  column: string;
  label: string;
  icon: string;
  type: 'select' | 'text' | 'number' | 'date';
  commonValues?: string[];
}

function extractMeasures(content: string): Measure[] {
  const measures: Measure[] = [];
  const lines = content.split('\n');
  
  // Categorias de medidas baseadas na documentação
  const categories: Record<string, { icon: string; keywords: string[] }> = {
    'Vendas': { icon: '💰', keywords: ['vendas', 'faturamento', 'valorliquido', 'valorsaida', 'valorbruta', 'ticket'] },
    'Produtos': { icon: '📦', keywords: ['produto', 'quantidade', 'cmv', 'margem', 'valorproduto'] },
    'Clientes': { icon: '👥', keywords: ['cliente', 'clientes'] },
    'Contas a Receber': { icon: '💳', keywords: ['receber', 'contasreceber'] },
    'Contas a Pagar': { icon: '📤', keywords: ['pagar', 'contaspagar'] }
  };

  let currentCategory = 'Geral';
  let currentCategoryIcon = '📊';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detectar seções de categoria: ### VENDAS / FATURAMENTO, ### PRODUTOS, etc
    const sectionMatch = line.match(/^###\s+(.+?)(?:\s*\/|$)/i);
    if (sectionMatch) {
      const sectionName = sectionMatch[1].trim().toUpperCase();
      for (const [cat, config] of Object.entries(categories)) {
        if (sectionName.includes(cat.toUpperCase()) || 
            config.keywords.some(k => sectionName.toLowerCase().includes(k))) {
          currentCategory = cat;
          currentCategoryIcon = config.icon;
          break;
        }
      }
    }

    // Detectar medidas: #### 🔵 NomeMedida ou **NomeMedida**
    const measureMatch = line.match(/^####\s*[🔵🟢🟡🟠⚪]\s*(\w+)(?:\s*\((.+?)\))?/) ||
                        line.match(/^\*\*(\w+)\*\*\s*(?:=|:)/);
    
    if (measureMatch) {
      const measureName = measureMatch[1];
      const measureLabel = measureMatch[2] || measureName;
      
      // Procurar descrição na próxima linha com **Usar para:**
      let description = '';
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('**Usar para:**')) {
          description = nextLine.replace('**Usar para:**', '').trim();
          break;
        }
        if (nextLine.startsWith('####') || nextLine.startsWith('###')) break;
      }

      // Procurar fórmula
      let formula = '';
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (nextLine.startsWith('```dax')) {
          // Coletar linhas até ```
          for (let k = j + 1; k < lines.length; k++) {
            if (lines[k].trim() === '```') break;
            formula += lines[k] + '\n';
          }
          break;
        }
        if (nextLine.startsWith('####') || nextLine.startsWith('###')) break;
      }

      // Determinar categoria baseada no nome
      let measureCategory = currentCategory;
      let measureCategoryIcon = currentCategoryIcon;
      
      for (const [cat, config] of Object.entries(categories)) {
        if (config.keywords.some(k => measureName.toLowerCase().includes(k))) {
          measureCategory = cat;
          measureCategoryIcon = config.icon;
          break;
        }
      }

      // Evitar duplicatas
      if (!measures.find(m => m.name === measureName)) {
        measures.push({
          name: measureName,
          label: measureLabel,
          description: description || `Medida ${measureName}`,
          category: measureCategory,
          categoryIcon: measureCategoryIcon,
          formula: formula.trim() || undefined
        });
      }
    }
  }

  // Se não encontrou medidas pelo parser, adicionar as principais manualmente baseado em keywords
  if (measures.length === 0) {
    const knownMeasures: Measure[] = [
      { name: 'ValorLiquido', label: 'Faturamento', description: 'Faturamento total da empresa', category: 'Vendas', categoryIcon: '💰' },
      { name: 'ValorProduto', label: 'Valor por Produto', description: 'Usar quando análise envolver produtos', category: 'Produtos', categoryIcon: '📦' },
      { name: 'Quantidade', label: 'Quantidade', description: 'Quantidade vendida (já considera devoluções)', category: 'Produtos', categoryIcon: '📦' },
      { name: 'CMV', label: 'Custo (CMV)', description: 'Custo da Mercadoria Vendida', category: 'Produtos', categoryIcon: '📦' },
      { name: 'Margem Valor', label: 'Margem R$', description: 'Margem de lucro em reais', category: 'Produtos', categoryIcon: '📦' },
      { name: 'Margem Percentual', label: 'Margem %', description: 'Margem de lucro percentual', category: 'Produtos', categoryIcon: '📦' },
      { name: 'Ticket Medio', label: 'Ticket Médio', description: 'Valor médio por venda', category: 'Vendas', categoryIcon: '💰' },
      { name: 'ContasReceber', label: 'Contas a Receber', description: 'Total de contas a receber', category: 'Contas a Receber', categoryIcon: '💳' },
      { name: 'ContasPagar', label: 'Contas a Pagar', description: 'Total de contas a pagar', category: 'Contas a Pagar', categoryIcon: '📤' },
    ];

    // Verificar quais medidas existem no conteúdo
    for (const measure of knownMeasures) {
      if (content.includes(measure.name) || content.includes(`[${measure.name}]`)) {
        measures.push(measure);
      }
    }
  }

  return measures;
}

function extractGroupers(content: string): Grouper[] {
  const groupers: Grouper[] = [];
  
  // Agrupadores comuns baseados na documentação
  const knownGroupers: Grouper[] = [
    { table: 'Filial', column: 'Empresa', label: 'Filial / Empresa', icon: '🏢', type: 'dimension' },
    { table: 'Calendario', column: 'Ano', label: 'Ano', icon: '📅', type: 'time' },
    { table: 'Calendario', column: 'Mês', label: 'Mês', icon: '📅', type: 'time' },
    { table: 'Calendario', column: 'Mês Ano', label: 'Mês/Ano', icon: '📅', type: 'time' },
    { table: 'Calendario', column: 'Nome do Mês', label: 'Nome do Mês', icon: '📅', type: 'time' },
    { table: 'Clientes', column: 'RAZAOSOCIAL', label: 'Cliente', icon: '👤', type: 'dimension' },
    { table: 'Clientes', column: 'CIDADEENTREGA', label: 'Cidade do Cliente', icon: '🏙️', type: 'dimension' },
    { table: 'Clientes', column: 'UFENTREGA', label: 'UF do Cliente', icon: '📍', type: 'dimension' },
    { table: 'Produto', column: 'DESCRICAO', label: 'Produto', icon: '📦', type: 'dimension' },
    { table: 'Grupo', column: 'DESCRICAO', label: 'Grupo de Produto', icon: '🏷️', type: 'dimension' },
    { table: 'Fornecedores', column: 'RAZAOSOCIAL', label: 'Fornecedor', icon: '🏭', type: 'dimension' },
    { table: 'Vendedor', column: 'Nome', label: 'Vendedor', icon: '👔', type: 'dimension' },
    { table: 'Classificacao', column: 'Classificacao', label: 'Aging (Faixa)', icon: '⏰', type: 'dimension' },
    { table: 'Classificacao', column: 'Categoria', label: 'Aging (Categoria)', icon: '⏰', type: 'dimension' },
  ];

  // Verificar quais agrupadores existem no conteúdo
  for (const grouper of knownGroupers) {
    if (content.includes(grouper.table) && 
        (content.includes(grouper.column) || content.includes(`[${grouper.column}]`))) {
      groupers.push(grouper);
    }
  }

  return groupers;
}

function extractFilters(content: string): Filter[] {
  const filters: Filter[] = [];
  
  // Filtros comuns baseados na documentação
  const knownFilters: Filter[] = [
    { 
      table: 'Filial', 
      column: 'Empresa', 
      label: 'Filial / Empresa', 
      icon: '🏢', 
      type: 'select'
    },
    { 
      table: 'Calendario', 
      column: 'Ano', 
      label: 'Ano', 
      icon: '📅', 
      type: 'select',
      commonValues: ['2024', '2025', '2026']
    },
    { 
      table: 'Calendario', 
      column: 'Mês', 
      label: 'Mês', 
      icon: '📅', 
      type: 'select',
      commonValues: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
    },
    { 
      table: 'MovFinanceiro', 
      column: 'TIPO', 
      label: 'Tipo Financeiro', 
      icon: '💳', 
      type: 'select',
      commonValues: ['Receber', 'Pagar']
    },
    { 
      table: 'MovFinanceiro', 
      column: 'Status', 
      label: 'Status Financeiro', 
      icon: '📋', 
      type: 'select',
      commonValues: ['Aberto', 'Baixado']
    },
    { 
      table: 'MovimentoFiscal', 
      column: 'TipoNF', 
      label: 'Tipo NF', 
      icon: '📄', 
      type: 'select',
      commonValues: ['Saída', 'Entrada']
    },
    { 
      table: 'MovimentoFiscal', 
      column: 'TipoVenda', 
      label: 'Tipo de Venda', 
      icon: '🛒', 
      type: 'select',
      commonValues: ['Venda', 'Bonificação']
    },
    { 
      table: 'Clientes', 
      column: 'RAZAOSOCIAL', 
      label: 'Cliente', 
      icon: '👤', 
      type: 'text'
    },
    { 
      table: 'Produto', 
      column: 'DESCRICAO', 
      label: 'Produto', 
      icon: '📦', 
      type: 'text'
    },
    { 
      table: 'Grupo', 
      column: 'DESCRICAO', 
      label: 'Grupo de Produto', 
      icon: '🏷️', 
      type: 'text'
    },
  ];

  // Verificar quais filtros existem no conteúdo
  for (const filter of knownFilters) {
    if (content.includes(filter.table)) {
      filters.push(filter);
    }
  }

  return filters;
}
