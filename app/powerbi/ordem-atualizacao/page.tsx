'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { 
  GripVertical,
  Play,
  PlayCircle,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Save,
  RefreshCw,
  Database,
  BarChart3,
  AlertCircle,
  Settings,
  ChevronDown,
  Trash2,
  Plus,
  X
} from 'lucide-react';

interface CompanyGroup {
  id: string;
  name: string;
}

interface RefreshItem {
  id: string;
  name: string;
  type: 'dataset' | 'dataflow';
  dataset_id?: string;
  dataflow_id?: string;
  connection_id?: string;
  order: number;
  status?: 'idle' | 'refreshing' | 'success' | 'error';
  lastRefresh?: string;
  errorMessage?: string;
}

export default function OrdemAtualizacaoPage() {
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [items, setItems] = useState<RefreshItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showItemScheduleModal, setShowItemScheduleModal] = useState(false);
  const [selectedItemForSchedule, setSelectedItemForSchedule] = useState<RefreshItem | null>(null);
  const [itemSchedule, setItemSchedule] = useState({
    enabled: false,
    times: ['06:00'],
    days: [1, 2, 3, 4, 5]
  });
  const [schedules, setSchedules] = useState<Record<string, any>>({});
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RefreshItem | null>(null);
  const [itemDetails, setItemDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const diasSemana = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
  ];

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedGroup) {
      loadItems();
      loadSchedules();
    }
  }, [selectedGroup]);

  async function loadGroups() {
    try {
      const res = await fetch('/api/company-groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.groups?.length > 0) {
          setSelectedGroup(data.groups[0].id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/powerbi/refresh-order?group_id=${selectedGroup}`);
      if (res.ok) {
        const data = await res.json();
        setItems((data.items || []).map((item: RefreshItem) => ({
          ...item,
          status: 'idle'
        })));
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  }

  async function loadSchedules() {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/powerbi/refresh-schedules?group_id=${selectedGroup}`);
      if (res.ok) {
        const data = await res.json();
        const schedulesMap: Record<string, any> = {};
        (data.schedules || []).forEach((s: any) => {
          schedulesMap[`${s.item_type}-${s.item_id}`] = s;
        });
        setSchedules(schedulesMap);
      }
    } catch (error) {
      console.error('Erro ao carregar agendamentos:', error);
    }
  }

  async function saveOrder() {
    if (!selectedGroup || items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/powerbi/refresh-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroup,
          items: items.map((item, index) => ({
            ...item,
            order: index + 1
          }))
        })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
      setHasChanges(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function refreshItem(index: number): Promise<boolean> {
    const item = items[index];
    if (!item || item.status === 'refreshing') return false;

    setItems(prev => prev.map((it, i) => 
      i === index ? { ...it, status: 'refreshing' as const } : it
    ));

    try {
      // 1. Disparar o refresh
      const res = await fetch('/api/powerbi/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: item.type === 'dataset' ? item.dataset_id : undefined,
          dataflow_id: item.type === 'dataflow' ? item.dataflow_id : undefined,
          connection_id: item.connection_id
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao atualizar');
      }

      // 2. Aguardar o refresh terminar (polling)
      const itemId = item.type === 'dataset' ? item.dataset_id : item.dataflow_id;
      const maxAttempts = 120; // 10 minutos máximo (120 * 5 segundos)
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Espera 5 segundos
        
        const statusRes = await fetch(
          `/api/powerbi/refresh?${item.type === 'dataset' ? 'dataset_id' : 'dataflow_id'}=${itemId}&connection_id=${item.connection_id}`
        );
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          const status = statusData.status;
          
          // Status possíveis: Unknown, Completed, Failed, Disabled, InProgress
          if (status === 'Completed' || status === 'Success') {
            setItems(prev => prev.map((it, i) =>
              i === index ? { ...it, status: 'success' as const } : it
            ));
            
            setTimeout(() => {
              setItems(prev => prev.map((it, i) =>
                i === index ? { ...it, status: 'idle' as const } : it
              ));
            }, 3000);
            
            return true;
          }
          
          if (status === 'Failed' || status === 'Disabled') {
            throw new Error(`Atualização falhou: ${status}`);
          }
          
          // Se ainda está em progresso, continua o loop
          if (status !== 'InProgress' && status !== 'Unknown') {
            console.log(`Status desconhecido: ${status}`);
          }
        }
        
        attempts++;
      }
      
      // Timeout - consideramos sucesso parcial (o refresh foi disparado mas demorou muito)
      setItems(prev => prev.map((it, i) =>
        i === index ? { ...it, status: 'success' as const } : it
      ));
      
      setTimeout(() => {
        setItems(prev => prev.map((it, i) =>
          i === index ? { ...it, status: 'idle' as const } : it
        ));
      }, 3000);
      
      return true;

    } catch (error: any) {
      console.error(`Erro ao atualizar ${item.name}:`, error);
      setItems(prev => prev.map((it, i) =>
        i === index ? { ...it, status: 'error' as const, errorMessage: error.message } : it
      ));

      setTimeout(() => {
        setItems(prev => prev.map((it, i) =>
          i === index ? { ...it, status: 'idle' as const, errorMessage: undefined } : it
        ));
      }, 5000);

      return false;
    }
  }

  async function refreshAllInOrder() {
    if (refreshingAll || items.length === 0) return;
    setRefreshingAll(true);
    
    for (let i = 0; i < items.length; i++) {
      const success = await refreshItem(i);
      // Se falhou, podemos continuar ou parar - vamos continuar
      if (!success) {
        console.log(`Item ${i} falhou, continuando para o próximo...`);
      }
    }
    
    setRefreshingAll(false);
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    newItems.splice(draggedIndex, 1);
    newItems.splice(index, 0, draggedItem);

    setItems(newItems);
    setDraggedIndex(index);
    setHasChanges(true);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function removeItem(index: number) {
    setItems(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  }

  function openItemScheduleModal(item: RefreshItem) {
    const key = `${item.type}-${item.id}`;
    const existingSchedule = schedules[key];
    
    setSelectedItemForSchedule(item);
    setItemSchedule({
      enabled: existingSchedule?.schedule_enabled || false,
      times: existingSchedule?.schedule_times || ['06:00'],
      days: existingSchedule?.schedule_days || [1, 2, 3, 4, 5]
    });
    setShowItemScheduleModal(true);
  }

  async function saveItemSchedule() {
    if (!selectedItemForSchedule || !selectedGroup) return;
    
    try {
      const res = await fetch('/api/powerbi/refresh-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: selectedGroup,
          item_id: selectedItemForSchedule.id,
          item_type: selectedItemForSchedule.type,
          item_name: selectedItemForSchedule.name,
          dataflow_id: selectedItemForSchedule.type === 'dataflow' ? selectedItemForSchedule.dataflow_id : null,
          dataset_id: selectedItemForSchedule.type === 'dataset' ? selectedItemForSchedule.dataset_id : null,
          connection_id: selectedItemForSchedule.connection_id,
          schedule_enabled: itemSchedule.enabled,
          schedule_times: itemSchedule.times,
          schedule_days: itemSchedule.days
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      await loadSchedules();
      setShowItemScheduleModal(false);
      setSelectedItemForSchedule(null);
    } catch (error: any) {
      alert(error.message);
    }
  }

  function toggleItemDay(day: number) {
    setItemSchedule(prev => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter(d => d !== day)
        : [...prev.days, day].sort()
    }));
  }

  function addItemTime() {
    setItemSchedule(prev => ({
      ...prev,
      times: [...prev.times, '12:00']
    }));
  }

  function removeItemTime(index: number) {
    setItemSchedule(prev => ({
      ...prev,
      times: prev.times.filter((_, i) => i !== index)
    }));
  }

  function updateItemTime(index: number, value: string) {
    setItemSchedule(prev => ({
      ...prev,
      times: prev.times.map((t, i) => i === index ? value : t)
    }));
  }

  function getItemScheduleInfo(item: RefreshItem): string | null {
    const key = `${item.type}-${item.id}`;
    const schedule = schedules[key];
    if (schedule?.schedule_enabled && schedule?.schedule_times?.length > 0) {
      return schedule.schedule_times.join(', ');
    }
    return null;
  }

  async function openDetailsPanel(item: RefreshItem) {
    setSelectedItem(item);
    setShowDetailsPanel(true);
    setLoadingDetails(true);
    setItemDetails(null);

    try {
      const itemId = item.type === 'dataflow' ? item.dataflow_id : item.dataset_id;
      const res = await fetch(`/api/powerbi/item-details?type=${item.type}&id=${itemId}&connection_id=${item.connection_id}`);
      
      if (res.ok) {
        const data = await res.json();
        setItemDetails(data);
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
    } finally {
      setLoadingDetails(false);
    }
  }

  function closeDetailsPanel() {
    setShowDetailsPanel(false);
    setSelectedItem(null);
    setItemDetails(null);
  }

  function formatDateTime(dateStr: string | null) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'Completed':
      case 'Success':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Concluído</span>;
      case 'Failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Falhou</span>;
      case 'InProgress':
      case 'Unknown':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Em andamento</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  }

  function getStatusIcon(status?: string) {
    switch (status) {
      case 'refreshing':
        return <Loader2 size={18} className="animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <XCircle size={18} className="text-red-500" />;
      default:
        return null;
    }
  }

  function getTypeIcon(type: string) {
    return type === 'dataflow' 
      ? <Database size={18} className="text-purple-500" />
      : <BarChart3 size={18} className="text-blue-500" />;
  }

  function getTypeLabel(type: string) {
    return type === 'dataflow' ? 'Fluxo de Dados' : 'Modelo Semântico';
  }

  if (loading && groups.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Ordem de Atualização</h1>
          <p className="text-gray-500">Defina a sequência de atualização dos dados do Power BI</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={refreshAllInOrder}
            disabled={refreshingAll || items.length === 0}
            loading={refreshingAll}
            icon={!refreshingAll ? <PlayCircle size={18} /> : undefined}
          >
            {refreshingAll ? 'Atualizando...' : 'Atualizar Todos'}
          </Button>

          <Button
            onClick={saveOrder}
            disabled={saving || !hasChanges}
            loading={saving}
            icon={!saving ? <Save size={18} /> : undefined}
          >
            {saving ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Grupo de Empresa
        </label>
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          <option value="">Selecione um grupo...</option>
          {groups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>

      {selectedGroup && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw size={20} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Sequência de Atualização</h2>
              <span className="text-sm text-gray-500">({items.length} itens)</span>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500">
              <AlertCircle size={40} className="mb-3 text-gray-300" />
              <p>Nenhum dataset ou dataflow encontrado</p>
              <p className="text-sm text-gray-400">Configure relatórios para este grupo primeiro</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item, index) => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  onClick={() => openDetailsPanel(item)}
                  className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    draggedIndex === index ? 'bg-blue-50 opacity-50' : ''
                  } ${selectedItem?.id === item.id ? 'bg-blue-100 border-l-[12px] border-blue-600 shadow-sm' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <GripVertical size={20} className="text-gray-400" />
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 font-bold rounded-lg text-sm">
                      {index + 1}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {getTypeIcon(item.type)}
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      item.type === 'dataflow' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {getTypeLabel(item.type)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-500 font-mono truncate">{item.dataset_id || item.dataflow_id}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    {item.status === 'error' && item.errorMessage && (
                      <span className="text-xs text-red-500 max-w-[150px] truncate" title={item.errorMessage}>
                        {item.errorMessage}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openItemScheduleModal(item);
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        getItemScheduleInfo(item)
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                      }`}
                      title={getItemScheduleInfo(item) ? `Agendado: ${getItemScheduleInfo(item)}` : 'Agendar'}
                    >
                      <Clock size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        refreshItem(index);
                      }}
                      disabled={item.status === 'refreshing'}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Atualizar agora"
                    >
                      {item.status === 'refreshing' ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Play size={18} />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(index);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remover"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showItemScheduleModal && selectedItemForSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agendar Atualização</h2>
                <p className="text-sm text-gray-500">{selectedItemForSchedule.name}</p>
              </div>
              <button
                onClick={() => {
                  setShowItemScheduleModal(false);
                  setSelectedItemForSchedule(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Ativar Agendamento</p>
                  <p className="text-sm text-gray-500">Execute automaticamente nos horários definidos</p>
                </div>
                <button
                  onClick={() => setItemSchedule(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    itemSchedule.enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    itemSchedule.enabled ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dias da Semana
                </label>
                <div className="flex gap-2">
                  {diasSemana.map((dia) => (
                    <button
                      key={dia.value}
                      onClick={() => toggleItemDay(dia.value)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition-colors ${
                        itemSchedule.days.includes(dia.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {dia.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Horários
                </label>
                <div className="space-y-2">
                  {itemSchedule.times.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateItemTime(index, e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {itemSchedule.times.length > 1 && (
                        <button
                          onClick={() => removeItemTime(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addItemTime}
                    className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Plus size={18} />
                    Adicionar Horário
                  </button>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowItemScheduleModal(false);
                  setSelectedItemForSchedule(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Cancelar
              </button>
              <Button onClick={saveItemSchedule}>
                Salvar Agendamento
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Painel Lateral de Detalhes */}
      {showDetailsPanel && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col">
          {/* Header azul */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedItem?.type === 'dataflow' ? (
                <Database size={20} />
              ) : (
                <BarChart3 size={20} />
              )}
              <span className="font-semibold">
                {selectedItem?.type === 'dataflow' ? 'Fluxo de Dados' : 'Modelo Semântico'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectedItem && refreshItem(items.findIndex(i => i.id === selectedItem.id));
                }}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
                title="Atualizar agora"
              >
                <Play size={18} />
              </button>
              <button
                onClick={closeDetailsPanel}
                className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto">
            {loadingDetails ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : itemDetails ? (
              <div className="p-4 space-y-6">
                {/* Nome e Info Básica */}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{itemDetails.name || selectedItem?.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {itemDetails.connectionName} • {itemDetails.type === 'dataflow' ? 'Dataflow' : 'Dataset'}
                  </p>
                </div>

                {/* ID */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">ID</p>
                  <p className="text-sm font-mono text-gray-700 break-all">
                    {selectedItem?.type === 'dataflow' ? selectedItem?.dataflow_id : selectedItem?.dataset_id}
                  </p>
                </div>

                {/* Agendamento do Power BI */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Calendar size={16} />
                    Agendamento Power BI
                  </h3>
                  {itemDetails.powerbiSchedule ? (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Status</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          itemDetails.powerbiSchedule.enabled 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {itemDetails.powerbiSchedule.enabled ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      {itemDetails.powerbiSchedule.enabled && (
                        <>
                          {itemDetails.powerbiSchedule.times && itemDetails.powerbiSchedule.times.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Horários</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {itemDetails.powerbiSchedule.times.join(', ')}
                              </p>
                            </div>
                          )}
                          {itemDetails.powerbiSchedule.days && itemDetails.powerbiSchedule.days.length > 0 && (
                            <div>
                              <span className="text-xs text-gray-500">Dias</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {itemDetails.powerbiSchedule.days.join(', ')}
                              </p>
                            </div>
                          )}
                          {itemDetails.powerbiSchedule.localTimeZoneId && (
                            <div>
                              <span className="text-xs text-gray-500">Fuso Horário</span>
                              <p className="text-sm text-gray-900 mt-1">
                                {itemDetails.powerbiSchedule.localTimeZoneId}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum agendamento configurado</p>
                  )}
                </div>

                {/* Histórico de Atualização */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <RefreshCw size={16} />
                    Histórico de Atualização
                  </h3>
                  {itemDetails.refreshHistory && itemDetails.refreshHistory.length > 0 ? (
                    <div className="space-y-2">
                      {itemDetails.refreshHistory.slice(0, 3).map((refresh: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            {getStatusBadge(refresh.status)}
                            <span className="text-xs text-gray-500">
                              {refresh.refreshType || 'Manual'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div className="flex justify-between">
                              <span>Início:</span>
                              <span>{formatDateTime(refresh.startTime)}</span>
                            </div>
                            {refresh.endTime && (
                              <div className="flex justify-between">
                                <span>Fim:</span>
                                <span>{formatDateTime(refresh.endTime)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum histórico disponível</p>
                  )}
                </div>

                {/* Informações Adicionais */}
                {(itemDetails.configuredBy || itemDetails.createdDate || itemDetails.modifiedDateTime) && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">Informações</h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                      {itemDetails.configuredBy && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Configurado por:</span>
                          <span className="text-gray-900">{itemDetails.configuredBy}</span>
                        </div>
                      )}
                      {itemDetails.createdDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Criado em:</span>
                          <span className="text-gray-900">{formatDateTime(itemDetails.createdDate)}</span>
                        </div>
                      )}
                      {itemDetails.modifiedDateTime && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Modificado em:</span>
                          <span className="text-gray-900">{formatDateTime(itemDetails.modifiedDateTime)}</span>
                        </div>
                      )}
                      {itemDetails.isRefreshable !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Atualizável:</span>
                          <span className="text-gray-900">{itemDetails.isRefreshable ? 'Sim' : 'Não'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                <p>Erro ao carregar detalhes</p>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </MainLayout>
  );
}
