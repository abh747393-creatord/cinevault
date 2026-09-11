import React from 'react';
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-white/5 border border-white/5',
        className
      )}
      {...props}
    />
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-40 sm:w-48 md:w-56 space-y-2">
      <Skeleton className="w-full aspect-[2/3] rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <div className="w-full h-[60vh] md:h-[75vh] relative bg-card animate-pulse rounded-2xl overflow-hidden p-6 md:p-12 flex flex-col justify-end space-y-4">
      <Skeleton className="h-10 w-1/3 rounded" />
      <Skeleton className="h-5 w-1/4 rounded" />
      <Skeleton className="h-16 w-2/3 rounded" />
      <div className="flex gap-4">
        <Skeleton className="h-12 w-32 rounded-xl" />
        <Skeleton className="h-12 w-32 rounded-xl" />
      </div>
    </div>
  );
}
