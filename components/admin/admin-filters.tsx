import React from 'react';
import { IconFilter, IconCalendar } from '@/components/ui/icons';

export type TimeframeFilter = 'today' | '7d' | '30d' | '90d' | 'all';

interface FilterOption<T = string> {
  label: string;
  value: T;
}

interface AdminFiltersProps {
  timeframe?: TimeframeFilter;
  onTimeframeChange?: (tf: TimeframeFilter) => void;
  options?: FilterOption[];
  selectedValue?: string;
  onSelectValue?: (val: string) => void;
  className?: string;
}

const defaultTimeframes: { label: string; value: TimeframeFilter }[] = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'All Time', value: 'all' },
];

export function AdminFilters({
  timeframe,
  onTimeframeChange,
  options,
  selectedValue,
  onSelectValue,
  className = '',
}: AdminFiltersProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2.5 ${className}`}>
      {/* Timeframe Buttons */}
      {timeframe && onTimeframeChange && (
        <div className="flex items-center gap-1 p-1 bg-card border border-white/10 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 pl-2 pr-1 flex items-center gap-1">
            <IconCalendar className="w-3 h-3 text-slate-400" />
            Range:
          </span>
          {defaultTimeframes.map((tf) => (
            <button
              key={tf.value}
              type="button"
              onClick={() => onTimeframeChange(tf.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                timeframe === tf.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tf.label}
            </button>
          ))}
        </div>
      )}

      {/* Category / Option Dropdown or Pills */}
      {options && options.length > 0 && onSelectValue && (
        <div className="flex items-center gap-1 p-1 bg-card border border-white/10 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 pl-2 pr-1 flex items-center gap-1">
            <IconFilter className="w-3 h-3 text-slate-400" />
            Filter:
          </span>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSelectValue(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                selectedValue === opt.value
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
