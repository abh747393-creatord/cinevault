'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { ContentItem } from '@/types/content';
import { ContentCard } from '@/components/cards/content-card';
import { cn } from '@/lib/utils';

interface ContentRowProps {
  title: string;
  items: ContentItem[];
  exploreHref?: string;
  onOpenInfo?: (content: ContentItem) => void;
  className?: string;
}

export function ContentRow({
  title,
  items,
  exploreHref,
  onOpenInfo,
  className,
}: ContentRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (rowRef.current) {
      const { scrollLeft, clientWidth } = rowRef.current;
      const scrollAmount = clientWidth * 0.75;
      rowRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className={cn('relative py-4 group select-none', className)}>
      {/* Row Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 md:px-12 mb-3">
        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
          {title}
        </h3>

        {exploreHref && (
          <Link
            href={exploreHref}
            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors"
          >
            Explore All
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Row Carousel Area */}
      <div className="relative">
        {/* Left Arrow Button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={rowRef}
          className="flex items-start gap-3 sm:gap-4 overflow-x-auto scrollbar-none px-4 sm:px-6 md:px-12 py-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((content) => (
            <ContentCard
              key={content.id}
              content={content}
              onOpenInfo={onOpenInfo}
            />
          ))}
        </div>

        {/* Right Arrow Button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/70 hover:bg-black/90 text-white backdrop-blur-md border border-white/10 hidden md:flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
