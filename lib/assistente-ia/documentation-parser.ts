// Parser de documentação estruturada
// Extrai seções delimitadas por <!-- SECTION:NOME --> e <!-- END:NOME -->

export interface ParsedDocumentation {
  raw?: string;  // Conteúdo original (opcional)
  base: string | null;
  medidas: MedidaInfo[] | null;
  tabelas: TabelaInfo[] | null;
  queries: QueryInfo[] | null;
  exemplos: ExemploInfo[] | null;
  errors: string[];
  metadata?: {
    hasBase: boolean;
    hasMedidas: boolean;
    hasTabelas: boolean;
    hasQueries: boolean;
    hasExemplos: boolean;
    totalMedidas: number;
    totalTabelas: number;
    totalQueries: number;
    totalExemplos: number;
  };
}

export interface MedidaInfo {
  name: string;
  description: string;
  whenToUse: string;
  area: string;
  formula: string;
  sourceTable: string;
  columns: string[];
  format: string;
}

export interface TabelaInfo {
  table: string;
  description: string;
  columns: ColunaInfo[];
}

export interface ColunaInfo {
  name: string;           // Formato: Tabela.Coluna
  type: string;
  usage: ('filter' | 'group')[];
  examples: string[];
}

export interface QueryInfo {
  id: string;
  question: string;
  measures: string[];
  groupers: string[];
  filters: string[];
  category: string;
}

export interface ExemploInfo {
  question: string;
  measures: string[];
  groupers: string[];
  filters: string[];
  ordering?: string;
  limit?: string;
  response: string;
}

export function parseDocumentation(content: string): ParsedDocumentation {
  const result: ParsedDocumentation = {
    base: null,
    medidas: null,
    tabelas: null,
    queries: null,
    exemplos: null,
    errors: []
  };

  // Extrair seção BASE
  result.base = extractSection(content, 'BASE');

  // Extrair e parsear MEDIDAS
  const medidasRaw = extractSection(content, 'MEDIDAS');
  if (medidasRaw) {
    result.medidas = parseMedidas(medidasRaw);
  }

  // Extrair e parsear TABELAS
  const tabelasRaw = extractSection(content, 'TABELAS');
  if (tabelasRaw) {
    result.tabelas = parseTabelas(tabelasRaw);
  }

  // Extrair e parsear QUERIES
  const queriesRaw = extractSection(content, 'QUERIES');
  if (queriesRaw) {
    result.queries = parseQueries(queriesRaw);
  }

  // Extrair e parsear EXEMPLOS
  const exemplosRaw = extractSection(content, 'EXEMPLOS');
  if (exemplosRaw) {
    result.exemplos = parseExemplos(exemplosRaw);
  }

  // Validar
  if (!result.base) result.errors.push('Seção BASE não encontrada');
  if (!result.medidas || result.medidas.length === 0) result.errors.push('Seção MEDIDAS vazia ou não encontrada');
  if (!result.tabelas || result.tabelas.length === 0) result.errors.push('Seção TABELAS vazia ou não encontrada');
  if (!result.queries || result.queries.length === 0) result.errors.push('Seção QUERIES vazia ou não encontrada');
  if (!result.exemplos || result.exemplos.length === 0) result.errors.push('Seção EXEMPLOS vazia ou não encontrada');

  // Adicionar metadata
  result.metadata = {
    hasBase: !!result.base,
    hasMedidas: !!(result.medidas && result.medidas.length > 0),
    hasTabelas: !!(result.tabelas && result.tabelas.length > 0),
    hasQueries: !!(result.queries && result.queries.length > 0),
    hasExemplos: !!(result.exemplos && result.exemplos.length > 0),
    totalMedidas: result.medidas?.length || 0,
    totalTabelas: result.tabelas?.length || 0,
    totalQueries: result.queries?.length || 0,
    totalExemplos: result.exemplos?.length || 0
  };

  return result;
}

function extractSection(content: string, sectionName: string): string | null {
  const startTag = `<!-- SECTION:${sectionName} -->`;
  const endTag = `<!-- END:${sectionName} -->`;
  
  const startIndex = content.indexOf(startTag);
  const endIndex = content.indexOf(endTag);
  
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }
  
  return content.substring(startIndex + startTag.length, endIndex).trim();
}

function parseMedidas(content: string): MedidaInfo[] {
  const medidas: MedidaInfo[] = [];
  
  if (!content || content.trim() === '') {
    return medidas;
  }
  
  const lines = content.split('\n');
  let inTable = false;
  let headerFound = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detectar início de tabela (linha que começa com |)
    if (line.startsWith('|')) {
      // Pular linha separadora (contém ---)
      if (line.includes('---')) {
        inTable = true;
        continue;
      }
      
      // Pular cabeçalho (primeira linha de tabela ou contém "Medida")
      if (!headerFound && (line.toLowerCase().includes('medida') || line.toLowerCase().includes('descrição'))) {
        headerFound = true;
        continue;
      }
      
      // Processar linha de dados
      if (inTable || headerFound) {
        const cells = line
          .split('|')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        
        // Precisa ter pelo menos 2 colunas (nome e descrição)
        if (cells.length >= 2) {
          const medida: MedidaInfo = {
            name: cells[0] || '',
            description: cells[1] || '',
            whenToUse: cells[2] || '',
            area: cells[3] || '',
            formula: '',
            sourceTable: '',
            columns: [],
            format: ''
          };
          
          // Só adicionar se tiver nome válido
          if (medida.name && !medida.name.toLowerCase().includes('medida')) {
            // Procurar detalhamento abaixo (### NomeMedida)
            const detalheIndex = content.indexOf(`### ${medida.name}`);
            if (detalheIndex !== -1) {
              const nextDetalheIndex = content.indexOf('###', detalheIndex + 10);
              const detalheContent = nextDetalheIndex !== -1 
                ? content.substring(detalheIndex, nextDetalheIndex)
                : content.substring(detalheIndex);
              
              // Extrair fórmula
              const formulaMatch = detalheContent.match(/\*\*Fórmula:\*\*\s*`([^`]+)`/i) || 
                                  detalheContent.match(/```dax\s*([\s\S]*?)```/i);
              if (formulaMatch) {
                medida.formula = formulaMatch[1].trim();
              }
              
              // Extrair área se não veio da tabela
              if (!medida.area) {
                const areaMatch = detalheContent.match(/\*\*Área:\*\*\s*(.+)/i);
                if (areaMatch) {
                  medida.area = areaMatch[1].trim();
                }
              }
              
              // Extrair tabela origem
              const tabelaMatch = detalheContent.match(/\*\*Tabela origem:\*\*\s*(.+)/i);
              if (tabelaMatch) {
                medida.sourceTable = tabelaMatch[1].trim();
              }
              
              // Extrair formato
              const formatoMatch = detalheContent.match(/\*\*Formato:\*\*\s*(.+)/i);
              if (formatoMatch) {
                medida.format = formatoMatch[1].trim();
              }
              
              // Extrair colunas usadas
              const colunasMatch = detalheContent.match(/\*\*Colunas usadas:\*\*\s*(.+)/i);
              if (colunasMatch) {
                medida.columns = colunasMatch[1].split(',').map(c => c.trim());
              }
            }
            
            medidas.push(medida);
          }
        }
      }
    } else {
      // Resetar quando sair da tabela
      if (line.startsWith('#')) {
        inTable = false;
        headerFound = false;
      }
    }
  }
  
  // Se não encontrou na tabela, tentar extrair dos detalhamentos (### NomeMedida)
  if (medidas.length === 0) {
    const detailRegex = /###\s+(\w+[\w_]*)\s*\n([\s\S]*?)(?=###|$)/g;
    let match;
    
    while ((match = detailRegex.exec(content)) !== null) {
      const nome = match[1];
      const detalhe = match[2];
      
      const descMatch = detalhe.match(/\*\*Descrição:\*\*\s*(.+)/i);
      const quandoMatch = detalhe.match(/\*\*Quando usar:\*\*\s*(.+)/i);
      const areaMatch = detalhe.match(/\*\*Área:\*\*\s*(.+)/i);
      const formulaMatch = detalhe.match(/\*\*Fórmula:\*\*\s*`([^`]+)`/i) || 
                          detalhe.match(/```dax\s*([\s\S]*?)```/i);
      
      medidas.push({
        name: nome,
        description: descMatch ? descMatch[1].trim() : '',
        whenToUse: quandoMatch ? quandoMatch[1].trim() : '',
        area: areaMatch ? areaMatch[1].trim() : '',
        formula: formulaMatch ? formulaMatch[1].trim() : '',
        sourceTable: '',
        columns: [],
        format: ''
      });
    }
  }
  
  return medidas;
}

function parseTabelas(content: string): TabelaInfo[] {
  const tabelas: TabelaInfo[] = [];
  const tabelasMap = new Map<string, ColunaInfo[]>();
  
  // Encontrar todas as linhas com formato Tabela.Coluna
  const lines = content.split('\n');
  
  lines.forEach(line => {
    if (!line.startsWith('|') || line.includes('---') || line.toLowerCase().includes('coluna')) return;
    
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3) {
      const colName = cells[0];
      
      // Verificar se está no formato Tabela.Coluna
      if (colName.includes('.')) {
        const [tableName] = colName.split('.');
        
        if (!tabelasMap.has(tableName)) {
          tabelasMap.set(tableName, []);
        }
        
        const usageStr = cells[2].toLowerCase();
        const usage: ('filter' | 'group')[] = [];
        if (usageStr.includes('filtro') || usageStr.includes('filter')) usage.push('filter');
        if (usageStr.includes('agrupar') || usageStr.includes('group')) usage.push('group');
        
        tabelasMap.get(tableName)!.push({
          name: colName,
          type: cells[1] || 'String',
          usage,
          examples: cells[3] ? cells[3].split(',').map(e => e.trim()) : []
        });
      }
    }
  });
  
  tabelasMap.forEach((columns, table) => {
    tabelas.push({
      table,
      description: '',
      columns
    });
  });
  
  return tabelas;
}

function parseQueries(content: string): QueryInfo[] {
  const queries: QueryInfo[] = [];
  let currentCategory = 'Geral';
  
  const lines = content.split('\n');
  
  lines.forEach(line => {
    // Detectar categoria
    if (line.startsWith('## ')) {
      currentCategory = line.replace('## ', '').replace('Queries ', '').trim();
    }
    
    // Parsear linha de query
    if (line.startsWith('|') && !line.includes('---') && !line.toLowerCase().includes(' id ')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 4 && cells[0].startsWith('Q')) {
        queries.push({
          id: cells[0],
          question: cells[1],
          measures: cells[2] === '-' ? [] : cells[2].split(',').map(m => m.trim()),
          groupers: cells[3] === '-' ? [] : cells[3].split(',').map(g => g.trim()),
          filters: cells[4] ? (cells[4] === '-' ? [] : cells[4].split(',').map(f => f.trim())) : [],
          category: currentCategory
        });
      }
    }
  });
  
  return queries;
}

function parseExemplos(content: string): ExemploInfo[] {
  const exemplos: ExemploInfo[] = [];
  
  // Dividir por "## Exemplo"
  const sections = content.split(/## Exemplo \d+/i).filter(s => s.trim());
  
  sections.forEach(section => {
    const exemplo: ExemploInfo = {
      question: '',
      measures: [],
      groupers: [],
      filters: [],
      response: ''
    };
    
    // Extrair campos
    const perguntaMatch = section.match(/\*\*Pergunta:\*\*\s*(.+)/);
    if (perguntaMatch) exemplo.question = perguntaMatch[1].trim();
    
    const medidasMatch = section.match(/\*\*Medidas:\*\*\s*(.+)/);
    if (medidasMatch) {
      exemplo.measures = medidasMatch[1].split(',').map(m => m.trim().replace(/[\[\]]/g, ''));
    }
    
    const agrupadoresMatch = section.match(/\*\*Agrupadores:\*\*\s*(.+)/);
    if (agrupadoresMatch && agrupadoresMatch[1].trim() !== '-') {
      exemplo.groupers = agrupadoresMatch[1].split(',').map(g => g.trim());
    }
    
    const filtrosMatch = section.match(/\*\*Filtros:\*\*\s*(.+)/);
    if (filtrosMatch && filtrosMatch[1].trim() !== '-') {
      exemplo.filters = filtrosMatch[1].split(',').map(f => f.trim());
    }
    
    const ordenacaoMatch = section.match(/\*\*Ordenação:\*\*\s*(.+)/);
    if (ordenacaoMatch) exemplo.ordering = ordenacaoMatch[1].trim();
    
    const limiteMatch = section.match(/\*\*Limite:\*\*\s*(.+)/);
    if (limiteMatch) exemplo.limit = limiteMatch[1].trim();
    
    const respostaMatch = section.match(/\*\*Resposta modelo:\*\*\s*"?(.+)"?/);
    if (respostaMatch) exemplo.response = respostaMatch[1].trim().replace(/^"|"$/g, '');
    
    if (exemplo.question && exemplo.measures.length > 0) {
      exemplos.push(exemplo);
    }
  });
  
  return exemplos;
}

// Função auxiliar para obter estatísticas
export function getDocumentationStats(parsed: ParsedDocumentation) {
  return {
    hasBase: !!parsed.base,
    medidasCount: parsed.medidas?.length || 0,
    tabelasCount: parsed.tabelas?.length || 0,
    colunasCount: parsed.tabelas?.reduce((acc, t) => acc + t.columns.length, 0) || 0,
    queriesCount: parsed.queries?.length || 0,
    exemplosCount: parsed.exemplos?.length || 0,
    errors: parsed.errors
  };
}

// Função para gerar contexto otimizado baseado na pergunta
export function generateOptimizedContext(
  parsed: ParsedDocumentation,
  question: string
): string {
  if (!parsed.base) {
    return '';
  }

  const questionLower = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Extrair palavras-chave da pergunta
  const keywords: string[] = [];
  
  // Palavras relacionadas a medidas
  const medidaKeywords = ['faturamento', 'venda', 'receita', 'ticket', 'margem', 'lucro', 'custo', 'cmv', 'quantidade', 'total', 'soma'];
  medidaKeywords.forEach(kw => {
    if (questionLower.includes(kw)) keywords.push(kw);
  });
  
  // Palavras relacionadas a dimensões
  const dimensaoKeywords = ['filial', 'loja', 'vendedor', 'garcom', 'funcionario', 'produto', 'cliente', 'fornecedor', 'categoria', 'grupo'];
  dimensaoKeywords.forEach(kw => {
    if (questionLower.includes(kw)) keywords.push(kw);
  });
  
  // Palavras relacionadas a tempo
  const tempoKeywords = ['mes', 'ano', 'dia', 'semana', 'periodo', 'data'];
  tempoKeywords.forEach(kw => {
    if (questionLower.includes(kw)) keywords.push(kw);
  });

  // Filtrar medidas relevantes
  const relevantMeasures: MedidaInfo[] = [];
  if (parsed.medidas) {
    parsed.medidas.forEach(medida => {
      const medidaText = `${medida.name} ${medida.description} ${medida.whenToUse} ${medida.area}`.toLowerCase();
      const isRelevant = keywords.some(kw => medidaText.includes(kw)) || 
                       keywords.length === 0; // Se não tem keywords, incluir todas
      
      if (isRelevant) {
        relevantMeasures.push(medida);
      }
    });
  }

  // Se não encontrou medidas relevantes, usar top 10 mais comuns
  const measuresToInclude = relevantMeasures.length > 0 
    ? relevantMeasures.slice(0, 15)  // Limitar a 15 medidas
    : (parsed.medidas || []).slice(0, 10);

  // Filtrar queries relevantes
  const relevantQueries: QueryInfo[] = [];
  if (parsed.queries) {
    parsed.queries.forEach(query => {
      const queryText = `${query.question} ${query.measures.join(' ')}`.toLowerCase();
      const isRelevant = keywords.some(kw => queryText.includes(kw)) ||
                        keywords.length === 0;
      
      if (isRelevant) {
        relevantQueries.push(query);
      }
    });
  }

  // Limitar queries a 5 mais relevantes
  const queriesToInclude = relevantQueries.slice(0, 5);

  // Filtrar exemplos relevantes
  const relevantExemplos: ExemploInfo[] = [];
  if (parsed.exemplos) {
    parsed.exemplos.forEach(exemplo => {
      const exemploText = `${exemplo.question} ${exemplo.measures.join(' ')}`.toLowerCase();
      const isRelevant = keywords.some(kw => exemploText.includes(kw)) ||
                        keywords.length === 0;
      
      if (isRelevant) {
        relevantExemplos.push(exemplo);
      }
    });
  }

  // Limitar exemplos a 3 mais relevantes
  const exemplosToInclude = relevantExemplos.slice(0, 3);

  // Construir contexto otimizado
  let context = `# CONTEXTO DO MODELO DE DADOS\n\n`;
  
  // BASE (sempre incluir)
  if (parsed.base) {
    context += `${parsed.base}\n\n`;
  }

  // MEDIDAS RELEVANTES
  if (measuresToInclude.length > 0) {
    context += `## MEDIDAS DISPONÍVEIS (${measuresToInclude.length} de ${parsed.medidas?.length || 0} total)\n\n`;
    measuresToInclude.forEach(medida => {
      context += `### ${medida.name}\n`;
      context += `- **Descrição:** ${medida.description}\n`;
      if (medida.whenToUse) context += `- **Quando usar:** ${medida.whenToUse}\n`;
      if (medida.area) context += `- **Área:** ${medida.area}\n`;
      if (medida.formula) context += `- **Fórmula:** \`${medida.formula}\`\n`;
      context += `\n`;
    });
  }

  // QUERIES RELEVANTES
  if (queriesToInclude.length > 0) {
    context += `## QUERIES PRÉ-CONFIGURADAS (${queriesToInclude.length} de ${parsed.queries?.length || 0} total)\n\n`;
    queriesToInclude.forEach(query => {
      context += `### ${query.id}: ${query.question}\n`;
      context += `- **Medidas:** ${query.measures.join(', ') || '-'}\n`;
      context += `- **Agrupadores:** ${query.groupers.join(', ') || '-'}\n`;
      context += `- **Filtros:** ${query.filters.join(', ') || '-'}\n\n`;
    });
  }

  // EXEMPLOS RELEVANTES
  if (exemplosToInclude.length > 0) {
    context += `## EXEMPLOS DE PERGUNTAS E RESPOSTAS (${exemplosToInclude.length} de ${parsed.exemplos?.length || 0} total)\n\n`;
    exemplosToInclude.forEach((exemplo, idx) => {
      context += `### Exemplo ${idx + 1}\n`;
      context += `**Pergunta:** ${exemplo.question}\n`;
      context += `**Medidas:** ${exemplo.measures.join(', ')}\n`;
      if (exemplo.groupers.length > 0) context += `**Agrupadores:** ${exemplo.groupers.join(', ')}\n`;
      if (exemplo.filters.length > 0) context += `**Filtros:** ${exemplo.filters.join(', ')}\n`;
      context += `**Resposta modelo:** ${exemplo.response}\n\n`;
    });
  }

  // TABELAS (resumido - apenas colunas mais usadas)
  if (parsed.tabelas && parsed.tabelas.length > 0) {
    context += `## COLUNAS PRINCIPAIS\n\n`;
    parsed.tabelas.forEach(tabela => {
      if (tabela.columns.length > 0) {
        const topColumns = tabela.columns.slice(0, 5); // Top 5 colunas por tabela
        context += `### ${tabela.table}\n`;
        topColumns.forEach(col => {
          context += `- ${col.name} (${col.type}) - ${col.usage.join('/')}\n`;
        });
        context += `\n`;
      }
    });
  }

  return context;
}
