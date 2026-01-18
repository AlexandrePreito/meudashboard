'use client';

import { useState, useEffect } from 'react';
import { X, Monitor, Loader2, GripVertical, MoveVertical } from 'lucide-react';

interface Screen {
  id: string;
  title: string;
  icon: string;
  display_order: number;
}

interface Props {
  userId: string;
  groupId: string;
  userName: string;
  onClose: () => void;
}

export default function ScreenOrderModal({ userId, groupId, userName, onClose }: Props) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadScreens();
  }, [userId, groupId]);

  async function loadScreens() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-group/screen-order?user_id=${userId}&group_id=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setScreens(data.screens || []);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao carregar telas');
      }
    } catch (err) {
      setError('Erro ao carregar telas');
    } finally {
      setLoading(false);
    }
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

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newScreens = [...screens];
    const [draggedItem] = newScreens.splice(draggedIndex, 1);
    newScreens.splice(dropIndex, 0, draggedItem);
    setScreens(newScreens);
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError('');

      const res = await fetch('/api/admin-group/screen-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          group_id: groupId,
          screen_order: screens.map(s => s.id)
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar');
      }

      alert('Ordem salva com sucesso!');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <MoveVertical className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Ordenar Telas</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : screens.length === 0 ? (
            <div className="text-center py-12">
              <Monitor className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">Nenhuma tela disponível</p>
              <p className="text-sm text-gray-400 mt-1">Este usuário não tem telas associadas</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-5">
                <p className="text-sm text-blue-700">
                  <strong>Dica:</strong> Arraste as telas para reordenar. A primeira será exibida ao fazer login.
                </p>
              </div>
              
              <div className="space-y-2">
                {screens.map((screen, index) => (
                  <div
                    key={screen.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing ${
                      draggedIndex === index
                        ? 'opacity-50 border-blue-400 bg-blue-50'
                        : dragOverIndex === index
                        ? 'border-blue-400 bg-blue-50 scale-[1.02]'
                        : index === 0 
                        ? 'border-blue-400 bg-gradient-to-r from-blue-50 to-indigo-50' 
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {/* Grip */}
                    <div className="text-gray-400">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    {/* Posição */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>

                    {/* Info */}
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || screens.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Ordem'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
