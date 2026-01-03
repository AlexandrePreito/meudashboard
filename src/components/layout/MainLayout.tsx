/**
 * Componente MainLayout - Layout principal do sistema MeuDashboard
 * 
 * Combina os componentes Sidebar e Header para criar o layout base da aplicação.
 * 
 * Estrutura:
 * - Sidebar fixa à esquerda com menu de navegação
 * - Área de conteúdo à direita contendo:
 *   - Header no topo com busca e informações do usuário
 *   - Main com o conteúdo das páginas (children)
 * 
 * Este componente deve ser usado como wrapper principal nas páginas
 * que precisam do layout completo do sistema.
 */

'use client';

import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar fixa à esquerda */}
      <Sidebar />

      {/* Área de conteúdo à direita */}
      <div className="flex flex-col flex-1">
        {/* Header no topo */}
        <Header />

        {/* Main com conteúdo das páginas */}
        <main className="flex-1 p-6 bg-gray-100">
          {children}
        </main>
      </div>
    </div>
  );
}
