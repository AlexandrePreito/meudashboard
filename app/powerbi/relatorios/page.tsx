'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  FileText,
  Link as LinkIcon,
  Search,
  Copy,
  Database
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  workspace_id: string;
  company_group_id?: string;
  company_group?: {
    id: string;
    name: string;
  };
}

interface Report {
  id: string;
  name: string;
  report_id: string;
  dataset_id: string;
  default_page: string | null;
  connection: Connection;
}

interface Dataset {
  id: string;
  name: string;
}

interface PowerBIReport {
  id: string;
  name: string;
  datasetId: string;
}

// Componente interno que usa o contexto
function RelatoriosContent() {
  const { activeGroup } = useMenu();
  const [reports, setReports] = useState<Report[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [pbiReports, setPbiReports] = useState<PowerBIReport[]>([]);
  const [loadingPbiData, setLoadingPbiData] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [accessDenied, setAccessDenied] = useState(false);
  
  const [form, setForm] = useState({
    connection_id: '',
    name: '',
    report_id: '',
    dataset_id: ''
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    // Só carregar dados se já verificou o acesso e tem permissão
    // Usar activeGroup?.id para evitar re-renders desnecessários quando objeto muda
    if (userRole !== 'user' && !accessDenied) {
      setLoading(true); // Ativar loading ao trocar de grupo
      loadData(activeGroup);
    }
  }, [activeGroup?.id, userRole]);

  async function checkAccessAndLoad() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (data.user) {
        if (data.user.is_master) {
          setUserRole('master');
        } else if (data.user.is_developer) {
          setUserRole('developer');
        } else if (data.user.role === 'admin') {
          setUserRole('admin');
        } else {
          setUserRole('user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        // Removido: loadData(activeGroup); - será chamado pelo useEffect acima
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

  async function loadData(currentGroup?: { id: string; name: string } | null) {
    // Montar URL com filtro de grupo se houver grupo ativo
    const reportsUrl = currentGroup
      ? `/api/powerbi/reports?group_id=${currentGroup.id}`
      : '/api/powerbi/reports';
    
    const connectionsUrl = currentGroup
      ? `/api/powerbi/connections?group_id=${currentGroup.id}`
      : '/api/powerbi/connections';
    
    try {
      console.log('[DEBUG /powerbi/relatorios] Carregando dados:', {
        currentGroup: currentGroup?.id || 'nenhum',
        reportsUrl,
        connectionsUrl
      });
        
      const [reportsRes, connectionsRes] = await Promise.all([
        fetch(reportsUrl),
        fetch(connectionsUrl)
      ]);

      if (reportsRes.ok) {
        // Clone para poder fazer log sem consumir a response
        const data = await reportsRes.json();
        console.log('Response completa:', data);
        console.log('Data recebida:', data);
        console.log('Reports:', data.reports);
        console.log('[DEBUG /powerbi/relatorios] Relatórios recebidos:', {
          total: data.reports?.length || 0,
          reports: data.reports
        });
        setReports(data.reports || []);
      } else {
        let errorData: any = {};
        try {
          errorData = await reportsRes.json();
        } catch (parseError) {
          errorData = {
            message: `Erro HTTP ${reportsRes.status}: ${reportsRes.statusText}`,
            parseError: String(parseError)
          };
        }
        console.error('[ERROR /powerbi/relatorios] Erro ao carregar relatórios:', JSON.stringify({
          status: reportsRes.status,
          statusText: reportsRes.statusText,
          url: reportsUrl,
          error: errorData
        }, null, 2));
      }

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        console.log('[DEBUG /powerbi/relatorios] Conexões recebidas:', {
          total: data.connections?.length || 0
        });
        setConnections(data.connections || []);
      } else {
        const errorData = await connectionsRes.json();
        console.error('[ERROR /powerbi/relatorios] Erro ao carregar conexões:', {
          status: connectionsRes.status,
          error: errorData
        });
      }
    } catch (error: any) {
      console.error('[ERROR /powerbi/relatorios] Erro ao carregar dados:', JSON.stringify({
        message: error?.message || 'Erro desconhecido',
        name: error?.name || 'Error',
        stack: error?.stack?.substring(0, 500) || 'N/A',
        errorString: String(error),
        reportsUrl,
        connectionsUrl
      }, null, 2));
    } finally {
      setLoading(false);
    }
  }

  async function loadPbiData(connectionId: string) {
    if (!connectionId) {
      setDatasets([]);
      setPbiReports([]);
      return;
    }
    
    setLoadingPbiData(true);
    try {
      // Montar URL com group_id se houver grupo ativo
      const url = activeGroup
        ? `/api/powerbi/datasets?connection_id=${connectionId}&group_id=${activeGroup.id}`
        : `/api/powerbi/datasets?connection_id=${connectionId}`;
      
      console.log('[DEBUG /powerbi/relatorios] Buscando datasets e reports:', url);
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        console.log('[DEBUG /powerbi/relatorios] Datasets e reports recebidos:', {
          datasets: data.datasets?.length || 0,
          reports: data.reports?.length || 0,
          datasetsList: data.datasets?.map((d: any) => ({ id: d.id, name: d.name })),
          reportsList: data.reports?.map((r: any) => ({ id: r.id, name: r.name, datasetId: r.datasetId }))
        });
        setDatasets(data.datasets || []);
        setPbiReports(data.reports || []);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('[ERROR /powerbi/relatorios] Erro ao carregar dados do Power BI:', {
          status: res.status,
          error: errorData
        });
        setDatasets([]);
        setPbiReports([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do Power BI:', error);
      setDatasets([]);
      setPbiReports([]);
    } finally {
      setLoadingPbiData(false);
    }
  }

  function openModal(report?: Report) {
    if (report) {
      setEditingReport(report);
      setForm({
        connection_id: report.connection?.id || '',
        name: report.name,
        report_id: report.report_id,
        dataset_id: report.dataset_id
      });
      // Carregar dados do Power BI
      if (report.connection?.id) {
        loadPbiData(report.connection.id);
      }
    } else {
      setEditingReport(null);
      setForm({
        connection_id: connections[0]?.id || '',
        name: '',
        report_id: '',
        dataset_id: ''
      });
      // Carregar dados do Power BI
      if (connections[0]?.id) {
        loadPbiData(connections[0].id);
      }
    }
    setShowModal(true);
  }

  function handleCopy(report: Report) {
    setEditingReport(null); // Não está editando, está criando novo
    setForm({
      connection_id: report.connection?.id || '',
      name: `${report.name} (Cópia)`,
      report_id: report.report_id,
      dataset_id: report.dataset_id
    });
    if (report.connection?.id) {
      loadPbiData(report.connection.id);
    }
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingReport 
        ? `/api/powerbi/reports/${editingReport.id}`
        : '/api/powerbi/reports';

      const res = await fetch(url, {
        method: editingReport ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setShowModal(false);
        loadData(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar relatório');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este relatório?')) return;

    try {
      const res = await fetch(`/api/powerbi/reports/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        loadData(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

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
            <h1 className="text-2xl font-bold text-gray-900">Relatórios Power BI</h1>
            <p className="text-gray-500">Gerencie os relatórios disponíveis</p>
          </div>
          <Button
            onClick={() => openModal()}
            disabled={connections.length === 0}
            icon={<Plus size={20} />}
          >
            Novo Relatório
          </Button>
        </div>

        {connections.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <LinkIcon size={20} className="text-yellow-600" />
            <p className="text-yellow-800">
              Você precisa criar uma <a href="/powerbi/conexoes" className="font-medium underline">conexão</a> antes de cadastrar relatórios.
            </p>
          </div>
        )}

        {/* Campo de Busca */}
        {reports.length > 0 && (
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, Report ID, Dataset ID ou conexão..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório</h2>
            <p className="text-gray-500 mb-4">Cadastre seu primeiro relatório do Power BI</p>
            {connections.length > 0 && (
              <Button onClick={() => openModal()}>
                Cadastrar Relatório
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Report ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Dataset ID</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Conexão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grupo</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reports
                  .filter(report => {
                    if (!searchTerm) return true;
                    const term = searchTerm.toLowerCase();
                    return (
                      report.name.toLowerCase().includes(term) ||
                      report.report_id.toLowerCase().includes(term) ||
                      report.dataset_id.toLowerCase().includes(term) ||
                      report.connection?.name.toLowerCase().includes(term)
                    );
                  })
                  .map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{report.name}</div>
                      {report.default_page && (
                        <div className="text-sm text-gray-500">Página: {report.default_page}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{report.report_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-mono">{report.dataset_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{report.connection?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {report.connection?.company_group?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(report)}
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
                        onClick={() => handleCopy(report)}
                        className={`p-2 rounded-lg mr-1 ${
                          userRole === 'developer'
                            ? 'text-gray-400 hover:bg-gray-100'
                            : 'text-blue-600 hover:bg-blue-50'
                        }`}
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className={`p-2 rounded-lg ${
                          userRole === 'developer'
                            ? 'text-gray-400 hover:bg-gray-100'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingReport ? 'Editar Relatório' : 'Novo Relatório'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Conexão e Nome na mesma linha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conexão</label>
                  <select
                    value={form.connection_id}
                    onChange={(e) => {
                      setForm({ ...form, connection_id: e.target.value, report_id: '', dataset_id: '' });
                      loadPbiData(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Selecione uma conexão</option>
                    {connections.map((conn) => (
                      <option key={conn.id} value={conn.id}>
                        {conn.name}
                      </option>
                    ))}
                  </select>
                </div>

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
              </div>

              {/* Dataset e Report na mesma linha */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dataset</label>
                  <select
                    value={form.dataset_id}
                    onChange={(e) => setForm({ ...form, dataset_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loadingPbiData}
                  >
                    <option value="">{loadingPbiData ? 'Carregando...' : 'Selecione um dataset'}</option>
                    {datasets.map((ds) => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relatório</label>
                  <select
                    value={form.report_id}
                    onChange={(e) => {
                      const selectedReport = pbiReports.find(r => r.id === e.target.value);
                      setForm({ 
                        ...form, 
                        report_id: e.target.value,
                        dataset_id: selectedReport?.datasetId || ''
                      });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loadingPbiData}
                  >
                    <option value="">{loadingPbiData ? 'Carregando...' : 'Selecione um report'}</option>
                    {pbiReports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Botões menores e alinhados à direita */}
              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
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
export default function RelatoriosPage() {
  return (
    <MainLayout>
      <RelatoriosContent />
    </MainLayout>
  );
}
