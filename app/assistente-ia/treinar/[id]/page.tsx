'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import { useMenu } from '@/contexts/MenuContext';
import { Sparkles, Send, Save, X } from 'lucide-react';
import { TrainingExample } from '@/types/assistente-ia';

const TAGS_DISPONIVEIS = [
  { value: 'vendas', label: 'Vendas', color: 'bg-blue-100 text-blue-800' },
  { value: 'faturamento', label: 'Faturamento', color: 'bg-green-100 text-green-800' },
  { value: 'compras', label: 'Compras', color: 'bg-purple-100 text-purple-800' },
  { value: 'estoque', label: 'Estoque', color: 'bg-orange-100 text-orange-800' },
  { value: 'financeiro', label: 'Financeiro', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'contas_pagar', label: 'Contas a Pagar', color: 'bg-red-100 text-red-800' },
  { value: 'contas_receber', label: 'Contas a Receber', color: 'bg-teal-100 text-teal-800' },
  { value: 'inadimplencia', label: 'Inadimplência', color: 'bg-rose-100 text-rose-800' },
  { value: 'clientes', label: 'Clientes', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'produtos', label: 'Produtos', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'fornecedores', label: 'Fornecedores', color: 'bg-violet-100 text-violet-800' },
  { value: 'custos', label: 'Custos', color: 'bg-amber-100 text-amber-800' },
  { value: 'despesas', label: 'Despesas', color: 'bg-red-100 text-red-800' },
  { value: 'receitas', label: 'Receitas', color: 'bg-green-100 text-green-800' },
  { value: 'lucro', label: 'Lucro/Margem', color: 'bg-emerald-100 text-emerald-800' },
  { value: 'nfe', label: 'Notas Fiscais', color: 'bg-slate-100 text-slate-800' },
  { value: 'pedidos', label: 'Pedidos', color: 'bg-blue-100 text-blue-800' },
  { value: 'producao', label: 'Produção', color: 'bg-orange-100 text-orange-800' },
  { value: 'logistica', label: 'Logística', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'rh', label: 'RH', color: 'bg-pink-100 text-pink-800' },
  { value: 'metas', label: 'Metas/KPIs', color: 'bg-purple-100 text-purple-800' },
  { value: 'ranking', label: 'Ranking/Top', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'comparativo', label: 'Comparativo', color: 'bg-cyan-100 text-cyan-800' },
  { value: 'periodo', label: 'Período', color: 'bg-indigo-100 text-indigo-800' },
];

// Componente interno que usa o contexto
function EditarExemploContent() {
  const router = useRouter();
  const params = useParams();
  const { activeGroup } = useMenu();
  const id = params.id as string;
  const respostaRef = useRef<HTMLTextAreaElement>(null);
  
  const [loading, setLoading] = useState(true);
  const [example, setExample] = useState<TrainingExample | null>(null);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [loadingDatasets, setLoadingDatasets] = useState(true);
  const [testQuestion, setTestQuestion] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState('');
  const [testDax, setTestDax] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    user_question: '',
    dax_query: '',
    formatted_response: '',
    category: '', // manter para compatibilidade com API (será primeira tag)
    tags: [] as string[], // array de tags
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExample();
    if (activeGroup?.id) {
      loadDatasets();
    }
  }, [id, activeGroup?.id]);

  const loadDatasets = async () => {
    if (!activeGroup?.id) {
      setDatasets([]);
      setLoadingDatasets(false);
      return;
    }

    try {
      setLoadingDatasets(true);
      const response = await fetch(`/api/powerbi/datasets?group_id=${activeGroup.id}`);
      
      if (!response.ok) {
        setDatasets([]);
        return;
      }

      const data = await response.json();
      const datasetsList = data.datasets || [];
      setDatasets(datasetsList);
      
      if (datasetsList.length > 0 && !selectedDataset) {
        setSelectedDataset(datasetsList[0].id || datasetsList[0].dataset_id);
      }
    } catch (error: any) {
      console.error('❌ Erro ao carregar datasets:', error);
      setDatasets([]);
    } finally {
      setLoadingDatasets(false);
    }
  };

  const loadExample = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assistente-ia/training?id=${id}`);
      
      if (response.ok) {
        const data = await response.json();
        const ex = data.data;
        
        setExample(ex);
        setFormData({
          user_question: ex.user_question || '',
          dax_query: ex.dax_query || '',
          formatted_response: ex.formatted_response || '',
          category: ex.category || '',
          tags: ex.tags || (ex.category ? [ex.category] : []),
        });

        // Selecionar dataset do exemplo se disponível
        if (ex.dataset_id) {
          setSelectedDataset(ex.dataset_id);
        }

        // Focar no campo de resposta
        setTimeout(() => {
          respostaRef.current?.focus();
        }, 100);
      } else {
        alert('Erro ao carregar exemplo');
        router.push('/assistente-ia/treinar');
      }
    } catch (error) {
      console.error('Erro ao carregar exemplo:', error);
      alert('Erro ao carregar exemplo');
      router.push('/assistente-ia/treinar');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!testQuestion.trim()) {
      alert('Digite uma pergunta para testar');
      return;
    }

    if (!selectedDataset) {
      alert('Selecione um dataset primeiro');
      return;
    }

    try {
      setTestLoading(true);
      setTestResponse('');
      setTestDax('');
      setTestResult(null);

      const response = await fetch('/api/assistente-ia/training/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: testQuestion,
          dataset_id: selectedDataset,
          company_group_id: activeGroup?.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTestResponse(data.data.response);
        setTestDax(data.data.dax_query);
        setTestResult(data.data);

        // Auto-preencher formulário (mantém tags já selecionadas)
        setFormData(prev => ({
          ...prev,
          user_question: testQuestion,
          dax_query: data.data.dax_query,
          formatted_response: data.data.response,
        }));
      } else {
        const errorMessage = data.error || 'Erro ao testar pergunta';
        
        if (errorMessage.includes('Nenhuma conexão Power BI') || 
            errorMessage.includes('conexão Power BI') ||
            errorMessage.includes('Conexão') ||
            errorMessage.includes('relatório ativo')) {
          const shouldRedirect = window.confirm(
            `${errorMessage}\n\nDeseja ir para Conexões agora?`
          );
          if (shouldRedirect) {
            window.location.href = '/powerbi/conexoes';
          }
        } else {
          alert(errorMessage);
        }
      }
    } catch (error: any) {
      console.error('❌ Erro ao testar:', error);
      alert('Erro ao testar pergunta: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setTestLoading(false);
    }
  };

  const handleSave = async () => {
    // Validações
    if (!formData.user_question.trim()) {
      alert('A pergunta é obrigatória');
      return;
    }
    if (!formData.dax_query.trim()) {
      alert('A consulta DAX é obrigatória');
      return;
    }
    if (!formData.formatted_response.trim()) {
      alert('A resposta para o usuário é obrigatória');
      return;
    }
    if (formData.tags.length === 0) {
      alert('Selecione pelo menos uma tag');
      return;
    }

    try {
      setSaving(true);

      const response = await fetch('/api/assistente-ia/training', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          user_question: formData.user_question,
          dax_query: formData.dax_query,
          formatted_response: formData.formatted_response,
          category: formData.category, // primeira tag
          tags: formData.tags, // array completo
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Exemplo atualizado com sucesso!');
        router.push('/assistente-ia/treinar');
      } else {
        alert(data.error || 'Erro ao atualizar exemplo');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao atualizar exemplo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <PermissionGuard>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Carregando exemplo...</p>
          </div>
        </div>
      </PermissionGuard>
    );
  }

  return (
    <PermissionGuard>
      <div className="max-w-7xl mx-auto p-6">
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Editar Exemplo de Treinamento
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Atualize os dados deste exemplo
                </p>
              </div>
            </div>
          </div>

          {/* Layout de 2 colunas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* COLUNA ESQUERDA: Teste */}
            <div className="space-y-6">
              
              {/* Seletor de Dataset */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  1. Selecione o Dataset Power BI
                </label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  disabled={loadingDatasets}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingDatasets ? 'Carregando datasets...' : 'Selecione um dataset...'}
                  </option>
                  {datasets.map(ds => (
                    <option key={ds.id || ds.dataset_id} value={ds.id || ds.dataset_id}>
                      {ds.name || ds.dataset_id}
                    </option>
                  ))}
                </select>
                {datasets.length === 0 && !loadingDatasets && activeGroup?.id && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 mb-2">
                      Nenhum dataset encontrado para este grupo.
                    </p>
                    <a 
                      href="/powerbi/relatorios" 
                      className="text-sm text-yellow-900 font-medium underline hover:text-yellow-950"
                    >
                      Clique aqui para criar relatórios Power BI →
                    </a>
                  </div>
                )}
              </div>

              {/* Área de Teste */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  2. Teste uma Pergunta
                </label>
                
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ex: Quanto faturamos em dezembro?"
                    value={testQuestion}
                    onChange={(e) => setTestQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleTest()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  <button
                    onClick={handleTest}
                    disabled={testLoading || !selectedDataset}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {testLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Testando...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        Testar com IA
                      </>
                    )}
                  </button>
                </div>

                {/* Resposta do Teste */}
                {testResponse && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Resposta Gerada:</p>
                      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap border border-gray-200">
                        {testResponse}
                      </div>
                    </div>

                    {testDax && (
                      <div>
                        <p className="text-xs font-medium text-gray-600 mb-2">DAX Gerado:</p>
                        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                          <code className="text-sm text-green-400 font-mono">
                            {testDax}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* COLUNA DIREITA: Formulário */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Dados do Exemplo
              </h2>
              <div className="space-y-4">
              
              {/* Pergunta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pergunta do Usuário *
                </label>
                <textarea
                  value={formData.user_question}
                  onChange={(e) => setFormData({ ...formData, user_question: e.target.value })}
                  rows={3}
                  placeholder="Ex: Quanto faturamos em dezembro?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>

              {/* DAX */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consulta DAX *
                </label>
                <textarea
                  value={formData.dax_query}
                  onChange={(e) => setFormData({ ...formData, dax_query: e.target.value })}
                  rows={8}
                  placeholder="EVALUATE ROW(..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm"
                />
              </div>

              {/* Resposta para o Usuário */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resposta para o Usuário *
                  <span className="text-xs text-gray-500 ml-2">(texto que será enviado no WhatsApp)</span>
                </label>
                <textarea
                  ref={respostaRef}
                  value={formData.formatted_response}
                  onChange={(e) => setFormData({ ...formData, formatted_response: e.target.value })}
                  rows={8}
                  placeholder="Digite aqui a resposta formatada que o usuário receberá no WhatsApp..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Dica: Use emojis, quebras de linha e formatação clara para WhatsApp
                </p>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (categorias) *
                  <span className="text-xs text-gray-500 ml-2">
                    Selecione uma ou mais tags para facilitar buscas
                  </span>
                </label>
                
                {/* Tags Selecionadas */}
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                    {formData.tags.map((tagValue) => {
                      const tag = TAGS_DISPONIVEIS.find(t => t.value === tagValue);
                      return tag ? (
                        <span
                          key={tagValue}
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${tag.color}`}
                        >
                          #{tag.label}
                          <button
                            type="button"
                            onClick={() => {
                              const newTags = formData.tags.filter(t => t !== tagValue);
                              setFormData({ 
                                ...formData, 
                                tags: newTags,
                                category: newTags[0] || '' // primeira tag vira category
                              });
                            }}
                            className="ml-1 hover:bg-black/10 rounded-full p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Dropdown para adicionar tags */}
                <select
                  value=""
                  onChange={(e) => {
                    const tagValue = e.target.value;
                    if (tagValue && !formData.tags.includes(tagValue)) {
                      const newTags = [...formData.tags, tagValue];
                      setFormData({ 
                        ...formData, 
                        tags: newTags,
                        category: newTags[0] || '' // primeira tag vira category
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">+ Adicionar tag...</option>
                  {TAGS_DISPONIVEIS.filter(tag => !formData.tags.includes(tag.value)).map((tag) => (
                    <option key={tag.value} value={tag.value}>
                      {tag.label}
                    </option>
                  ))}
                </select>
                
                <p className="text-xs text-gray-500 mt-2">
                  💡 Dica: Adicione tags como #vendas #faturamento #dezembro para facilitar buscas
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => router.push('/assistente-ia/treinar')}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                  Cancelar
                </button>
                
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.user_question.trim() || !formData.dax_query.trim() || !formData.formatted_response.trim() || formData.tags.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Salvar
                    </>
                  )}
                </button>
              </div>
              </div>
            </div>

          </div>

        </div>
    </PermissionGuard>
  );
}

// Componente principal exportado
export default function EditarExemploPage() {
  return (
    <MainLayout>
      <EditarExemploContent />
    </MainLayout>
  );
}
