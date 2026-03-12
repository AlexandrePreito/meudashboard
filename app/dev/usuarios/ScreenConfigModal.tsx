'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Monitor,
  Loader2,
  GripVertical,
  Tv,
  ListOrdered,
  Settings,
  Eye,
  EyeOff,
  ChevronDown,
  Plus,
  Trash2,
  Link2,
  Key,
} from 'lucide-react';

type TabId = 'access' | 'order' | 'presentation' | 'integration' | 'options';

interface Props {
  userId: string;
  groupId: string;
  userName: string;
  userEmail: string;
  onClose: () => void;
  onSaved?: () => void;
}

interface ScreenItem {
  id: string;
  title: string;
  icon?: string;
  display_order?: number;
}

interface PageAccess {
  page_name: string;
  display_name: string;
  is_allowed: boolean;
}

interface PageConfig {
  name: string;
  displayName: string;
  is_enabled: boolean;
  display_order: number;
  duration_seconds: number;
}

const tabs: { id: TabId; label: string; icon: typeof Monitor }[] = [
  { id: 'access', label: 'Acesso', icon: Monitor },
  { id: 'order', label: 'Ordem', icon: ListOrdered },
  { id: 'presentation', label: 'Apresentação', icon: Tv },
  { id: 'options', label: 'Opções', icon: Settings },
  { id: 'integration', label: 'Integração', icon: Link2 },
];

// --- Componente interno: item de tela com nível 2 (páginas)
function ScreenAccessItem({
  screen,
  isEnabled,
  isExpanded,
  pages,
  loadingPages,
  onToggle,
  onExpand,
  onTogglePage,
  onMarkAllPages,
  onUnmarkAllPages,
}: {
  screen: ScreenItem;
  isEnabled: boolean;
  isExpanded: boolean;
  pages: PageAccess[] | undefined;
  loadingPages: boolean;
  onToggle: () => void;
  onExpand: () => void;
  onTogglePage: (pageName: string) => void;
  onMarkAllPages: () => void;
  onUnmarkAllPages: () => void;
}) {
  const allowedCount = pages?.filter((p) => p.is_allowed).length ?? 0;
  const totalCount = pages?.length ?? 0;
  const hasCustomConfig = pages && totalCount > 0 && !pages.every((p) => p.is_allowed);

  return (
    <div
      className={`border rounded-xl transition-all ${
        isEnabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={onToggle}
          className="rounded border-gray-300 text-blue-600 accent-blue-600"
        />
        <span
          className={`flex-1 text-sm font-medium ${isEnabled ? 'text-gray-900' : 'text-gray-400'}`}
        >
          {screen.title}
        </span>
        {isEnabled && hasCustomConfig && (
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
            {allowedCount}/{totalCount} páginas
          </span>
        )}
        {isEnabled && (
          <button
            type="button"
            onClick={onExpand}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Configurar páginas"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>

      {isExpanded && isEnabled && (
        <div className="border-t border-gray-100 bg-gray-50 p-3">
          {loadingPages ? (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Carregando páginas...
            </div>
          ) : pages && pages.length > 0 ? (
            <div className="space-y-1">
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={onMarkAllPages}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Todas
                </button>
                <button
                  type="button"
                  onClick={onUnmarkAllPages}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Nenhuma
                </button>
              </div>
              {pages.map((page) => (
                <label
                  key={page.page_name}
                  className="flex items-center gap-2 py-1 px-2 rounded hover:bg-gray-100 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={page.is_allowed}
                    onChange={() => onTogglePage(page.page_name)}
                    className="rounded border-gray-300 text-blue-600 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">{page.display_name}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">Nenhuma página encontrada neste relatório.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function ScreenConfigModal({
  userId,
  groupId,
  userName,
  userEmail,
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('access');
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // --- Aba 1: Acesso (2 níveis)
  const [allScreens, setAllScreens] = useState<ScreenItem[]>([]);
  const [selectedScreenIds, setSelectedScreenIds] = useState<string[]>([]);
  const [expandedScreenId, setExpandedScreenId] = useState<string | null>(null);
  const [screenPages, setScreenPages] = useState<Record<string, PageAccess[]>>({});
  const [loadingAccess, setLoadingAccess] = useState(true);
  const [loadingPages, setLoadingPages] = useState<string | null>(null);
  const [savingAccess, setSavingAccess] = useState(false);

  // --- Aba 2: Ordem
  const [orderScreens, setOrderScreens] = useState<ScreenItem[]>([]);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [dragOrderIndex, setDragOrderIndex] = useState<number | null>(null);
  const [dragOverOrderIndex, setDragOverOrderIndex] = useState<number | null>(null);

  // --- Aba 3: Apresentação
  const [presentationScreenId, setPresentationScreenId] = useState<string | null>(null);
  const [presentationPages, setPresentationPages] = useState<PageConfig[]>([]);
  const [loadingPresentationPages, setLoadingPresentationPages] = useState(false);
  const [savingPresentation, setSavingPresentation] = useState(false);
  const [dragPageIndex, setDragPageIndex] = useState<number | null>(null);
  const [dragOverPageIndex, setDragOverPageIndex] = useState<number | null>(null);

  // --- Aba 4: Opções
  const [presentationEnabled, setPresentationEnabled] = useState(false);
  // TODO: API para persistir presentationEnabled (coluna presentation_enabled em company_group_members ou user_screen_presentation).

  // --- RLS (na aba Opções)
  const [rlsScreenId, setRlsScreenId] = useState<string | null>(null);
  const [rlsEnabled, setRlsEnabled] = useState(false);
  const [rlsRoleName, setRlsRoleName] = useState('');
  const [rlsCompanyCodes, setRlsCompanyCodes] = useState<string[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // --- Aba Integração (API key Power BI)
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [apiKeyActive, setApiKeyActive] = useState(false);
  const [apiKeyLastUsed, setApiKeyLastUsed] = useState<string | null>(null);
  const [loadingApiKey, setLoadingApiKey] = useState(false);
  const [generatingKey, setGeneratingKey] = useState(false);
  const [copiedM, setCopiedM] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Carregar telas do grupo e IDs com acesso (nível 1)
  useEffect(() => {
    async function load() {
      setLoadingAccess(true);
      setError('');
      try {
        const [screensRes, idsRes] = await Promise.all([
          fetch(`/api/powerbi/screens?group_id=${groupId}`),
          fetch(`/api/powerbi/screens/user-screen-ids?group_id=${groupId}&user_id=${userId}`),
        ]);

        let screenList: ScreenItem[] = [];
        if (screensRes.ok) {
          const d = await screensRes.json();
          screenList = (d.screens || []).map((s: any) => ({
            id: s.id,
            title: s.title || s.id,
            icon: s.icon,
          }));
          setAllScreens(screenList);
        }

        if (idsRes.ok) {
          const d = await idsRes.json();
          const ids = d.screen_ids || [];
          if (ids.length === 0) {
            // Sem config específica = acesso a todas (padrão do sistema)
            setSelectedScreenIds(screenList.map((s: ScreenItem) => s.id));
          } else {
            setSelectedScreenIds(ids);
          }
        }
      } catch {
        setError('Erro ao carregar');
      } finally {
        setLoadingAccess(false);
      }
    }
    load();
  }, [userId, groupId]);

  // Ao expandir uma tela, carregar páginas (nível 2) e merge com page-access
  const loadPagesForScreen = useCallback(
    async (screenId: string) => {
      setLoadingPages(screenId);
      try {
        const [pagesRes, accessRes] = await Promise.all([
          fetch(`/api/powerbi/screens/${screenId}/pages`),
          fetch(
            `/api/dev/users/page-access?user_id=${userId}&screen_id=${screenId}&group_id=${groupId}`
          ),
        ]);
        const pagesData = pagesRes.ok ? await pagesRes.json() : { pages: [] };
        const accessData = accessRes.ok ? await accessRes.json() : { pages: [], has_custom_config: false };
        const savedList = accessData.pages || [];
        const savedMap = new Map(savedList.map((p: any) => [p.page_name, p.is_allowed]));
        const powerBiPages = pagesData.pages || [];

        const merged: PageAccess[] = powerBiPages.map((p: any) => ({
          page_name: p.name,
          display_name: p.displayName || p.name,
          is_allowed: accessData.has_custom_config ? (savedMap.get(p.name) ?? true) : true,
        }));

        setScreenPages((prev) => ({ ...prev, [screenId]: merged }));
      } catch {
        setScreenPages((prev) => ({ ...prev, [screenId]: [] }));
      } finally {
        setLoadingPages(null);
      }
    },
    [userId, groupId]
  );

  useEffect(() => {
    if (expandedScreenId && !screenPages[expandedScreenId] && loadingPages !== expandedScreenId) {
      loadPagesForScreen(expandedScreenId);
    }
  }, [expandedScreenId, screenPages, loadPagesForScreen, loadingPages]);

  // Aba 2: carregar ordem
  useEffect(() => {
    if (activeTab !== 'order') return;
    setLoadingOrder(true);
    fetch(`/api/dev/users/screen-order?user_id=${userId}&group_id=${groupId}`)
      .then((res) => res.json())
      .then((data) => setOrderScreens(data.screens || []))
      .catch(() => setOrderScreens([]))
      .finally(() => setLoadingOrder(false));
  }, [activeTab, userId, groupId]);

  const presentationScreenOptions =
    orderScreens.length > 0
      ? orderScreens
      : allScreens.filter((s) => selectedScreenIds.includes(s.id));

  // Aba 3: carregar páginas da tela selecionada + presentation config + page-access (filtrar por permitidas)
  useEffect(() => {
    if (activeTab !== 'presentation' || !presentationScreenId) {
      setPresentationPages([]);
      return;
    }
    setLoadingPresentationPages(true);
    setError('');
    Promise.all([
      fetch(`/api/powerbi/screens/${presentationScreenId}/pages`),
      fetch(
        `/api/dev/users/presentation?user_id=${userId}&group_id=${groupId}&screen_id=${presentationScreenId}`
      ),
      fetch(
        `/api/dev/users/page-access?user_id=${userId}&screen_id=${presentationScreenId}&group_id=${groupId}`
      ),
    ])
      .then(async ([pagesRes, configRes, accessRes]) => {
        if (!pagesRes.ok) return [];
        const pagesData = await pagesRes.json();
        const configData = configRes.ok ? await configRes.json() : { pages: [] };
        const accessData = accessRes.ok ? await accessRes.json() : { pages: [], has_custom_config: false };
        const saved = configData.pages || configData.screens || [];
        const configMap = new Map(saved.map((c: any) => [c.page_name || c.name, c]));

        let rawPages = (pagesData.pages || []).map((p: any, i: number) => {
          const config = configMap.get(p.name);
          return {
            name: p.name,
            displayName: p.displayName || p.name,
            is_enabled: config?.is_enabled ?? true,
            display_order: config?.display_order ?? i,
            duration_seconds: config?.duration_seconds ?? 10,
          };
        });

        if (accessData.has_custom_config && accessData.pages?.length) {
          const allowedNames = new Set(
            accessData.pages.filter((p: any) => p.is_allowed).map((p: any) => p.page_name)
          );
          rawPages = rawPages.filter((p: any) => allowedNames.has(p.name));
        }

        return rawPages.sort(
          (a: PageConfig, b: PageConfig) => a.display_order - b.display_order
        );
      })
      .then(setPresentationPages)
      .catch(() => setPresentationPages([]))
      .finally(() => setLoadingPresentationPages(false));
  }, [activeTab, presentationScreenId, userId, groupId]);

  const enabledScreens =
    orderScreens.length > 0 ? orderScreens : allScreens.filter((s) => selectedScreenIds.includes(s.id));

  // Carregar config RLS ao selecionar tela na aba Opções
  useEffect(() => {
    if (activeTab !== 'options' || !rlsScreenId) return;

    async function loadRlsConfig() {
      const screenRes = await fetch(`/api/dev/screens/rls?screen_id=${rlsScreenId}`);
      if (screenRes.ok) {
        const data = await screenRes.json();
        setRlsEnabled(data.rls_enabled || false);
        setRlsRoleName(data.rls_role_name || '');
      }
    }

    loadRlsConfig();
  }, [activeTab, rlsScreenId]);

  // Carregar filiais RLS do usuário (global, ao abrir o modal)
  useEffect(() => {
    async function loadRlsCompanies() {
      setLoadingCompanies(true);
      try {
        const res = await fetch(
          `/api/dev/users/rls-companies?user_id=${userId}&group_id=${groupId}`
        );
        if (res.ok) {
          const data = await res.json();
          setRlsCompanyCodes(data.companies || []);
        }
      } catch (e) {
        console.error('Erro ao carregar filiais RLS:', e);
      } finally {
        setLoadingCompanies(false);
      }
    }
    loadRlsCompanies();
  }, [userId, groupId]);

  // Carregar api_key ao abrir a aba Integração
  useEffect(() => {
    if (activeTab !== 'integration') return;
    async function loadApiKey() {
      setLoadingApiKey(true);
      try {
        const res = await fetch(`/api/dev/rls-api-key?group_id=${groupId}`);
        if (res.ok) {
          const data = await res.json();
          setApiKey(data.api_key);
          setApiKeyActive(data.is_active ?? false);
          setApiKeyLastUsed(data.last_used_at ?? null);
        }
      } catch (e) {
        console.error('Erro ao carregar API key:', e);
      } finally {
        setLoadingApiKey(false);
      }
    }
    loadApiKey();
  }, [activeTab, groupId]);

  // --- Handlers Aba 1: Acesso
  function toggleAccessAll(checked: boolean) {
    if (checked) setSelectedScreenIds(allScreens.map((s) => s.id));
    else setSelectedScreenIds([]);
  }

  function toggleAccess(screenId: string) {
    setSelectedScreenIds((prev) =>
      prev.includes(screenId) ? prev.filter((id) => id !== screenId) : [...prev, screenId]
    );
    if (!selectedScreenIds.includes(screenId)) setExpandedScreenId(null);
  }

  function togglePageAccess(screenId: string, pageName: string) {
    setScreenPages((prev) => {
      const list = prev[screenId];
      if (!list) return prev;
      return {
        ...prev,
        [screenId]: list.map((p) =>
          p.page_name === pageName ? { ...p, is_allowed: !p.is_allowed } : p
        ),
      };
    });
  }

  function markAllPagesForScreen(screenId: string, allowed: boolean) {
    setScreenPages((prev) => {
      const list = prev[screenId];
      if (!list) return prev;
      return {
        ...prev,
        [screenId]: list.map((p) => ({ ...p, is_allowed: allowed })),
      };
    });
  }

  async function saveAccess() {
    setSavingAccess(true);
    try {
      const res = await fetch('/api/powerbi/screens/set-user-screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          user_id: userId,
          screen_ids: selectedScreenIds,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      for (const screenId of Object.keys(screenPages)) {
        const pages = screenPages[screenId];
        if (!pages?.length) continue;
        const allAllowed = pages.every((p) => p.is_allowed);
        await fetch('/api/dev/users/page-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            screen_id: screenId,
            group_id: groupId,
            pages: allAllowed ? pages.map((p) => ({ ...p, is_allowed: true })) : pages.map((p) => ({
              page_name: p.page_name,
              display_name: p.display_name,
              is_allowed: p.is_allowed,
            })),
          }),
        });
      }
    } finally {
      setSavingAccess(false);
    }
  }

  // --- Aba 2: Ordem
  function handleOrderDragStart(e: React.DragEvent, index: number) {
    setDragOrderIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }

  function handleOrderDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverOrderIndex(index);
  }

  function handleOrderDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragOrderIndex === null || dragOrderIndex === dropIndex) {
      setDragOrderIndex(null);
      setDragOverOrderIndex(null);
      return;
    }
    const next = [...orderScreens];
    const [dragged] = next.splice(dragOrderIndex, 1);
    next.splice(dropIndex, 0, dragged);
    setOrderScreens(next);
    setDragOrderIndex(null);
    setDragOverOrderIndex(null);
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      const res = await fetch('/api/dev/users/screen-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          group_id: groupId,
          screen_order: orderScreens.map((s) => s.id),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
    } finally {
      setSavingOrder(false);
    }
  }

  // --- Aba 3: Apresentação
  function togglePage(index: number) {
    setPresentationPages((prev) => {
      const next = [...prev];
      next[index].is_enabled = !next[index].is_enabled;
      return next;
    });
  }

  function updatePageDuration(index: number, value: number) {
    setPresentationPages((prev) => {
      const next = [...prev];
      next[index].duration_seconds = Math.max(5, Math.min(120, value));
      return next;
    });
  }

  function handlePageDragStart(e: React.DragEvent, index: number) {
    setDragPageIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }

  function handlePageDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPageIndex(index);
  }

  function handlePageDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragPageIndex === null || dragPageIndex === dropIndex) {
      setDragPageIndex(null);
      setDragOverPageIndex(null);
      return;
    }
    const next = [...presentationPages];
    const [dragged] = next.splice(dragPageIndex, 1);
    next.splice(dropIndex, 0, dragged);
    setPresentationPages(next);
    setDragPageIndex(null);
    setDragOverPageIndex(null);
  }

  async function savePresentation() {
    if (!presentationScreenId) return;
    setSavingPresentation(true);
    try {
      const res = await fetch('/api/dev/users/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          group_id: groupId,
          screen_id: presentationScreenId,
          pages: presentationPages.map((p, index) => ({
            page_name: p.name,
            is_enabled: p.is_enabled,
            display_order: index,
            duration_seconds: p.duration_seconds,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }
    } finally {
      setSavingPresentation(false);
    }
  }

  // --- Aba 4: Opções
  function saveOptions() {
    setError('');
  }

  async function saveRls() {
    if (!rlsScreenId) return;
    const screenRes = await fetch('/api/dev/screens/rls', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        screen_id: rlsScreenId,
        rls_enabled: rlsEnabled,
        rls_role_name: rlsRoleName,
      }),
    });
    if (!screenRes.ok) {
      const data = await screenRes.json();
      throw new Error(data.error || 'Erro ao salvar RLS da tela');
    }
  }

  async function saveRlsCompanies() {
    const codes = rlsCompanyCodes
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const res = await fetch('/api/dev/users/rls-companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        group_id: groupId,
        user_email: userEmail,
        companies: codes,
      }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao salvar filiais');
    }
  }

  async function generateApiKey(action: 'generate' | 'regenerate') {
    setGeneratingKey(true);
    try {
      const res = await fetch('/api/dev/rls-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key);
        setApiKeyActive(true);
        setApiKeyLastUsed(null);
      }
    } catch (e) {
      console.error('Erro ao gerar chave:', e);
    } finally {
      setGeneratingKey(false);
    }
  }

  async function toggleApiKey(active: boolean) {
    try {
      await fetch('/api/dev/rls-api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          action: active ? 'activate' : 'deactivate',
        }),
      });
      setApiKeyActive(active);
    } catch (e) {
      console.error('Erro:', e);
    }
  }

  function getMCode(): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return `let
    Fonte = Json.Document(
        Web.Contents(
            "${baseUrl}/api/public/rls",
            [
                Query = [key = "${apiKey}"],
                ManualStatusHandling = {400, 401, 403, 500}
            ]
        )
    ),
    Tabela = Table.FromList(Fonte, Splitter.SplitByNothing(), null, null, ExtraValues.Error),
    Expandir = Table.ExpandRecordColumn(Tabela, "Column1", {"user_email", "company_code"}, {"Email", "Codigo_Filial"}),
    TipoDefinido = Table.TransformColumnTypes(Expandir, {{"Email", type text}, {"Codigo_Filial", type text}})
in
    TipoDefinido`;
  }

  function copyToClipboard(text: string, type: 'key' | 'm') {
    navigator.clipboard.writeText(text);
    if (type === 'key') {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } else {
      setCopiedM(true);
      setTimeout(() => setCopiedM(false), 2000);
    }
  }

  async function handleSaveCurrentTab() {
    setError('');
    setSaveSuccess('');
    try {
      if (activeTab === 'access') await saveAccess();
      else if (activeTab === 'order') await saveOrder();
      else if (activeTab === 'presentation') await savePresentation();
      else if (activeTab === 'options') {
        await saveRls();
        await saveRlsCompanies();
      }
      onSaved?.();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    }
  }

  const enabledPresentationPages = presentationPages.filter((p) => p.is_enabled);
  const totalSeconds = enabledPresentationPages.reduce((s, p) => s + p.duration_seconds, 0);
  const totalMin = Math.floor(totalSeconds / 60);
  const totalSec = totalSeconds % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl border border-gray-100">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Configurar Telas</h2>
              <p className="text-sm text-gray-500">{userName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}
          {saveSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl text-sm mb-4">
              {saveSuccess}
            </div>
          )}

          {activeTab === 'access' && (
            <>
              {loadingAccess ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : allScreens.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhuma tela no grupo.</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => toggleAccessAll(true)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Marcar todas
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleAccessAll(false)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Desmarcar todas
                    </button>
                  </div>
                  <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                    {allScreens.map((screen) => (
                      <ScreenAccessItem
                        key={screen.id}
                        screen={screen}
                        isEnabled={selectedScreenIds.includes(screen.id)}
                        isExpanded={expandedScreenId === screen.id}
                        pages={screenPages[screen.id]}
                        loadingPages={loadingPages === screen.id}
                        onToggle={() => toggleAccess(screen.id)}
                        onExpand={() =>
                          setExpandedScreenId((id) => (id === screen.id ? null : screen.id))
                        }
                        onTogglePage={(pageName) => togglePageAccess(screen.id, pageName)}
                        onMarkAllPages={() => markAllPagesForScreen(screen.id, true)}
                        onUnmarkAllPages={() => markAllPagesForScreen(screen.id, false)}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'order' && (
            <>
              {loadingOrder ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : orderScreens.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Nenhuma tela com acesso. Configure na aba Acesso.
                </p>
              ) : (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                    <p className="text-sm text-blue-700">
                      <strong>Dica:</strong> Arraste as telas para reordenar. A primeira será
                      exibida ao fazer login.
                    </p>
                  </div>
                  <div className="space-y-2">
                    {orderScreens.map((screen, index) => (
                      <div
                        key={screen.id}
                        draggable
                        onDragStart={(e) => handleOrderDragStart(e, index)}
                        onDragOver={(e) => handleOrderDragOver(e, index)}
                        onDragLeave={() => setDragOverOrderIndex(null)}
                        onDrop={(e) => handleOrderDrop(e, index)}
                        onDragEnd={() => {
                          setDragOrderIndex(null);
                          setDragOverOrderIndex(null);
                        }}
                        className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                          dragOrderIndex === index
                            ? 'opacity-50 border-blue-400 bg-blue-50'
                            : dragOverOrderIndex === index
                              ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                              : index === 0
                                ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50'
                                : 'border-gray-100 bg-white hover:border-gray-200'
                        }`}
                      >
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{screen.title}</p>
                          {index === 0 && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                              ★ Tela inicial
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'presentation' && (
            <>
              {/* Modo Apresentação */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
                <div>
                  <p className="font-medium text-gray-900">Modo Apresentação</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Quando ativado, o botão Play aparece nas telas do Power BI deste usuário
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPresentationEnabled(!presentationEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    presentationEnabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      presentationEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tela do relatório
                </label>
                <select
                  value={presentationScreenId || ''}
                  onChange={(e) => setPresentationScreenId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione uma tela</option>
                  {presentationScreenOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>
              {!presentationScreenId ? (
                <p className="text-gray-500 text-sm py-4">
                  Selecione uma tela para configurar as páginas do relatório.
                </p>
              ) : loadingPresentationPages ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : presentationPages.length === 0 ? (
                <p className="text-gray-500 py-8">
                  Nenhuma página encontrada ou permitida neste relatório.
                </p>
              ) : (
                <>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-purple-700">
                        {enabledPresentationPages.length} página(s) ativa(s)
                      </span>
                      <span className="text-sm text-purple-700">
                        Ciclo: {totalMin > 0 ? `${totalMin}min ` : ''}{totalSec}s
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {presentationPages.map((page, index) => (
                      <div
                        key={page.name}
                        draggable
                        onDragStart={(e) => handlePageDragStart(e, index)}
                        onDragOver={(e) => handlePageDragOver(e, index)}
                        onDragLeave={() => setDragOverPageIndex(null)}
                        onDrop={(e) => handlePageDrop(e, index)}
                        onDragEnd={() => {
                          setDragPageIndex(null);
                          setDragOverPageIndex(null);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                          dragPageIndex === index
                            ? 'opacity-50 border-purple-400 bg-purple-50'
                            : dragOverPageIndex === index
                              ? 'border-purple-400 bg-purple-50 scale-[1.02]'
                              : page.is_enabled
                                ? 'border-gray-100 bg-white hover:border-gray-200'
                                : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                      >
                        <GripVertical className="w-5 h-5 text-gray-400" />
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                            page.is_enabled ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
                          }`}
                        >
                          {page.is_enabled
                            ? enabledPresentationPages.indexOf(page) + 1
                            : '-'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm truncate ${page.is_enabled ? 'text-gray-900' : 'text-gray-400'}`}
                          >
                            {page.displayName}
                          </p>
                        </div>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={page.duration_seconds}
                          onChange={(e) =>
                            updatePageDuration(index, parseInt(e.target.value) || 10)
                          }
                          disabled={!page.is_enabled}
                          className="w-14 h-8 text-center text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-100"
                        />
                        <span className="text-xs text-gray-400">seg</span>
                        <button
                          type="button"
                          onClick={() => togglePage(index)}
                          className={`p-1.5 rounded-lg ${page.is_enabled ? 'text-purple-600 hover:bg-purple-50' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          {page.is_enabled ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {activeTab === 'integration' && (
            <div className="space-y-6 py-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>Integração Power BI</strong> — Gere uma chave de API para conectar o Power
                  BI à tabela de filiais (RLS). O código M já vem pronto para copiar e colar no
                  Editor Avançado do Power Query.
                </p>
              </div>

              {loadingApiKey ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : !apiKey ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 font-medium mb-2">Nenhuma chave de API gerada</p>
                  <p className="text-sm text-gray-500 mb-4">
                    Gere uma chave para habilitar a integração com o Power BI
                  </p>
                  <button
                    type="button"
                    onClick={() => generateApiKey('generate')}
                    disabled={generatingKey}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium"
                  >
                    {generatingKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Key className="w-4 h-4" />
                    )}
                    Gerar Chave de API
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${apiKeyActive ? 'bg-green-500' : 'bg-red-400'}`}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Chave {apiKeyActive ? 'ativa' : 'desativada'}
                        </p>
                        {apiKeyLastUsed && (
                          <p className="text-xs text-gray-500">
                            Último uso: {new Date(apiKeyLastUsed).toLocaleString('pt-BR')}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleApiKey(!apiKeyActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        apiKeyActive ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          apiKeyActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Chave de API
                    </label>
                    <div className="flex gap-2">
                      <code className="flex-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 font-mono truncate">
                        {apiKey}
                      </code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(apiKey, 'key')}
                        className="px-3 py-2 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors font-medium"
                      >
                        {copiedKey ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            'Regenerar a chave? A chave anterior será invalidada e o Power BI precisará ser atualizado.'
                          )
                        ) {
                          generateApiKey('regenerate');
                        }
                      }}
                      disabled={generatingKey}
                      className="text-xs text-orange-600 hover:underline mt-2"
                    >
                      Regenerar chave
                    </button>
                  </div>

                  {apiKeyActive && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-sm font-medium text-gray-700">
                          Código M (Power Query)
                        </label>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(getMCode(), 'm')}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                        >
                          {copiedM ? '✓ Copiado!' : 'Copiar Código M'}
                        </button>
                      </div>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto whitespace-pre max-h-64 overflow-y-auto">
                        {getMCode()}
                      </pre>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-3">
                        <p className="text-xs text-amber-700">
                          <strong>Como usar:</strong> No Power BI Desktop → Página Inicial → Obter
                          Dados → Consulta em Branco → Editor Avançado → Cole o código acima → OK. A
                          tabela será criada com as colunas <code>Email</code> e{' '}
                          <code>Codigo_Filial</code>. Depois, relacione <code>Codigo_Filial</code> com
                          a coluna de filial do seu modelo.
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'options' && (
            <div className="space-y-6 py-4">
              {/* Seção RLS */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Segurança (RLS)</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tela</label>
                  <select
                    value={rlsScreenId || ''}
                    onChange={(e) => setRlsScreenId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione uma tela para configurar RLS</option>
                    {enabledScreens.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>

                {rlsScreenId && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                      <div>
                        <p className="font-medium text-gray-900">Habilitar RLS nesta tela</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Filtra dados do Power BI com base no email do usuário
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRlsEnabled(!rlsEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          rlsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            rlsEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {rlsEnabled && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome da Role no Power BI <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={rlsRoleName}
                          onChange={(e) => setRlsRoleName(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: RLS_Email"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          Nome exato da role criada no Power BI Desktop
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Filiais / Empresas do usuário (RLS) */}
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">
                  Filiais com Acesso (RLS)
                </h3>
                <p className="text-xs text-gray-500 mb-3">
                  Códigos das filiais/empresas que este usuário pode visualizar no Power BI. Adicione
                  uma filial por linha. Essa configuração vale para todas as telas com RLS ativo.
                </p>

                {loadingCompanies ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {rlsCompanyCodes.map((code, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={code}
                            onChange={(e) =>
                              setRlsCompanyCodes((prev) =>
                                prev.map((c, i) => (i === index ? e.target.value : c))
                              )
                            }
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Ex: 01"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setRlsCompanyCodes((prev) => prev.filter((_, i) => i !== index))
                            }
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRlsCompanyCodes((prev) => [...prev, ''])}
                      className="mt-2 flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar filial
                    </button>
                    <p className="text-xs text-gray-400 mt-2">
                      Os códigos devem corresponder à coluna de filial/empresa no Power BI. Se não
                      houver nenhuma, o usuário não terá restrição por filial.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
          >
            Cancelar
          </button>
          {activeTab !== 'integration' && (
            <button
              onClick={handleSaveCurrentTab}
              disabled={
                (activeTab === 'access' && (savingAccess || loadingAccess)) ||
                (activeTab === 'order' &&
                  (savingOrder || loadingOrder || orderScreens.length === 0)) ||
                (activeTab === 'presentation' &&
                  (savingPresentation ||
                    !presentationScreenId ||
                    presentationPages.length === 0))
              }
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
            >
              {(activeTab === 'access' && savingAccess) ||
              (activeTab === 'order' && savingOrder) ||
              (activeTab === 'presentation' && savingPresentation) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Salvar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
