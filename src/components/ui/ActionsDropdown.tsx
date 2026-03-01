'use client';

import { useState, useRef, useEffect } from 'react';
import { MoreVertical, type LucideIcon } from 'lucide-react';

export interface ActionItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

interface ActionsDropdownProps {
  /** Ações exibidas no dropdown (mobile) */
  actions: ActionItem[];
  /** Conteúdo para desktop (botões individuais) */
  children: React.ReactNode;
  /** Alinhamento: center (padrão), left, right */
  align?: 'center' | 'left' | 'right';
}

const justifyMap = { center: 'justify-center', left: 'justify-start', right: 'justify-end' };

export default function ActionsDropdown({ actions, children, align = 'center' }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`flex items-center gap-2 ${justifyMap[align]}`} ref={ref}>
      {/* Mobile: três pontinhos + dropdown */}
      <div className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Ações"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 min-w-[160px]">
              {actions.map((action, i) => {
                const Icon = action.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={action.disabled}
                    onClick={() => {
                      if (action.disabled) return;
                      action.onClick();
                      setOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${action.className || 'text-gray-700'}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
      {/* Desktop: botões originais */}
      <div className={`hidden md:flex items-center gap-2 ${justifyMap[align]}`}>
        {children}
      </div>
    </div>
  );
}
