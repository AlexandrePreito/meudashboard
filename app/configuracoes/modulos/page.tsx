'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useNotification } from '@/hooks/useNotification';
import Notifications from '@/components/ui/Notifications';
import { 
  Loader2,
  BarChart3,
  MessageCircle,
  Bell,
  Bot,
  AlertCircle,
  Search,
  X,
  Building2
} from 'lucide-react';

interface Module {
  id: string;
  name: string;
  display_name: string;
  description: string;
  icon: string;
  sort_order: number;
}

interface CompanyGroup {
  id: string;
  name: string;
}

interface ModuleGroup {
  module_id: string;
  company_group_id: string;
}

const iconMap: Record<string, any> = {
  BarChart3,
  Bell,
  MessageCircle,
  Bot
};

export default function ModulosPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [moduleGroups, setModuleGroups] = useState<ModuleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMaster, setIsMaster] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const { notifications, success, error, removeNotification } = useNotification();

  useEffect(() => {
    checkPermissionAndLoad();
  }, []);

  async function checkPermissionAndLoad() {
    try {
      const userRes = await fetch('/api/auth/me');
      if (userRes.ok) {
        const userData = await userRes.json();
        setIsMaster(userData.user?.is_master || false);
      }

      const [modulesRes, groupsRes, moduleGroupsRes] = await Promise.all([
        fetch('/api/modules'),
        fetch('/api/company-groups'),
        fetch('/api/modules/groups')
      ]);

      if (modulesRes.ok) {
        const data = await modulesRes.json();
        setModules(data.modules || []);
      }

      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }

      if (moduleGroupsRes.ok) {
        const data = await moduleGroupsRes.json();
        setModuleGroups(data.associations || []);
      }
    } catch (err) {
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  }

  function isModuleActiveForGroup(moduleId: string, groupId: string): boolean {
    return moduleGroups.some(
      mg => mg.module_id === moduleId && mg.company_group_id === groupId
    );
  }

  function getActiveGroupsCount(moduleId: string): number {
    return moduleGroups.filter(mg => mg.module_id === moduleId).length;
  }

  function getFilteredGroups(filterTerm: string) {
    if (!filterTerm) return groups;
    const term = filterTerm.toLowerCase();
    return groups.filter(g => g.name.toLowerCase().includes(term));
  }

  async function toggleModuleForGroup(module: Module, groupId: string) {
    if (module.name === 'powerbi') return;

    const isActive = isModuleActiveForGroup(module.id, groupId);
    const updateKey = `${module.id}-${groupId}`;
    setUpdating(updateKey);

    try {
      if (isActive) {
        const res = await fetch(
          `/api/modules/groups?module_id=${module.id}&group_id=${groupId}`,
          { method: 'DELETE' }
        );

        if (res.ok) {
          checkPermissionAndLoad();
          success('Módulo desativado para a empresa', 'Sucesso');
        } else {
          const data = await res.json();
          error(data.error || 'Erro ao desativar', 'Erro');
        }
      } else {
        const res = await fetch('/api/modules/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            module_id: module.id,
            company_group_id: groupId
          })
        });

        if (res.ok) {
          checkPermissionAndLoad();
          success('Módulo ativado para a empresa', 'Sucesso');
        } else {
          const data = await res.json();
          error(data.error || 'Erro ao ativar', 'Erro');
        }
      }
    } catch (err) {
      console.error('Erro:', err);
      error('Erro ao atualizar módulo', 'Erro');
    } finally {
      setUpdating(null);
    }
  }

  function openModal(module: Module) {
    if (module.name === 'powerbi') return;
    setSelectedModule(module);
    setModalSearchTerm('');
  }

  function closeModal() {
    setSelectedModule(null);
    setModalSearchTerm('');
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </MainLayout>
    );
  }

  if (!isMaster) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64">
          <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
          <p className="text-gray-600">Apenas administradores master podem gerenciar módulos.</p>
        </div>
      </MainLayout>
    );
  }

  const filteredGroups = getFilteredGroups(searchTerm);

  return (
    <MainLayout>
      <Notifications notifications={notifications} onRemove={removeNotification} />
      <div className="space-y-6 -mt-12">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Módulos do Sistema</h1>
          <p className="text-gray-500 text-sm mt-1">Configure quais módulos cada empresa pode acessar</p>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Grid de Módulos */}
        {modules.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum módulo encontrado</h3>
            <p className="text-gray-500">Configure os módulos do sistema no banco de dados</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modules.map(module => {
              const Icon = iconMap[module.icon] || BarChart3;
              const isPowerBI = module.name === 'powerbi';
              const activeCount = isPowerBI ? groups.length : getActiveGroupsCount(module.id);

              return (
                <div
                  key={module.id}
                  onClick={() => openModal(module)}
                  className={`bg-white rounded-xl border border-gray-200 p-6 shadow-sm transition-all ${
                    isPowerBI 
                      ? 'cursor-not-allowed opacity-90' 
                      : 'cursor-pointer hover:shadow-md hover:border-blue-300'
                  }`}
                >
                  {/* Ícone e Nome */}
                  <div className="flex flex-col items-center text-center mb-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                      isPowerBI 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gradient-to-br from-green-100 to-green-200 text-green-600'
                    }`}>
                      <Icon size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">{module.display_name}</h3>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-gray-600 text-center mb-4 min-h-[40px]">
                    {module.description}
                  </p>

                  {/* Badge */}
                  <div className="flex justify-center">
                    {isPowerBI ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                        Obrigatório - Todas empresas
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        {activeCount} {activeCount === 1 ? 'empresa ativa' : 'empresas ativas'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = iconMap[selectedModule.icon] || BarChart3;
                  return <Icon size={28} className="text-green-600" />;
                })()}
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedModule.display_name}</h2>
                  <p className="text-sm text-gray-500">{selectedModule.description}</p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Busca no Modal */}
            <div className="p-6 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar empresa..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Lista de Empresas */}
            <div className="flex-1 overflow-y-auto p-6">
              {groups.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Nenhuma empresa encontrada</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {getFilteredGroups(modalSearchTerm).map(group => {
                    const isActive = isModuleActiveForGroup(selectedModule.id, group.id);
                    const updateKey = `${selectedModule.id}-${group.id}`;
                    const isUpdating = updating === updateKey;

                    return (
                      <div
                        key={group.id}
                        className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                          isActive 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Building2 size={20} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                          <span className={`font-medium ${isActive ? 'text-green-900' : 'text-gray-700'}`}>
                            {group.name}
                          </span>
                        </div>
                        
                        <button
                          onClick={() => toggleModuleForGroup(selectedModule, group.id)}
                          disabled={isUpdating}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 ${
                            isActive ? 'bg-green-600' : 'bg-gray-200'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-white mx-auto" />
                          ) : (
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                isActive ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer do Modal */}
            <div className="p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
