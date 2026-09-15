import React from 'react';
import { IconSort, IconRoundSortVertical } from '@/components/ui/icons';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading = false,
  emptyMessage = 'No matching records found.',
  sortKey,
  sortOrder,
  onSort,
  onRowClick,
  className = '',
}: AdminTableProps<T>) {
  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-card border border-white/10 shadow-sm ${className}`}
    >
      <div className="w-full overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02]">
              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    onClick={() => col.sortable && onSort?.(col.key)}
                    className={`px-4 py-3.5 font-semibold text-slate-400 uppercase tracking-wider select-none ${
                      col.sortable ? 'cursor-pointer hover:text-white transition-colors' : ''
                    } ${col.className || ''}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {col.sortable && (
                        <span className="text-slate-500">
                          {isSorted ? (
                            <IconRoundSortVertical
                              className={`w-3.5 h-3.5 text-primary ${
                                sortOrder === 'desc' ? 'rotate-180' : ''
                              }`}
                            />
                          ) : (
                            <IconSort className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skel-col-${cIdx}`} className="px-4 py-3.5">
                      <div className="h-4 bg-white/5 rounded-md w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500 font-medium"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, rIdx) => (
                <tr
                  key={row.id || `row-${rIdx}`}
                  onClick={() => onRowClick?.(row)}
                  className={`group transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={`${row.id || rIdx}-${col.key}`}
                      className={`px-4 py-3.5 text-slate-300 align-middle ${col.className || ''}`}
                    >
                      {col.render ? col.render(row, rIdx) : String(row[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
