'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  FileText,
  Link as LinkIcon,
  Search,
  Copy
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  workspace_id: string;
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

export default function RelatoriosPage() {
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
  
  const [form, setForm] = useState({
    connection_id: '',
    name: '',
    report_id: '',
    dataset_id: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [reportsRes, connectionsRes] = await Promise.all([
        fetch('/api/powerbi/reports'),
        fetch('/api/powerbi/connections')
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
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
      const res = await fetch(`/api/powerbi/datasets?connection_id=${connectionId}`);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets || []);
        setPbiReports(data.reports || []);
      } else {
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
        connection_id: report.connection.id,
        name: report.name,
        report_id: report.report_id,
        dataset_id: report.dataset_id
      });
      // Carregar dados do Power BI
      loadPbiData(report.connection.id);
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
      connection_id: report.connection.id,
      name: `${report.name} (Cópia)`,
      report_id: report.report_id,
      dataset_id: report.dataset_id
    });
    loadPbiData(report.connection.id);
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
        loadData();
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
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 -mt-12">
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(report)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-1"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleCopy(report)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
    </MainLayout>
  );
}




