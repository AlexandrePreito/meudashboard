'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Layers,
  FileText,
  Star,
  StarOff,
  Eye,
  EyeOff,
  Copy,
  Search,
  Filter,
  Monitor,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  LucideIcon
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
}

interface Screen {
  id: string;
  title: string;
  icon: string;
  is_active: boolean;
  is_first: boolean;
  display_order: number;
  report: Report;
  company_group: {
    id: string;
    name: string;
  };
}

const ICONS = [
  'Monitor', 'BarChart3', 'FileText', 'PieChart', 'TrendingUp', 'Activity', 
  'DollarSign', 'Users', 'ShoppingCart', 'Package', 'Truck', 'Factory'
];

// Mapeamento de nomes de ícones para componentes
const ICON_MAP: Record<string, LucideIcon> = {
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory
};

// Função para renderizar o ícone
function renderIcon(iconName: string, size: number = 20, className?: string) {
  const IconComponent = ICON_MAP[iconName] || Monitor;
  return <IconComponent size={size} className={className} />;
}

export default function TelasPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  
  const [form, setForm] = useState({
    report_id: '',
    title: '',
    icon: 'Monitor',
    is_first: false,
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [screensRes, reportsRes] = await Promise.all([
        fetch('/api/powerbi/screens'),
        fetch('/api/powerbi/reports')
      ]);

      if (screensRes.ok) {
        const data = await screensRes.json();
        setScreens(data.screens || []);
      }

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function openModal(screen?: Screen) {
    if (screen) {
      setEditingScreen(screen);
      setForm({
        report_id: screen.report?.id || '',
        title: screen.title,
        icon: screen.icon,
        is_first: screen.is_first,
        is_active: screen.is_active
      });
    } else {
      setEditingScreen(null);
      setForm({
        report_id: reports[0]?.id || '',
        title: '',
        icon: 'Monitor',
        is_first: false,
        is_active: true
      });
    }
    setShowModal(true);
  }

  function handleCopy(screen: Screen) {
    setEditingScreen(null); // Não está editando, está criando novo
    setForm({
      report_id: screen.report?.id || '',
      title: `${screen.title} (Cópia)`,
      icon: screen.icon,
      is_first: false,
      is_active: screen.is_active
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingScreen 
        ? `/api/powerbi/screens/${editingScreen.id}`
        : '/api/powerbi/screens';

      const body = editingScreen
        ? form
        : { ...form, company_group_id: screens[0]?.company_group?.id || reports[0]?.id };

      const res = await fetch(url, {
        method: editingScreen ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
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
      alert('Erro ao salvar tela');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir esta tela?')) return;

    try {
      const res = await fetch(`/api/powerbi/screens/${id}`, {
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

  async function toggleActive(screen: Screen) {
    try {
      const res = await fetch(`/api/powerbi/screens/${screen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !screen.is_active })
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  }

  async function toggleFirst(screen: Screen) {
    try {
      const res = await fetch(`/api/powerbi/screens/${screen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_first: !screen.is_first })
      });

      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Erro ao alterar destaque:', error);
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
            <h1 className="text-2xl font-bold text-gray-900">Telas</h1>
            <p className="text-gray-500">Gerencie as telas disponíveis para os usuários</p>
          </div>
          <button
            onClick={() => openModal()}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
            Nova Tela
          </button>
        </div>

        {reports.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <FileText size={20} className="text-yellow-600" />
            <p className="text-yellow-800">
              Você precisa cadastrar um <a href="/powerbi/relatorios" className="font-medium underline">relatório</a> antes de criar telas.
            </p>
          </div>
        )}

        {/* Campos de Busca e Filtro */}
        {screens.length > 0 && (
          <div className="flex gap-4">
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou relatório..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtro por Grupo */}
            <div className="relative min-w-[250px]">
              <Filter size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Todos os grupos</option>
                {Array.from(new Set(screens.map(s => s.company_group?.name).filter(Boolean))).map((groupName) => (
                  <option key={groupName} value={groupName}>{groupName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {screens.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Layers size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tela</h2>
            <p className="text-gray-500 mb-4">Crie sua primeira tela para os usuários</p>
            {reports.length > 0 && (
              <button
                onClick={() => openModal()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Criar Tela
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tela</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Relatório</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Destaque</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {screens
                  .filter(screen => {
                    // Filtro de busca
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = 
                        screen.title.toLowerCase().includes(term) ||
                        screen.report?.name.toLowerCase().includes(term);
                      if (!matchesSearch) return false;
                    }
                    
                    // Filtro de grupo
                    if (filterGroup && screen.company_group?.name !== filterGroup) {
                      return false;
                    }
                    
                    return true;
                  })
                  .map((screen) => (
                  <tr key={screen.id} className={`hover:bg-gray-50 ${!screen.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {renderIcon(screen.icon, 18, 'text-blue-600')}
                        </div>
                        <div className="font-medium text-gray-900">{screen.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{screen.report?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{screen.company_group?.name}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(screen)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          screen.is_active 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={screen.is_active ? 'Ativa' : 'Inativa'}
                      >
                        {screen.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleFirst(screen)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          screen.is_first 
                            ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={screen.is_first ? 'Tela principal' : 'Definir como principal'}
                      >
                        {screen.is_first ? <Star size={16} /> : <StarOff size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(screen)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg mr-1"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleCopy(screen)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg mr-1"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(screen.id)}
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
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingScreen ? 'Editar Tela' : 'Nova Tela'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relatório</label>
                <select
                  value={form.report_id}
                  onChange={(e) => setForm({ ...form, report_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!!editingScreen}
                >
                  <option value="">Selecione um relatório</option>
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>{report.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Dashboard Financeiro"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        form.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={icon}
                    >
                      {renderIcon(icon, 20, form.icon === icon ? 'text-blue-600' : 'text-gray-600')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Ativa</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_first}
                    onChange={(e) => setForm({ ...form, is_first: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Tela principal</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
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




