'use client';

import React, { useState, useEffect, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import {
  IconHeart,
  IconBookmark,
  IconPlus,
  IconCheck,
  IconProps,
} from './icons';
import { ContentItem } from '@/types/content';
import {
  isInWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  getFavorites,
  addToFavorites,
  removeFromFavorites,
} from '@/lib/storage/local-storage-store';

export type IconComponent = React.ComponentType<IconProps>;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconComponent;
  label: string; // Required for accessibility (aria-label)
  title?: string;
  variant?: 'ghost' | 'primary' | 'secondary' | 'glass' | 'circle' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  iconClassName?: string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon: Icon,
    label,
    title,
    variant = 'ghost',
    size = 'md',
    active = false,
    className,
    iconClassName,
    disabled,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const variantClasses = {
    ghost: cn(
      'text-slate-300 hover:text-white hover:bg-white/10',
      active && 'text-primary bg-primary/10'
    ),
    outline: cn(
      'border border-white/20 text-slate-200 hover:border-white/50 hover:bg-white/10',
      active && 'border-primary text-primary bg-primary/10'
    ),
    primary: 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20',
    secondary: 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-md',
    glass: 'bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-black/60 hover:border-white/20',
    circle: 'rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white hover:bg-black/80 hover:scale-105',
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={title || label}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-xl transition-all duration-200 select-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        'active:scale-95 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      <Icon className={cn(iconSizes[size], iconClassName)} />
    </button>
  );
});

export interface NavIconProps {
  icon: IconComponent;
  active?: boolean;
  label?: string;
  className?: string;
}

export function NavIcon({ icon: Icon, active = false, label, className }: NavIconProps) {
  return (
    <Icon
      className={cn(
        'w-5 h-5 transition-transform duration-200',
        active ? 'text-primary scale-110' : 'text-slate-400 group-hover:text-white',
        className
      )}
      aria-hidden={!label}
      aria-label={label}
    />
  );
}

export interface PlayerControlProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconComponent;
  label: string;
  title?: string;
  active?: boolean;
  size?: 'sm' | 'md' | 'lg';
  iconClassName?: string;
}

export const PlayerControl = forwardRef<HTMLButtonElement, PlayerControlProps>(function PlayerControl(
  {
    icon: Icon,
    label,
    title,
    active = false,
    size = 'md',
    className,
    iconClassName,
    disabled,
    ...props
  },
  ref
) {
  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={title || label}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-lg text-white/90 hover:text-white transition-all duration-150',
        'hover:bg-white/10 active:scale-95 select-none',
        'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        'disabled:opacity-40 disabled:pointer-events-none',
        active && 'text-primary bg-primary/20 hover:bg-primary/30',
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <Icon className={cn(iconSizes[size], iconClassName)} />
    </button>
  );
});

export interface FavoriteButtonProps {
  contentId: string;
  initialFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'glass' | 'ghost';
  className?: string;
  onToggle?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  contentId,
  initialFavorited,
  size = 'md',
  variant = 'circle',
  className,
  onToggle,
}: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    if (initialFavorited !== undefined) {
      setIsFav(initialFavorited);
    } else {
      const favs = getFavorites();
      setIsFav(favs.includes(contentId));
    }
  }, [contentId, initialFavorited]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !isFav;
    setIsFav(next);
    if (next) {
      addToFavorites(contentId);
    } else {
      removeFromFavorites(contentId);
    }
    onToggle?.(next);
  };

  const label = isFav ? 'Remove from favorites' : 'Add to favorites';

  return (
    <IconButton
      icon={IconHeart}
      label={label}
      title={label}
      size={size}
      variant={variant}
      active={isFav}
      onClick={handleToggle}
      className={cn(
        'group transition-transform',
        isFav && 'text-red-500 hover:text-red-400',
        className
      )}
      iconClassName={cn(
        'transition-transform duration-200',
        isFav ? 'text-red-500 fill-red-500 scale-110' : 'text-slate-300 group-hover:text-white'
      )}
    />
  );
}

export interface WatchlistButtonProps {
  content: ContentItem;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'circle' | 'glass' | 'ghost' | 'primary';
  showLabel?: boolean;
  className?: string;
  onToggle?: (isInList: boolean) => void;
}

export function WatchlistButton({
  content,
  size = 'md',
  variant = 'circle',
  showLabel = false,
  className,
  onToggle,
}: WatchlistButtonProps) {
  const [inList, setInList] = useState(false);

  useEffect(() => {
    setInList(isInWatchlist(content.id));
  }, [content.id]);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !inList;
    setInList(next);
    if (next) {
      addToWatchlist(content);
    } else {
      removeFromWatchlist(content.id);
    }
    onToggle?.(next);
  };

  const label = inList ? 'Remove from My List' : 'Add to My List';
  const Icon = inList ? IconCheck : IconPlus;

  if (showLabel) {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={handleToggle}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 select-none',
          'focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none active:scale-95',
          inList
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
            : 'bg-white/10 text-white border border-white/15 hover:bg-white/20',
          className
        )}
      >
        <Icon className="w-4 h-4" />
        <span>{inList ? 'In My List' : 'Add to List'}</span>
      </button>
    );
  }

  return (
    <IconButton
      icon={Icon}
      label={label}
      title={label}
      size={size}
      variant={variant}
      active={inList}
      onClick={handleToggle}
      className={cn(
        inList && 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10',
        className
      )}
      iconClassName={inList ? 'text-emerald-400' : undefined}
    />
  );
}
