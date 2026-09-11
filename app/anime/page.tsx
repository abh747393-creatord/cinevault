'use client';

import React, { useState, useMemo } from 'react';
import { Sparkles, SlidersHorizontal, Volume2, Subtitles, X } from 'lucide-react';
import { ContentCard } from '@/components/cards/content-card';
import { SearchBar } from '@/components/search/search-bar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';

export default function AnimePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const animeCategories = [
    { label: 'All Anime', value: 'all' },
    { label: 'Trending Anime', value: 'trending' },
    { label: 'Cyberpunk & Sci-Fi', value: 'scifi' },
    { label: 'Fantasy & Magic', value: 'fantasy' },
    { label: 'Action & Martial', value: 'action' },
    { label: 'Dual Audio (Sub/Dub)', value: 'dub' },
  ];

  const filteredAnime = useMemo(() => {
    let list = SEED_CONTENT.filter((c) => c.contentType === 'anime');

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.originalTitle?.toLowerCase().includes(q)
      );
    }

    if (selectedCategory === 'trending') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    } else if (selectedCategory === 'scifi') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'sci-fi'));
    } else if (selectedCategory === 'fantasy') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'fantasy'));
    } else if (selectedCategory === 'action') {
      list = list.filter((a) => a.genres.some((g) => g.slug === 'action'));
    } else if (selectedCategory === 'dub') {
      list = list.filter((a) =>
        a.availableAudio?.some((aud) => aud.toLowerCase().includes('dub'))
      );
    }

    return list;
  }, [selectedCategory, searchQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Anime Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-accent" />
            Anime Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Discover Japanese animation, cyberpunk sagas, and mystical adventures with authentic audio & subtitles.
          </p>
        </div>

        <div className="w-full md:w-72">
          <SearchBar onSearch={setSearchQuery} />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {animeCategories.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-accent text-white shadow-lg shadow-accent/25'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Featured Anime Highlights Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAnime.map((anime) => (
          <div
            key={anime.id}
            className="group relative rounded-2xl bg-card border border-white/10 overflow-hidden shadow-xl hover:border-accent/40 transition-all flex flex-col"
          >
            <div className="relative aspect-video w-full overflow-hidden bg-black">
              <img
                src={anime.backdropUrl}
                alt={anime.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <Badge variant="accent" size="sm">
                  Anime
                </Badge>
                {anime.quality && <Badge variant="quality" size="sm">{anime.quality}</Badge>}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-accent transition-colors">
                    {anime.title}
                  </h3>
                  <span className="text-xs font-semibold text-amber-400">
                    ★ {anime.rating}
                  </span>
                </div>
                {anime.originalTitle && (
                  <p className="text-xs text-slate-400 italic mt-0.5">{anime.originalTitle}</p>
                )}
                <p className="text-xs text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                  {anime.description}
                </p>
              </div>

              {/* Audio & Subtitle Badges */}
              <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-slate-300">
                    <Volume2 className="w-3.5 h-3.5 text-accent" />
                    {anime.availableAudio ? anime.availableAudio.join(' / ') : 'Japanese'}
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <Subtitles className="w-3.5 h-3.5 text-primary" />
                    {anime.availableSubtitles ? `${anime.availableSubtitles.length} Subs` : 'English'}
                  </span>
                </div>

                <a
                  href={`/tv/${anime.slug}`}
                  className="text-xs font-bold text-accent hover:underline"
                >
                  View Episodes →
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
