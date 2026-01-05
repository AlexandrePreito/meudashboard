'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  FileText,
  Link as LinkIcon
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

export default function RelatoriosPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    connection_id: '',
    name: '',
    report_id: '',
    dataset_id: '',
    default_page: ''
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

  function openModal(report?: Report) {
    if (report) {
      setEditingReport(report);
      setForm({
        connection_id: report.connection.id,
        name: report.name,
        report_id: report.report_id,
        dataset_id: report.dataset_id,
        default_page: report.default_page || ''
      });
    } else {
      setEditingReport(null);
      setForm({
        connection_id: connections[0]?.id || '',
        name: '',
        report_id: '',
        dataset_id: '',
        default_page: ''
      });
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
        body: JSON.stringify({
          ...form,
          default_page: form.default_page || null
        })
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios Power BI</h1>
            <p className="text-gray-500">Gerencie os relatórios disponíveis</p>
          </div>
          <button
            onClick={() => openModal()}
            disabled={connections.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Novo Relatório
          </button>
        </div>

        {connections.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <LinkIcon size={20} className="text-yellow-600" />
            <p className="text-yellow-800">
              Você precisa criar uma <a href="/powerbi/conexoes" className="font-medium underline">conexão</a> antes de cadastrar relatórios.
            </p>
          </div>
        )}

        {reports.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhum relatório</h2>
            <p className="text-gray-500 mb-4">Cadastre seu primeiro relatório do Power BI</p>
            {connections.length > 0 && (
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Cadastrar Relatório
              </button>
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
                {reports.map((report) => (
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
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(report.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingReport ? 'Editar Relatório' : 'Novo Relatório'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conexão</label>
                <select
                  value={form.connection_id}
                  onChange={(e) => setForm({ ...form, connection_id: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report ID</label>
                <input
                  type="text"
                  value={form.report_id}
                  onChange={(e) => setForm({ ...form, report_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dataset ID</label>
                <input
                  type="text"
                  value={form.dataset_id}
                  onChange={(e) => setForm({ ...form, dataset_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Página Padrão (opcional)</label>
                <input
                  type="text"
                  value={form.default_page}
                  onChange={(e) => setForm({ ...form, default_page: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome da página padrão"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={18} className="animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}




