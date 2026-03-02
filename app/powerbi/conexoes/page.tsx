'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import ActionsDropdown from '@/components/ui/ActionsDropdown';
import { useMenu } from '@/contexts/MenuContext';
import { useFeatures } from '@/hooks/useFeatures';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Link as LinkIcon,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Search,
  Database,
  Share2
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  tenant_id: string;
  client_id: string;
  workspace_id: string;
  show_page_navigation: boolean;
  company_group_id?: string | null;
  developer_id?: string | null;
  company_group?: {
    id: string;
    name: string;
  } | null;
  _source?: 'group' | 'developer';
  _label?: string;
}

interface CompanyGroup {
  id: string;
  name: string;
}

const PAGE_SIZE = 20;

// Componente interno que usa o contexto
function ConexoesContent() {
  const { activeGroup } = useMenu();
  const { allowPowerbiConnections, loading: featuresLoading } = useFeatures();
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [developerId, setDeveloperId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [form, setForm] = useState({
    name: '',
    tenant_id: '',
    client_id: '',
    client_secret: '',
    workspace_id: '',
    show_page_navigation: true,
    company_group_id: ''
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (userRole === 'user') return;
    if (userRole === 'master') {
      loadConnections();
      return;
    }
    // developer/admin: verificar allowPowerbiConnections
    if (featuresLoading) return;
    if (!allowPowerbiConnections) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }
    loadConnections();
  }, [activeGroup, userRole, featuresLoading, allowPowerbiConnections]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  // Abrir modal com "Compartilhado" pré-selecionado quando vem de /dev/recursos?shared=1
  useEffect(() => {
    if (loading || !groups.length) return;
    const fromShared = searchParams.get('shared') === '1';
    if (fromShared && userRole === 'developer' && developerId) {
      openModal(undefined, true);
      window.history.replaceState({}, '', '/powerbi/conexoes');
    }
  }, [loading, groups.length, userRole, developerId, searchParams]);

  async function checkAccessAndLoad() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (data.user) {
        if (data.user.is_master) {
          setUserRole('master');
        } else if (data.user.is_developer) {
          setUserRole('developer');
          // loadConnections será chamado no useEffect quando features carregar
        } else if (data.user.role === 'admin') {
          setUserRole('admin');
          // loadConnections será chamado no useEffect quando features carregar
        } else {
          setUserRole('user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }
      } else {
        setAccessDenied(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setAccessDenied(true);
      setLoading(false);
    }
  }

  async function loadConnections() {
    try {
      // Montar URL com filtro de grupo se houver grupo ativo
      const connUrl = activeGroup 
        ? `/api/powerbi/connections?group_id=${activeGroup.id}`
        : '/api/powerbi/connections';
        
      const [connRes, groupsRes] = await Promise.all([
        fetch(connUrl),
        fetch('/api/user/groups')
      ]);
      
      if (connRes.ok) {
        const data = await connRes.json();
        setConnections(data.connections || []);
      }
      
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
        setDeveloperId(data.developer?.id || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(connection?: Connection, preferShared?: boolean) {
    if (connection) {
      setEditingConnection(connection);
      const isShared = connection.developer_id && !connection.company_group_id;
      setForm({
        name: connection.name,
        tenant_id: connection.tenant_id,
        client_id: connection.client_id,
        client_secret: '',
        workspace_id: connection.workspace_id,
        show_page_navigation: connection.show_page_navigation,
        company_group_id: isShared ? 'shared' : (connection.company_group?.id || connection.company_group_id || '')
      });
    } else {
      setEditingConnection(null);
      setForm({
        name: '',
        tenant_id: '',
        client_id: '',
        client_secret: '',
        workspace_id: '',
        show_page_navigation: true,
        company_group_id: preferShared ? 'shared' : (groups[0]?.id || '')
      });
    }
    setShowModal(true);
  }

  function handleCopy(connection: Connection) {
    setEditingConnection(null);
    const isShared = connection.developer_id && !connection.company_group_id;
    setForm({
      name: `${connection.name} (Cópia)`,
      tenant_id: connection.tenant_id,
      client_id: connection.client_id,
      client_secret: '',
      workspace_id: connection.workspace_id,
      show_page_navigation: connection.show_page_navigation,
      company_group_id: isShared ? 'shared' : (connection.company_group?.id || connection.company_group_id || '')
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingConnection 
        ? `/api/powerbi/connections/${editingConnection.id}`
        : '/api/powerbi/connections';
      
      const isShared = form.company_group_id === 'shared';
      const body: Record<string, unknown> = {
        name: form.name,
        tenant_id: form.tenant_id,
        client_id: form.client_id,
        workspace_id: form.workspace_id,
        show_page_navigation: form.show_page_navigation,
        client_secret: editingConnection ? (form.client_secret || undefined) : form.client_secret
      };

      if (isShared && developerId) {
        body.company_group_id = null;
        body.developer_id = developerId;
      } else {
        body.company_group_id = form.company_group_id || null;
        body.developer_id = null;
      }

      const res = await fetch(url, {
        method: editingConnection ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        loadConnections();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar conexão');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;

    try {
      const res = await fetch(`/api/powerbi/connections/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadConnections();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  // Filtrar conexões baseado no termo de busca
  const filteredConnections = connections.filter(conn => 
    conn.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.tenant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.workspace_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conn.company_group?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedConnections = filteredConnections.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Database className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Acesso restrito</h2>
        <p className="text-gray-500 mb-4">Este modulo nao esta disponivel para seu perfil.</p>
        <p className="text-sm text-gray-400">Apenas administradores podem acessar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conexões Power BI</h1>
            <p className="text-gray-500">Gerencie as conexões com workspaces do Power BI</p>
          </div>
          <Button onClick={() => openModal()} icon={<Plus size={20} />}>
            Nova Conexão
          </Button>
        </div>

        {/* Campo de Busca */}
        {connections.length > 0 && (
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, tenant, workspace ou grupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {connections.length === 0 ? (
          <div className="card-modern p-12 text-center">
            <LinkIcon size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão</h2>
            <p className="text-gray-500 mb-4">Crie sua primeira conexão com o Power BI</p>
            <Button onClick={() => openModal()}>
              Criar Conexão
            </Button>
          </div>
        ) : (
          <>
          <div className="overflow-hidden bg-white">
            <table className="w-full table-modern">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Workspace ID</th>
                  <th>Grupo</th>
                  <th className="text-center">Navegação</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredConnections.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      Nenhuma conexão encontrada para "{searchTerm}"
                    </td>
                  </tr>
                ) : (
                  paginatedConnections.map((conn) => (
                  <tr key={conn.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {conn.name}
                        {(conn._source === 'developer' || (conn.developer_id && !conn.company_group_id)) && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit">
                            <Share2 size={12} /> Compartilhado
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{conn.tenant_id}</div>
                    </td>
                    <td className="text-sm text-gray-600 font-mono">{conn.workspace_id}</td>
                    <td className="text-sm text-gray-600">
                      {conn.developer_id && !conn.company_group_id ? (
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Compartilhado</span>
                      ) : (
                        conn.company_group?.name || '—'
                      )}
                    </td>
                    <td className="text-center">
                      {conn.show_page_navigation ? (
                        <CheckCircle size={20} className="inline text-green-500" />
                      ) : (
                        <XCircle size={20} className="inline text-gray-400" />
                      )}
                    </td>
                    <td className="text-right">
                      <ActionsDropdown
                        align="right"
                        actions={[
                          { label: 'Copiar conexão', icon: Copy, onClick: () => handleCopy(conn), className: userRole === 'developer' ? 'text-gray-400' : 'text-blue-600' },
                          { label: 'Editar', icon: Pencil, onClick: () => openModal(conn) },
                          { label: 'Excluir', icon: Trash2, onClick: () => handleDelete(conn.id), className: userRole === 'developer' ? 'text-gray-400' : 'text-red-600' }
                        ]}
                      >
                        <>
                          <button
                            onClick={() => handleCopy(conn)}
                            className={`p-2 rounded-lg mr-1 ${
                              userRole === 'developer' 
                                ? 'text-gray-400 hover:bg-gray-100' 
                                : 'text-blue-600 hover:bg-blue-50'
                            }`}
                            title="Copiar conexão"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            onClick={() => openModal(conn)}
                            className={`p-2 rounded-lg mr-1 ${
                              userRole === 'developer'
                                ? 'text-gray-400 hover:bg-gray-100'
                                : 'text-gray-600 hover:bg-gray-100'
                            }`}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(conn.id)}
                            className={`p-2 rounded-lg ${
                              userRole === 'developer'
                                ? 'text-gray-400 hover:bg-gray-100'
                                : 'text-red-600 hover:bg-red-50'
                            }`}
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      </ActionsDropdown>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4">
            <Pagination totalItems={filteredConnections.length} currentPage={page} onPageChange={setPage} pageSize={PAGE_SIZE} />
          </div>
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingConnection ? 'Editar Conexão' : 'Nova Conexão'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Linha 1: Nome e Grupo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                  <select
                    value={form.company_group_id}
                    onChange={(e) => setForm({ ...form, company_group_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione um grupo</option>
                    {userRole === 'developer' && developerId && (
                      <option value="shared">🔗 Compartilhado (todos os grupos)</option>
                    )}
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ))}
                  </select>
                  {form.company_group_id === 'shared' && (
                    <p className="text-xs text-amber-600 mt-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      Esta conexão será usada por todos os grupos que não têm conexão própria.
                    </p>
                  )}
                </div>
              </div>

              {/* Linha 2: Tenant ID e Client ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input
                    type="text"
                    value={form.tenant_id}
                    onChange={(e) => setForm({ ...form, tenant_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={form.client_id}
                    onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Linha 3: Client Secret e Workspace ID */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Secret {editingConnection && '(deixe vazio para manter)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={form.client_secret}
                      onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      required={!editingConnection}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-500"
                    >
                      {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Workspace ID</label>
                  <input
                    type="text"
                    value={form.workspace_id}
                    onChange={(e) => setForm({ ...form, workspace_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    required
                  />
                </div>
              </div>

              {/* Checkbox com cor azul */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="show_page_navigation"
                  checked={form.show_page_navigation}
                  onChange={(e) => setForm({ ...form, show_page_navigation: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                />
                <label htmlFor="show_page_navigation" className="text-sm text-gray-700">
                  Mostrar navegação de páginas nos relatórios
                </label>
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  loading={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Componente principal exportado
export default function ConexoesPage() {
  return (
    <MainLayout>
      <ConexoesContent />
    </MainLayout>
  );
}
