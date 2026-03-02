'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { useRefreshContextOptional } from '@/contexts/RefreshContext';
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
  X,
  Bell,
  BellRing,
  Phone
} from 'lucide-react';

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
  lastRefreshStatus?: 'Completed' | 'Failed' | 'Unknown' | 'InProgress' | 'Success' | null;
  lastRefreshDuration?: string;
  errorMessage?: string;
}

function OrdemAtualizacaoContent() {
  const [items, setItems] = useState<RefreshItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableItems, setAvailableItems] = useState<RefreshItem[]>([]);
  const [selectedNewItems, setSelectedNewItems] = useState<Set<string>>(new Set());
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [refreshingStatusIndex, setRefreshingStatusIndex] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({
    active: false,
    current: 0,
    total: 0,
    currentName: '',
    completed: 0,
    failed: 0,
    succeeded: 0,
  });
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
  const [userRole, setUserRole] = useState<string>('user');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [selectedAlertItem, setSelectedAlertItem] = useState<RefreshItem | null>(null);
  const [alertConfig, setAlertConfig] = useState({
    is_enabled: true,
    alert_on_error: true,
    alert_on_delay: false,
    alert_daily_report: false,
    expected_refresh_time: '08:00',
    daily_report_time: '07:00',
    whatsapp_numbers: '',
  });
  const [refreshAlerts, setRefreshAlerts] = useState<Record<string, any>>({});
  const [savingAlert, setSavingAlert] = useState(false);
  const [dailyUsage, setDailyUsage] = useState({ used: 0, limit: 10, remaining: 10 });
  const [phoneNumbers, setPhoneNumbers] = useState<string[]>(['']);

  const { activeGroup } = useMenu();
  const refreshContext = useRefreshContextOptional();

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
    checkAccessAndLoad();
  }, [activeGroup?.id]);

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
        if (activeGroup?.id) {
          loadItems();
          loadSchedules();
          loadRefreshAlerts();
        } else {
          setLoading(false);
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

  async function fetchItemStatus(item: RefreshItem): Promise<RefreshItem> {
    try {
      const itemId = item.type === 'dataset' ? item.dataset_id : item.dataflow_id;
      if (!itemId || !item.connection_id) return { ...item, lastRefreshStatus: null };
      const res = await fetch(
        `/api/powerbi/item-details?type=${item.type}&id=${itemId}&connection_id=${item.connection_id}`
      );
      if (res.ok) {
        const data = await res.json();
        const firstRefresh = data.refreshHistory?.[0];
        if (firstRefresh) {
          const lastRefreshStatus = firstRefresh.status || null;
          const lastRefresh = firstRefresh.endTime || firstRefresh.startTime || null;
          let lastRefreshDuration: string | undefined;
          if (firstRefresh.startTime && firstRefresh.endTime) {
            const start = new Date(firstRefresh.startTime).getTime();
            const end = new Date(firstRefresh.endTime).getTime();
            const secs = Math.round((end - start) / 1000);
            lastRefreshDuration = secs >= 60 ? `${Math.floor(secs / 60)}m ${secs % 60}s` : `${secs}s`;
          }
          return {
            ...item,
            lastRefreshStatus,
            lastRefresh,
            lastRefreshDuration,
          };
        }
      }
    } catch (error) {
      console.error(`Erro ao buscar status de ${item.name}:`, error);
    }
    return { ...item, lastRefreshStatus: null };
  }

  async function loadItemsStatus(loadedItems: RefreshItem[]) {
    const updatedItems = await Promise.all(loadedItems.map(fetchItemStatus));
    setItems(updatedItems);
  }

  async function refreshItemStatus(index: number) {
    const item = items[index];
    if (!item) return;
    setRefreshingStatusIndex(index);
    try {
      const updated = await fetchItemStatus(item);
      setItems(prev => prev.map((it, i) => i === index ? updated : it));
    } finally {
      setRefreshingStatusIndex(null);
    }
  }

  async function loadItems() {
    setLoading(true);
    try {
      const res = await fetch(`/api/powerbi/refresh-order?group_id=${activeGroup?.id}`);
      if (res.ok) {
        const data = await res.json();
        const loadedItems = (data.items || []).map((item: RefreshItem) => ({
          ...item,
          status: 'idle' as const
        }));
        setItems(loadedItems);
        loadItemsStatus(loadedItems);
      }
    } catch (error) {
      console.error('Erro ao carregar itens:', error);
    } finally {
      setLoading(false);
      setHasChanges(false);
    }
  }

  function getItemKey(item: RefreshItem): string {
    return `${item.type}-${item.dataset_id || item.dataflow_id}-${item.connection_id || ''}`;
  }

  async function openAddModal() {
    if (!activeGroup?.id) return;
    setShowAddModal(true);
    setAvailableItems([]);
    setSelectedNewItems(new Set());
    setLoadingAvailable(true);
    try {
      // 1. Sync dataflows do Power BI (silencioso)
      await fetch(`/api/powerbi/dataflows/sync?group_id=${activeGroup.id}`, { method: 'POST' });
      // 2. Buscar todos os itens disponíveis
      const res = await fetch(`/api/powerbi/refresh-order?group_id=${activeGroup.id}&available=true`);
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.items || []).map((item: RefreshItem) => ({
          ...item,
          status: 'idle' as const
        }));
        setAvailableItems(allItems);
      }
    } catch (error) {
      console.error('Erro ao carregar itens disponíveis:', error);
      alert('Erro ao carregar itens disponíveis');
    } finally {
      setLoadingAvailable(false);
    }
  }

  function closeAddModal() {
    setShowAddModal(false);
    setAvailableItems([]);
    setSelectedNewItems(new Set());
  }

  function toggleSelectedItem(key: string) {
    setSelectedNewItems(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function addSelectedItems() {
    const toAdd = availableItems.filter(item => selectedNewItems.has(getItemKey(item)));
    const currentKeys = new Set(items.map(getItemKey));
    const newItems = toAdd.filter(item => !currentKeys.has(getItemKey(item)));
    if (newItems.length > 0) {
      const nextOrder = items.length + 1;
      setItems(prev => [...prev, ...newItems.map((item, i) => ({
        ...item,
        order: nextOrder + i,
        status: 'idle' as const
      }))]);
      setHasChanges(true);
    }
    closeAddModal();
  }

  async function loadSchedules() {
    if (!activeGroup?.id) return;
    try {
      const res = await fetch(`/api/powerbi/refresh-schedules?group_id=${activeGroup?.id}`);
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

  async function loadRefreshAlerts() {
    if (!activeGroup?.id) return;
    try {
      const res = await fetch(`/api/powerbi/refresh-alerts?group_id=${activeGroup.id}`);
      if (res.ok) {
        const data = await res.json();
        const alertsMap: Record<string, any> = {};
        (data.alerts || []).forEach((a: any) => {
          const key = `${a.item_type}-${a.dataset_id || a.dataflow_id}`;
          alertsMap[key] = a;
        });
        setRefreshAlerts(alertsMap);
        if (data.daily_usage) setDailyUsage(data.daily_usage);
      }
    } catch (error) {
      console.error('Erro ao carregar alertas de refresh:', error);
    }
  }

  function openAlertModal(item: RefreshItem) {
    const itemId = item.type === 'dataset' ? item.dataset_id : item.dataflow_id;
    const key = `${item.type}-${itemId}`;
    const existing = refreshAlerts[key];

    const numbers = (existing?.whatsapp_numbers || '')
      .split(',')
      .map((n: string) => n.trim())
      .filter(Boolean);
    setPhoneNumbers(numbers.length > 0 ? numbers : ['']);

    setSelectedAlertItem(item);
    setAlertConfig({
      is_enabled: existing?.is_enabled ?? true,
      alert_on_error: existing?.alert_on_error ?? true,
      alert_on_delay: existing?.alert_on_delay ?? false,
      alert_daily_report: existing?.alert_daily_report ?? false,
      expected_refresh_time: existing?.expected_refresh_time || '08:00',
      daily_report_time: existing?.daily_report_time || '07:00',
      whatsapp_numbers: existing?.whatsapp_numbers || '',
    });
    setShowAlertModal(true);
  }

  function addPhoneNumber() {
    setPhoneNumbers(prev => [...prev, '']);
  }

  function removePhoneNumber(index: number) {
    setPhoneNumbers(prev => prev.filter((_, i) => i !== index));
  }

  function updatePhoneNumber(index: number, value: string) {
    setPhoneNumbers(prev => prev.map((n, i) => i === index ? value : n));
  }

  async function saveRefreshAlert() {
    if (!selectedAlertItem || !activeGroup?.id) return;
    const numbers = phoneNumbers.map(n => n.trim()).filter(Boolean);
    if (numbers.length === 0) {
      alert('Informe pelo menos um número de WhatsApp');
      return;
    }

    setSavingAlert(true);
    try {
      const res = await fetch('/api/powerbi/refresh-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: activeGroup.id,
          refresh_order_item_id: selectedAlertItem.id,
          item_name: selectedAlertItem.name,
          item_type: selectedAlertItem.type,
          dataset_id: selectedAlertItem.type === 'dataset' ? selectedAlertItem.dataset_id : null,
          dataflow_id: selectedAlertItem.type === 'dataflow' ? selectedAlertItem.dataflow_id : null,
          connection_id: selectedAlertItem.connection_id,
          ...alertConfig,
          whatsapp_numbers: numbers.join(', '),
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      await loadRefreshAlerts();
      setShowAlertModal(false);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setSavingAlert(false);
    }
  }

  async function removeRefreshAlert() {
    if (!selectedAlertItem) return;
    const itemId = selectedAlertItem.type === 'dataset' ? selectedAlertItem.dataset_id : selectedAlertItem.dataflow_id;
    const key = `${selectedAlertItem.type}-${itemId}`;
    const existing = refreshAlerts[key];
    if (!existing) return;

    if (!confirm('Remover monitoramento deste item?')) return;

    try {
      const res = await fetch(`/api/powerbi/refresh-alerts?id=${existing.id}`, { method: 'DELETE' });
      if (res.ok) {
        await loadRefreshAlerts();
        setShowAlertModal(false);
      }
    } catch (error) {
      console.error('Erro ao remover alerta:', error);
    }
  }

  function hasActiveAlert(item: RefreshItem): boolean {
    const itemId = item.type === 'dataset' ? item.dataset_id : item.dataflow_id;
    const key = `${item.type}-${itemId}`;
    return !!refreshAlerts[key]?.is_enabled;
  }

  async function saveOrder() {
    if (!activeGroup?.id || items.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/powerbi/refresh-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: activeGroup.id,
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
              i === index ? {
                ...it,
                status: 'success' as const,
                lastRefreshStatus: 'Completed' as const,
                lastRefresh: statusData.endTime || statusData.startTime || new Date().toISOString()
              } : it
            ));
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
        i === index ? {
          ...it,
          status: 'success' as const,
          lastRefreshStatus: 'Completed' as const,
          lastRefresh: new Date().toISOString()
        } : it
      ));
      return true;

    } catch (error: any) {
      console.error(`Erro ao atualizar ${item.name}:`, error);
      setItems(prev => prev.map((it, i) =>
        i === index ? {
          ...it,
          status: 'error' as const,
          lastRefreshStatus: 'Failed' as const,
          lastRefresh: new Date().toISOString(),
          errorMessage: error.message
        } : it
      ));
      return false;
    }
  }

  async function refreshAllInOrder() {
    if (refreshingAll || items.length === 0) return;
    setRefreshingAll(true);
    setRefreshProgress({
      active: true,
      current: 0,
      total: items.length,
      currentName: items[0]?.name || '',
      completed: 0,
      failed: 0,
      succeeded: 0,
    });

    let succeeded = 0;
    let failed = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      setRefreshProgress(prev => ({
        ...prev,
        current: i,
        currentName: item?.name || '',
      }));

      refreshContext?.addRefresh({
        screenId: item.id,
        screenName: item.name,
        status: 'refreshing',
        startedAt: new Date(),
      });

      const success = await refreshItem(i);

      refreshContext?.updateRefresh(item.id, success ? 'success' : 'error');

      if (success) {
        succeeded++;
      } else {
        failed++;
      }

      setRefreshProgress(prev => ({
        ...prev,
        completed: i + 1,
        succeeded,
        failed,
      }));
    }

    setRefreshProgress(prev => ({
      ...prev,
      active: false,
      completed: items.length,
    }));
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
    if (!selectedItemForSchedule || !activeGroup?.id) return;
    
    try {
      const res = await fetch('/api/powerbi/refresh-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_group_id: activeGroup.id,
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

  function getTypeIcon(type: string) {
    return type === 'dataflow' 
      ? <Database size={18} className="text-purple-500" />
      : <BarChart3 size={18} className="text-blue-500" />;
  }

  function getTypeLabel(type: string) {
    return type === 'dataflow' ? 'Fluxo de Dados' : 'Modelo Semântico';
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

  if (!activeGroup?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-amber-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Selecione um grupo</h2>
        <p className="text-gray-500 mb-4 text-center max-w-sm">
          Escolha um grupo na barra superior para visualizar e gerenciar a ordem de atualização dos datasets e dataflows.
        </p>
        <p className="text-sm text-gray-400">A opção &quot;Todos&quot; não é válida para esta tela.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordem de Atualização</h1>
          <p className="text-gray-500">Defina a sequência de atualização dos dados do Power BI</p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={openAddModal}
            variant="secondary"
            icon={<Plus size={18} />}
          >
            Adicionar Item
          </Button>

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
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <Database size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{items.length}</p>
              <p className="text-xs text-gray-500">Total de itens</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {items.filter(i => i.lastRefreshStatus === 'Completed' || i.lastRefreshStatus === 'Success').length}
              </p>
              <p className="text-xs text-gray-500">Atualizados</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
              <XCircle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">
                {items.filter(i => i.lastRefreshStatus === 'Failed').length}
              </p>
              <p className="text-xs text-gray-500">Com erro</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock size={20} className="text-gray-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-500">
                {items.filter(i => !i.lastRefreshStatus || i.lastRefreshStatus === 'Unknown').length}
              </p>
              <p className="text-xs text-gray-500">Sem info</p>
            </div>
          </div>
        </div>
      )}

      {/* Barra de Progresso */}
      {(refreshingAll || refreshProgress.active) && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 size={18} className="animate-spin text-blue-600" />
              <span className="font-medium text-gray-900">
                Atualizando: {refreshProgress.currentName}
              </span>
            </div>
            <span className="text-sm text-gray-500">
              {refreshProgress.completed} de {refreshProgress.total}
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-gradient-to-r from-blue-500 to-blue-600"
              style={{
                width: `${refreshProgress.total > 0
                  ? (refreshProgress.completed / refreshProgress.total) * 100
                  : 0}%`
              }}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {refreshProgress.succeeded > 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle size={14} /> {refreshProgress.succeeded} concluídos
              </span>
            )}
            {refreshProgress.failed > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <XCircle size={14} /> {refreshProgress.failed} com erro
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={14} /> {Math.max(0, refreshProgress.total - refreshProgress.completed)} restantes
            </span>
          </div>
        </div>
      )}

      {activeGroup?.id && (
        <div className="card-modern overflow-hidden">
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
                  </div>

                  <div className="flex items-center gap-2 min-w-[180px]">
                    {item.lastRefreshStatus === 'Completed' || item.lastRefreshStatus === 'Success' ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={16} className="text-green-500" />
                        <div>
                          <p className="text-xs font-medium text-green-600">Atualizado</p>
                          {item.lastRefresh && (
                            <p className="text-[10px] text-gray-400">{formatDateTime(item.lastRefresh)}</p>
                          )}
                        </div>
                      </div>
                    ) : item.lastRefreshStatus === 'Failed' ? (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={16} className="text-red-500" />
                        <div>
                          <p className="text-xs font-medium text-red-600">Erro</p>
                          {item.lastRefresh && (
                            <p className="text-[10px] text-gray-400">{formatDateTime(item.lastRefresh)}</p>
                          )}
                        </div>
                      </div>
                    ) : item.lastRefreshStatus === 'InProgress' ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 size={16} className="text-blue-500 animate-spin" />
                        <p className="text-xs font-medium text-blue-600">Atualizando...</p>
                      </div>
                    ) : item.status === 'refreshing' ? (
                      <div className="flex items-center gap-1.5">
                        <Loader2 size={16} className="text-blue-500 animate-spin" />
                        <p className="text-xs font-medium text-blue-600">Atualizando...</p>
                      </div>
                    ) : item.status === 'success' ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle size={16} className="text-green-500" />
                        <p className="text-xs font-medium text-green-600">Concluído</p>
                      </div>
                    ) : item.status === 'error' ? (
                      <div className="flex items-center gap-1.5">
                        <XCircle size={16} className="text-red-500" />
                        <p className="text-xs font-medium text-red-600" title={item.errorMessage}>Falhou</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Clock size={16} className="text-gray-300" />
                        <p className="text-xs text-gray-400">Sem info</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openAlertModal(item);
                      }}
                      className={`p-1.5 rounded-lg transition-all ${
                        hasActiveAlert(item)
                          ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      title={hasActiveAlert(item) ? 'Monitoramento ativo' : 'Configurar monitoramento'}
                    >
                      {hasActiveAlert(item) ? <BellRing size={16} /> : <Bell size={16} />}
                    </button>
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
                        refreshItemStatus(index);
                      }}
                      disabled={refreshingStatusIndex === index}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Buscar informações de atualização"
                    >
                      {refreshingStatusIndex === index ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <RefreshCw size={18} />
                      )}
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

      {/* Modal Adicionar Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-gray-900">Adicionar Item</h2>
              <button
                onClick={closeAddModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loadingAvailable ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 size={40} className="animate-spin text-blue-600 mb-4" />
                  <p className="text-gray-500">Sincronizando e carregando itens disponíveis...</p>
                </div>
              ) : availableItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                  <Database size={48} className="mb-4 text-gray-300" />
                  <p className="font-medium">Nenhum item disponível</p>
                  <p className="text-sm mt-1">Configure conexões e sincronize os fluxos de dados do Power BI.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Fluxos de Dados */}
                  {availableItems.some(i => i.type === 'dataflow') && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <Database size={16} className="text-purple-500" />
                        Fluxos de Dados
                      </h3>
                      <div className="space-y-2">
                        {availableItems.filter(i => i.type === 'dataflow').map((item) => {
                          const key = getItemKey(item);
                          const alreadyAdded = items.some(ex => getItemKey(ex) === key);
                          return (
                            <label
                              key={key}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                alreadyAdded ? 'bg-gray-50 border-gray-200 opacity-75 cursor-not-allowed' : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={alreadyAdded || selectedNewItems.has(key)}
                                disabled={alreadyAdded}
                                onChange={() => !alreadyAdded && toggleSelectedItem(key)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              </div>
                              {alreadyAdded && (
                                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                                  Já adicionado
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Modelos Semânticos */}
                  {availableItems.some(i => i.type === 'dataset') && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <BarChart3 size={16} className="text-blue-500" />
                        Modelos Semânticos
                      </h3>
                      <div className="space-y-2">
                        {availableItems.filter(i => i.type === 'dataset').map((item) => {
                          const key = getItemKey(item);
                          const alreadyAdded = items.some(ex => getItemKey(ex) === key);
                          return (
                            <label
                              key={key}
                              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                                alreadyAdded ? 'bg-gray-50 border-gray-200 opacity-75 cursor-not-allowed' : 'hover:bg-gray-50 border-gray-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={alreadyAdded || selectedNewItems.has(key)}
                                disabled={alreadyAdded}
                                onChange={() => !alreadyAdded && toggleSelectedItem(key)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{item.name}</p>
                              </div>
                              {alreadyAdded && (
                                <span className="shrink-0 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
                                  Já adicionado
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {!loadingAvailable && availableItems.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 shrink-0">
                <button
                  onClick={closeAddModal}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  onClick={addSelectedItems}
                  disabled={selectedNewItems.size === 0}
                  icon={<Plus size={16} />}
                >
                  Adicionar Selecionados ({selectedNewItems.size})
                </Button>
              </div>
            )}
          </div>
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

      {/* Modal Alerta de Refresh */}
      {showAlertModal && selectedAlertItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100">
            {/* Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                    <BellRing className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Monitoramento</h3>
                    <p className="text-sm text-gray-600 mt-0.5">{selectedAlertItem.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="p-2 hover:bg-white/60 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Badge limite diário */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <span className="text-sm text-slate-600">Alertas hoje</span>
                <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${
                  dailyUsage.remaining <= 2 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {dailyUsage.used}/{dailyUsage.limit}
                </span>
              </div>

              {/* Números WhatsApp */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <Phone size={16} className="text-green-600" />
                  Números WhatsApp
                </label>
                <div className="space-y-2">
                  {phoneNumbers.map((num, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="tel"
                        value={num}
                        onChange={(e) => updatePhoneNumber(index, e.target.value)}
                        placeholder="5511999999999"
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-400 outline-none transition-shadow"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoneNumber(index)}
                        disabled={phoneNumbers.length === 1}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                        title="Remover"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addPhoneNumber}
                    className="flex items-center gap-2 w-full py-2.5 px-4 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-colors"
                  >
                    <Plus size={18} />
                    Adicionar número
                  </button>
                </div>
              </div>

              {/* Tipos de Alerta */}
              <div>
                <p className="text-sm font-semibold text-gray-800 mb-3">Alertar quando:</p>
                <div className="space-y-2">
                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={alertConfig.alert_on_error}
                      onChange={(e) => setAlertConfig(prev => ({ ...prev, alert_on_error: e.target.checked }))}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">❌ Erro na atualização</span>
                      <p className="text-xs text-gray-500 mt-0.5">Notifica quando a atualização falhar</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={alertConfig.alert_on_delay}
                      onChange={(e) => setAlertConfig(prev => ({ ...prev, alert_on_delay: e.target.checked }))}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">⏰ Não atualizou no horário</span>
                      <p className="text-xs text-gray-500 mt-0.5">Notifica se não atualizou até o horário esperado</p>
                      {alertConfig.alert_on_delay && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Horário esperado:</span>
                          <input
                            type="time"
                            value={alertConfig.expected_refresh_time}
                            onChange={(e) => setAlertConfig(prev => ({ ...prev, expected_refresh_time: e.target.value }))}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={alertConfig.alert_daily_report}
                      onChange={(e) => setAlertConfig(prev => ({ ...prev, alert_daily_report: e.target.checked }))}
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900">📋 Relatório diário</span>
                      <p className="text-xs text-gray-500 mt-0.5">Resumo de status enviado todo dia</p>
                      {alertConfig.alert_daily_report && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-xs text-gray-500">Horário do relatório:</span>
                          <input
                            type="time"
                            value={alertConfig.daily_report_time}
                            onChange={(e) => setAlertConfig(prev => ({ ...prev, daily_report_time: e.target.value }))}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {/* Toggle Ativo */}
              <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">Monitoramento ativo</span>
                <button
                  type="button"
                  onClick={() => setAlertConfig(prev => ({ ...prev, is_enabled: !prev.is_enabled }))}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    alertConfig.is_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                    alertConfig.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <div>
                {refreshAlerts[`${selectedAlertItem.type}-${selectedAlertItem.type === 'dataset' ? selectedAlertItem.dataset_id : selectedAlertItem.dataflow_id}`] && (
                  <button
                    onClick={removeRefreshAlert}
                    className="text-xs text-red-500 hover:text-red-600 underline"
                  >
                    Remover monitoramento
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAlertModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveRefreshAlert}
                  disabled={savingAlert}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {savingAlert && <Loader2 size={14} className="animate-spin" />}
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Painel Lateral de Detalhes */}
      {showDetailsPanel && (
        <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col">
          {/* Header azul */}
          <div className="text-white px-4 h-16 flex items-center justify-between" style={{ backgroundColor: 'var(--color-primary)' }}>
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
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                title="Atualizar agora"
              >
                <Play size={18} />
              </button>
              <button
                onClick={closeDetailsPanel}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
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
  );
}

export default function OrdemAtualizacaoPage() {
  return (
    <MainLayout>
      <OrdemAtualizacaoContent />
    </MainLayout>
  );
}
