'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2, 
  CheckCircle,
  XCircle,
  Eye,
  Copy,
  Download,
  Upload,
  FileText,
  X,
  Search
} from 'lucide-react';

interface Context {
  id: string;
  connection_id: string;
  dataset_id: string;
  dataset_name: string;
  context_name: string;
  context_content: string;
  context_format: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  connection?: { id: string; name: string };
}

interface Connection {
  id: string;
  name: string;
}

export default function ContextosPage() {
  const [contexts, setContexts] = useState<Context[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editingContext, setEditingContext] = useState<Context | null>(null);

  const [formData, setFormData] = useState({
    context_name: '',
    connection_id: '',
    dataset_id: '',
    dataset_name: '',
    context_content: ''
  });

  useEffect(() => {
    loadContexts();
    loadConnections();
  }, []);

  async function loadContexts() {
    try {
      const res = await fetch('/api/ai/contexts');
      if (res.ok) {
        const data = await res.json();
        setContexts(data.contexts || []);
      }
    } catch (err) {
      console.error('Erro ao carregar contextos:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadConnections() {
    try {
      const res = await fetch('/api/powerbi/connections');
      if (res.ok) {
        const data = await res.json();
        // A API pode retornar um array direto ou um objeto com propriedade connections
        const conns = Array.isArray(data) ? data : (data.connections || []);
        setConnections(conns);
      }
    } catch (err) {
      console.error('Erro ao carregar conexões:', err);
    }
  }

  function resetForm() {
    setFormData({
      context_name: '',
      connection_id: '',
      dataset_id: '',
      dataset_name: '',
      context_content: ''
    });
    setEditingContext(null);
  }

  function openNewContext() {
    resetForm();
    setShowModal(true);
  }

  function handleEdit(context: Context) {
    setEditingContext(context);
    setFormData({
      context_name: context.context_name,
      connection_id: context.connection_id,
      dataset_id: context.dataset_id || '',
      dataset_name: context.dataset_name || '',
      context_content: context.context_content
    });
    setShowModal(true);
  }

  function handlePreview(content: string) {
    setPreviewContent(content);
    setShowPreview(true);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData({ ...formData, context_content: content });
    };
    reader.readAsText(file);
  }

  function downloadContext(context: Context) {
    const blob = new Blob([context.context_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${context.context_name}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copyToClipboard(content: string) {
    try {
      await navigator.clipboard.writeText(content);
      alert('Copiado para a área de transferência!');
    } catch (err) {
      alert('Erro ao copiar');
    }
  }

  async function handleSave() {
    if (!formData.context_name.trim()) {
      alert('O nome do contexto é obrigatório');
      return;
    }

    if (!formData.connection_id) {
      alert('A conexão é obrigatória');
      return;
    }

    if (!formData.context_content.trim()) {
      alert('O conteúdo do contexto é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingContext?.id,
        context_name: formData.context_name,
        connection_id: formData.connection_id,
        dataset_id: formData.dataset_id || null,
        dataset_name: formData.dataset_name || null,
        context_content: formData.context_content,
        context_format: 'markdown'
      };

      const res = await fetch('/api/ai/contexts', {
        method: editingContext ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingContext ? 'Contexto atualizado!' : 'Contexto criado!');
        setShowModal(false);
        resetForm();
        loadContexts();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      console.error('Erro ao salvar:', err);
      alert('Erro ao salvar contexto');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este contexto?')) return;

    try {
      const res = await fetch(`/api/ai/contexts?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Contexto excluído!');
        loadContexts();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('Erro ao excluir contexto');
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function countLines(content: string) {
    return content?.split('\n').length || 0;
  }

  const filteredContexts = contexts.filter(context => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      context.context_name.toLowerCase().includes(searchLower) ||
      context.connection?.name?.toLowerCase().includes(searchLower) ||
      context.dataset_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contextos de Modelos</h1>
            <p className="text-gray-500 text-sm mt-1">Configure o contexto dos modelos para a IA entender seus dados</p>
          </div>
          <Button onClick={openNewContext} icon={<Plus size={20} />}>
            Novo Contexto
          </Button>
        </div>

        {/* Filtro */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar contextos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredContexts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'Nenhum contexto encontrado' : 'Nenhum contexto configurado'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchTerm ? 'Tente buscar por outro termo' : 'Comece criando seu primeiro contexto para a IA'}
            </p>
            {!searchTerm && (
              <Button onClick={openNewContext}>
                Criar Contexto
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContexts.map((context) => (
              <div
                key={context.id}
                className={`bg-white rounded-xl border border-gray-200 p-4 ${!context.is_active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <FileText className="text-blue-600" size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{context.context_name}</h3>
                        {context.is_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle size={12} className="mr-1" />
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            <XCircle size={12} className="mr-1" />
                            Inativo
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        Conexão: {context.connection?.name || '-'} • Dataset: {context.dataset_name || '-'} • {countLines(context.context_content)} linhas
                      </p>
                      <p className="text-xs text-gray-500">
                        Atualizado em {formatDate(context.updated_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePreview(context.context_content)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Visualizar"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => copyToClipboard(context.context_content)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Copiar"
                    >
                      <Copy size={18} />
                    </button>
                    <button
                      onClick={() => downloadContext(context)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Download"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      onClick={() => handleEdit(context)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(context.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Criar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingContext ? 'Editar Contexto' : 'Novo Contexto'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Contexto *</label>
                  <input
                    type="text"
                    value={formData.context_name}
                    onChange={(e) => setFormData({ ...formData, context_name: e.target.value })}
                    placeholder="Ex: Sistema Aquarius - Vendas"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Conexão Power BI *</label>
                    <select
                      value={formData.connection_id}
                      onChange={(e) => setFormData({ ...formData, connection_id: e.target.value })}
                      disabled={!!editingContext}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Selecione uma conexão</option>
                      {connections.map(conn => (
                        <option key={conn.id} value={conn.id}>{conn.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Dataset (opcional)</label>
                    <input
                      type="text"
                      value={formData.dataset_name}
                      onChange={(e) => setFormData({ ...formData, dataset_name: e.target.value })}
                      placeholder="Ex: Vendas_2024"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Importar arquivo (opcional)</label>
                  <label className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 w-fit">
                    <Upload size={18} className="text-gray-500" />
                    <span className="text-sm text-gray-700">Carregar .md ou .txt</span>
                    <input
                      type="file"
                      accept=".md,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo do Contexto *</label>
                  <textarea
                    value={formData.context_content}
                    onChange={(e) => setFormData({ ...formData, context_content: e.target.value })}
                    placeholder="Cole aqui o conteúdo do contexto (Markdown)..."
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">{countLines(formData.context_content)} linhas • Suporta Markdown</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                >
                  {editingContext ? 'Salvar' : 'Criar Contexto'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Preview */}
        {showPreview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Visualizar Contexto</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
                  {previewContent}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

