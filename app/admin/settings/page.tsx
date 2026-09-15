'use client';

import React, { useState, useEffect } from 'react';
import {
  IconSettings,
  IconStars,
  IconFilter,
  IconCheckCircle,
  IconAlertTriangle,
  IconTrashBinMinimalistic,
  IconPlus,
  IconRefresh,
  IconBolt,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  HeroSlide,
  DEFAULT_HERO_SLIDES,
  getStoredHeroSlides,
  saveStoredHeroSlides,
  getStoredCustomBlacklist,
  saveStoredCustomBlacklist,
} from '@/lib/store/admin-store';
import { isLegitimateTitle } from '@/lib/utils/content-filter';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'hero' | 'safety' | 'cache'>('general');

  // Platform Settings State
  const [siteName, setSiteName] = useState('CineVault');
  const [tagline, setTagline] = useState('High Performance Cinematic Streaming Platform');
  const [defaultQuality, setDefaultQuality] = useState<'4K' | '1080p' | '720p'>('1080p');
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [isSaved, setIsSaved] = useState(false);

  // Hero Slides State
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DEFAULT_HERO_SLIDES);
  const [showAddSlideModal, setShowAddSlideModal] = useState(false);
  const [newSlideTitle, setNewSlideTitle] = useState('');
  const [newSlideTagline, setNewSlideTagline] = useState('');
  const [newSlideDesc, setNewSlideDesc] = useState('');
  const [newSlideBackdrop, setNewSlideBackdrop] = useState('');
  const [newSlideType, setNewSlideType] = useState<'movie' | 'tv' | 'anime'>('movie');

  // Safety Blacklist State
  const [customBlacklist, setCustomBlacklist] = useState<string[]>([]);
  const [newBlacklistWord, setNewBlacklistWord] = useState('');
  const [simTitle, setSimTitle] = useState('Deadpool & Wolverine');

  // Cache state
  const [cacheFlushed, setCacheFlushed] = useState(false);
  const [flushing, setFlushing] = useState(false);

  useEffect(() => {
    setHeroSlides(getStoredHeroSlides());
    setCustomBlacklist(getStoredCustomBlacklist());
  }, []);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleSlide = (id: string) => {
    const updated = heroSlides.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    setHeroSlides(updated);
    saveStoredHeroSlides(updated);
  };

  const handleDeleteSlide = (id: string) => {
    const updated = heroSlides.filter((s) => s.id !== id);
    setHeroSlides(updated);
    saveStoredHeroSlides(updated);
  };

  const handleCreateSlide = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideTitle) return;

    const newSlide: HeroSlide = {
      id: `hero-${Date.now()}`,
      title: newSlideTitle,
      tagline: newSlideTagline || 'Featured blockbuster on CineVault.',
      description: newSlideDesc || 'Streaming in high definition.',
      backdropUrl: newSlideBackdrop || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1600',
      posterUrl: 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg',
      contentType: newSlideType,
      year: 2024,
      rating: 9.0,
      quality: '4K Ultra HD',
      slug: newSlideTitle.toLowerCase().replace(/\s+/g, '-'),
      active: true,
    };

    const updated = [newSlide, ...heroSlides];
    setHeroSlides(updated);
    saveStoredHeroSlides(updated);
    setShowAddSlideModal(false);
    setNewSlideTitle('');
    setNewSlideTagline('');
    setNewSlideDesc('');
    setNewSlideBackdrop('');
  };

  const handleAddBlacklist = (e: React.FormEvent) => {
    e.preventDefault();
    const word = newBlacklistWord.trim().toLowerCase();
    if (!word || customBlacklist.includes(word)) return;
    const updated = [...customBlacklist, word];
    setCustomBlacklist(updated);
    saveStoredCustomBlacklist(updated);
    setNewBlacklistWord('');
  };

  const handleRemoveBlacklist = (word: string) => {
    const updated = customBlacklist.filter((w) => w !== word);
    setCustomBlacklist(updated);
    saveStoredCustomBlacklist(updated);
  };

  const simulateTitleCheck = (raw: string) => {
    if (!raw.trim()) return { allowed: true, reason: 'Enter title' };
    const lower = raw.toLowerCase();

    for (const word of customBlacklist) {
      if (lower.includes(word)) {
        return { allowed: false, reason: `Blocked by Custom Blacklist ("${word}")` };
      }
    }

    const isLegit = isLegitimateTitle(raw);
    if (!isLegit) {
      return { allowed: false, reason: 'Blocked by Built-in Safety Blacklist' };
    }

    return { allowed: true, reason: 'Passed Safety & Legitimate Title Verification' };
  };

  const handleFlushCache = async () => {
    setFlushing(true);
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'flush_cache' }),
      });
      setCacheFlushed(true);
      setTimeout(() => setCacheFlushed(false), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setFlushing(false);
    }
  };

  const simResult = simulateTitleCheck(simTitle);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconSettings className="w-7 h-7 text-primary" />
            Platform & Governance Settings
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure platform parameters, hero slides, content safety filters, and cache controls.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {[
          { id: 'general', label: 'General Configuration', icon: IconSettings },
          { id: 'hero', label: `Hero Carousel (${heroSlides.filter((s) => s.active).length} Active)`, icon: IconStars },
          { id: 'safety', label: `Safety Blacklist (${customBlacklist.length} Custom)`, icon: IconFilter },
          { id: 'cache', label: 'Cache & Maintenance', icon: IconBolt },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveGeneral} className="p-6 rounded-2xl bg-card border border-white/10 space-y-5 max-w-2xl">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white">Branding & Playback Defaults</h3>
            <p className="text-xs text-slate-400">Global settings applied across customer facing views.</p>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-300">Platform Brand Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full h-9 px-3 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300">Default Streaming Quality</label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value as any)}
                className="w-full h-9 px-2 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="4K" className="bg-[#12161f]">4K Ultra HD (Auto Bitrate)</option>
                <option value="1080p" className="bg-[#12161f]">1080p Full HD (Standard)</option>
                <option value="720p" className="bg-[#12161f]">720p High Definition (Low Data)</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div>
                <span className="text-xs font-bold text-white block">Autoplay Next Episode</span>
                <span className="text-[11px] text-slate-400">Automatically advance to subsequent episodes for series</span>
              </div>
              <input
                type="checkbox"
                checked={autoplayNext}
                onChange={(e) => setAutoplayNext(e.target.checked)}
                className="w-4 h-4 rounded text-primary focus:ring-0"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            {isSaved ? (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <IconCheckCircle className="w-4 h-4" /> Preferences Updated
              </span>
            ) : <span />}

            <Button type="submit" variant="primary" size="sm" className="text-xs font-bold">
              Save Platform Settings
            </Button>
          </div>
        </form>
      )}

      {/* TAB 2: HERO SLIDES */}
      {activeTab === 'hero' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Homepage Hero Carousel Slides</h3>
              <p className="text-xs text-slate-400">Featured cinematic posters taking front stage on the index page.</p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddSlideModal(true)}
              className="gap-1.5 text-xs font-bold"
            >
              <IconPlus className="w-4 h-4" />
              Add Banner Slide
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {heroSlides.map((slide) => (
              <div
                key={slide.id}
                className={`rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  slide.active ? 'bg-card border-white/15' : 'bg-card/40 border-white/5 opacity-60'
                }`}
              >
                <div className="relative h-36 w-full overflow-hidden">
                  <img src={slide.backdropUrl} alt={slide.title} className="w-full h-full object-cover brightness-75" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                  <div className="absolute top-3 left-3">
                    <Badge variant={slide.active ? 'accent' : 'outline'} size="sm">
                      {slide.active ? 'ACTIVE' : 'DISABLED'}
                    </Badge>
                  </div>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white">{slide.title}</h4>
                    <p className="text-xs text-primary font-medium">{slide.tagline}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">{slide.description}</p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleSlide(slide.id)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        slide.active ? 'bg-primary/20 text-primary' : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {slide.active ? 'Disable' : 'Enable'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlide(slide.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Delete Slide"
                    >
                      <IconTrashBinMinimalistic className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SAFETY BLACKLIST */}
      {activeTab === 'safety' && (
        <div className="space-y-6 max-w-3xl">
          <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Title Safety Simulator</h3>
              <p className="text-xs text-slate-400">Test if a movie or show query passes legitimacy and adult content filters.</p>
            </div>

            <input
              type="text"
              value={simTitle}
              onChange={(e) => setSimTitle(e.target.value)}
              placeholder="Test any title (e.g. Loki 7, Deadpool, B-grade film)..."
              className="w-full h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
            />

            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 font-semibold border ${
                simResult.allowed
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
              }`}
            >
              {simResult.allowed ? <IconCheckCircle className="w-4 h-4" /> : <IconAlertTriangle className="w-4 h-4" />}
              {simResult.reason}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Custom Blocked Keywords</h3>
              <p className="text-xs text-slate-400">Add keywords to block mockbusters, pirated rips, and inappropriate content.</p>
            </div>

            <form onSubmit={handleAddBlacklist} className="flex gap-2">
              <input
                type="text"
                value={newBlacklistWord}
                onChange={(e) => setNewBlacklistWord(e.target.value)}
                placeholder="Enter keyword to block..."
                className="flex-1 h-9 px-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
              />
              <Button type="submit" variant="primary" size="sm" className="gap-1 text-xs">
                <IconPlus className="w-3.5 h-3.5" />
                Add Keyword
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 pt-2">
              {customBlacklist.map((word) => (
                <span
                  key={word}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 font-mono"
                >
                  {word}
                  <button
                    type="button"
                    onClick={() => handleRemoveBlacklist(word)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CACHE & MAINTENANCE */}
      {activeTab === 'cache' && (
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4 max-w-2xl">
          <div>
            <h3 className="text-sm font-bold text-white">Cluster Cache Purge</h3>
            <p className="text-xs text-slate-400">
              Clear in-memory provider search buffers, title normalization caches, and stale metadata entries.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5">
              <IconAlertTriangle className="w-4 h-4" /> Note:
            </span>
            <p>
              Flushing the cache will momentarily require providers to make fresh upstream calls on subsequent queries.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-4">
            <Button
              variant="accent"
              size="sm"
              onClick={handleFlushCache}
              disabled={flushing}
              className="gap-2 text-xs font-bold"
            >
              {flushing && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Flush System Cache
            </Button>

            {cacheFlushed && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                <IconCheckCircle className="w-4 h-4" /> Cache Successfully Purged
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
