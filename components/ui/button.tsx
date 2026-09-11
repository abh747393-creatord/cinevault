import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, disabled, ...props }, ref) => {
    const variantStyles = {
      primary: 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20',
      secondary: 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10',
      accent: 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/20',
      outline: 'border border-white/20 hover:bg-white/10 text-white',
      ghost: 'hover:bg-white/10 text-slate-300 hover:text-white',
      glass: 'bg-black/60 hover:bg-black/80 text-white backdrop-blur-md border border-white/15',
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs rounded-md font-medium',
      md: 'h-10 px-4 text-sm rounded-lg font-medium',
      lg: 'h-12 px-6 text-base rounded-xl font-semibold',
      icon: 'h-10 w-10 p-0 rounded-lg flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] select-none',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
