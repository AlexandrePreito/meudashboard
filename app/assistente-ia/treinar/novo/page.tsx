'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { 
  Plus,
  X,
  Play, 
  Save, 
  ChevronDown,
  ChevronRight,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Calculator,
  Layers,
  Filter,
  Settings,
  MessageSquare,
  Code
} from 'lucide-react';
import { TrainingFieldSelector, generateDaxPreview } from '@/components/assistente-ia/TrainingFieldSelector';

interface Measure {
  name: string;
  label: string;
  description: string;
  category: string;
  categoryIcon: string;
}


interface Dataset {
  id: string;
  name: string;
}

interface DaxResult {
  success: boolean;
  result?: any[];
  columns?: string[];
  rowCount?: number;
  executionTime?: number;
  error?: string;
  warning?: string;
}

const OPERATORS = [
  { value: '=', label: '=' },
  { value: '<>', label: '≠' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '≥' },
  { value: '<=', label: '≤' },
  { value: 'contains', label: 'contém' },
];

const ORDER_OPTIONS = [
  { value: 'DESC', label: 'Maior → Menor' },
  { value: 'ASC', label: 'Menor → Maior' },
];

const LIMIT_OPTIONS = [
  { value: 0, label: 'Todos' },
  { value: 5, label: 'Top 5' },
  { value: 10, label: 'Top 10' },
  { value: 20, label: 'Top 20' },
];

const TAG_SUGGESTIONS = [
  'anual', 'cancelamento', 'categoria', 'cidade', 'clientes',
  'CMV', 'comissão', 'compras', 'contas a pagar', 'contas a receber',
  'custo', 'desconto', 'despesas', 'devolução', 'diário',
  'estado', 'estoque', 'faturamento', 'filial', 'financeiro',
  'fluxo de caixa', 'fornecedores', 'grupo', 'impostos', 'inadimplência',
  'lucro', 'marca', 'margem', 'mensal', 'meta',
  'notas fiscais', 'pagamento', 'pedidos', 'período', 'prazo',
  'produtos', 'receitas', 'recebimento', 'região', 'representante',
  'semanal', 'subgrupo', 'vencimento', 'vendas', 'vendedor'
].sort();

function NovoTreinamentoPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Parâmetros da URL (para quando vem de "Ensinar Resposta")
  const questionFromUrl = searchParams.get('question');
  const unansweredId = searchParams.get('unanswered_id');
  
  // Data states
  const [groupId, setGroupId] = useState<string | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [measures, setMeasures] = useState<Measure[]>([]);
  const [suggestedGroupers, setSuggestedGroupers] = useState<any[]>([]);
  const [suggestedFilters, setSuggestedFilters] = useState<any[]>([]);
  
  // Loading states
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [executing, setExecuting] = useState(false);
  
  // Selection states (novo formato)
  const [selectedDataset, setSelectedDataset] = useState('');
  const [selectedMeasures, setSelectedMeasures] = useState<string[]>([]); // Array de nomes de medidas
  const [selectedGroupers, setSelectedGroupers] = useState<string[]>([]); // Array de "Tabela.Coluna"
  const [selectedFilters, setSelectedFilters] = useState<Array<{ column: string; value: string }>>([]);
  const [orderBy, setOrderBy] = useState<'DESC' | 'ASC'>('DESC');
  const [limit, setLimit] = useState(0);
  
  // UI states
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  // Result states
  const [daxResult, setDaxResult] = useState<DaxResult | null>(null);
  const [generatedDax, setGeneratedDax] = useState('');
  
  // Question and tags states
  const [question, setQuestion] = useState(questionFromUrl || '');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Buscar group_id do usuário
  useEffect(() => {
    async function loadUserGroup() {
      try {
        console.log('=== Buscando grupo do usuário ===');
        const res = await fetch('/api/user/groups');
        if (res.ok) {
          const data = await res.json();
          console.log('Grupos encontrados:', data);
          if (data.groups && data.groups.length > 0) {
            console.log('Usando grupo:', data.groups[0].id);
            setGroupId(data.groups[0].id);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar grupo:', err);
      }
    }
    loadUserGroup();
  }, []);

  // Load datasets quando groupId mudar
  useEffect(() => {
    if (groupId) {
      loadDatasets();
    }
  }, [groupId]);

  // Load metadata quando selectedDataset mudar
  useEffect(() => {
    if (selectedDataset) {
      console.log('=== useEffect: selectedDataset mudou ===', selectedDataset);
      loadMetadata();
    }
  }, [selectedDataset]);

  // Generate DAX quando seleções mudarem
  useEffect(() => {
    if (selectedMeasures.length > 0) {
      const dax = generateDax();
      setGeneratedDax(dax);
    } else {
      setGeneratedDax('');
    }
  }, [selectedMeasures, selectedGroupers, selectedFilters, orderBy, limit]);

  async function loadDatasets() {
    console.log('=== loadDatasets chamado ===');
    setLoadingDatasets(true);
    try {
      // Buscar connection_id do grupo
      if (groupId) {
        const connectionRes = await fetch(`/api/powerbi/connections?group_id=${groupId}`);
        if (connectionRes.ok) {
          const connectionData = await connectionRes.json();
          if (connectionData.connections && connectionData.connections.length > 0) {
            // Pegar a primeira conexão ativa
            const activeConnection = connectionData.connections.find((c: any) => c.is_active) || connectionData.connections[0];
            if (activeConnection) {
              setConnectionId(activeConnection.id);
              console.log('Connection ID encontrado:', activeConnection.id);
            }
          }
        }
      }

      const url = `/api/assistente-ia/datasets?group_id=${groupId}`;
      console.log('Buscando datasets:', url);
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('Datasets encontrados:', data);
        const datasetList = data.data || data.datasets || [];
        setDatasets(datasetList);
        if (datasetList.length > 0) {
          console.log('Auto-selecionando dataset:', datasetList[0].id);
          setSelectedDataset(datasetList[0].id);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  }

  async function loadMetadata() {
    console.log('=== loadMetadata chamado ===');
    console.log('selectedDataset:', selectedDataset);
    setLoadingMetadata(true);
    try {
      const url = `/api/assistente-ia/model-metadata?dataset_id=${selectedDataset}`;
      console.log('Buscando metadata:', url);
      const res = await fetch(url);
      console.log('Metadata response status:', res.status);
      if (res.ok) {
        const data = await res.json();
        console.log('Metadata encontrado:', data);
        console.log('Measures:', data.measures?.length);
        console.log('Suggested Groupers:', data.suggestedGroupers?.length);
        console.log('Suggested Filters:', data.suggestedFilters?.length);
        setMeasures(data.measures || []);
        setSuggestedGroupers(data.suggestedGroupers || []);
        setSuggestedFilters(data.suggestedFilters || []);
      } else {
        console.error('Erro na resposta:', res.status);
      }
    } catch (err) {
      console.error('Erro ao carregar metadados:', err);
    } finally {
      setLoadingMetadata(false);
    }
  }

  // Função auxiliar para converter Tabela.Coluna para DAX
  function toDAXColumn(tableColumn: string): string {
    const [table, column] = tableColumn.split('.');
    if (!table || !column) return tableColumn;
    return `${table}[${column}]`;
  }

  function generateDax(): string {
    if (selectedMeasures.length === 0) return '';

    // Usar a primeira medida selecionada (ou todas, dependendo da lógica)
    const primaryMeasure = selectedMeasures[0];
    const measureRef = `[${primaryMeasure}]`;
    
    // Converter agrupadores do formato "Tabela.Coluna" para DAX
    const grouperRefs = selectedGroupers.map(toDAXColumn);
    
    // Construir filtros do formato { column: "Tabela.Coluna", value: "valor" }
    const filterExpressions = selectedFilters.map(f => {
      const [table, column] = f.column.split('.');
      if (!table || !column) return '';
      const value = isNaN(Number(f.value)) ? `"${f.value}"` : f.value;
      return `${table}[${column}] = ${value}`;
    }).filter(f => f);

    let dax = 'EVALUATE\n';
    
    if (grouperRefs.length > 0) {
      // Com agrupadores - usar SUMMARIZECOLUMNS
      if (limit > 0) {
        dax += `TOPN(\n    ${limit},\n    `;
      }
      
      dax += `SUMMARIZECOLUMNS(\n`;
      dax += grouperRefs.map(g => `        ${g}`).join(',\n');
      
      // Adicionar filtros no SUMMARIZECOLUMNS
      if (filterExpressions.length > 0) {
        filterExpressions.forEach((filterExpr, index) => {
          const [table] = selectedFilters[index].column.split('.');
          dax += `,\n        FILTER(ALL('${table}'), ${filterExpr})`;
        });
      }
      
      dax += `,\n        "Valor", ${measureRef}\n    )`;
      
      if (limit > 0) {
        dax += `,\n    [Valor], ${orderBy}\n)`;
      }
    } else {
      // Sem agrupadores - usar ROW com CALCULATE se houver filtros
      if (filterExpressions.length > 0) {
        const filterConditions = filterExpressions.map((filterExpr, index) => {
          const [table] = selectedFilters[index].column.split('.');
          return `FILTER(ALL('${table}'), ${filterExpr})`;
        });
        dax += `ROW("Valor", CALCULATE(${measureRef}, ${filterConditions.join(', ')}))`;
      } else {
        dax += `ROW("Valor", ${measureRef})`;
      }
    }

    return dax;
  }

  async function executeDax() {
    if (!generatedDax || !selectedDataset) return;
    
    setExecuting(true);
    setDaxResult(null);
    
    try {
      const res = await fetch('/api/assistente-ia/execute-dax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: selectedDataset,
          dax_query: generatedDax,
          company_group_id: groupId
        })
      });
      
      const data = await res.json();
      setDaxResult(data);
    } catch (err: any) {
      setDaxResult({ success: false, error: err.message });
    } finally {
      setExecuting(false);
    }
  }


  function copyDax() {
    navigator.clipboard.writeText(generatedDax);
  }

  async function saveTraining() {
    if (!question.trim() || !generatedDax || !selectedDataset) {
      alert('Preencha a pergunta e gere o DAX antes de salvar');
      return;
    }
    
    // Gera resposta formatada automaticamente baseada na seleção
    const measureLabel = selectedMeasures.length > 0 
      ? measures.find(m => m.name === selectedMeasures[0])?.label || selectedMeasures[0]
      : 'Resultado';
    const formattedResponse = `📊 *${measureLabel}*\n\n{resultado}\n\n_Dados atualizados do Power BI_`;
    
    try {
      const res = await fetch('/api/assistente-ia/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_question: question,
          dax_query: generatedDax,
          formatted_response: formattedResponse,
          tags: tags,
          category: tags[0] || 'geral',
          dataset_id: selectedDataset,
          unanswered_question_id: unansweredId || null
        })
      });
      
      if (res.ok) {
        alert('Treinamento salvo com sucesso!');
        router.push('/assistente-ia/treinar');
      } else {
        const data = await res.json();
        console.error('Erro API:', data);
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar treinamento');
    }
  }

  if (loadingDatasets || !groupId) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Novo Treinamento</h1>
          <p className="text-gray-500 text-sm">Crie um exemplo de treinamento para o Assistente IA</p>
        </div>

        {/* Pergunta da URL (quando vem de "Ensinar Resposta") */}
        {questionFromUrl && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">Pergunta a ser ensinada:</span>
        </div>
                <p className="text-sm text-gray-900 font-medium">&quot;{questionFromUrl}&quot;</p>
      </div>
            </div>
          </div>
        )}

        {/* Dataset e Tags */}
        <div className="flex gap-4 mb-6">
          {/* Dataset */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Dataset Power BI</label>
        <select
          value={selectedDataset}
              onChange={(e) => {
                setSelectedDataset(e.target.value);
                setSelectedMeasures([]);
                setSelectedGroupers([]);
                setSelectedFilters([]);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="">Selecione um dataset</option>
          {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
          ))}
        </select>
      </div>
      
          {/* Tags */}
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div 
              className="flex items-center gap-2 flex-wrap min-h-[42px] px-3 py-2 border border-gray-200 rounded-lg bg-white cursor-text"
              onClick={() => setShowTagSuggestions(true)}
            >
              {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs border border-blue-200">
                  <span className="text-blue-500">#</span>{tag}
                  <button onClick={(e) => { e.stopPropagation(); setTags(tags.filter(t => t !== tag)); }} className="hover:text-blue-900">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onFocus={() => setShowTagSuggestions(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault();
                    if (!tags.includes(tagInput.trim())) {
                      setTags([...tags, tagInput.trim()]);
                    }
                    setTagInput('');
                  }
                }}
                placeholder={tags.length === 0 ? "Digite ou selecione tags..." : ""}
                className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
              />
      </div>
      
            {showTagSuggestions && (
              <>
                <div className="fixed inset-0 z-[100]" onClick={() => setShowTagSuggestions(false)} />
                <div className="absolute z-[101] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 grid grid-cols-3 gap-1">
                    {TAG_SUGGESTIONS
                      .filter(s => !tags.includes(s) && s.toLowerCase().includes(tagInput.toLowerCase()))
                      .map(suggestion => (
        <button
                          key={suggestion}
                          onClick={() => {
                            setTags([...tags, suggestion]);
                            setTagInput('');
                            setShowTagSuggestions(false);
                          }}
                          className="px-2 py-1.5 text-xs text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded transition-colors"
                        >
                          <span className="text-blue-500">#</span>{suggestion}
        </button>
                      ))}
      </div>
    </div>
              </>
            )}
        </div>
      </div>
      
        {/* Botão Salvar - Fixo no lado direito */}
        <div className="fixed right-6 top-24 z-50">
          <button
            onClick={saveTraining}
            disabled={!question.trim() || !generatedDax}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Salvar Treinamento
          </button>
        </div>

        {/* Card da Pergunta */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-6">
          <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="font-semibold text-gray-900 text-sm">Pergunta do Usuário</span>
        </div>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ex: Qual o faturamento?"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Componente de Seleção de Campos */}
        {loadingMetadata ? (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Carregando metadados...</span>
            </div>
          </div>
        ) : selectedDataset ? (
          <>
            <TrainingFieldSelector
              measures={measures}
              suggestedGroupers={suggestedGroupers}
              suggestedFilters={suggestedFilters}
              selectedMeasures={selectedMeasures}
              selectedGroupers={selectedGroupers}
              selectedFilters={selectedFilters}
              onMeasuresChange={setSelectedMeasures}
              onGroupersChange={setSelectedGroupers}
              onFiltersChange={setSelectedFilters}
            />
            
            {/* Card de Opções - Linha separada */}
            <div className="grid grid-cols-1 gap-4 mb-6 items-stretch">
              <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Opções</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Ordenar</label>
                    <div className="flex gap-1">
                      {ORDER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setOrderBy(opt.value as 'DESC' | 'ASC')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                            orderBy === opt.value 
                              ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium' 
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-2">Limite</label>
                    <div className="flex flex-wrap gap-1">
                      {LIMIT_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => setLimit(opt.value)}
                          className={`px-2 py-1.5 text-xs rounded-lg border transition-colors ${
                            limit === opt.value 
                              ? 'bg-orange-50 border-orange-200 text-orange-700 font-medium' 
                              : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Preview DAX - Fundo Branco (abaixo dos cards) */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Code className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Preview do DAX</h3>
              </div>
              <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap break-words bg-gray-50 p-4 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                {generateDaxPreview(selectedMeasures, selectedGroupers, selectedFilters)}
              </pre>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <p className="text-gray-500 text-center">Selecione um dataset para começar</p>
          </div>
        )}

        {/* DAX Gerado e Botões - Abaixo dos cards */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm mb-6">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">DAX Gerado</span>
          <button
              onClick={copyDax}
              disabled={!generatedDax}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
              title="Copiar DAX"
            >
              <Copy className="w-4 h-4" />
          </button>
          </div>
          <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg mx-4 my-3">
            <pre className="text-sm text-gray-700 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
              {generatedDax || '// Selecione uma medida para gerar o DAX'}
            </pre>
          </div>
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
              onClick={executeDax}
              disabled={!generatedDax || executing}
              className="w-10 h-10 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Executar DAX"
            >
              {executing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <Play className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

        {/* Resultado - Abaixo dos cards */}
        {daxResult && (
            <div className={`rounded-xl border overflow-hidden shadow-sm ${
              daxResult.success ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'
            }`}>
              <div className={`px-4 py-3 border-b ${
                daxResult.success ? 'bg-gray-50 border-gray-200' : 'bg-red-100 border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-semibold ${daxResult.success ? 'text-gray-700' : 'text-red-700'}`}>
                    {daxResult.success ? 'Resultado' : 'Erro'}
                  </span>
                  {daxResult.success && daxResult.rowCount !== undefined && (
                    <span className="text-xs text-gray-500 font-medium">
                      {daxResult.rowCount} registro(s) • {daxResult.executionTime}ms
                    </span>
                  )}
            </div>
          </div>
              <div className="p-4 max-h-64 overflow-auto">
                {daxResult.success ? (
                  daxResult.rowCount === 0 ? (
                    <div className="text-center py-6">
                      <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 font-medium">Nenhum resultado encontrado</p>
                      {daxResult.warning && (
                        <p className="text-xs text-gray-500 mt-1">{daxResult.warning}</p>
                      )}
        </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {daxResult.columns?.map(col => (
                              <th key={col} className="text-left py-2 px-3 font-semibold text-gray-700">
                                {col.replace(/[\[\]]/g, '')}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {daxResult.result?.slice(0, 20).map((row, i) => (
                            <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                              {daxResult.columns?.map(col => (
                                <td key={col} className="py-2 px-3 text-gray-600">
                                  {typeof row[col] === 'number' 
                                    ? row[col].toLocaleString('pt-BR', { maximumFractionDigits: 2 })
                                    : String(row[col] || '')
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
        </div>
                  )
                ) : (
                  <div className="text-sm text-red-700">
                    <p className="font-medium">{daxResult.error}</p>
      </div>
                )}
    </div>
            </div>
          )}
      </div>
    </MainLayout>
  );
}

export default function NovoTreinamentoPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    }>
      <NovoTreinamentoPageContent />
    </Suspense>
  );
}
