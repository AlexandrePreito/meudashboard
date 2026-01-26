'use client';

import { useState, useEffect } from 'react';
import { Search, Database, Calculator, Columns, HelpCircle, MessageSquare, ChevronDown, ChevronRight } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';

interface MedidaInfo {
  name: string;
  description: string;
  whenToUse: string;
  area: string;
  formula: string;
  sourceTable: string;
  columns: string[];
  format: string;
}

interface TabelaInfo {
  table: string;
  description: string;
  columns: ColunaInfo[];
}

interface ColunaInfo {
  name: string;
  type: string;
  usage: string[];
  examples: string[];
}

interface QueryInfo {
  id: string;
  question: string;
  measures: string[];
  groupers: string[];
  filters: string[];
  category: string;
}

interface ExemploInfo {
  question: string;
  measures: string[];
  groupers: string[];
  filters: string[];
  ordering?: string;
  limit?: string;
  response: string;
}

interface ContextData {
  section_base: string;
  section_medidas: MedidaInfo[];
  section_tabelas: TabelaInfo[];
  section_queries: QueryInfo[];
  section_exemplos: ExemploInfo[];
}

const TABS = [
  { id: 'overview', label: 'Visão Geral', icon: Database },
  { id: 'medidas', label: 'Medidas', icon: Calculator },
  { id: 'colunas', label: 'Colunas', icon: Columns },
  { id: 'queries', label: 'Queries', icon: HelpCircle },
  { id: 'exemplos', label: 'Exemplos', icon: MessageSquare },
];

export default function TreinamentoPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [context, setContext] = useState<ContextData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedMedida, setExpandedMedida] = useState<string | null>(null);
  const [expandedTabela, setExpandedTabela] = useState<string | null>(null);

  useEffect(() => {
    loadContext();
  }, []);

  const loadContext = async () => {
    try {
      // Primeiro tenta buscar contexto DAX (base completa)
      let res = await fetch('/api/assistente-ia/context?type=dax');
      let data = await res.json();
      let contextData = data.contexts?.[0];
      
      // Se não tiver DAX, usa Chat
      if (!contextData) {
        res = await fetch('/api/assistente-ia/context?type=chat');
        data = await res.json();
        contextData = data.contexts?.[0];
      }
      
      if (contextData) {
        setContext({
          section_base: contextData.section_base || '',
          section_medidas: contextData.section_medidas || [],
          section_tabelas: contextData.section_tabelas || [],
          section_queries: contextData.section_queries || [],
          section_exemplos: contextData.section_exemplos || [],
        });
      } else {
        setError('Nenhuma documentação configurada. Vá em Contextos para importar.');
      }
    } catch (err) {
      console.error('Erro ao carregar:', err);
      setError('Erro ao carregar documentação');
    } finally {
      setLoading(false);
    }
  };

  const stats = context ? {
    medidas: context.section_medidas?.length || 0,
    tabelas: context.section_tabelas?.length || 0,
    colunas: context.section_tabelas?.reduce((a, t) => a + (t.columns?.length || 0), 0) || 0,
    queries: context.section_queries?.length || 0,
    exemplos: context.section_exemplos?.length || 0,
  } : null;

  // Filtrar medidas
  const filteredMedidas = context?.section_medidas?.filter(m =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.area.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Filtrar colunas
  const filteredTabelas = context?.section_tabelas?.filter(t =>
    t.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.columns.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  // Filtrar queries
  const filteredQueries = context?.section_queries?.filter(q =>
    q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.category.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Agrupar queries por categoria
  const queriesByCategory = filteredQueries.reduce((acc, q) => {
    const cat = q.category || 'Geral';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(q);
    return acc;
  }, {} as Record<string, QueryInfo[]>);

  if (loading) {
    return (
      <PermissionGuard>
        <MainLayout>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </MainLayout>
      </PermissionGuard>
    );
  }

  if (error || !context) {
    return (
      <PermissionGuard>
        <MainLayout>
          <div className="max-w-2xl mx-auto text-center py-12">
            <Database size={48} className="mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Documentação não encontrada</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <a 
              href="/assistente-ia/contextos" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Ir para Contextos
            </a>
          </div>
        </MainLayout>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <MainLayout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">🎓 Treinamento da IA</h1>
            <p className="text-gray-600">Visualize e gerencie o conhecimento do assistente</p>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 border-b mb-6 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); }}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
                {tab.id === 'medidas' && stats && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{stats.medidas}</span>
                )}
                {tab.id === 'colunas' && stats && (
                  <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">{stats.colunas}</span>
                )}
                {tab.id === 'queries' && stats && (
                  <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">{stats.queries}</span>
                )}
                {tab.id === 'exemplos' && stats && (
                  <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">{stats.exemplos}</span>
                )}
              </button>
            ))}
          </div>

          {/* Search (não aparece na Visão Geral) */}
          {activeTab !== 'overview' && (
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar ${activeTab}...`}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          {/* Tab Content */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            
            {/* VISÃO GERAL */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-700">{stats?.medidas}</div>
                    <div className="text-sm text-blue-600">Medidas</div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-700">{stats?.tabelas}</div>
                    <div className="text-sm text-green-600">Tabelas</div>
                  </div>
                  <div className="bg-teal-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-teal-700">{stats?.colunas}</div>
                    <div className="text-sm text-teal-600">Colunas</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-amber-700">{stats?.queries}</div>
                    <div className="text-sm text-amber-600">Queries</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-purple-700">{stats?.exemplos}</div>
                    <div className="text-sm text-purple-600">Exemplos</div>
                  </div>
                </div>

                <div className="prose max-w-none">
                  <pre className="text-gray-700 whitespace-pre-wrap font-sans text-sm leading-relaxed">
                    {context.section_base}
                  </pre>
                </div>
              </div>
            )}

            {/* MEDIDAS */}
            {activeTab === 'medidas' && (
              <div className="space-y-2">
                {filteredMedidas.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma medida encontrada</p>
                ) : (
                  filteredMedidas.map((medida) => (
                    <div key={medida.name} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedMedida(expandedMedida === medida.name ? null : medida.name)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          {expandedMedida === medida.name ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <div className="text-left">
                            <div className="font-medium">{medida.name}</div>
                            <div className="text-sm text-gray-500">{medida.description}</div>
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{medida.area}</span>
                      </button>
                      
                      {expandedMedida === medida.name && (
                        <div className="px-4 pb-4 border-t bg-gray-50">
                          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                            <div>
                              <div className="text-gray-500 mb-1">Quando usar:</div>
                              <div>{medida.whenToUse || '-'}</div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-1">Tabela origem:</div>
                              <div>{medida.sourceTable || '-'}</div>
                            </div>
                            {medida.formula && (
                              <div className="col-span-2">
                                <div className="text-gray-500 mb-1">Fórmula DAX:</div>
                                <pre className="bg-gray-800 text-green-400 p-3 rounded text-xs overflow-x-auto">
                                  {medida.formula}
                                </pre>
                              </div>
                            )}
                            {medida.columns && medida.columns.length > 0 && (
                              <div className="col-span-2">
                                <div className="text-gray-500 mb-1">Colunas usadas:</div>
                                <div className="flex flex-wrap gap-1">
                                  {medida.columns.map((col, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                      {col}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* COLUNAS */}
            {activeTab === 'colunas' && (
              <div className="space-y-4">
                {filteredTabelas.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma coluna encontrada</p>
                ) : (
                  filteredTabelas.map((tabela) => (
                    <div key={tabela.table} className="border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setExpandedTabela(expandedTabela === tabela.table ? null : tabela.table)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedTabela === tabela.table ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                          <span className="font-medium">{tabela.table}</span>
                          <span className="text-sm text-gray-500">({tabela.columns.length} colunas)</span>
                        </div>
                      </button>
                      
                      {expandedTabela === tabela.table && (
                        <div className="border-t">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="text-left p-3">Coluna</th>
                                <th className="text-left p-3">Tipo</th>
                                <th className="text-left p-3">Uso</th>
                                <th className="text-left p-3">Exemplos</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tabela.columns.map((col, i) => (
                                <tr key={i} className="border-t">
                                  <td className="p-3 font-mono text-blue-600">{col.name}</td>
                                  <td className="p-3">{col.type}</td>
                                  <td className="p-3">
                                    {col.usage && col.usage.length > 0 ? col.usage.map((u, j) => (
                                      <span key={j} className="inline-block px-2 py-0.5 bg-gray-100 text-xs rounded mr-1">
                                        {u}
                                      </span>
                                    )) : '-'}
                                  </td>
                                  <td className="p-3 text-gray-500">
                                    {col.examples && col.examples.length > 0 ? col.examples.join(', ') : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* QUERIES */}
            {activeTab === 'queries' && (
              <div className="space-y-6">
                {Object.keys(queriesByCategory).length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma query encontrada</p>
                ) : (
                  Object.entries(queriesByCategory).map(([category, queries]) => (
                    <div key={category}>
                      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        {category}
                        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{queries.length}</span>
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-3 w-16">ID</th>
                              <th className="text-left p-3">Pergunta</th>
                              <th className="text-left p-3">Medidas</th>
                              <th className="text-left p-3">Agrupadores</th>
                              <th className="text-left p-3">Filtros</th>
                            </tr>
                          </thead>
                          <tbody>
                            {queries.map((q) => (
                              <tr key={q.id} className="border-t hover:bg-gray-50">
                                <td className="p-3 font-mono text-blue-600">{q.id}</td>
                                <td className="p-3">{q.question}</td>
                                <td className="p-3">
                                  {q.measures && q.measures.length > 0 ? q.measures.map((m, i) => (
                                    <span key={i} className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded mr-1 mb-1">
                                      {m}
                                    </span>
                                  )) : '-'}
                                </td>
                                <td className="p-3">
                                  {q.groupers && q.groupers.length > 0 ? q.groupers.map((g, i) => (
                                    <span key={i} className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded mr-1 mb-1">
                                      {g}
                                    </span>
                                  )) : '-'}
                                </td>
                                <td className="p-3">
                                  {q.filters && q.filters.length > 0 ? q.filters.map((f, i) => (
                                    <span key={i} className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded mr-1 mb-1">
                                      {f}
                                    </span>
                                  )) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* EXEMPLOS */}
            {activeTab === 'exemplos' && (
              <div className="grid gap-4">
                {context.section_exemplos?.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum exemplo encontrado</p>
                ) : (
                  context.section_exemplos?.map((exemplo, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="flex-shrink-0 w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-medium text-sm">
                          {i + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{exemplo.question}</div>
                        </div>
                      </div>
                      
                      <div className="pl-11 space-y-2 text-sm">
                        <div className="flex flex-wrap gap-2">
                          <span className="text-gray-500">Medidas:</span>
                          {exemplo.measures && exemplo.measures.length > 0 ? exemplo.measures.map((m, j) => (
                            <span key={j} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                              {m}
                            </span>
                          )) : <span className="text-gray-400">-</span>}
                        </div>
                        
                        {exemplo.groupers && exemplo.groupers.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-gray-500">Agrupadores:</span>
                            {exemplo.groupers.map((g, j) => (
                              <span key={j} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {exemplo.filters && exemplo.filters.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            <span className="text-gray-500">Filtros:</span>
                            {exemplo.filters.map((f, j) => (
                              <span key={j} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        
                        {exemplo.response && (
                          <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                            <span className="text-gray-500">Resposta modelo: </span>
                            <span className="text-gray-700 italic">&quot;{exemplo.response}&quot;</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        </div>
      </MainLayout>
    </PermissionGuard>
  );
}
