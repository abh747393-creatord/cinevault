import React from 'react';
import { IconChevronLeft, IconChevronRight } from '@/components/ui/icons';

interface AdminPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function AdminPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className = '',
}: AdminPaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-card border border-white/10 rounded-2xl text-xs text-slate-400 ${className}`}
    >
      <div className="flex items-center gap-1.5">
        <span>Showing</span>
        <strong className="text-white font-semibold">{startItem}</strong>
        <span>to</span>
        <strong className="text-white font-semibold">{endItem}</strong>
        <span>of</span>
        <strong className="text-white font-semibold">{totalItems}</strong>
        <span>entries</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
          aria-label="Previous Page"
        >
          <IconChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <div className="px-2 font-mono text-slate-300">
          Page {currentPage} / {Math.max(totalPages, 1)}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="flex items-center gap-1 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs font-semibold"
          aria-label="Next Page"
        >
          <span>Next</span>
          <IconChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
