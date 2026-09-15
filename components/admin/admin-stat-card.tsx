import React from 'react';
import { IconChartLineUp } from '@/components/ui/icons';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  accentColor?: 'primary' | 'emerald' | 'amber' | 'rose' | 'sky' | 'purple';
  className?: string;
}

const accentMap = {
  primary: 'text-primary bg-primary/10 border-primary/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  sky: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export function AdminStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  accentColor = 'primary',
  className = '',
}: AdminStatCardProps) {
  const accentClass = accentMap[accentColor] || accentMap.primary;

  return (
    <div
      className={`p-5 rounded-2xl bg-card border border-white/10 hover:border-white/20 transition-all flex flex-col justify-between space-y-3 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {value}
          </div>
        </div>

        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${accentClass}`}
        >
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs pt-1 border-t border-white/5">
        {trend ? (
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-bold ${
                trend.isPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
              }`}
            >
              <IconChartLineUp
                className={`w-3 h-3 ${trend.isPositive ? '' : 'rotate-180'}`}
              />
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-slate-500 text-[11px]">
              {trend.label || 'vs last week'}
            </span>
          </div>
        ) : (
          <span className="text-slate-500 text-[11px]">{subtitle || 'Live Telemetry'}</span>
        )}

        {subtitle && trend && (
          <span className="text-slate-400 text-[11px] truncate max-w-[150px]">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
