'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE_DEFAULT = 20;

interface PaginationProps {
  /** Total de itens (após filtros) */
  totalItems: number;
  /** Página atual (1-based) */
  currentPage: number;
  /** Callback quando mudar de página */
  onPageChange: (page: number) => void;
  /** Itens por página */
  pageSize?: number;
  /** Classe adicional no container */
  className?: string;
}

export default function Pagination({
  totalItems,
  currentPage,
  onPageChange,
  pageSize = PAGE_SIZE_DEFAULT,
  className = '',
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems <= pageSize && currentPage === 1) {
    return (
      <div className={`flex items-center justify-between text-sm text-gray-500 ${className}`}>
        <span>Mostrando {totalItems} {totalItems === 1 ? 'resultado' : 'resultados'}</span>
      </div>
    );
  }

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      if (totalPages > 1) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 text-sm ${className}`}>
      <span className="text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{start}</span> a{' '}
        <span className="font-medium text-gray-700">{end}</span> de{' '}
        <span className="font-medium text-gray-700">{totalItems}</span> resultados
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!canPrev}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {getPageNumbers().map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`min-w-[2rem] h-9 px-2 rounded-lg border transition-colors ${
                p === currentPage
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!canNext}
          className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export const PAGE_SIZE = PAGE_SIZE_DEFAULT;
