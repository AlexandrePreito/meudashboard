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
    const group_id = searchParams.get('group_id');

    if (!dataset_id) {
      return NextResponse.json({ success: false, error: 'dataset_id é obrigatório' }, { status: 400 });
    }

    // Usar group_id do parâmetro se fornecido, senão usar do membership
    const groupId = group_id || membership.company_group_id;
    
    console.log('[DEBUG model-metadata] group_id recebido:', group_id);
    console.log('[DEBUG model-metadata] membership.company_group_id:', membership.company_group_id);
    console.log('[DEBUG model-metadata] groupId final usado:', groupId);

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

    // Buscar contexto salvo no banco (com seções parseadas se disponíveis)
    // CORREÇÃO: Buscar por company_group_id ao invés de connection_id
    // porque o connection_id pode ser NULL no banco
    // Usar .limit(1) ao invés de .single() para evitar erro se houver múltiplos registros
    const { data: modelContexts, error: contextError } = await supabase
      .from('ai_model_contexts')
      .select('context_content, section_medidas, section_tabelas, section_queries, parsed_at, connection_id')
      .eq('company_group_id', groupId)
      .eq('dataset_id', dataset_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);
    
    const modelContext = modelContexts && modelContexts.length > 0 ? modelContexts[0] : null;
    
    console.log('[DEBUG model-metadata] Query params:', { groupId, dataset_id });
    console.log('[DEBUG model-metadata] Context found:', !!modelContext, 'Error:', contextError?.message);
    if (modelContexts && modelContexts.length > 1) {
      console.warn('[DEBUG model-metadata] ⚠️ Múltiplos contextos encontrados! Usando o mais recente.');
    }
    if (modelContext) {
      console.log('[DEBUG model-metadata] Context connection_id:', modelContext.connection_id);
      console.log('[DEBUG model-metadata] section_medidas length:', modelContext.section_medidas?.length);
      console.log('[DEBUG model-metadata] section_tabelas length:', modelContext.section_tabelas?.length);
    }

    // CORREÇÃO: Verificar AMBOS context_content E section_medidas
    // Se não tem nem conteúdo antigo nem seções parseadas, retornar vazio
    const hasContent = modelContext?.context_content;
    const hasParsedMeasures = modelContext?.section_medidas && Array.isArray(modelContext.section_medidas) && modelContext.section_medidas.length > 0;
    const hasParsedTables = modelContext?.section_tabelas && Array.isArray(modelContext.section_tabelas) && modelContext.section_tabelas.length > 0;
    
    if (!modelContext || (!hasContent && !hasParsedMeasures && !hasParsedTables)) {
      console.log('[DEBUG model-metadata] Nenhum dado encontrado para dataset:', dataset_id);
      return NextResponse.json({
        success: true,
        measures: [],
        suggestedGroupers: [],
        suggestedFilters: [],
        queries: [],
        source: 'empty',
        allowManualInput: true
      });
    }

    let measures: Measure[] = [];
    let suggestedGroupers: any[] = [];
    let suggestedFilters: any[] = [];
    let queries: any[] = [];

    // PRIORIDADE 1: Se tem seções parseadas, usar elas
    if (hasParsedMeasures) {
      console.log('[DEBUG model-metadata] Usando section_medidas parseada:', modelContext.section_medidas.length);
      measures = modelContext.section_medidas.map((m: any) => ({
        name: m.name,
        label: m.name,
        description: m.description || m.whenToUse || '',
        category: m.area || 'Geral',
        categoryIcon: getCategoryIcon(m.area || 'Geral')
      }));
    } else if (hasContent) {
      // FALLBACK: extrair do texto (método antigo) apenas se não tem section_medidas
      console.log('[DEBUG model-metadata] Extraindo medidas do texto (fallback)');
      measures = extractMeasures(modelContext.context_content);
    }

    // Se tem section_tabelas parseada, extrair groupers e filters dela
    if (hasParsedTables) {
      console.log('[DEBUG model-metadata] Usando section_tabelas parseada:', modelContext.section_tabelas.length);
      
      // Extrair todas as colunas que podem ser usadas como agrupadores ou filtros
      const allColumns: any[] = [];
      modelContext.section_tabelas.forEach((tabela: any) => {
        if (tabela.columns && Array.isArray(tabela.columns)) {
          tabela.columns.forEach((col: any) => {
            if (col.usage && Array.isArray(col.usage)) {
              const canGroup = col.usage.includes('group');
              const canFilter = col.usage.includes('filter');
              
              if (canGroup || canFilter) {
                allColumns.push({
                  value: col.name,
                  label: col.name.split('.').pop() || col.name,
                  icon: getColumnIcon(col.type || 'String'),
                  type: canGroup && canFilter ? 'both' : (canGroup ? 'group' : 'filter')
                });
              }
            }
          });
        }
      });
      
      suggestedGroupers = allColumns.filter(c => c.type === 'group' || c.type === 'both');
      suggestedFilters = allColumns.filter(c => c.type === 'filter' || c.type === 'both');
    } else {
      // Fallback: usar sugestões hardcoded
      console.log('[DEBUG model-metadata] Usando sugestões hardcoded (fallback)');
      suggestedGroupers = getSuggestedGroupers();
      suggestedFilters = getSuggestedFilters();
    }

    console.log('[DEBUG model-metadata] Extracted measures:', measures.length);
    console.log('[DEBUG model-metadata] Measures:', measures.map(m => m.name).slice(0, 10), '...');
    console.log('[DEBUG model-metadata] Suggested groupers:', suggestedGroupers.length);
    console.log('[DEBUG model-metadata] Suggested filters:', suggestedFilters.length);

    // Buscar queries se disponíveis (já foi buscado no primeiro select)
    if (modelContext?.section_queries && Array.isArray(modelContext.section_queries)) {
      queries = modelContext.section_queries;
      console.log('[DEBUG model-metadata] Queries encontradas:', queries.length);
    }

    return NextResponse.json({
      success: true,
      measures,
      suggestedGroupers,
      suggestedFilters,
      queries: queries || [],
      source: hasParsedMeasures ? 'parsed' : 'context',
      allowManualInput: true,
      inputFormat: {
        description: 'Para filtros e agrupadores, use o formato: Tabela.Coluna',
        examples: [
          'Calendario.Ano',
          'Calendario.Mês', 
          'Filial.Empresa',
          'CboProduto.prd_nome',
          'Funcionario.nome',
          'Extrato.Tipo da operação'
        ]
      }
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

function getCategoryIcon(category: string): string {
  const icons: { [key: string]: string } = {
    'Vendas': '💰',
    'Produtos': '📦',
    'Clientes': '👤',
    'Financeiro': '💳',
    'Contas a Receber': '💳',
    'Contas a Pagar': '📤',
    'Estoque': '📦',
    'CRP': '💳',
    'Saldos': '🏦',
    'Fx': '📊',
    'DRE': '📈',
    'Geral': '📊'
  };
  return icons[category] || '📊';
}

function getColumnIcon(type: string): string {
  const icons: { [key: string]: string } = {
    'DateTime': '📅',
    'Date': '📅',
    'Int64': '🔢',
    'Int32': '🔢',
    'Double': '🔢',
    'Decimal': '💰',
    'String': '📝',
    'Boolean': '✓'
  };
  return icons[type] || '📝';
}

// Função para extrair medidas do texto (fallback)
function extractMeasures(content: string): Measure[] {
  const categories: { [key: string]: { keywords: string[], icon: string } } = {
    'Vendas': { keywords: ['venda', 'faturamento', 'receita', 'ticket', 'pedido', 'nf'], icon: '💰' },
    'Produtos': { keywords: ['produto', 'quantidade', 'estoque', 'cmv', 'custo', 'margem', 'item'], icon: '📦' },
    'Clientes': { keywords: ['cliente', 'parceiro', 'cpf', 'cnpj'], icon: '👤' },
    'Contas a Receber': { keywords: ['receber', 'cr', 'recebido', 'entrada'], icon: '💳' },
    'Contas a Pagar': { keywords: ['pagar', 'cp', 'pago', 'saída', 'despesa'], icon: '📤' },
    'Financeiro': { keywords: ['saldo', 'caixa', 'banco', 'fluxo', 'financeiro', 'extrato'], icon: '🏦' },
  };

  let extractedMeasures: Measure[] = [];
  const foundMeasures = new Set<string>();

  // Padrão para encontrar medidas no formato [NomeDaMedida]
  const measurePattern = /\[([A-Za-z][A-Za-z0-9_\s]+)\]/g;
  let match;

  while ((match = measurePattern.exec(content)) !== null) {
    const measureName = match[1];
    
    // Lista de palavras que são colunas comuns, não medidas
    const commonColumns = [
      'id', 'pk', 'fk', 'data', 'ano', 'mes', 'dia', 'tipo', 'status', 'nome', 
      'descricao', 'codigo', 'valor', 'qtd', 'total', 'sum', 'count', 'avg', 
      'max', 'min', 'empresa', 'filial', 'cliente', 'produto', 'grupo', 
      'vendedor', 'fornecedor', 'cidade', 'uf', 'estado', 'regiao', 'categoria',
      'classificacao', 'razaosocial', 'cnpj', 'cpf', 'telefone', 'email',
      'camada', 'banco', 'conta', 'movimento', 'prevista', 'baixado', 'aberto'
    ];
    
    // Ignorar nomes muito curtos ou que são claramente colunas
    const isMeasurePrefix = /^(qa_|fx|cp_|cr_|fx_)/i.test(measureName);
    const isLikelyMeasure = measureName.length >= 3 && 
        (isMeasurePrefix || 
         measureName[0] === measureName[0].toUpperCase() || 
         measureName.includes('_') || 
         !commonColumns.includes(measureName.toLowerCase()));
    
    if (isLikelyMeasure) {
      foundMeasures.add(measureName);
    }
  }

  // Criar array final com todas as medidas encontradas
  for (const measureName of foundMeasures) {
    // Determinar categoria
    let measureCategory = 'Geral';
    let measureCategoryIcon = '📊';
    
    for (const [cat, config] of Object.entries(categories)) {
      if (config.keywords.some(k => measureName.toLowerCase().includes(k.toLowerCase()))) {
        measureCategory = cat;
        measureCategoryIcon = config.icon;
        break;
      }
    }

    extractedMeasures.push({
      name: measureName,
      label: measureName,
      description: `Medida ${measureName}`,
      category: measureCategory,
      categoryIcon: measureCategoryIcon
    });
  }

  return extractedMeasures;
}

// Sugestões de agrupadores (fallback)
function getSuggestedGroupers() {
  return [
    { value: 'Calendario.Ano', label: 'Ano', icon: '📅', type: 'time' },
    { value: 'Calendario.Mês', label: 'Mês (número)', icon: '📅', type: 'time' },
    { value: 'Calendario.Nome do Mês', label: 'Nome do Mês', icon: '📅', type: 'time' },
    { value: 'Calendario.Mês Ano', label: 'Mês/Ano', icon: '📅', type: 'time' },
    { value: 'Calendario.Nome do Dia', label: 'Dia da Semana', icon: '📅', type: 'time' },
    { value: 'Calendario.Data', label: 'Data', icon: '📅', type: 'time' },
    { value: 'Filial.Empresa', label: 'Filial / Empresa', icon: '🏢', type: 'dimension' },
    { value: 'VendaGeral.Loja', label: 'Loja', icon: '🏢', type: 'dimension' },
    { value: 'CboProduto.prd_nome', label: 'Produto', icon: '📦', type: 'dimension' },
    { value: 'CboProduto.grp_nome', label: 'Grupo de Produto', icon: '🏷️', type: 'dimension' },
    { value: 'Funcionario.nome', label: 'Funcionário', icon: '👔', type: 'dimension' },
    { value: 'Vendedor.Nome', label: 'Vendedor', icon: '👔', type: 'dimension' },
    { value: 'Clientes.RAZAOSOCIAL', label: 'Cliente', icon: '👤', type: 'dimension' },
    { value: 'Extrato.Tipo da operação', label: 'Pagar/Receber', icon: '💰', type: 'dimension' },
    { value: 'Extrato.Camada01', label: 'Categoria Nível 1', icon: '📂', type: 'dimension' },
    { value: 'Extrato.Camada02', label: 'Categoria Nível 2', icon: '📂', type: 'dimension' },
  ];
}

// Sugestões de filtros (fallback)
function getSuggestedFilters() {
  return [
    { value: 'Calendario.Ano', label: 'Ano', icon: '📅', type: 'select' },
    { value: 'Calendario.Mês', label: 'Mês', icon: '📅', type: 'select' },
    { value: 'Filial.Empresa', label: 'Filial / Empresa', icon: '🏢', type: 'select' },
    { value: 'CboProduto.prd_nome', label: 'Produto', icon: '📦', type: 'text' },
    { value: 'CboProduto.grp_nome', label: 'Grupo', icon: '🏷️', type: 'text' },
    { value: 'Funcionario.nome', label: 'Funcionário', icon: '👔', type: 'text' },
    { value: 'VendaGeral.cancelado', label: 'Cancelado', icon: '❌', type: 'select' },
    { value: 'Extrato.Tipo da operação', label: 'Pagar/Receber', icon: '💰', type: 'select' },
    { value: 'Extrato.Situação', label: 'Situação', icon: '📋', type: 'select' },
    { value: 'Clientes.RAZAOSOCIAL', label: 'Cliente', icon: '👤', type: 'text' },
  ];
}