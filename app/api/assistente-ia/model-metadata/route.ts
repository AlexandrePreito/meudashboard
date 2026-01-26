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

    // Buscar contexto salvo no banco (com seções parseadas se disponíveis)
    const { data: modelContext } = await supabase
      .from('ai_model_contexts')
      .select('context_content, section_medidas, section_tabelas, parsed_at')
      .eq('connection_id', connection.id)
      .eq('dataset_id', dataset_id)
      .single();

    if (!modelContext?.context_content) {
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

    // Se tem seções parseadas, usar elas (prioridade)
    if (modelContext.section_medidas && Array.isArray(modelContext.section_medidas)) {
      console.log('[DEBUG model-metadata] Usando section_medidas parseada:', modelContext.section_medidas.length);
      measures = modelContext.section_medidas.map((m: any) => ({
        name: m.name,
        label: m.name,
        description: m.description || m.whenToUse || '',
        category: m.area || 'Geral',
        categoryIcon: getCategoryIcon(m.area || 'Geral')
      }));
    } else {
      // Fallback: extrair do texto (método antigo)
      console.log('[DEBUG model-metadata] Extraindo medidas do texto (fallback)');
      const content = modelContext.context_content;
      measures = extractMeasures(content);
    }

    // Se tem section_tabelas parseada, extrair groupers e filters dela
    if (modelContext.section_tabelas && Array.isArray(modelContext.section_tabelas)) {
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
    console.log('[DEBUG model-metadata] Measures:', measures.map(m => m.name));
    console.log('[DEBUG model-metadata] Suggested groupers:', suggestedGroupers.length);
    console.log('[DEBUG model-metadata] Suggested filters:', suggestedFilters.length);
    
    // Log completo do conteúdo para análise (apenas em desenvolvimento)
    if (process.env.NODE_ENV === 'development' && modelContext.context_content) {
      console.log('[DEBUG model-metadata] Full content (for analysis):', modelContext.context_content.substring(0, 1000));
    }

    // Buscar queries se disponíveis
    const { data: contextWithQueries } = await supabase
      .from('ai_model_contexts')
      .select('section_queries')
      .eq('connection_id', connection.id)
      .eq('dataset_id', dataset_id)
      .single();

    if (contextWithQueries?.section_queries && Array.isArray(contextWithQueries.section_queries)) {
      queries = contextWithQueries.section_queries;
      console.log('[DEBUG model-metadata] Queries encontradas:', queries.length);
    }

    return NextResponse.json({
      success: true,
      measures,
      suggestedGroupers,
      suggestedFilters,
      queries: queries || [],
      source: modelContext.parsed_at ? 'parsed' : 'context',
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

// Função auxiliar para obter ícone de categoria
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Vendas': '💰',
    'Produtos': '📦',
    'Financeiro': '💵',
    'Pessoas': '👥',
    'Contas a Receber': '💳',
    'Contas a Pagar': '📤',
    'Fluxo de Caixa': '📊',
    'Geral': '📊'
  };
  return icons[category] || '📊';
}

// Função auxiliar para obter ícone de coluna
function getColumnIcon(type: string): string {
  if (type.toLowerCase().includes('date') || type.toLowerCase().includes('time')) return '📅';
  if (type.toLowerCase().includes('int') || type.toLowerCase().includes('number')) return '🔢';
  if (type.toLowerCase().includes('bool')) return '✅';
  return '📋';
}

function extractMeasures(content: string): Measure[] {
  const measures: Measure[] = [];
  const lines = content.split('\n');
  const measuresMap = new Map<string, Measure>();
  
  // Categorias de medidas baseadas na documentação
  const categories: Record<string, { icon: string; keywords: string[] }> = {
    'Vendas': { icon: '💰', keywords: ['vendas', 'faturamento', 'valorliquido', 'valorsaida', 'valorbruta', 'ticket', 'receita', 'caixa'] },
    'Produtos': { icon: '📦', keywords: ['produto', 'quantidade', 'cmv', 'margem', 'valorproduto', 'qtd', 'item'] },
    'Clientes': { icon: '👥', keywords: ['cliente', 'clientes'] },
    'Contas a Receber': { icon: '💳', keywords: ['receber', 'contasreceber', 'areceber', 'cr_'] },
    'Contas a Pagar': { icon: '📤', keywords: ['pagar', 'contaspagar', 'apagar', 'cp_'] },
    'Financeiro': { icon: '💵', keywords: ['financeiro', 'saldo', 'recebido', 'pago', 'fx_'] },
    'Fluxo de Caixa': { icon: '📊', keywords: ['fluxo', 'fx_', 'resultado', 'operacional'] }
  };

  let currentCategory = 'Geral';
  let currentCategoryIcon = '📊';
  let inTable = false;
  let tableHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detectar início de tabela markdown
    if (line.match(/^\|.*\|.*\|/)) {
      if (line.match(/^\|.*Medida.*\|/i)) {
        inTable = true;
        // Extrair cabeçalhos da tabela
        tableHeaders = line.split('|').map(h => h.trim()).filter(h => h);
        continue;
      }
      
      // Se estamos em uma tabela e a linha contém dados
      if (inTable && !line.match(/^[\|\s-]+$/)) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        if (cells.length >= 2) {
          // Primeira coluna geralmente é a medida
          const measureName = cells[0].replace(/[`\[\]]/g, '').trim();
          const description = cells.length > 1 ? cells[1] : '';
          
          if (measureName && measureName.length >= 2 && !measureName.match(/^(medida|descrição|formato)$/i)) {
            // Determinar categoria
            let measureCategory = currentCategory;
            let measureCategoryIcon = currentCategoryIcon;
            
            for (const [cat, config] of Object.entries(categories)) {
              if (config.keywords.some(k => measureName.toLowerCase().includes(k.toLowerCase()))) {
                measureCategory = cat;
                measureCategoryIcon = config.icon;
                break;
              }
            }

            if (!measuresMap.has(measureName)) {
              measuresMap.set(measureName, {
                name: measureName,
                label: measureName,
                description: description || `Medida ${measureName}`,
                category: measureCategory,
                categoryIcon: measureCategoryIcon
              });
            }
          }
        }
        continue;
      }
    } else {
      inTable = false;
    }

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

    // Padrão 1: ### [NomeMedida] (formato mais comum na documentação)
    let measureMatch = line.match(/^###\s+\[(\w+)\]/);
    
    // Padrão 2: #### 🔵 NomeMedida ou #### NomeMedida ou #### [NomeMedida]
    if (!measureMatch) {
      measureMatch = line.match(/^####\s*[🔵🟢🟡🟠⚪]?\s*\[?(\w+)\]?(?:\s*\((.+?)\))?/);
    }
    
    // Padrão 3: - [NomeMedida] = (formato de lista)
    if (!measureMatch) {
      measureMatch = line.match(/^-\s*\[(\w+)\]\s*=/);
    }
    
    // Padrão 4: **NomeMedida** = ou **NomeMedida**: ou **[NomeMedida]**
    if (!measureMatch) {
      measureMatch = line.match(/^\*\*\[?(\w+)\]?\*\*\s*(?:=|:)/);
    }
    
    // Padrão 5: [NomeMedida] = (linha direta, sem prefixo)
    if (!measureMatch) {
      measureMatch = line.match(/^\[(\w+)\]\s*=/);
    }
    
    // Padrão 6: -- NomeMedida (comentário em bloco DAX)
    if (!measureMatch) {
      measureMatch = line.match(/^--\s+(\w+)/);
    }
    
    // Padrão 7: NomeMedida = (sem colchetes, mas com = e parece ser medida)
    if (!measureMatch) {
      measureMatch = line.match(/^([A-Z][A-Za-z0-9_]+)\s*=\s*(SUM|CALCULATE|DIVIDE|COUNT|DISTINCTCOUNT|AVERAGE|MAX|MIN|VAR|ABS|DATEDIFF|FORMAT)/i);
    }
    
    if (measureMatch) {
      const measureName = measureMatch[1];
      const measureLabel = measureMatch[2] || measureName;
      
      // Procurar descrição nas próximas linhas
      let description = '';
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const nextLine = lines[j].trim();
        
        // Procurar por "**Usar para:**", "**Descrição:**", "Descrição:", etc
        if (nextLine.match(/\*\*Usar para:\*\*/i) || nextLine.match(/\*\*Descrição:\*\*/i)) {
          description = nextLine.replace(/\*\*Usar para:\*\*/i, '').replace(/\*\*Descrição:\*\*/i, '').trim();
          break;
        }
        if (nextLine.match(/^Descrição:/i)) {
          description = nextLine.replace(/^Descrição:/i, '').trim();
          break;
        }
        if (nextLine.match(/^Usar para:/i)) {
          description = nextLine.replace(/^Usar para:/i, '').trim();
          break;
        }
        
        // Se encontrar comentário // na linha seguinte, usar como descrição
        if (nextLine.startsWith('//') && !description) {
          description = nextLine.replace(/^\/\/\s*/, '').trim();
          break;
        }
        
        // Se encontrar próxima seção, parar
        if (nextLine.startsWith('####') || nextLine.startsWith('###') || nextLine.startsWith('##')) {
          break;
        }
        
        // Se a linha não está vazia e não é código, pode ser descrição
        if (nextLine && !nextLine.startsWith('```') && !nextLine.startsWith('-') && !nextLine.match(/^\[/)) {
          if (!description && nextLine.length > 10 && nextLine.length < 200) {
            description = nextLine;
          }
        }
      }

      // Determinar categoria baseada no nome
      let measureCategory = currentCategory;
      let measureCategoryIcon = currentCategoryIcon;
      
      for (const [cat, config] of Object.entries(categories)) {
        if (config.keywords.some(k => measureName.toLowerCase().includes(k.toLowerCase()))) {
          measureCategory = cat;
          measureCategoryIcon = config.icon;
          break;
        }
      }

      // Evitar duplicatas
      if (!measuresMap.has(measureName)) {
        measuresMap.set(measureName, {
          name: measureName,
          label: measureLabel || measureName,
          description: description || `Medida ${measureName}`,
          category: measureCategory,
          categoryIcon: measureCategoryIcon
        });
      }
    }
  }

  // Converter Map para Array
  let extractedMeasures = Array.from(measuresMap.values());

  console.log('[DEBUG extractMeasures] Measures found by parser:', extractedMeasures.length);

  // SEMPRE buscar por padrões [NomeMedida] no conteúdo inteiro para encontrar todas as medidas
  console.log('[DEBUG extractMeasures] Searching for [MeasureName] patterns in content...');
  const measurePattern = /\[([A-Za-z][A-Za-z0-9_]*)\]/g;
  const foundMeasures = new Set<string>();
  let match;
  
  // Adicionar medidas já encontradas ao Set
  extractedMeasures.forEach(m => foundMeasures.add(m.name));
  
  // Buscar todas as medidas no formato [NomeMedida] no conteúdo inteiro
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
    // Mas incluir medidas que começam com prefixos conhecidos (QA_, fx, CP_, CR_, etc)
    const isMeasurePrefix = /^(qa_|fx|cp_|cr_|fx_)/i.test(measureName);
    const isLikelyMeasure = measureName.length >= 3 && 
        (isMeasurePrefix || 
         measureName[0] === measureName[0].toUpperCase() || // Começa com maiúscula
         measureName.includes('_') || // Contém underscore
         !commonColumns.includes(measureName.toLowerCase()));
    
    if (isLikelyMeasure) {
      foundMeasures.add(measureName);
    }
  }
  
  console.log('[DEBUG extractMeasures] Found measures by pattern:', Array.from(foundMeasures).slice(0, 20), '... (total:', foundMeasures.size, ')');

  console.log('[DEBUG extractMeasures] Total unique measures found:', foundMeasures.size);

  // Criar array final com todas as medidas encontradas
  const allMeasures: Measure[] = [];
  const existingMeasureNames = new Set(extractedMeasures.map(m => m.name));

  // Adicionar medidas já encontradas pelo parser
  allMeasures.push(...extractedMeasures);

  // Adicionar medidas encontradas pelo padrão [NomeMedida] que ainda não foram adicionadas
  for (const measureName of foundMeasures) {
    if (!existingMeasureNames.has(measureName)) {
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

      allMeasures.push({
        name: measureName,
        label: measureName,
        description: `Medida ${measureName}`,
        category: measureCategory,
        categoryIcon: measureCategoryIcon
      });
    }
  }

  extractedMeasures = allMeasures;

  // Se ainda não encontrou nada, retornar medidas conhecidas baseadas no conteúdo
  if (extractedMeasures.length === 0) {
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
        extractedMeasures.push(measure);
      }
    }
  }

  return extractedMeasures;
}

// NOVA FUNÇÃO: Retorna sugestões de agrupadores (não lista fixa)
function getSuggestedGroupers() {
  return [
    // Tempo
    { value: 'Calendario.Ano', label: 'Ano', icon: '📅', type: 'time' },
    { value: 'Calendario.Mês', label: 'Mês (número)', icon: '📅', type: 'time' },
    { value: 'Calendario.Nome do Mês', label: 'Nome do Mês', icon: '📅', type: 'time' },
    { value: 'Calendario.Mês Ano', label: 'Mês/Ano', icon: '📅', type: 'time' },
    { value: 'Calendario.Nome do Dia', label: 'Dia da Semana', icon: '📅', type: 'time' },
    { value: 'Calendario.Data', label: 'Data', icon: '📅', type: 'time' },
    
    // Empresa/Filial
    { value: 'Filial.Empresa', label: 'Filial / Empresa', icon: '🏢', type: 'dimension' },
    { value: 'VendaGeral.Loja', label: 'Loja', icon: '🏢', type: 'dimension' },
    
    // Produtos
    { value: 'CboProduto.prd_nome', label: 'Produto', icon: '📦', type: 'dimension' },
    { value: 'CboProduto.grp_nome', label: 'Grupo de Produto', icon: '🏷️', type: 'dimension' },
    { value: 'GrupoMaterial.descricao', label: 'Grupo Material', icon: '🏷️', type: 'dimension' },
    { value: 'Produto.DESCRICAO', label: 'Produto (alternativo)', icon: '📦', type: 'dimension' },
    { value: 'Grupo.DESCRICAO', label: 'Grupo (alternativo)', icon: '🏷️', type: 'dimension' },
    
    // Pessoas
    { value: 'Funcionario.nome', label: 'Funcionário', icon: '👔', type: 'dimension' },
    { value: 'GrupoFuncionario.nome', label: 'Grupo de Funcionário', icon: '👥', type: 'dimension' },
    { value: 'Vendedor.Nome', label: 'Vendedor', icon: '👔', type: 'dimension' },
    
    // Clientes
    { value: 'Clientes.RAZAOSOCIAL', label: 'Cliente', icon: '👤', type: 'dimension' },
    { value: 'Clientes.CIDADEENTREGA', label: 'Cidade do Cliente', icon: '🏙️', type: 'dimension' },
    { value: 'Clientes.UFENTREGA', label: 'UF do Cliente', icon: '📍', type: 'dimension' },
    
    // Vendas
    { value: 'VendaGeral.modo_venda_nome', label: 'Modo de Venda', icon: '🛒', type: 'dimension' },
    { value: 'VendaGeral.situacao', label: 'Situação da Venda', icon: '📋', type: 'dimension' },
    { value: 'VendaItemGeral.grupo_descr', label: 'Grupo do Item', icon: '🏷️', type: 'dimension' },
    
    // Financeiro
    { value: 'Extrato.Tipo da operação', label: 'Pagar/Receber', icon: '💰', type: 'dimension' },
    { value: 'Extrato.Situação', label: 'Situação Financeira', icon: '📋', type: 'dimension' },
    { value: 'Extrato.Conta bancária', label: 'Conta Bancária', icon: '🏦', type: 'dimension' },
    { value: 'Extrato.Camada01', label: 'Categoria Nível 1', icon: '📂', type: 'dimension' },
    { value: 'Extrato.Camada02', label: 'Categoria Nível 2', icon: '📂', type: 'dimension' },
    { value: 'Extrato.Camada03', label: 'Categoria Nível 3', icon: '📂', type: 'dimension' },
    { value: 'Extrato.Nome do fornecedor/cliente', label: 'Fornecedor/Cliente', icon: '👤', type: 'dimension' },
    
    // Fornecedores
    { value: 'Fornecedores.RAZAOSOCIAL', label: 'Fornecedor', icon: '🏭', type: 'dimension' },
    
    // Classificação/Aging
    { value: 'Classificacao.Classificacao', label: 'Aging (Faixa)', icon: '⏰', type: 'dimension' },
    { value: 'Classificacao.Categoria', label: 'Aging (Categoria)', icon: '⏰', type: 'dimension' },
  ];
}

// NOVA FUNÇÃO: Retorna sugestões de filtros (não lista fixa)
function getSuggestedFilters() {
  return [
    { value: 'Calendario.Ano', label: 'Ano', icon: '📅', type: 'select' },
    { value: 'Calendario.Mês', label: 'Mês', icon: '📅', type: 'select' },
    { value: 'Calendario.Nome do Mês', label: 'Nome do Mês', icon: '📅', type: 'select' },
    { value: 'Filial.Empresa', label: 'Filial / Empresa', icon: '🏢', type: 'select' },
    { value: 'CboProduto.prd_nome', label: 'Produto', icon: '📦', type: 'text' },
    { value: 'CboProduto.grp_nome', label: 'Grupo', icon: '🏷️', type: 'text' },
    { value: 'Funcionario.nome', label: 'Funcionário', icon: '👔', type: 'text' },
    { value: 'VendaGeral.cancelado', label: 'Cancelado', icon: '❌', type: 'select' },
    { value: 'VendaGeral.situacao', label: 'Situação da Venda', icon: '📋', type: 'select' },
    { value: 'Extrato.Tipo da operação', label: 'Pagar/Receber', icon: '💰', type: 'select' },
    { value: 'Extrato.Situação', label: 'Situação', icon: '📋', type: 'select' },
    { value: 'Extrato.Nome do fornecedor/cliente', label: 'Fornecedor/Cliente', icon: '👤', type: 'text' },
    { value: 'Clientes.RAZAOSOCIAL', label: 'Cliente', icon: '👤', type: 'text' },
    { value: 'Produto.DESCRICAO', label: 'Produto', icon: '📦', type: 'text' },
    { value: 'Grupo.DESCRICAO', label: 'Grupo de Produto', icon: '🏷️', type: 'text' },
    { value: 'MovFinanceiro.TIPO', label: 'Tipo Financeiro', icon: '💳', type: 'select' },
    { value: 'MovFinanceiro.Status', label: 'Status Financeiro', icon: '📋', type: 'select' },
    { value: 'MovimentoFiscal.TipoNF', label: 'Tipo NF', icon: '📄', type: 'select' },
    { value: 'MovimentoFiscal.TipoVenda', label: 'Tipo de Venda', icon: '🛒', type: 'select' },
  ];
}
