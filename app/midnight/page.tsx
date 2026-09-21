'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  IconMoonStars,
  IconLock,
  IconEye,
  IconEyeSlash,
  IconAlertCircle,
  IconShieldWarning,
  IconLogout,
  IconPlay,
  IconMagnifer,
  IconClapperboardPlay,
  IconTV,
  IconFlame,
  IconBolt,
  IconInfoCircle,
  IconRefresh,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { MovieBoxCatalogItem } from '@/lib/api/moviebox-client';
import { getCanonicalTitle } from '@/lib/utils/content-filter';

interface AuthStatus {
  loading: boolean;
  enabled: boolean;
  authenticated: boolean;
  disclaimerAccepted: boolean;
}

export default function MidnightPage() {
  const router = useRouter();

  // Auth & Access Gate State
  const [authStatus, setAuthStatus] = useState<AuthStatus>({
    loading: true,
    enabled: true,
    authenticated: false,
    disclaimerAccepted: false,
  });

  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submittingPasscode, setSubmittingPasscode] = useState(false);
  const [submittingDisclaimer, setSubmittingDisclaimer] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Content Catalog State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [midnightList, setMidnightList] = useState<ContentItem[]>([]);
  const [searchResults, setSearchResults] = useState<ContentItem[] | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [searching, setSearching] = useState(false);

  const midnightCategories = [
    { label: '🌙 All Midnight', value: 'all' },
    { label: '🎬 Midnight Movies', value: 'movies' },
    { label: '📺 Midnight Series', value: 'series' },
    { label: '🎙️ Dubbed & Hindi', value: 'dubbed' },
  ];

  // Map raw MovieBox catalog items into CineVault ContentItem objects
  const mapToContentItem = useCallback((it: MovieBoxCatalogItem): ContentItem => {
    const rawId = it.id.value;
    const isSeries = it.media_type === 'series';
    const titleLower = it.title.toLowerCase();
    const hasHindi =
      titleLower.includes('hindi') ||
      titleLower.includes('dub') ||
      titleLower.includes('tamil') ||
      titleLower.includes('telugu');

    const cleanTitle = getCanonicalTitle(it.title);

    const genres = [
      { id: 'g-midnight', name: 'Midnight', slug: 'midnight' },
      { id: isSeries ? 'g-tv' : 'g-movie', name: isSeries ? 'TV Series' : 'Movie', slug: isSeries ? 'tv' : 'movie' },
    ];

    const availableAudio = hasHindi
      ? ['Hindi / Regional (Dub)', 'Original Audio']
      : ['Original Audio', 'English Subtitles'];

    return {
      id: `mb-${rawId}`,
      externalId: rawId,
      title: cleanTitle || it.title,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl: it.poster_url || '/images/neutral-poster.svg',
      backdropUrl: it.poster_url || '/images/neutral-backdrop.svg',
      description: `${cleanTitle || it.title} (${it.year || 'Midnight Edition'})`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      genres,
      language: hasHindi ? 'Multi-Dub' : 'Original',
      availableAudio,
      availableSubtitles: ['English', 'Spanish'],
      status: 'released',
    };
  }, []);

  // 1. Check current Midnight access status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/midnight/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAuthStatus({
          loading: false,
          enabled: data.enabled ?? true,
          authenticated: Boolean(data.authenticated),
          disclaimerAccepted: Boolean(data.disclaimerAccepted),
        });
      } else {
        setAuthStatus({
          loading: false,
          enabled: true,
          authenticated: false,
          disclaimerAccepted: false,
        });
      }
    } catch {
      setAuthStatus({
        loading: false,
        enabled: true,
        authenticated: false,
        disclaimerAccepted: false,
      });
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // 2. Fetch genuine upstream Midnight content once authenticated AND disclaimer accepted
  const loadContent = useCallback(async () => {
    setLoadingContent(true);
    try {
      const res = await fetch('/api/midnight/content?page=1', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const rawItems = data?.items || [];
        const seenIds = new Set<string>();
        const uniqueItems: ContentItem[] = [];

        for (const item of rawItems) {
          const idVal = item.id?.value;
          if (!idVal || seenIds.has(idVal)) continue;
          seenIds.add(idVal);
          uniqueItems.push(mapToContentItem(item));
        }

        setMidnightList(uniqueItems);
      } else if (res.status === 401 || res.status === 403) {
        // Session expired or disabled
        checkStatus();
      }
    } catch (err) {
      console.error('Failed to load Midnight content:', err);
    } finally {
      setLoadingContent(false);
    }
  }, [checkStatus, mapToContentItem]);

  useEffect(() => {
    if (authStatus.enabled && authStatus.authenticated && authStatus.disclaimerAccepted) {
      loadContent();
    }
  }, [authStatus.enabled, authStatus.authenticated, authStatus.disclaimerAccepted, loadContent]);

  // Handle Passcode Submit
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passcode.trim()) return;

    setSubmittingPasscode(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/midnight/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: passcode.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setPasscode('');
        setAuthStatus((prev) => ({
          ...prev,
          authenticated: true,
          disclaimerAccepted: false,
        }));
      } else {
        setAuthError(data.error || 'Invalid passcode.');
      }
    } catch {
      setAuthError('An error occurred. Please try again.');
    } finally {
      setSubmittingPasscode(false);
    }
  };

  // Handle 18+ Disclaimer Accept
  const handleAcceptDisclaimer = async () => {
    setSubmittingDisclaimer(true);
    try {
      const res = await fetch('/api/midnight/disclaimer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accept: true }),
      });

      if (res.ok) {
        setAuthStatus((prev) => ({
          ...prev,
          disclaimerAccepted: true,
        }));
      } else {
        checkStatus();
      }
    } catch {
      setAuthError('Failed to process confirmation.');
    } finally {
      setSubmittingDisclaimer(false);
    }
  };

  // Handle Exit
  const handleExit = async () => {
    try {
      await fetch('/api/midnight/exit', { method: 'POST' });
    } catch {}
    setAuthStatus({
      loading: false,
      enabled: true,
      authenticated: false,
      disclaimerAccepted: false,
    });
    setMidnightList([]);
    setSearchResults(null);
    router.push('/');
  };

  // Handle Search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/midnight/search?q=${encodeURIComponent(q)}`, { cache: 'no-store' });
      if (res.ok) {
        const results = await res.json();
        const mapped = (results || []).map((it: any) => mapToContentItem(it));
        setSearchResults(mapped);
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Filter items
  const activeItems = searchResults || midnightList;
  const filteredMidnight = useMemo(() => {
    if (selectedCategory === 'all') return activeItems;

    return activeItems.filter((item) => {
      const titleLower = item.title.toLowerCase();
      if (selectedCategory === 'movies') {
        return item.contentType === 'movie';
      }
      if (selectedCategory === 'series') {
        return item.contentType === 'tv';
      }
      if (selectedCategory === 'dubbed') {
        return (
          titleLower.includes('hindi') ||
          titleLower.includes('dub') ||
          titleLower.includes('tamil') ||
          titleLower.includes('telugu') ||
          item.availableAudio?.some((aud) => aud.toLowerCase().includes('dub'))
        );
      }
      return true;
    });
  }, [activeItems, selectedCategory]);

  // Featured Banner Item
  const featuredItem = useMemo(() => {
    return (
      midnightList.find(
        (m) =>
          m.posterUrl &&
          !m.posterUrl.includes('neutral') &&
          m.title.length < 35
      ) || midnightList[0] || null
    );
  }, [midnightList]);

  // ----------------------------------------------------
  // STATE 1: Checking Authentication
  // ----------------------------------------------------
  if (authStatus.loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-medium">Verifying Midnight Access...</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE 2: Midnight Disabled by Admin
  // ----------------------------------------------------
  if (!authStatus.enabled) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mx-auto">
            <IconMoonStars className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Midnight Unavailable</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Midnight is currently unavailable. This section is temporarily disabled by platform administration.
            </p>
          </div>
          <Button
            variant="secondary"
            size="md"
            onClick={() => router.push('/')}
            className="w-full font-semibold text-xs"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE 3: Passcode Required
  // ----------------------------------------------------
  if (!authStatus.authenticated) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-card/80 to-card border border-indigo-500/30 backdrop-blur-2xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-600/20">
              <IconMoonStars className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                RESTRICTED SECTION
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Midnight Access
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Enter the access passcode to unlock this catalog.
              </p>
            </div>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <IconLock className="w-3.5 h-3.5 text-indigo-400" />
                Passcode
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter passcode..."
                  autoFocus
                  required
                  className="w-full h-12 pl-4 pr-11 rounded-xl bg-black/60 border border-indigo-500/30 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-white placeholder-slate-500 text-sm tracking-wider outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-3 p-1.5 text-slate-400 hover:text-white transition-colors"
                >
                  {showPassword ? (
                    <IconEyeSlash className="w-4 h-4" />
                  ) : (
                    <IconEye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-400 animate-shake">
                <IconAlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={submittingPasscode || !passcode.trim()}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
            >
              {submittingPasscode ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : (
                'Continue'
              )}
            </Button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
            >
              ← Back to CineVault Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE 4: 18+ Disclaimer Required (Do NOT render content behind it)
  // ----------------------------------------------------
  if (!authStatus.disclaimerAccepted) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-red-950/40 via-card/90 to-card border border-red-500/30 backdrop-blur-2xl shadow-2xl space-y-6 text-center">
          {/* 18+ Mature Badge */}
          <div className="space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-red-600/20 border-2 border-red-500/50 shadow-xl shadow-red-600/25">
              <span className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">18+</span>
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">
                18+ / Mature Content
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Age Confirmation Required
              </h2>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs sm:text-sm text-slate-300 leading-relaxed text-left space-y-2.5">
            <p className="font-semibold text-white">
              Midnight contains mature content intended only for adults aged 18 and over.
            </p>
            <p className="text-slate-400 text-xs">
              By continuing, you confirm that you are 18 or older and understand that this section may contain mature themes and content.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="secondary"
              size="md"
              onClick={handleExit}
              disabled={submittingDisclaimer}
              className="flex-1 font-semibold text-xs border border-white/10 order-2 sm:order-1"
            >
              Exit
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={handleAcceptDisclaimer}
              disabled={submittingDisclaimer}
              className="flex-1 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 order-1 sm:order-2 flex items-center justify-center gap-2"
            >
              {submittingDisclaimer ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                'I Am 18+ — Continue'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // STATE 5: Full Midnight Content (Protected)
  // ----------------------------------------------------
  return (
    <div className="space-y-8 sm:space-y-12 pb-16">
      {/* Top Banner / Hero with Exit Midnight Button */}
      {featuredItem && !searchResults && (
        <div className="relative w-full h-[40vh] sm:h-[50vh] min-h-[320px] max-h-[500px] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-[0.4] transition-all duration-700"
            style={{ backgroundImage: `url(${featuredItem.backdropUrl || featuredItem.posterUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

          <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 md:px-12 flex flex-col justify-end pb-8 sm:pb-12 z-10 space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30 flex items-center gap-1.5">
                <IconMoonStars className="w-3.5 h-3.5 text-white" />
                MIDNIGHT CINEMA
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-600/30 text-red-300 border border-red-500/40">
                18+ MATURE
              </span>
              <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                {featuredItem.year} • {featuredItem.language}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight line-clamp-2 max-w-3xl">
              {featuredItem.title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 line-clamp-2 max-w-2xl leading-relaxed">
              {featuredItem.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href={`/${featuredItem.contentType === 'tv' ? 'watch/tv' : 'watch/movie'}/${featuredItem.id}${featuredItem.contentType === 'tv' ? '/ep-1' : ''}`}>
                <Button
                  variant="primary"
                  size="md"
                  className="flex items-center gap-2 font-bold px-6 shadow-lg shadow-primary/25"
                >
                  <IconPlay className="w-4 h-4 fill-white" />
                  Watch Now
                </Button>
              </Link>

              <Link href={`/${featuredItem.contentType === 'tv' ? 'tv' : 'movie'}/${featuredItem.slug}`}>
                <Button variant="secondary" size="md" className="flex items-center gap-1.5 text-xs font-semibold">
                  <IconInfoCircle className="w-4 h-4" />
                  Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 space-y-6 sm:space-y-8">
        {/* Header & Controls with Exit Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <IconMoonStars className="w-4 h-4" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Midnight Collection
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Late-night cinema, adult thrillers, and multi-audio productions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="relative w-full sm:w-64">
              <IconMagnifer className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim() && searchResults !== null) {
                    setSearchResults(null);
                  }
                }}
                placeholder="Search Midnight..."
                className="w-full h-10 pl-10 pr-4 text-xs rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-400 outline-none transition-all"
              />
            </form>

            {/* Exit Midnight Action */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExit}
              className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white border border-white/10"
              aria-label="Exit Midnight"
            >
              <IconLogout className="w-3.5 h-3.5 text-red-400" />
              Exit Midnight
            </Button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {midnightCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value);
                setSearchResults(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.value && searchResults === null
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Content Loading State */}
        {loadingContent && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-medium">Loading genuine Midnight catalog...</p>
          </div>
        )}

        {/* Catalog Grid */}
        {!loadingContent && (
          <>
            {filteredMidnight.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-6">
                {filteredMidnight.map((item) => (
                  <ContentCard key={item.id} content={item} />
                ))}
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <IconMoonStars className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">No titles available</h3>
                <p className="text-xs text-slate-400">
                  {searchResults !== null
                    ? `No results found for "${searchQuery}". Try another keyword.`
                    : 'No Midnight titles found in this category.'}
                </p>
                {searchResults !== null && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchResults(null);
                      setSearchQuery('');
                    }}
                    className="text-xs"
                  >
                    Clear Search
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
