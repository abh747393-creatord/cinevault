'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { IconShield, IconClapperboard, IconTV, IconShieldWarning } from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';
import { SEED_CONTENT } from '@/lib/data/catalog-seed';
import { isAdultContent } from '@/lib/utils/content-filter';

type TabType = 'all' | 'movies' | 'tv';

export default function AdultPage() {
  const router = useRouter();
  const [isAgeVerified, setIsAgeVerified] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [adultItems, setAdultItems] = useState<ContentItem[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');

  // Check age verification status on mount from local browser session
  useEffect(() => {
    try {
      const verified = sessionStorage.getItem('cinevault_age_gate_verified') === 'true';
      setIsAgeVerified(verified);
    } catch {
      setIsAgeVerified(false);
    }
  }, []);

  // Filter catalog strictly based on verified metadata
  useEffect(() => {
    if (!isAgeVerified) return;

    let isMounted = true;
    setLoading(true);

    // Retrieve verified adult/mature items from seed catalog
    const verifiedSeedAdults = SEED_CONTENT.filter(isAdultContent);

    if (isMounted) {
      setAdultItems(verifiedSeedAdults);
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAgeVerified]);

  const movies = useMemo(() => {
    return adultItems.filter((item) => item.contentType === 'movie');
  }, [adultItems]);

  const tvShows = useMemo(() => {
    return adultItems.filter((item) => item.contentType === 'tv' || item.contentType === 'anime');
  }, [adultItems]);

  const displayedItems = useMemo(() => {
    if (activeTab === 'movies') return movies;
    if (activeTab === 'tv') return tvShows;
    return adultItems;
  }, [activeTab, movies, tvShows, adultItems]);

  const handleConfirmAge = () => {
    try {
      sessionStorage.setItem('cinevault_age_gate_verified', 'true');
    } catch {}
    setIsAgeVerified(true);
  };

  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/');
    }
  };

  // Initial SSR / Hydration placeholder
  if (isAgeVerified === null) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 18+ Age Gate Modal
  if (!isAgeVerified) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-card/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <IconShield className="w-8 h-8" variant="Bold" />
          </div>

          <div className="space-y-3">
            <div className="inline-block px-3 py-1 rounded-full text-xs font-black tracking-widest bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
              18+ CONTENT
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Adult Viewers Only
            </h1>
            <p className="text-sm text-slate-300 max-w-xs mx-auto leading-relaxed">
              This section is intended for adult viewers only.
            </p>
            <p className="text-xs text-slate-400 font-medium">
              You must be 18 or older to continue.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleConfirmAge}
              className="w-full sm:auto text-xs font-bold px-6 py-2.5 shadow-lg shadow-primary/25"
            >
              I&apos;m 18+
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={handleGoBack}
              className="w-full sm:w-auto text-xs font-medium px-6 py-2.5 border border-white/10 hover:bg-white/5"
            >
              Go Back
            </Button>
          </div>

          <p className="text-[10px] text-slate-500 leading-tight">
            Self-attestation for mature content viewing. Local browser session only.
          </p>
        </div>
      </div>
    );
  }

  // Adult Section Catalog Page
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 w-full select-none">
      {/* Page Header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wider bg-red-500/10 border border-red-500/30 text-red-400 uppercase">
            18+ Restricted
          </span>
          <span className="text-xs text-slate-400">
            Isolated Content Catalog
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          18+ Adult
        </h1>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
          Verified mature titles for adult viewers based on official MPAA &apos;R&apos;, NC-17, and TV-MA certifications.
        </p>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'all'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300">
            {adultItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('movies')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'movies'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <IconClapperboard className="w-4 h-4" />
          <span>Movies</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300">
            {movies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('tv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
            activeTab === 'tv'
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          }`}
        >
          <IconTV className="w-4 h-4" />
          <span>TV Shows</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 text-slate-300">
            {tvShows.length}
          </span>
        </button>
      </div>

      {/* Catalog Display */}
      {loading ? (
        <div className="min-h-[40vh] flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === 'tv' && tvShows.length === 0 ? (
        /* Truthful provider limitation notice for TV Shows */
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 rounded-3xl bg-card/40 border border-white/5 text-center space-y-4 max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <IconShieldWarning className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base sm:text-lg font-bold text-white">
              No verified 18+ TV shows available right now.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              The current provider does not expose enough reliable age-rating metadata to safely populate TV shows in this section.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setActiveTab('movies')}
              className="text-xs font-semibold"
            >
              View Verified Movies ({movies.length})
            </Button>
            <Link href="/">
              <Button variant="secondary" size="sm" className="text-xs font-semibold">
                Return to Home
              </Button>
            </Link>
          </div>
        </div>
      ) : displayedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 md:gap-6">
          {displayedItems.map((item) => (
            <ContentCard key={item.id} content={item} />
          ))}
        </div>
      ) : (
        <div className="min-h-[40vh] flex flex-col items-center justify-center p-8 rounded-3xl bg-card/40 border border-white/5 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
            <IconShield className="w-7 h-7 text-slate-500" />
          </div>
          <div className="space-y-1.5 max-w-md">
            <h3 className="text-base sm:text-lg font-bold text-white">
              No verified 18+ content available right now.
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              No titles currently meet the verified 18+ classification from available upstream providers.
            </p>
          </div>
          <Link href="/">
            <Button variant="secondary" size="sm" className="text-xs font-semibold mt-2">
              Return to Home
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
