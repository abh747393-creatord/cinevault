'use client';

import React from 'react';
import { Flame } from 'lucide-react';
import { ContentCard } from '@/components/cards/content-card';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';

export default function TrendingPage() {
  const trending = [...SEED_CONTENT].sort((a, b) => b.rating - a.rating);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
          <Flame className="w-7 h-7 text-amber-500 fill-amber-500" />
          Trending Content
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          The most popular movies, series, and anime being streamed right now.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {trending.map((item, index) => (
          <div key={item.id} className="relative">
            <div className="absolute -top-3 -left-3 z-20 w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-red-500 text-white font-black text-sm flex items-center justify-center shadow-lg">
              #{index + 1}
            </div>
            <ContentCard content={item} className="w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
