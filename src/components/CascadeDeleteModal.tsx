'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, User, Users, Monitor, Building2, Loader2, Eye, EyeOff, Trash2 } from 'lucide-react';

interface CascadeItem {
  type: string;
  id: string;
  name: string;
  children?: CascadeItem[];
}

interface CascadePreview {
  root: { type: string; id: string; name: string };
  items: CascadeItem[];
  summary: Record<string, number>;
}

interface CascadeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  type: 'developer' | 'group';
  id: string;
  name: string;
}

const typeIcons: Record<string, any> = {
  developer: Building2,
  group: Users,
  user: User,
  screen: Monitor,
};

const typeLabels: Record<string, string> = {
  developer: 'Desenvolvedor',
  group: 'Grupo',
  user: 'Usuario',
  screen: 'Tela',
};

const typeColors: Record<string, string> = {
  developer: 'text-purple-600 bg-purple-100',
  group: 'text-blue-600 bg-blue-100',
  user: 'text-green-600 bg-green-100',
  screen: 'text-cyan-600 bg-cyan-100',
};

function CascadeTree({ items, level = 0 }: { items: CascadeItem[]; level?: number }) {
  return (
    <div className={level > 0 ? 'ml-6 border-l-2 border-gray-200 pl-4' : ''}>
      {items.map((item, index) => {
        const Icon = typeIcons[item.type] || Building2;
        const colorClass = typeColors[item.type] || 'text-gray-600 bg-gray-100';
        
        return (
          <div key={`${item.type}-${item.id}-${index}`} className="py-1">
            <div className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded flex items-center justify-center ${colorClass}`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm text-gray-700">{item.name}</span>
              <span className="text-xs text-gray-400">({typeLabels[item.type]})</span>
            </div>
            {item.children && item.children.length > 0 && (
              <CascadeTree items={item.children} level={level + 1} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CascadeDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  type,
  id,
  name,
}: CascadeDeleteModalProps) {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [preview, setPreview] = useState<CascadePreview | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && id) {
      fetchPreview();
      setPassword('');
      setError('');
    }
  }, [isOpen, id, type]);

  const fetchPreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/cascade-preview?type=${type}&id=${id}`);
      if (!res.ok) {
        throw new Error('Erro ao carregar dados');
      }
      const data = await res.json();
      setPreview(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!password) {
      setError('Digite sua senha para confirmar');
      return;
    }

    setDeleting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/cascade-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Confirmar Exclusao em Cascata</h2>
              <p className="text-sm text-gray-500">Esta acao nao pode ser desfeita</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : preview ? (
            <div className="space-y-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 font-medium">
                  Voce esta prestes a excluir "{name}" e todos os itens relacionados:
                </p>
                {preview.summary && (
                  <div className="mt-2 flex flex-wrap gap-3">
                    {preview.summary.groups !== undefined && preview.summary.groups > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                        {preview.summary.groups} grupo(s)
                      </span>
                    )}
                    {preview.summary.users !== undefined && preview.summary.users > 0 && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
                        {preview.summary.users} usuario(s)
                      </span>
                    )}
                    {preview.summary.screens !== undefined && preview.summary.screens > 0 && (
                      <span className="px-2 py-1 bg-cyan-100 text-cyan-700 rounded text-sm">
                        {preview.summary.screens} tela(s)
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Itens que serao excluidos:</h3>
                <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                  <CascadeTree items={preview.items} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Digite sua senha para confirmar a exclusao:
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Erro ao carregar dados
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !password}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Excluir Tudo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
