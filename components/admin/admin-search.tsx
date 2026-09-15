import React, { useState, useEffect, useTransition } from 'react';
import { IconMagnifer, IconCloseCircle } from '@/components/ui/icons';

interface AdminSearchProps {
  value?: string;
  placeholder?: string;
  onSearch: (value: string) => void;
  debounceMs?: number;
  className?: string;
}

export function AdminSearch({
  value: initialValue = '',
  placeholder = 'Search by name, ID, or keywords...',
  onSearch,
  debounceMs = 300,
  className = '',
}: AdminSearchProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      startTransition(() => {
        onSearch(searchTerm);
      });
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [searchTerm, debounceMs, onSearch]);

  const handleClear = () => {
    setSearchTerm('');
    onSearch('');
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <IconMagnifer className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="w-full h-10 pl-10 pr-9 bg-card border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
      />
      {searchTerm && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 p-0.5 text-slate-400 hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <IconCloseCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
