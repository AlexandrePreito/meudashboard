'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  X, CheckCircle2, Circle, ChevronRight,
  Users, FolderPlus, Database, FileBarChart, LayoutDashboard, Eye,
  Rocket
} from 'lucide-react';

interface Step {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  buttonLabel: string;
  checkKey: string;
}

const STEPS: Step[] = [
  {
    id: 'groups',
    number: 1,
    title: 'Criar um Grupo',
    description: 'Grupos representam suas empresas clientes. Cada grupo tem suas próprias telas, usuários e configurações.',
    icon: <FolderPlus className="w-5 h-5" />,
    href: '/dev/groups',
    buttonLabel: 'Criar grupo',
    checkKey: 'has_groups',
  },
  {
    id: 'users',
    number: 2,
    title: 'Adicionar Usuários',
    description: 'Cadastre os usuários que vão acessar os dashboards. Defina se são administradores ou visualizadores.',
    icon: <Users className="w-5 h-5" />,
    href: '/dev/usuarios',
    buttonLabel: 'Adicionar usuários',
    checkKey: 'has_users',
  },
  {
    id: 'connections',
    number: 3,
    title: 'Criar Conexão Power BI',
    description: 'Conecte seu workspace do Power BI para importar relatórios automaticamente.',
    icon: <Database className="w-5 h-5" />,
    href: '/powerbi/conexoes',
    buttonLabel: 'Criar conexão',
    checkKey: 'has_connections',
  },
  {
    id: 'reports',
    number: 4,
    title: 'Importar Relatórios',
    description: 'Com a conexão ativa, importe os relatórios do Power BI que deseja compartilhar.',
    icon: <FileBarChart className="w-5 h-5" />,
    href: '/powerbi/relatorios',
    buttonLabel: 'Importar relatórios',
    checkKey: 'has_reports',
  },
  {
    id: 'screens',
    number: 5,
    title: 'Criar Telas',
    description: 'Monte telas combinando relatórios. Cada tela pode ter um ou mais dashboards.',
    icon: <LayoutDashboard className="w-5 h-5" />,
    href: '/powerbi/telas',
    buttonLabel: 'Criar telas',
    checkKey: 'has_screens',
  },
  {
    id: 'permissions',
    number: 6,
    title: 'Liberar Telas para Usuários',
    description: 'Defina quais telas cada usuário pode acessar. Pronto! Seus clientes já podem visualizar.',
    icon: <Eye className="w-5 h-5" />,
    href: '/powerbi/telas',
    buttonLabel: 'Gerenciar acessos',
    checkKey: 'has_permissions',
  },
];

interface GuideSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GuideSidebar({ isOpen, onClose }: GuideSidebarProps) {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    async function loadProgress() {
      setIsLoading(true);
      try {
        const res = await fetch('/api/dev/onboarding-progress', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setCompletedSteps(data.progress || {});
        }
      } catch (err) {
        console.error('Erro ao carregar progresso:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadProgress();
  }, [isOpen]);

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const totalSteps = STEPS.length;
  const progressPercent = Math.round((completedCount / totalSteps) * 100);

  const nextStepIndex = STEPS.findIndex((s) => !completedSteps[s.checkKey]);

  function handleGoToStep(step: Step) {
    onClose();
    router.push(step.href);
  }

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-50 transition-opacity"
        onClick={onClose}
      />

      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Rocket className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Primeiros Passos</h2>
              <p className="text-xs text-gray-500">Configure seu ambiente</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              {isLoading
                ? 'Carregando...'
                : completedCount === totalSteps
                  ? '🎉 Tudo pronto!'
                  : `${completedCount} de ${totalSteps} concluídos`}
            </span>
            {!isLoading && (
              <span className="text-sm font-bold text-blue-600">{progressPercent}%</span>
            )}
          </div>
          <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${isLoading ? 0 : progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {STEPS.map((step, index) => {
              const isCompleted = completedSteps[step.checkKey];
              const isNext = index === nextStepIndex;
              const isPast = index < nextStepIndex || nextStepIndex === -1;

              return (
                <div
                  key={step.id}
                  className={`
                    rounded-xl border transition-all duration-200
                    ${isCompleted
                      ? 'bg-green-50/50 border-green-200'
                      : isNext
                        ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-100'
                        : 'bg-white border-gray-200 opacity-60'
                    }
                  `}
                >
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-green-500" />
                        ) : isNext ? (
                          <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                            {step.number}
                          </div>
                        ) : (
                          <Circle className="w-6 h-6 text-gray-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3
                          className={`text-sm font-semibold ${isCompleted ? 'text-green-700' : isNext ? 'text-gray-900' : 'text-gray-500'}`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-xs mt-0.5 ${isCompleted ? 'text-green-600' : isNext ? 'text-gray-500' : 'text-gray-400'}`}
                        >
                          {isCompleted ? 'Concluído ✓' : step.description}
                        </p>

                        {!isCompleted && (isNext || isPast) && (
                          <button
                            onClick={() => handleGoToStep(step)}
                            className={`
                              mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all
                              ${isNext
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                              }
                            `}
                          >
                            {step.buttonLabel}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div
                        className={`flex-shrink-0 p-2 rounded-lg ${isCompleted ? 'bg-green-100 text-green-600' : isNext ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}
                      >
                        {step.icon}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!isLoading && completedCount === totalSteps && (
            <div className="mt-6 p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h3 className="text-lg font-bold text-green-800">Parabéns!</h3>
              <p className="text-sm text-green-600 mt-1">
                Seu ambiente está configurado. Seus usuários já podem acessar os dashboards!
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-slate-50">
          <p className="text-xs text-gray-400 text-center">
            Dúvidas? Entre em contato pelo{' '}
            <a
              href="https://wa.me/5562982289559?text=Olá!%20Preciso%20de%20ajuda%20para%20configurar%20o%20MeuDashboard."
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              WhatsApp
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
