'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import { TrainingExample } from '@/types/assistente-ia';
import { Sparkles, Plus, Search, Tag, Trash2, Edit, Calendar, CheckCircle2 } from 'lucide-react';
import Button from '@/components/ui/Button';

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
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');

  useEffect(() => {
    loadExamples();
  }, []);

  const loadExamples = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/assistente-ia/training');
      if (response.ok) {
        const data = await response.json();
        setExamples(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar exemplos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
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
    const matchesSearch = ex.user_question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ex.formatted_response.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedTag === 'all' || 
                     (ex.tags && ex.tags.includes(selectedTag)) || 
                     ex.category === selectedTag;
    return matchesSearch && matchesTag;
  });

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Exemplos de Treinamento</h1>
            <p className="text-gray-500">Gerencie os exemplos que treinam o assistente IA</p>
          </div>
          <Button
            onClick={() => router.push('/assistente-ia/treinar/novo')}
            icon={<Plus size={20} />}
          >
            Adicionar DAX
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por pergunta ou resposta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="all">Todas as tags</option>
            {TAGS_DISPONIVEIS.map((tag) => (
              <option key={tag.value} value={tag.value}>
                #{tag.label}
              </option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredExamples.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum exemplo encontrado</h2>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedTag !== 'all' 
                ? 'Tente ajustar os filtros de busca'
                : 'Comece adicionando o primeiro exemplo de treinamento'}
            </p>
            {!searchTerm && selectedTag === 'all' && (
              <Button
                onClick={() => router.push('/assistente-ia/treinar/novo')}
                icon={<Plus size={20} />}
              >
                Adicionar DAX
              </Button>
            )}
          </div>
        )}

        {/* Tabela */}
        {!loading && filteredExamples.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Pergunta</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tags</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Validações</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Data</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredExamples.map((example) => (
                  <tr key={example.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 max-w-md">
                        {example.user_question}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {(example.tags && example.tags.length > 0 ? example.tags : example.category ? [example.category] : []).map((tagValue) => {
                          const tag = TAGS_DISPONIVEIS.find(t => t.value === tagValue);
                          return tag ? (
                            <span
                              key={tagValue}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${tag.color}`}
                            >
                              #{tag.label}
                            </span>
                          ) : (
                            <span
                              key={tagValue}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                            >
                              #{tagValue}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle2 className="w-3 h-3" />
                        {example.validation_count}x
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(() => {
                        const companyGroup = Array.isArray(example.company_group) 
                          ? example.company_group[0] 
                          : example.company_group;
                        return companyGroup?.name || '-';
                      })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(example.created_at).toLocaleDateString('pt-BR')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => router.push(`/assistente-ia/treinar/${example.id}`)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors mr-1"
                        title="Editar"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(example.id)}
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
