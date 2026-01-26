'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import { TrainingExample } from '@/types/assistente-ia';
import { Plus, Pencil, Trash2, Sparkles, Search } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';

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
function TreinarIAContent() {
  const router = useRouter();
  const { activeGroup } = useMenu();
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [datasets, setDatasets] = useState<Array<{ id: string; name: string; dataset_id: string }>>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');

  useEffect(() => {
    loadDatasets();
  }, [activeGroup?.id]);

  useEffect(() => {
    // Recarregar exemplos quando o grupo ou dataset mudar
    if (activeGroup) {
      loadExamples();
    } else {
      setExamples([]);
      setLoading(false);
    }
  }, [selectedDataset, activeGroup?.id]);

  const loadDatasets = async () => {
    if (!activeGroup) {
      setDatasets([]);
      setSelectedDataset('');
      return;
    }
    
    try {
      const url = `/api/assistente-ia/datasets?group_id=${activeGroup.id}`;
      const res = await fetch(url);
      const data = await res.json();
      const datasetsList = data.data || data.datasets || data || [];
      setDatasets(datasetsList);
      
      // Limpar dataset selecionado quando grupo mudar e selecionar o primeiro do novo grupo
      if (datasetsList.length > 0) {
        setSelectedDataset(datasetsList[0].dataset_id || datasetsList[0].id);
      } else {
        setSelectedDataset('');
      }
    } catch (error) {
      console.error('Erro ao carregar datasets:', error);
      setDatasets([]);
      setSelectedDataset('');
    }
  };

  const loadExamples = async () => {
    if (!activeGroup) {
      setExamples([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Montar URL com filtros
      const params = new URLSearchParams();
      if (selectedDataset) {
        params.append('dataset_id', selectedDataset);
      }
      if (activeGroup.id) {
        params.append('group_id', activeGroup.id);
      }
      
      const url = `/api/assistente-ia/training${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setExamples(data.data || []);
      } else {
        console.error('Erro ao carregar exemplos:', await response.text());
        setExamples([]);
      }
    } catch (error) {
      console.error('Erro ao carregar exemplos:', error);
      setExamples([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteExample = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este exemplo?')) return;
    
    try {
      const response = await fetch(`/api/assistente-ia/training?id=${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setExamples(examples.filter(ex => ex.id !== id));
      } else {
        alert('Erro ao excluir exemplo');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao excluir exemplo');
    }
  };

  const filteredExamples = examples.filter(ex => {
    const matchesSearch = ex.user_question.toLowerCase().includes(search.toLowerCase()) ||
                         ex.formatted_response?.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || selectedTag === '' || 
                     (ex.tags && ex.tags.includes(selectedTag)) || 
                     ex.category === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Treinar IA</h1>
            <p className="text-gray-500 text-sm">Gerencie os exemplos que ensinam o assistente</p>
          </div>
          <button
            onClick={() => router.push('/assistente-ia/treinar/novo')}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Treinamento
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por pergunta..."
                className="w-full px-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg min-w-[200px]"
            >
              <option value="">Todos os datasets</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.dataset_id || ds.id}>
                  {ds.name}
                </option>
              ))}
            </select>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg min-w-[180px]"
            >
              <option value="">Todas as tags</option>
              {TAGS_DISPONIVEIS.map((tag) => (
                <option key={tag.value} value={tag.value}>
                  #{tag.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredExamples.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhum exemplo encontrado</h3>
            <p className="text-gray-500 text-sm mb-4">Comece adicionando o primeiro exemplo de treinamento</p>
            <button
              onClick={() => router.push('/assistente-ia/treinar/novo')}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Novo Treinamento
            </button>
          </div>
        )}

        {/* Lista de exemplos */}
        {!loading && filteredExamples.length > 0 && (
          <div className="space-y-3">
            {filteredExamples.map(example => (
              <div key={example.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-blue-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-1">{example.user_question}</h3>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {(example.tags && example.tags.length > 0 ? example.tags : example.category ? [example.category] : []).map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Criado em {new Date(example.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/assistente-ia/treinar/${example.id}`)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteExample(example.id)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

// Componente principal exportado
export default function TreinarIAPage() {
  return (
    <MainLayout>
      <TreinarIAContent />
    </MainLayout>
  );
}
