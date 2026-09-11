import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'accent' | 'rating' | 'quality' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'subtle',
  size = 'sm',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary/20 text-primary border-primary/30',
    accent: 'bg-accent/20 text-accent border-accent/30',
    rating: 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-semibold',
    quality: 'bg-white/10 text-white border-white/20 font-bold tracking-wider',
    outline: 'border-white/20 text-slate-300 bg-transparent',
    subtle: 'bg-white/5 text-slate-300 border-white/10',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5 rounded',
    md: 'text-sm px-2.5 py-1 rounded-md',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center font-medium border uppercase tracking-wider backdrop-blur-sm',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
