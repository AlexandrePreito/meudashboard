/**
 * Componente Sidebar - Menu lateral do sistema MeuDashboard
 * 
 * Exibe o menu de navegação principal com os itens:
 * - Dashboard
 * - Relatórios
 * - Chat IA
 * - Alertas
 * - Configurações
 * 
 * Inclui estados ativos baseados na rota atual e estilização moderna.
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Tipos para os itens do menu
interface MenuItem {
  label: string;
  path: string;
  icon: string;
}

// Array de itens do menu
const menuItems: MenuItem[] = [
  { label: 'Dashboard', path: '/', icon: '📊' },
  { label: 'Relatórios', path: '/relatorios', icon: '📈' },
  { label: 'Chat IA', path: '/chat', icon: '💬' },
  { label: 'Alertas', path: '/alertas', icon: '🔔' },
  { label: 'Configurações', path: '/config', icon: '⚙️' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex flex-col h-screen w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-blue-400">MeuDashboard</h1>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const isActive = pathname === item.path;
          
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                ${isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Rodapé */}
      <div className="px-4 py-4 border-t border-gray-800">
        <p className="text-sm text-gray-400">Logado como: Usuário</p>
      </div>
    </aside>
  );
}
