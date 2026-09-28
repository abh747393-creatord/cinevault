'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  IconFilter,
  IconSort,
  IconChevronDown,
  IconClose,
} from '@/components/ui/icons';
import { ContentCard } from '@/components/cards/content-card';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';
import { movieboxApi } from '@/lib/api/moviebox-client';
import { getCanonicalTitle } from '@/lib/utils/content-filter';

interface AuthStatus {
  loading: boolean;
  enabled: boolean;
  authenticated: boolean;
  disclaimerAccepted: boolean;
}

export default function MidnightPage() {
  const router = useRouter();

  // 1. Auth & Access Gate State
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

  // 2. Content & Pagination State
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items, setItems] = useState<ContentItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingContent, setLoadingContent] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);

  // 3. Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [langFilter, setLangFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [sortFilter, setSortFilter] = useState('default');
  const [showFilters, setShowFilters] = useState(false);

  // Sentinel ref for infinite scroll & concurrency lock
  const observerTarget = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  // Category definitions (8 categories as required)
  const midnightCategories = [
    { label: '🌙 All Midnight', value: 'all' },
    { label: '🎬 Midnight Movies', value: 'movies' },
    { label: '📺 Midnight Series', value: 'series' },
    { label: '🔥 Erotic Movies', value: 'erotic' },
    { label: '🔞 Adult Anime / Hentai', value: 'anime' },
    { label: '🎙️ Hindi Dubbed', value: 'dubbed' },
    { label: '⚡ Recently Added', value: 'recent' },
    { label: '⭐ Popular', value: 'popular' },
  ];

  // Map raw MovieBox catalog items into CineVault ContentItem objects
  const mapToContentItem = useCallback((it: any): ContentItem => {
    const rawId = it.id?.value || (typeof it.id === 'string' ? it.id : it.subjectId || '');
    const isSeries =
      it.media_type === 'series' ||
      it.type === 'series' ||
      (it.media_type !== 'movie' &&
        it.type !== 'movie' &&
        typeof it.season_count === 'number' &&
        it.season_count > 0);
    const rawTitle = it.title || it.name || 'Untitled';
    const titleLower = rawTitle.toLowerCase();
    const hasHindi =
      titleLower.includes('hindi') ||
      titleLower.includes('dub') ||
      titleLower.includes('tamil') ||
      titleLower.includes('telugu');

    const cleanTitle = getCanonicalTitle(rawTitle);

    const genres = [
      { id: 'g-midnight', name: 'Midnight', slug: 'midnight' },
      {
        id: isSeries ? 'g-tv' : 'g-movie',
        name: isSeries ? 'TV Series' : 'Movie',
        slug: isSeries ? 'tv' : 'movie',
      },
    ];

    const availableAudio = hasHindi
      ? ['Hindi / Regional (Dub)', 'Original Audio']
      : ['Original Audio', 'English Subtitles'];

    const posterUrl = it.poster_url || it.poster || it.cover || '/images/neutral-poster.svg';

    return {
      id: `mb-${rawId}`,
      externalId: String(rawId),
      title: cleanTitle || rawTitle,
      slug: `mb-${rawId}`,
      contentType: isSeries ? 'tv' : 'movie',
      posterUrl,
      backdropUrl: posterUrl,
      description: `${cleanTitle || rawTitle} (${it.year || 'Midnight Edition'})`,
      releaseDate: it.year ? `${it.year}-01-01` : '',
      year: it.year ? parseInt(it.year, 10) || 2024 : 2024,
      genres,
      language: hasHindi ? 'Multi-Dub' : 'Original',
      availableAudio,
      availableSubtitles: ['English', 'Spanish'],
      status: 'released',
    };
  }, []);

  // Check current Midnight access status
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

  // Fetch page of content
  const fetchPage = useCallback(
    async (
      pageNum: number,
      cat: string,
      q: string,
      filters: { type: string; language: string; year: string; sort: string },
      append: boolean = false
    ) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (pageNum === 1) {
        setLoadingContent(true);
        setContentError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams({
          category: cat,
          page: String(pageNum),
          limit: '24',
          type: filters.type,
          language: filters.language,
          year: filters.year,
          sort: filters.sort,
        });
        if (q.trim()) {
          params.set('q', q.trim());
        }

        const res = await fetch(`/api/midnight/content?${params.toString()}`, {
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          const rawItems = data?.items || [];
          const newItems = rawItems.map(mapToContentItem);

          setHasMore(Boolean(data?.hasMore));
          setTotalAvailable(typeof data?.totalAvailable === 'number' ? data.totalAvailable : null);
          setPage(pageNum);

          setItems((prev) => {
            if (!append) return newItems;
            const seen = new Set(prev.map((i) => i.id));
            const additions = newItems.filter((i: ContentItem) => !seen.has(i.id));
            return [...prev, ...additions];
          });
        } else if (res.status === 401 || res.status === 403) {
          checkStatus();
        } else {
          // Fallback to client-side provider fetch if server route fails
          try {
            const clientRes = await movieboxApi.homepage('9', pageNum);
            const rawItems = clientRes?.items || [];
            const newItems = rawItems.map(mapToContentItem);
            setItems((prev) => (append ? [...prev, ...newItems] : newItems));
            setHasMore(false);
          } catch {
            setContentError('Failed to load Midnight catalog from provider.');
          }
        }
      } catch (err) {
        console.error('Midnight fetch error:', err);
        setContentError('Failed to load content. Please check your connection.');
      } finally {
        isFetchingRef.current = false;
        setLoadingContent(false);
        setLoadingMore(false);
      }
    },
    [checkStatus, mapToContentItem]
  );

  // Trigger initial fetch when authenticated or when category / filters / query change
  useEffect(() => {
    if (authStatus.enabled && authStatus.authenticated && authStatus.disclaimerAccepted) {
      setPage(1);
      setHasMore(true);
      fetchPage(
        1,
        selectedCategory,
        submittedQuery,
        { type: typeFilter, language: langFilter, year: yearFilter, sort: sortFilter },
        false
      );
    }
  }, [
    authStatus.enabled,
    authStatus.authenticated,
    authStatus.disclaimerAccepted,
    selectedCategory,
    submittedQuery,
    typeFilter,
    langFilter,
    yearFilter,
    sortFilter,
    fetchPage,
  ]);

  // Infinite Scroll IntersectionObserver
  useEffect(() => {
    if (!hasMore || loadingContent || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !loadingMore &&
          !loadingContent &&
          !isFetchingRef.current
        ) {
          fetchPage(
            page + 1,
            selectedCategory,
            submittedQuery,
            { type: typeFilter, language: langFilter, year: yearFilter, sort: sortFilter },
            true
          );
        }
      },
      { threshold: 0.1, rootMargin: '300px' }
    );

    const el = observerTarget.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [
    hasMore,
    loadingContent,
    loadingMore,
    page,
    selectedCategory,
    submittedQuery,
    typeFilter,
    langFilter,
    yearFilter,
    sortFilter,
    fetchPage,
  ]);

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
    setItems([]);
    router.push('/');
  };

  // Handle Search
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedQuery(searchQuery.trim());
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSubmittedQuery('');
  };

  // Active filters count
  const activeFiltersCount = [
    typeFilter !== 'all',
    langFilter !== 'all',
    yearFilter !== 'all',
    sortFilter !== 'default',
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setTypeFilter('all');
    setLangFilter('all');
    setYearFilter('all');
    setSortFilter('default');
  };

  // Featured Item for Hero Banner
  const featuredItem = useMemo(() => {
    return (
      items.find(
        (m) =>
          m.posterUrl &&
          !m.posterUrl.includes('neutral') &&
          m.title.length < 40
      ) || items[0] || null
    );
  }, [items]);

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
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm sm:max-w-md p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-indigo-950/40 via-card/85 to-card border border-indigo-500/30 backdrop-blur-2xl shadow-2xl space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="relative inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shadow-lg shadow-indigo-600/20">
              <IconMoonStars className="w-7 h-7 sm:w-8 sm:h-8" />
              <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white border border-red-400 shadow-md">
                18+
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-1.5">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                  RESTRICTED SECTION
                </span>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
                  18+ ONLY
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Midnight Access
              </h1>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-sm mx-auto">
                Late-night adult cinema, mature productions, and explicit content. Strictly restricted to viewers aged 18 and older.
              </p>
            </div>
          </div>

          {/* Details Notice Box */}
          <div className="p-3.5 rounded-2xl bg-black/40 border border-red-500/25 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-red-400">
              <IconShieldWarning className="w-4 h-4 shrink-0 text-red-400" />
              <span>Mature & Restricted Catalog Details</span>
            </div>
            <ul className="text-[11px] sm:text-xs text-slate-400 space-y-1.5 pl-1">
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-slate-200">18+ Content Only:</strong> Contains adult themes, romantic thrillers, and uncut cinema.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-slate-200">Passcode Protected:</strong> Requires authorized administrative passcode to view.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1" />
                <span>
                  <strong className="text-slate-200">Age Verification:</strong> Legal age acknowledgment required before streaming.
                </span>
              </li>
            </ul>
          </div>

          {/* Passcode Form */}
          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <IconLock className="w-3.5 h-3.5 text-indigo-400" />
                  Passcode
                </label>
                <span className="text-[10px] text-slate-500 font-medium">Secured with PBKDF2</span>
              </div>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    if (authError) setAuthError(null);
                  }}
                  placeholder="Enter access passcode..."
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
                'Unlock Midnight Vault'
              )}
            </Button>
          </form>

          <div className="text-center pt-1 space-y-2">
            <p className="text-[11px] text-slate-500">
              Need access? Contact your platform admin for passcode.
            </p>
            <div>
              <Link
                href="/"
                className="text-xs text-slate-400 hover:text-white transition-colors font-medium inline-flex items-center gap-1"
              >
                ← Back to CineVault Home
              </Link>
            </div>
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
    <div className="space-y-8 sm:space-y-12 pb-20">
      {/* Top Banner / Hero with Exit Midnight Button */}
      {featuredItem && !submittedQuery && (
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
              <Link
                href={`/${featuredItem.contentType === 'tv' ? 'watch/tv' : 'watch/movie'}/${featuredItem.id}${
                  featuredItem.contentType === 'tv' ? '/s1e1' : ''
                }`}
              >
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
              Late-night cinema, adult thrillers, uncut series, and multi-audio productions.
              {totalAvailable !== null && (
                <span className="text-indigo-400 font-semibold ml-1.5">
                  ({totalAvailable} titles available)
                </span>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Form */}
            <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
              <IconMagnifer className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Midnight..."
                className="w-full h-10 pl-10 pr-9 text-xs rounded-xl bg-white/5 border border-white/10 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white placeholder-slate-400 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
                >
                  <IconClose className="w-3.5 h-3.5" />
                </button>
              )}
            </form>

            {/* Filter Toggle Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-xs border ${
                activeFiltersCount > 0
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                  : 'border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <IconFilter className="w-3.5 h-3.5 text-indigo-400" />
              Filters
              {activeFiltersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

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

        {/* Category Tabs (8 categories) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {midnightCategories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setSelectedCategory(cat.value);
              }}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.value
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filters Bar (Collapsible) */}
        {showFilters && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <IconFilter className="w-4 h-4 text-indigo-400" />
                <span>Filter & Refine Midnight Catalog</span>
              </div>
              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
                >
                  Reset all filters
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Type Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IconClapperboardPlay className="w-3 h-3 text-indigo-400" />
                  Format / Type
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="tv">Series / Web Shows</option>
                  <option value="anime">Anime / Hentai</option>
                </select>
              </div>

              {/* Language Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IconBolt className="w-3 h-3 text-indigo-400" />
                  Language
                </label>
                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  <option value="hindi">Hindi / Regional Dubs</option>
                  <option value="english">English / International</option>
                  <option value="japanese">Japanese / Asian</option>
                </select>
              </div>

              {/* Year Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IconFlame className="w-3 h-3 text-indigo-400" />
                  Release Year
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="all">All Years</option>
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="older">2022 & Older</option>
                </select>
              </div>

              {/* Sort Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <IconSort className="w-3 h-3 text-indigo-400" />
                  Sort By
                </label>
                <select
                  value={sortFilter}
                  onChange={(e) => setSortFilter(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl bg-black/60 border border-white/10 text-white outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="default">Default / Curated</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="title">Title (A - Z)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Active Search Badge */}
        {submittedQuery && (
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-indigo-950/30 border border-indigo-500/20 px-3.5 py-2 rounded-xl">
            <span>
              Searching for: <strong className="text-white">&quot;{submittedQuery}&quot;</strong>
            </span>
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto font-semibold flex items-center gap-1"
            >
              <IconClose className="w-3 h-3" />
              Clear Search
            </button>
          </div>
        )}

        {/* Initial Content Loading State */}
        {loadingContent && (
          <div className="py-24 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-xs font-medium">Loading genuine Midnight catalog...</p>
          </div>
        )}

        {/* Catalog Grid */}
        {!loadingContent && (
          <>
            {items.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-6">
                  {items.map((item) => (
                    <ContentCard key={item.id} content={item} />
                  ))}
                </div>

                {/* Loading More Spinner */}
                {loadingMore && (
                  <div className="py-8 flex flex-col items-center justify-center space-y-2.5">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-xs font-medium">Loading more titles...</p>
                  </div>
                )}

                {/* Fallback Load More Button & Sentinel */}
                {hasMore && !loadingMore && (
                  <div className="flex flex-col items-center justify-center py-6 space-y-3">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() =>
                        fetchPage(
                          page + 1,
                          selectedCategory,
                          submittedQuery,
                          { type: typeFilter, language: langFilter, year: yearFilter, sort: sortFilter },
                          true
                        )
                      }
                      className="px-8 text-xs font-bold border border-white/10 hover:border-indigo-500/50 shadow-lg"
                    >
                      Load More Titles
                    </Button>
                    <span className="text-[11px] text-slate-500">
                      or scroll down to load automatically
                    </span>
                  </div>
                )}

                {/* Infinite Scroll Sentinel */}
                <div ref={observerTarget} className="h-6 w-full pointer-events-none" />

                {/* End of Content Notice */}
                {!hasMore && items.length > 0 && (
                  <div className="py-10 text-center space-y-2 border-t border-white/5">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400">
                      <IconMoonStars className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      You have reached the end of the Midnight catalog in this category.
                    </p>
                  </div>
                )}
              </div>
            ) : contentError ? (
              <div className="py-20 text-center space-y-3 bg-red-950/20 rounded-2xl border border-red-500/20">
                <IconAlertCircle className="w-10 h-10 text-red-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Connection Error</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">{contentError}</p>
                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      fetchPage(
                        1,
                        selectedCategory,
                        submittedQuery,
                        { type: typeFilter, language: langFilter, year: yearFilter, sort: sortFilter },
                        false
                      )
                    }
                    className="text-xs font-semibold"
                  >
                    <IconRefresh className="w-3.5 h-3.5 mr-1.5" />
                    Retry Connection
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center space-y-3 bg-white/5 rounded-2xl border border-white/5">
                <IconMoonStars className="w-10 h-10 text-slate-500 mx-auto" />
                <h3 className="text-sm font-bold text-white">No titles available</h3>
                <p className="text-xs text-slate-400">
                  {submittedQuery
                    ? `No results found for "${submittedQuery}". Try another keyword or reset filters.`
                    : 'No Midnight titles found matching the selected category and filters.'}
                </p>
                {(submittedQuery || activeFiltersCount > 0) && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {submittedQuery && (
                      <Button variant="outline" size="sm" onClick={handleClearSearch} className="text-xs">
                        Clear Search
                      </Button>
                    )}
                    {activeFiltersCount > 0 && (
                      <Button variant="secondary" size="sm" onClick={handleResetFilters} className="text-xs">
                        Reset Filters
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
