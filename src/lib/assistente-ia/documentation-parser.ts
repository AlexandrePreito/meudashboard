// Parser de documentação estruturada

export interface ParsedDocumentation {
  base: string | null;
  medidas: MedidaInfo[] | null;
  tabelas: TabelaInfo[] | null;
  queries: QueryInfo[] | null;
  exemplos: ExemploInfo[] | null;
  errors: string[];
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
  name: string;
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

  result.base = extractSection(content, 'BASE');
  
  const medidasRaw = extractSection(content, 'MEDIDAS');
  if (medidasRaw) result.medidas = parseMedidas(medidasRaw);

  const tabelasRaw = extractSection(content, 'TABELAS');
  if (tabelasRaw) result.tabelas = parseTabelas(tabelasRaw);

  const queriesRaw = extractSection(content, 'QUERIES');
  if (queriesRaw) result.queries = parseQueries(queriesRaw);

  const exemplosRaw = extractSection(content, 'EXEMPLOS');
  if (exemplosRaw) result.exemplos = parseExemplos(exemplosRaw);

  if (!result.base) result.errors.push('Seção BASE não encontrada');
  if (!result.medidas?.length) result.errors.push('Seção MEDIDAS vazia');
  if (!result.tabelas?.length) result.errors.push('Seção TABELAS vazia');
  if (!result.queries?.length) result.errors.push('Seção QUERIES vazia');
  if (!result.exemplos?.length) result.errors.push('Seção EXEMPLOS vazia');

  return result;
}

function extractSection(content: string, name: string): string | null {
  const start = content.indexOf(`<!-- SECTION:${name} -->`);
  const end = content.indexOf(`<!-- END:${name} -->`);
  if (start === -1 || end === -1) return null;
  return content.substring(start + `<!-- SECTION:${name} -->`.length, end).trim();
}

function parseMedidas(content: string): MedidaInfo[] {
  const medidas: MedidaInfo[] = [];
  const rows = content.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.toLowerCase().includes('medida'));
  
  rows.forEach(row => {
    const cells = row.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 4) {
      medidas.push({
        name: cells[0], description: cells[1], whenToUse: cells[2], area: cells[3],
        formula: '', sourceTable: '', columns: [], format: ''
      });
    }
  });
  return medidas;
}

function parseTabelas(content: string): TabelaInfo[] {
  const map = new Map<string, ColunaInfo[]>();
  
  content.split('\n').forEach(line => {
    if (!line.startsWith('|') || line.includes('---')) return;
    const cells = line.split('|').map(c => c.trim()).filter(c => c);
    if (cells.length >= 3 && cells[0].includes('.')) {
      const [table] = cells[0].split('.');
      if (!map.has(table)) map.set(table, []);
      const usage: ('filter' | 'group')[] = [];
      if (cells[2].toLowerCase().includes('filtro')) usage.push('filter');
      if (cells[2].toLowerCase().includes('agrupar')) usage.push('group');
      map.get(table)!.push({ name: cells[0], type: cells[1], usage, examples: cells[3]?.split(',').map(e => e.trim()) || [] });
    }
  });
  
  return Array.from(map.entries()).map(([table, columns]) => ({ table, description: '', columns }));
}

function parseQueries(content: string): QueryInfo[] {
  const queries: QueryInfo[] = [];
  let category = 'Geral';
  
  content.split('\n').forEach(line => {
    if (line.startsWith('## ')) category = line.replace('## ', '').trim();
    if (line.startsWith('|') && !line.includes('---')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 4 && cells[0].startsWith('Q')) {
        queries.push({
          id: cells[0], question: cells[1],
          measures: cells[2] === '-' ? [] : cells[2].split(',').map(m => m.trim()),
          groupers: cells[3] === '-' ? [] : cells[3].split(',').map(g => g.trim()),
          filters: cells[4] ? (cells[4] === '-' ? [] : cells[4].split(',').map(f => f.trim())) : [],
          category
        });
      }
    }
  });
  return queries;
}

function parseExemplos(content: string): ExemploInfo[] {
  const exemplos: ExemploInfo[] = [];
  
  content.split(/## Exemplo \d+/i).filter(s => s.trim()).forEach(section => {
    const get = (field: string) => section.match(new RegExp(`\\*\\*${field}:\\*\\*\\s*(.+)`))?.[1]?.trim() || '';
    const question = get('Pergunta');
    const measures = get('Medidas').split(',').map(m => m.trim().replace(/[\[\]]/g, '')).filter(Boolean);
    
    if (question && measures.length) {
      exemplos.push({
        question, measures,
        groupers: get('Agrupadores') === '-' ? [] : get('Agrupadores').split(',').map(g => g.trim()).filter(Boolean),
        filters: get('Filtros') === '-' ? [] : get('Filtros').split(',').map(f => f.trim()).filter(Boolean),
        ordering: get('Ordenação') || undefined,
        limit: get('Limite') || undefined,
        response: get('Resposta modelo').replace(/^"|"$/g, '')
      });
    }
  });
  return exemplos;
}

export function getDocumentationStats(parsed: ParsedDocumentation) {
  return {
    hasBase: !!parsed.base,
    medidasCount: parsed.medidas?.length || 0,
    tabelasCount: parsed.tabelas?.length || 0,
    colunasCount: parsed.tabelas?.reduce((a, t) => a + t.columns.length, 0) || 0,
    queriesCount: parsed.queries?.length || 0,
    exemplosCount: parsed.exemplos?.length || 0,
    errors: parsed.errors
  };
}
