'use client';

import { useState, useEffect } from 'react';
import { Brain, Plus, Edit, Trash2, Search, Eye } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useNotification } from '@/hooks/useNotification';

// Componente interno que usa o contexto
function ContextosContent() {
  const { success, error, warning } = useNotification();
  const [contexts, setContexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingContext, setEditingContext] = useState<any>(null);
  const [viewingContext, setViewingContext] = useState<any>(null);
  
  // Form
  const [contextName, setContextName] = useState('');
  const [datasetName, setDatasetName] = useState('');
  const [contextContent, setContextContent] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchContexts();
  }, []);

  const fetchContexts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/contexts');
      const data = await response.json();
      
      if (data.contexts) {
        setContexts(data.contexts || []);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error('Erro ao buscar contextos:', err);
      error(err.message || 'Erro ao carregar contextos', 'Erro');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!contextName || !contextContent) {
      warning('Preencha nome e conteúdo do contexto', 'Campos obrigatórios');
      return;
    }

    setSaving(true);

    try {
      const method = editingContext ? 'PUT' : 'POST';
      
      const response = await fetch('/api/ai/contexts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingContext?.id,
          context_name: contextName,
          dataset_name: datasetName || undefined,
          context_content: contextContent,
          is_active: true
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      success('O assistente agora tem acesso a esta documentação', editingContext ? 'Contexto atualizado!' : 'Contexto criado!');

      setShowModal(false);
      setEditingContext(null);
      setContextName('');
      setDatasetName('');
      setContextContent('');
      fetchContexts();

    } catch (err: any) {
      error(err.message, 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (context: any) => {
    setEditingContext(context);
    setContextName(context.context_name);
    setDatasetName(context.dataset_name || '');
    setContextContent(context.context_content);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este contexto?')) {
      return;
    }

    try {
      const response = await fetch(`/api/ai/contexts?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      success('O contexto foi removido com sucesso', 'Contexto excluído');
      fetchContexts();
    } catch (err: any) {
      error(err.message, 'Erro ao excluir');
    }
  };

  const filteredContexts = contexts.filter(ctx =>
    ctx.context_name.toLowerCase().includes(search.toLowerCase()) ||
    (ctx.dataset_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contextos do Modelo</h1>
            <p className="text-gray-500">Documentação dos modelos Power BI para o assistente</p>
          </div>
          <Button
            onClick={() => {
              setEditingContext(null);
              setContextName('');
              setDatasetName('');
              setContextContent('');
              setShowModal(true);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            Novo Contexto
          </Button>
        </div>

        {/* Info */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-2">📚 O que é o Contexto?</h3>
          <p className="text-sm text-blue-700">
            O contexto é a documentação do seu modelo Power BI (tabelas, colunas, medidas, filtros). 
            O assistente usa essa informação para criar consultas corretas e responder perguntas com precisão.
          </p>
        </div>

        {/* Busca */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome do contexto ou dataset..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <Button icon={<Search className="w-4 h-4" />}>
              Buscar
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size={40} />
          </div>
        )}

        {/* Lista */}
        {!loading && filteredContexts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredContexts.map((context) => (
              <div
                key={context.id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Brain className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{context.context_name}</h3>
                      {context.dataset_name && (
                        <p className="text-xs text-gray-500">{context.dataset_name}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 line-clamp-3">
                    {context.context_content.substring(0, 150)}...
                  </p>
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  {context.context_content.length.toLocaleString()} caracteres
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => setViewingContext(context)}
                    variant="ghost"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Ver
                  </Button>
                  <Button
                    onClick={() => handleEdit(context)}
                    variant="secondary"
                    size="sm"
                    icon={<Edit className="w-4 h-4" />}
                  >
                    Editar
                  </Button>
                  <Button
                    onClick={() => handleDelete(context.id)}
                    variant="ghost"
                    size="sm"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty */}
        {!loading && filteredContexts.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum contexto cadastrado
            </h3>
            <p className="text-gray-600 mb-6">
              Crie o primeiro contexto para o assistente começar a funcionar
            </p>
            <Button
              onClick={() => setShowModal(true)}
              icon={<Plus className="w-4 h-4" />}
            >
              Criar Primeiro Contexto
            </Button>
          </div>
        )}

        {/* Modal Criar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingContext ? 'Editar Contexto' : 'Novo Contexto'}
                </h2>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📝 Nome do Contexto *
                    </label>
                    <input
                      type="text"
                      value={contextName}
                      onChange={(e) => setContextName(e.target.value)}
                      placeholder="Ex: Modelo Hospcom"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📊 Nome do Dataset (opcional)
                    </label>
                    <input
                      type="text"
                      value={datasetName}
                      onChange={(e) => setDatasetName(e.target.value)}
                      placeholder="Ex: Faturamento 2025"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📚 Conteúdo do Contexto (Markdown) *
                    </label>
                    <textarea
                      value={contextContent}
                      onChange={(e) => setContextContent(e.target.value)}
                      placeholder="# Modelo: Nome

## Tabelas
### Calendario
- Mes (número 1-12)
- Ano (número)

## Medidas
### [sReceitaBruta]
Descrição: Receita bruta total
Uso: CALCULATE([sReceitaBruta], filtros)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                      rows={15}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {contextContent.length.toLocaleString()} / 10.000 caracteres
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-2 justify-end">
                <Button
                  onClick={() => {
                    setShowModal(false);
                    setEditingContext(null);
                  }}
                  variant="ghost"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                  disabled={!contextName || !contextContent || saving}
                >
                  {editingContext ? 'Atualizar' : 'Criar'} Contexto
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Visualizar */}
        {viewingContext && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {viewingContext.context_name}
                </h2>
                {viewingContext.dataset_name && (
                  <p className="text-sm text-gray-600">{viewingContext.dataset_name}</p>
                )}
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-4 rounded-lg">
                  {viewingContext.context_content}
                </pre>
              </div>

              <div className="p-6 border-t border-gray-200 flex justify-end">
                <Button onClick={() => setViewingContext(null)}>
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

// Componente principal exportado
export default function ContextosPage() {
  return (
    <MainLayout>
      <ContextosContent />
    </MainLayout>
  );
}
