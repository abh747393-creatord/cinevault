'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { ContentCard } from '@/components/cards/content-card';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';

export default function LatestPage() {
  const latest = [...SEED_CONTENT].sort((a, b) => b.year - a.year || new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime());

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
          <Clock className="w-7 h-7 text-primary" />
          Latest Releases
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Recently added cinema productions, anime episodes, and streaming releases.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {latest.map((item) => (
          <ContentCard key={item.id} content={item} className="w-full" />
        ))}
      </div>
    </div>
  );
}
