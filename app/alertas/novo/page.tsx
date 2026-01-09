'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import MessageEditor from '@/components/whatsapp/MessageEditor';
import { 
  FileText,
  Database,
  GitBranch,
  Clock,
  FileCode,
  Play,
  RefreshCw,
  Send,
  X,
  AlertTriangle,
  Loader2,
  Check,
  Plus,
  Trash2,
  Sparkles
} from 'lucide-react';

interface Connection {
  id: string;
  name: string;
  workspace_id: string;
}

interface AuthorizedNumber {
  id: string;
  name: string;
  phone_number: string;
}

interface AuthorizedGroup {
  id: string;
  group_name: string;
  group_id: string;
}

interface Dataset {
  id: string;
  name: string;
}

const CONDITIONS = [
  { value: 'greater_than', label: 'Maior que' },
  { value: 'less_than', label: 'Menor que' },
  { value: 'equals', label: 'Igual a' },
  { value: 'not_equals', label: 'Diferente de' },
  { value: 'greater_or_equal', label: 'Maior ou igual' },
  { value: 'less_or_equal', label: 'Menor ou igual' },
];

const ALERT_TYPES = [
  { value: 'warning', label: 'Aviso', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'danger', label: 'Perigo', color: 'bg-red-100 text-red-700' },
  { value: 'success', label: 'Sucesso', color: 'bg-green-100 text-green-700' },
  { value: 'info', label: 'Informação', color: 'bg-blue-100 text-blue-700' },
];

const CHECK_FREQUENCIES = [
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const FORM_TABS = [
  { id: 'geral', label: 'Geral', icon: FileText },
  { id: 'dados', label: 'Dados', icon: Database },
  { id: 'condicao', label: 'Condição', icon: GitBranch },
  { id: 'agendamento', label: 'Agendamento', icon: Clock },
  { id: 'notificacoes', label: 'Template', icon: Sparkles },
] as const;

type TabId = typeof FORM_TABS[number]['id'];

export default function NovoAlertaPage() {
  const router = useRouter();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [authorizedNumbers, setAuthorizedNumbers] = useState<AuthorizedNumber[]>([]);
  const [authorizedGroups, setAuthorizedGroups] = useState<AuthorizedGroup[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadingDatasets, setLoadingDatasets] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('geral');
  const [whatsappType, setWhatsappType] = useState<'number' | 'group' | 'both'>('number');
  const [selectedNumberToAdd, setSelectedNumberToAdd] = useState('');
  const [selectedGroupToAdd, setSelectedGroupToAdd] = useState('');
  const [testingDax, setTestingDax] = useState(false);
  const [daxTestResult, setDaxTestResult] = useState<{ success: boolean; message: string; value?: any } | null>(null);
  const [generatingTemplate, setGeneratingTemplate] = useState(false);
  const [daxPrompt, setDaxPrompt] = useState('');
  const [generatingDax, setGeneratingDax] = useState(false);
  const [daxError, setDaxError] = useState<{ message: string; suggestions: string[] } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    dax_query: '',
    condition: 'greater_than',
    threshold: 0,
    alert_type: 'warning',
    check_times: ['08:00'],
    check_frequency: 'daily',
    check_days_of_week: [] as number[],
    check_days_of_month: [] as number[],
    connection_id: '',
    dataset_id: '',
    notify_whatsapp: false,
    whatsapp_numbers: [] as string[],
    whatsapp_group_ids: [] as string[],
    message_template: '🔔 *{{nome_alerta}}*\n\n📊 Valor: *{{valor}}*\n📅 {{data}} às {{hora}}'
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (formData.connection_id) {
      loadDatasets(formData.connection_id);
    }
  }, [formData.connection_id]);

  async function loadData() {
    try {
      const [connectionsRes, numbersRes, groupsRes] = await Promise.all([
        fetch('/api/powerbi/connections'),
        fetch('/api/whatsapp/authorized-numbers'),
        fetch('/api/whatsapp/groups')
      ]);

      if (connectionsRes.ok) {
        const data = await connectionsRes.json();
        setConnections(data.connections || []);
      }

      if (numbersRes.ok) {
        const data = await numbersRes.json();
        setAuthorizedNumbers(data.numbers || []);
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setAuthorizedGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadDatasets(connectionId: string) {
    setLoadingDatasets(true);
    try {
      const res = await fetch(`/api/powerbi/datasets?connection_id=${connectionId}`);
      if (res.ok) {
        const data = await res.json();
        setDatasets(data.datasets || []);
      }
    } catch (err) {
      console.error('Erro ao carregar datasets:', err);
    } finally {
      setLoadingDatasets(false);
    }
  }

  async function handleTestDax() {
    if (!formData.connection_id || !formData.dataset_id || !formData.dax_query.trim()) {
      alert('Preencha conexão, dataset e query DAX');
      return;
    }

    setTestingDax(true);
    setDaxTestResult(null);

    try {
      const res = await fetch('/api/powerbi/datasets/execute-dax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connection_id: formData.connection_id,
          dataset_id: formData.dataset_id,
          query: formData.dax_query
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        const value = data.results?.[0]?.[Object.keys(data.results[0])[0]];
        setDaxTestResult({
          success: true,
          message: `Query executada com sucesso!`,
          value: value
        });
      } else {
        setDaxTestResult({
          success: false,
          message: data.error || 'Erro ao executar query'
        });
      }
    } catch (err) {
      setDaxTestResult({
        success: false,
        message: 'Erro ao executar query DAX'
      });
    } finally {
      setTestingDax(false);
    }
  }

  async function handleGenerateTemplate() {
    if (!formData.name) {
      alert('Preencha o nome do alerta primeiro');
      return;
    }

    if (!formData.dax_query) {
      alert('Configure a query DAX na aba Dados primeiro');
      return;
    }

    setGeneratingTemplate(true);
    try {
      const res = await fetch('/api/ai/generate-alert-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alert_name: formData.name,
          alert_type: formData.alert_type,
          description: formData.description,
          condition: formData.condition,
          threshold: formData.threshold,
          dax_query: formData.dax_query,
          dax_prompt: daxPrompt
        })
      });

      const data = await res.json();

      if (res.ok && data.template) {
        setFormData(prev => ({
          ...prev,
          message_template: data.template
        }));
      } else {
        alert(data.error || 'Erro ao gerar template');
      }
    } catch (err) {
      alert('Erro ao gerar template com IA');
    } finally {
      setGeneratingTemplate(false);
    }
  }

  async function handleGenerateDax() {
    if (!formData.connection_id || !formData.dataset_id) {
      alert('Selecione uma conexão e dataset primeiro');
      return;
    }

    if (!daxPrompt.trim()) {
      alert('Descreva o que você precisa monitorar');
      return;
    }

    setGeneratingDax(true);
    setDaxError(null);
    setDaxTestResult(null);

    try {
      const res = await fetch('/api/ai/generate-dax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: daxPrompt,
          connection_id: formData.connection_id,
          dataset_id: formData.dataset_id
        })
      });

      const data = await res.json();

      if (data.success && data.dax_query) {
        setFormData(prev => ({
          ...prev,
          dax_query: data.dax_query
        }));
        setDaxError(null);
        setDaxPrompt('');
      } else {
        setDaxError({
          message: data.error || 'Erro ao gerar DAX',
          suggestions: data.suggestions || []
        });
      }
    } catch (err) {
      setDaxError({
        message: 'Erro ao gerar DAX com IA',
        suggestions: []
      });
    } finally {
      setGeneratingDax(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/alertas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        alert('Alerta criado com sucesso!');
        router.push('/alertas');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar alerta');
      }
    } catch (err) {
      alert('Erro ao criar alerta');
    } finally {
      setSaving(false);
    }
  }

  function addCheckTime() {
    setFormData(prev => ({
      ...prev,
      check_times: [...prev.check_times, '12:00']
    }));
  }

  function removeCheckTime(index: number) {
    setFormData(prev => ({
      ...prev,
      check_times: prev.check_times.filter((_, i) => i !== index)
    }));
  }

  function updateCheckTime(index: number, value: string) {
    setFormData(prev => ({
      ...prev,
      check_times: prev.check_times.map((t, i) => i === index ? value : t)
    }));
  }

  function toggleDayOfWeek(day: number) {
    setFormData(prev => ({
      ...prev,
      check_days_of_week: prev.check_days_of_week.includes(day)
        ? prev.check_days_of_week.filter(d => d !== day)
        : [...prev.check_days_of_week, day].sort()
    }));
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 -mt-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Alerta</h1>
          <p className="text-gray-500 text-sm mt-1">Configure um alerta automático baseado em dados</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {FORM_TABS.map((tab, index) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const tabIndex = FORM_TABS.findIndex(t => t.id === activeTab);
              const isPast = index < tabIndex;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : isPast
                      ? 'text-green-600 hover:bg-gray-50'
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  {isPast ? <Check size={16} /> : <Icon size={16} />}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="p-6">
              {/* Tab: Geral */}
              {activeTab === 'geral' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Alerta *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ex: Vendas abaixo da meta"
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo do Alerta
                      </label>
                      <div className="flex gap-2">
                        {ALERT_TYPES.map(type => (
                          <button
                            key={type.value}
                            type="button"
                            onClick={() => setFormData({ ...formData, alert_type: type.value })}
                            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              formData.alert_type === type.value
                                ? type.color + ' ring-2 ring-offset-2 ring-blue-500'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {type.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Descrição
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Descreva o objetivo deste alerta..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Tab: Dados */}
              {activeTab === 'dados' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Conexão Power BI *
                      </label>
                      <select
                        value={formData.connection_id}
                        onChange={(e) => setFormData({ ...formData, connection_id: e.target.value, dataset_id: '' })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Selecione uma conexão</option>
                        {connections.map(conn => (
                          <option key={conn.id} value={conn.id}>{conn.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dataset *
                      </label>
                      <select
                        value={formData.dataset_id}
                        onChange={(e) => setFormData({ ...formData, dataset_id: e.target.value })}
                        disabled={!formData.connection_id || loadingDatasets}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">
                          {loadingDatasets ? 'Carregando...' : 'Selecione um dataset'}
                        </option>
                        {datasets.map(ds => (
                          <option key={ds.id} value={ds.id}>{ds.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Gerador de DAX com IA */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles size={18} className="text-purple-600" />
                      <h3 className="text-sm font-semibold text-purple-900">Gerar DAX com IA</h3>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-purple-700 mb-1">
                          Descreva o que você precisa monitorar:
                        </label>
                        <textarea
                          value={daxPrompt}
                          onChange={(e) => setDaxPrompt(e.target.value)}
                          placeholder="Ex: Venda de ontem por filial, Total de vendas do mês, Top 10 clientes..."
                          rows={2}
                          disabled={!formData.connection_id || !formData.dataset_id}
                          className="w-full px-3 py-2 border border-purple-200 rounded-lg focus:outline-none focus:border-purple-500 text-sm resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        />
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleGenerateDax}
                          disabled={generatingDax || !formData.connection_id || !formData.dataset_id || !daxPrompt.trim()}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                          {generatingDax ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Sparkles size={16} />
                              Gerar DAX
                            </>
                          )}
                        </button>
                        
                        {!formData.connection_id || !formData.dataset_id ? (
                          <span className="text-xs text-purple-600">
                            ⚠️ Selecione conexão e dataset primeiro
                          </span>
                        ) : null}
                      </div>

                      {/* Mensagem de erro com sugestões */}
                      {daxError && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="text-sm text-amber-800 font-medium">{daxError.message}</p>
                          {daxError.suggestions.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-amber-700 mb-1">Sugestões disponíveis:</p>
                              <div className="flex flex-wrap gap-1">
                                {daxError.suggestions.map((suggestion, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setDaxPrompt(suggestion)}
                                    className="px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded text-xs transition-colors"
                                  >
                                    {suggestion}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Query DAX * (ou use a IA acima para gerar)
                    </label>
                    <textarea
                      value={formData.dax_query}
                      onChange={(e) => setFormData({ ...formData, dax_query: e.target.value })}
                      placeholder="EVALUATE ROW(&quot;Valor&quot;, [Minha Medida])"
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm resize-none"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleTestDax}
                      disabled={testingDax || !formData.connection_id || !formData.dataset_id}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {testingDax ? (
                        <RefreshCw size={16} className="animate-spin" />
                      ) : (
                        <Play size={16} />
                      )}
                      Testar Query
                    </button>

                    {daxTestResult && (
                      <div className={`flex-1 px-4 py-2 rounded-lg text-sm ${
                        daxTestResult.success
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}>
                        {daxTestResult.success && daxTestResult.value !== undefined && (
                          <span className="font-semibold">Valor: {daxTestResult.value} - </span>
                        )}
                        {daxTestResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Condição */}
              {activeTab === 'condicao' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Condição
                      </label>
                      <select
                        value={formData.condition}
                        onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        {CONDITIONS.map(cond => (
                          <option key={cond.value} value={cond.value}>{cond.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Limite
                      </label>
                      <input
                        type="number"
                        value={formData.threshold}
                        onChange={(e) => setFormData({ ...formData, threshold: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-700">
                      <strong>Resumo:</strong> O alerta será disparado quando o valor retornado pela query DAX for{' '}
                      <strong>{CONDITIONS.find(c => c.value === formData.condition)?.label.toLowerCase()}</strong>{' '}
                      <strong>{formData.threshold.toLocaleString('pt-BR')}</strong>
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Agendamento */}
              {activeTab === 'agendamento' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Frequência
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {CHECK_FREQUENCIES.map(freq => (
                        <button
                          key={freq.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, check_frequency: freq.value })}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                            formData.check_frequency === freq.value
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {freq.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.check_frequency === 'weekly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Dias da Semana
                      </label>
                      <div className="flex gap-2">
                        {DAYS_OF_WEEK.map(day => (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDayOfWeek(day.value)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                              formData.check_days_of_week.includes(day.value)
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {day.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Horários de Verificação
                    </label>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                      {formData.check_times.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => updateCheckTime(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                          />
                          {formData.check_times.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeCheckTime(index)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addCheckTime}
                      className="flex items-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm mt-3"
                    >
                      <Plus size={16} />
                      Adicionar horário
                    </button>
                  </div>

                  {/* WhatsApp */}
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="notify_whatsapp"
                        checked={formData.notify_whatsapp}
                        onChange={(e) => setFormData({ ...formData, notify_whatsapp: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <label htmlFor="notify_whatsapp" className="text-sm font-medium text-gray-700">
                        Notificar via WhatsApp
                      </label>
                    </div>

                    {formData.notify_whatsapp && (
                      <div className="space-y-4 pl-7">
                        <div className="flex gap-2">
                          {['number', 'group', 'both'].map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setWhatsappType(type as any)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                                whatsappType === type
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {type === 'number' ? 'Números' : type === 'group' ? 'Grupos' : 'Ambos'}
                            </button>
                          ))}
                        </div>

                        {(whatsappType === 'number' || whatsappType === 'both') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Números</label>
                            <div className="flex gap-2">
                              <select
                                value={selectedNumberToAdd}
                                onChange={(e) => setSelectedNumberToAdd(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              >
                                <option value="">Selecione um número</option>
                                {authorizedNumbers
                                  .filter(n => !formData.whatsapp_numbers.includes(n.phone_number))
                                  .map(n => (
                                    <option key={n.id} value={n.phone_number}>{n.name}</option>
                                  ))}
                              </select>
                              <Button
                                type="button"
                                onClick={() => {
                                  if (selectedNumberToAdd) {
                                    setFormData(prev => ({
                                      ...prev,
                                      whatsapp_numbers: [...prev.whatsapp_numbers, selectedNumberToAdd]
                                    }));
                                    setSelectedNumberToAdd('');
                                  }
                                }}
                                disabled={!selectedNumberToAdd}
                                size="sm"
                              >
                                Adicionar
                              </Button>
                            </div>
                            {formData.whatsapp_numbers.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {formData.whatsapp_numbers.map(num => {
                                  const contact = authorizedNumbers.find(n => n.phone_number === num);
                                  return (
                                    <span key={num} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                                      {contact?.name || num}
                                      <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                          ...prev,
                                          whatsapp_numbers: prev.whatsapp_numbers.filter(n => n !== num)
                                        }))}
                                        className="hover:text-green-900"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {(whatsappType === 'group' || whatsappType === 'both') && (
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">Grupos</label>
                            <div className="flex gap-2">
                              <select
                                value={selectedGroupToAdd}
                                onChange={(e) => setSelectedGroupToAdd(e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              >
                                <option value="">Selecione um grupo</option>
                                {authorizedGroups
                                  .filter(g => !formData.whatsapp_group_ids.includes(g.group_id))
                                  .map(g => (
                                    <option key={g.id} value={g.group_id}>{g.group_name}</option>
                                  ))}
                              </select>
                              <Button
                                type="button"
                                onClick={() => {
                                  if (selectedGroupToAdd) {
                                    setFormData(prev => ({
                                      ...prev,
                                      whatsapp_group_ids: [...prev.whatsapp_group_ids, selectedGroupToAdd]
                                    }));
                                    setSelectedGroupToAdd('');
                                  }
                                }}
                                disabled={!selectedGroupToAdd}
                                size="sm"
                              >
                                Adicionar
                              </Button>
                            </div>
                            {formData.whatsapp_group_ids.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {formData.whatsapp_group_ids.map(gid => {
                                  const group = authorizedGroups.find(g => g.group_id === gid);
                                  return (
                                    <span key={gid} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                                      {group?.group_name || gid}
                                      <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({
                                          ...prev,
                                          whatsapp_group_ids: prev.whatsapp_group_ids.filter(g => g !== gid)
                                        }))}
                                        className="hover:text-purple-900"
                                      >
                                        <X size={12} />
                                      </button>
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Template */}
              {/* Tab: Template */}
              {activeTab === 'notificacoes' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700">Template da Mensagem</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Configure a mensagem que será enviada quando o alerta for disparado</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campos Disponíveis
                    </label>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-xs text-gray-500 mb-3">
                        Clique em um campo para adicioná-lo à mensagem:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: '{{nome_alerta}}', label: 'Nome do Alerta' },
                          { key: '{{valor}}', label: 'Valor' },
                          { key: '{{data}}', label: 'Data' },
                          { key: '{{hora}}', label: 'Hora' },
                          { key: '{{condicao}}', label: 'Condição' },
                          { key: '{{threshold}}', label: 'Limite' },
                        ].map((variable) => (
                          <button
                            key={variable.key}
                            type="button"
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                message_template: prev.message_template + variable.key
                              }));
                            }}
                            className="px-3 py-2 bg-white border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm"
                          >
                            <span className="font-mono text-blue-600">{variable.key}</span>
                            <span className="text-xs text-gray-500 ml-2">{variable.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Botão IA para gerar template - NOVO POSICIONAMENTO */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleGenerateTemplate}
                      disabled={generatingTemplate || !formData.name || !formData.dax_query}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {generatingTemplate ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          Gerar Template com IA
                        </>
                      )}
                    </button>
                    {(!formData.dax_query || !formData.name) && (
                      <span className="text-xs text-gray-500">
                        ⚠️ Preencha o nome do alerta e a query DAX primeiro
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Personalizar Mensagem
                    </label>
                    <MessageEditor
                      value={formData.message_template}
                      onChange={(value) => setFormData(prev => ({ ...prev, message_template: value }))}
                      alertName={formData.name || 'Meu Alerta'}
                      showTemplates={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <span className="text-sm text-gray-500">
                {FORM_TABS.findIndex(t => t.id === activeTab) + 1} de {FORM_TABS.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancelar
                </button>

                {activeTab !== 'geral' && (
                  <button
                    type="button"
                    onClick={() => {
                      const idx = FORM_TABS.findIndex(t => t.id === activeTab);
                      if (idx > 0) setActiveTab(FORM_TABS[idx - 1].id);
                    }}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    ← Anterior
                  </button>
                )}

                {activeTab !== 'notificacoes' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const idx = FORM_TABS.findIndex(t => t.id === activeTab);
                      if (idx < FORM_TABS.length - 1) setActiveTab(FORM_TABS[idx + 1].id);
                    }}
                  >
                    Próximo →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={saving}
                  >
                    Criar Alerta
                  </Button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </MainLayout>
  );
}


// force rebuild
// rebuild v2
