/**
 * Componente Header - Cabeçalho do sistema MeuDashboard
 * 
 * Exibe o cabeçalho superior da aplicação com:
 * - Campo de busca no lado esquerdo
 * - Ícone de notificações, avatar e nome do usuário no lado direito
 * 
 * Projetado para ser usado em conjunto com o Sidebar para criar
 * o layout principal do sistema.
 */

'use client';

export default function Header() {
  return (
    <header className="flex justify-between items-center h-16 bg-white shadow-sm px-6">
      {/* Lado esquerdo - Campo de busca */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lado direito - Notificações, Avatar e Nome */}
      <div className="flex items-center gap-4">
        {/* Ícone de notificação */}
        <button
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
          aria-label="Notificações"
        >
          <span className="text-xl">🔔</span>
        </button>

        {/* Avatar e Nome do usuário */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm font-medium">U</span>
          </div>
          <span className="text-gray-700 font-medium">Usuário</span>
        </div>
      </div>
    </header>
  );
}
