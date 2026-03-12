'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Loader2, GripVertical, Tv, Play, Clock, Eye, EyeOff } from 'lucide-react';

interface PageConfig {
  name: string;
  displayName: string;
  is_enabled: boolean;
  display_order: number;
  duration_seconds: number;
}

interface ScreenOption {
  id: string;
  title: string;
}

interface Props {
  userId: string;
  groupId: string;
  userName: string;
  /** Se informado, pula o seletor de tela e carrega as páginas desta tela */
  screenId?: string;
  onClose: () => void;
}

export default function PresentationConfigModal({ userId, groupId, userName, screenId: initialScreenId, onClose }: Props) {
  const [availableScreens, setAvailableScreens] = useState<ScreenOption[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState<string | null>(initialScreenId || null);
  const [pages, setPages] = useState<PageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPages, setLoadingPages] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Carregar lista de telas do usuário no grupo (para o dropdown)
  useEffect(() => {
    async function loadScreens() {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/dev/users/screen-order?user_id=${userId}&group_id=${groupId}`);
        if (res.ok) {
          const data = await res.json();
          const list = (data.screens || []).map((s: any) => ({ id: s.id, title: s.title || s.id }));
          setAvailableScreens(list);
          if (initialScreenId && list.some((s: ScreenOption) => s.id === initialScreenId)) {
            setSelectedScreenId(initialScreenId);
          } else if (!initialScreenId && list.length === 1) {
            setSelectedScreenId(list[0].id);
          }
        } else {
          const data = await res.json();
          setError(data.error || 'Erro ao carregar telas');
        }
      } catch {
        setError('Erro ao carregar');
      } finally {
        setLoading(false);
      }
    }
    loadScreens();
  }, [userId, groupId, initialScreenId]);

  // Quando selecionar uma tela, carregar páginas do relatório + config salva
  useEffect(() => {
    if (!selectedScreenId) {
      setPages([]);
      return;
    }

    async function loadPages() {
      setLoadingPages(true);
      setError('');
      try {
        const [pagesRes, configRes] = await Promise.all([
          fetch(`/api/powerbi/screens/${selectedScreenId}/pages`),
          fetch(`/api/dev/users/presentation?user_id=${userId}&group_id=${groupId}&screen_id=${selectedScreenId}`),
        ]);

        if (!pagesRes.ok) {
          setError('Erro ao carregar páginas do relatório');
          setPages([]);
          return;
        }

        const pagesData = await pagesRes.json();
        const configData = configRes.ok ? await configRes.json() : { pages: [] };
        const savedPages = configData.pages || configData.screens || [];
        const configMap = new Map(savedPages.map((c: any) => [c.page_name || c.name, c]));

        const list: PageConfig[] = (pagesData.pages || []).map((p: any, index: number) => {
          const config = configMap.get(p.name);
          return {
            name: p.name,
            displayName: p.displayName || p.name,
            is_enabled: config?.is_enabled ?? true,
            display_order: config?.display_order ?? index,
            duration_seconds: config?.duration_seconds ?? 10,
          };
        }).sort((a: PageConfig, b: PageConfig) => a.display_order - b.display_order);

        setPages(list);
      } catch {
        setError('Erro ao carregar páginas');
        setPages([]);
      } finally {
        setLoadingPages(false);
      }
    }

    loadPages();
  }, [selectedScreenId, userId, groupId]);

  function togglePage(index: number) {
    const updated = [...pages];
    updated[index].is_enabled = !updated[index].is_enabled;
    setPages(updated);
  }

  function updateDuration(index: number, value: number) {
    const updated = [...pages];
    updated[index].duration_seconds = Math.max(5, Math.min(120, value));
    setPages(updated);
  }

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', '');
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }
    const newPages = [...pages];
    const [dragged] = newPages.splice(draggedIndex, 1);
    newPages.splice(dropIndex, 0, dragged);
    setPages(newPages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleSave() {
    if (!selectedScreenId) return;
    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/dev/users/presentation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          group_id: groupId,
          screen_id: selectedScreenId,
          pages: pages.map((p, index) => ({
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

      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const enabledPages = pages.filter(p => p.is_enabled);
  const totalSeconds = enabledPages.reduce((sum, p) => sum + p.duration_seconds, 0);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Tv className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Modo Apresentação (páginas)</h2>
              <p className="text-sm text-gray-500">{userName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : availableScreens.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500">Nenhuma tela disponível para este usuário no grupo.</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tela do relatório</label>
                <select
                  value={selectedScreenId || ''}
                  onChange={(e) => setSelectedScreenId(e.target.value || null)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Selecione uma tela</option>
                  {availableScreens.map((s) => (
                    <option key={s.id} value={s.id}>{s.title}</option>
                  ))}
                </select>
              </div>

              {!selectedScreenId ? (
                <div className="text-center py-8 text-gray-500 text-sm">
                  Selecione uma tela para configurar as páginas do relatório.
                </div>
              ) : loadingPages ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              ) : pages.length === 0 ? (
                <div className="text-center py-12">
                  <Monitor className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <p className="text-gray-500">Nenhuma página encontrada neste relatório.</p>
                </div>
              ) : (
                <>
                  <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Play className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-700">
                          {enabledPages.length} página{enabledPages.length !== 1 ? 's' : ''} ativa{enabledPages.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <span className="text-sm text-purple-700">
                          Ciclo: {totalMinutes > 0 ? `${totalMinutes}min ` : ''}{remainingSeconds}s
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {pages.map((page, index) => (
                      <div
                        key={page.name}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragLeave={() => setDragOverIndex(null)}
                        onDrop={(e) => handleDrop(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                          draggedIndex === index
                            ? 'opacity-50 border-purple-400 bg-purple-50'
                            : dragOverIndex === index
                            ? 'border-purple-400 bg-purple-50 scale-[1.02]'
                            : page.is_enabled
                            ? 'border-gray-100 bg-white hover:border-gray-200'
                            : 'border-gray-100 bg-gray-50 opacity-60'
                        }`}
                      >
                        <div className="text-gray-400">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          page.is_enabled ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {page.is_enabled ? enabledPages.indexOf(page) + 1 : '-'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${page.is_enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                            {page.displayName}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={5}
                            max={120}
                            value={page.duration_seconds}
                            onChange={(e) => updateDuration(index, parseInt(e.target.value) || 10)}
                            disabled={!page.is_enabled}
                            className="w-14 h-8 text-center text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 disabled:bg-gray-100 disabled:text-gray-400"
                          />
                          <span className="text-xs text-gray-400">seg</span>
                        </div>

                        <button
                          onClick={() => togglePage(index)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            page.is_enabled
                              ? 'text-purple-600 hover:bg-purple-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }`}
                          title={page.is_enabled ? 'Desabilitar' : 'Habilitar'}
                        >
                          {page.is_enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !selectedScreenId || pages.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-medium"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </div>
    </div>
  );
}
