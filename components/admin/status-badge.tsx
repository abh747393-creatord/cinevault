import React from 'react';

export type StatusBadgeVariant =
  | 'admin'
  | 'moderator'
  | 'user'
  | 'online'
  | 'offline'
  | 'active'
  | 'inactive'
  | 'healthy'
  | 'degraded'
  | 'failing'
  | 'movie'
  | 'tv'
  | 'anime'
  | '4k'
  | '1080p'
  | '720p'
  | 'default';

interface StatusBadgeProps {
  variant?: StatusBadgeVariant | string;
  label?: string;
  className?: string;
  dot?: boolean;
}

const variantStyles: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  admin: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    border: 'border-rose-500/20',
    dot: 'bg-rose-500',
  },
  moderator: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-500',
  },
  user: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-500/20',
    dot: 'bg-slate-400',
  },
  online: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400 animate-pulse',
  },
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  healthy: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  degraded: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    dot: 'bg-amber-400',
  },
  offline: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
  },
  inactive: {
    bg: 'bg-white/5',
    text: 'text-slate-400',
    border: 'border-white/10',
    dot: 'bg-slate-500',
  },
  failing: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    dot: 'bg-red-500',
  },
  movie: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    dot: 'bg-blue-400',
  },
  tv: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/20',
    dot: 'bg-purple-400',
  },
  anime: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/20',
    dot: 'bg-pink-400',
  },
  '4k': {
    bg: 'bg-amber-500/15',
    text: 'text-amber-300',
    border: 'border-amber-500/30',
    dot: 'bg-amber-400',
  },
  '1080p': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    dot: 'bg-emerald-400',
  },
  '720p': {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    border: 'border-sky-500/20',
    dot: 'bg-sky-400',
  },
  default: {
    bg: 'bg-white/5',
    text: 'text-slate-300',
    border: 'border-white/10',
    dot: 'bg-slate-400',
  },
};

export function StatusBadge({
  variant = 'default',
  label,
  className = '',
  dot = true,
}: StatusBadgeProps) {
  const normalizedKey = variant.toLowerCase();
  const config = variantStyles[normalizedKey] || variantStyles.default;
  const displayLabel = label || variant;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide border uppercase ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />}
      <span>{displayLabel}</span>
    </span>
  );
}
