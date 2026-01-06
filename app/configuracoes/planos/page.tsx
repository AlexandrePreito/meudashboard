'use client';

import { useState, useEffect } from 'react';
import { useNotification } from '@/hooks/useNotification';
import Notifications from '@/components/ui/Notifications';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2,
  X,
  Check,
  Crown,
  RefreshCw,
  Monitor,
  Users,
  Building2,
  AlertCircle,
  MessageCircle,
  Bot,
  Bell
} from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  max_daily_refreshes: number;
  max_powerbi_screens: number;
  max_users: number;
  max_companies: number;
  is_active: boolean;
  display_order: number;
  max_ai_questions_per_day: number;
  max_ai_alerts_per_month: number;
  max_whatsapp_messages_per_month: number;
  ai_enabled: boolean;
}

export default function PlanosPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);
  const { notifications, success, error, removeNotification } = useNotification();

  // Função para determinar a cor do plano baseado no nome
  function getPlanColor(planName: string): string {
    const name = planName.toLowerCase();
    if (name.includes('básico') || name.includes('basico')) return 'border-l-blue-500';
    if (name.includes('standard') || name.includes('padrão') || name.includes('padrao')) return 'border-l-green-500';
    if (name.includes('premium') || name.includes('pro')) return 'border-l-purple-500';
    if (name.includes('enterprise') || name.includes('empresarial')) return 'border-l-amber-500';
    return 'border-l-gray-500';
  }

  // Função para formatar valores (mostrar "Ilimitado" para valores altos)
  function formatLimit(value: number): string {
    return value >= 999999 ? 'Ilimitado' : value.toString();
  }
  
  const [form, setForm] = useState({
    name: '',
    description: '',
    max_daily_refreshes: 1,
    max_powerbi_screens: 3,
    max_users: 10,
    max_companies: 2,
    display_order: 0,
    max_ai_questions_per_day: 50,
    max_ai_alerts_per_month: 10,
    max_whatsapp_messages_per_month: 100,
    ai_enabled: true
  });

  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  async function checkPermissionAndLoad() {
    try {
      // Verifica se é super admin
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setIsSuperAdmin(userData.user?.is_master || false);
      }

      // Carrega planos
      const plansRes = await fetch('/api/plans');
      if (plansRes.ok) {
        const data = await plansRes.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleNew() {
    setEditingPlan(null);
    setForm({
      name: '',
      description: '',
      max_daily_refreshes: 1,
      max_powerbi_screens: 3,
      max_users: 10,
      max_companies: 2,
      display_order: plans.length + 1,
      max_ai_questions_per_day: 50,
      max_ai_alerts_per_month: 10,
      max_whatsapp_messages_per_month: 100,
      ai_enabled: true
    });
    setShowModal(true);
  }

  function handleEdit(plan: Plan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      description: plan.description || '',
      max_daily_refreshes: plan.max_daily_refreshes,
      max_powerbi_screens: plan.max_powerbi_screens,
      max_users: plan.max_users,
      max_companies: plan.max_companies,
      display_order: plan.display_order,
      max_ai_questions_per_day: plan.max_ai_questions_per_day,
      max_ai_alerts_per_month: plan.max_ai_alerts_per_month,
      max_whatsapp_messages_per_month: plan.max_whatsapp_messages_per_month,
      ai_enabled: plan.ai_enabled
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name) {
      error('Nome do plano é obrigatório', 'Validação');
      return;
    }

    setSaving(true);
    try {
      const url = editingPlan ? `/api/plans/${editingPlan.id}` : '/api/plans';
      const res = await fetch(url, {
        method: editingPlan ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      if (res.ok) {
        setShowModal(false);
        checkPermissionAndLoad();
        success('Plano salvo com sucesso!', 'Sucesso');
      } else {
        const data = await res.json();
        error(data.error || 'Erro ao salvar', 'Erro');
      }
    } catch (err) {
      console.error('Erro:', err);
      error('Erro ao salvar plano', 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este plano?')) return;

    try {
      const res = await fetch(`/api/plans/${id}`, { method: 'DELETE' });
      if (res.ok) {
        checkPermissionAndLoad();
        success('Plano excluído com sucesso!', 'Sucesso');
      } else {
        const data = await res.json();
        error(data.error || 'Erro ao excluir', 'Erro');
      }
    } catch (err) {
      console.error('Erro:', err);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      </MainLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Acesso Restrito</h2>
          <p className="text-slate-600">Apenas super administradores podem gerenciar planos.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Notifications notifications={notifications} onRemove={removeNotification} />
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planos</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie os planos de assinatura do sistema</p>
          </div>
          <Button onClick={handleNew} icon={<Plus size={20} />}>
            Novo Plano
          </Button>
        </div>

        {/* Lista de Planos */}
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum plano cadastrado</h3>
            <p className="text-gray-500 mb-4">Crie o primeiro plano para começar</p>
            <Button onClick={handleNew} icon={<Plus size={18} />}>
              Criar Primeiro Plano
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {plans.map(plan => (
              <div 
                key={plan.id} 
                className={`bg-white rounded-lg border border-gray-200 ${getPlanColor(plan.name)} border-l-4 shadow-sm hover:shadow-md transition-shadow`}
              >
                {/* Header do Card */}
                <div className="p-4 pb-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Crown size={18} className="text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  </div>
                  {plan.description && (
                    <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                  )}
                </div>

                {/* Divisor */}
                <div className="border-t border-gray-100"></div>

                {/* Limites */}
                <div className="p-4">
                  <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5">
                    <div className="flex items-center gap-2 text-sm">
                      <RefreshCw size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Atualizações/dia:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_daily_refreshes)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Monitor size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Telas Power BI:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_powerbi_screens)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Usuários:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_users)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Building2 size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Empresas:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_companies)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Bot size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Perguntas IA/dia:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_ai_questions_per_day)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Bell size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Alertas IA:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_ai_alerts_per_month)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MessageCircle size={14} className="text-gray-400 flex-shrink-0" />
                      <span className="text-gray-600">Mensagens WhatsApp:</span>
                      <span className="ml-auto font-medium text-gray-900">{formatLimit(plan.max_whatsapp_messages_per_month)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer com Ações */}
                <div className="border-t border-gray-100 p-3 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingPlan ? 'Editar Plano' : 'Novo Plano'}
              </h2>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Plano *
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Ex: Plano Básico"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Descrição do plano..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Atualizações/Dia
                  </label>
                  <input
                    type="number"
                    value={form.max_daily_refreshes}
                    onChange={(e) => setForm({ ...form, max_daily_refreshes: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telas Power BI
                  </label>
                  <input
                    type="number"
                    value={form.max_powerbi_screens}
                    onChange={(e) => setForm({ ...form, max_powerbi_screens: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de Usuários
                  </label>
                  <input
                    type="number"
                    value={form.max_users}
                    onChange={(e) => setForm({ ...form, max_users: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de Empresas
                  </label>
                  <input
                    type="number"
                    value={form.max_companies}
                    onChange={(e) => setForm({ ...form, max_companies: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordem de Exibição
                  </label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.ai_enabled}
                      onChange={(e) => setForm({ ...form, ai_enabled: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-700">IA Habilitada</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perguntas IA/dia
                  </label>
                  <input
                    type="number"
                    value={form.max_ai_questions_per_day}
                    onChange={(e) => setForm({ ...form, max_ai_questions_per_day: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Alertas IA
                  </label>
                  <input
                    type="number"
                    value={form.max_ai_alerts_per_month}
                    onChange={(e) => setForm({ ...form, max_ai_alerts_per_month: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Mensagens WhatsApp
                  </label>
                  <input
                    type="number"
                    value={form.max_whatsapp_messages_per_month}
                    onChange={(e) => setForm({ ...form, max_whatsapp_messages_per_month: parseInt(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancelar
              </button>
              <Button onClick={handleSave} loading={saving} icon={<Check size={16} />}>
                Salvar
              </Button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

