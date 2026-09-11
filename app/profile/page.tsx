'use client';

import React from 'react';
import Link from 'next/link';
import { User, Clock, CheckCircle2, Bookmark, Settings, Shield, Film } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getStoredWatchlist, getStoredHistory } from '@/lib/storage/local-storage-store';

export default function ProfilePage() {
  const { user } = useAuth();
  const watchlist = getStoredWatchlist();
  const history = getStoredHistory();

  const completedCount = history.filter((h) => h.completed).length;
  const totalSeconds = history.reduce((acc, h) => acc + h.positionSeconds, 0);
  const hoursWatched = Math.round((totalSeconds / 3600) * 10) / 10;

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
        <User className="w-16 h-16 text-slate-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Sign In to View Your Profile</h2>
        <p className="text-xs text-slate-400">
          Create an account or sign in to sync your watch progress, favorites, and preferences across devices.
        </p>
        <Link href="/login">
          <Button variant="primary" size="md">
            Sign In Now
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Profile Header Card */}
      <div className="relative rounded-3xl bg-card border border-white/10 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          {/* Avatar */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl ring-4 ring-primary/30 overflow-hidden bg-primary/20 flex items-center justify-center text-3xl font-black text-white shadow-xl flex-shrink-0">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
            ) : (
              user.displayName.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                {user.displayName}
              </h1>
              <Badge variant={user.role === 'admin' ? 'accent' : 'primary'} size="sm">
                {user.role.toUpperCase()}
              </Badge>
            </div>

            <p className="text-xs text-slate-400">@{user.username} • {user.email}</p>
            <p className="text-xs text-slate-500">
              Member since {new Date(user.createdAt).toLocaleDateString()}
            </p>

            <div className="pt-3 flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <Link href="/settings">
                <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
                  <Settings className="w-3.5 h-3.5" />
                  Account Settings
                </Button>
              </Link>

              {user.role === 'admin' && (
                <Link href="/admin">
                  <Button variant="accent" size="sm" className="gap-1.5 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    Admin Panel
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Viewing Statistics */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">Streaming Activity</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Time Watched</span>
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{hoursWatched} hrs</p>
            <p className="text-[11px] text-slate-500">Recorded viewing time</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">Titles Completed</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{completedCount}</p>
            <p className="text-[11px] text-slate-500">Completed at least 90%</p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-semibold">In Watchlist</span>
              <Bookmark className="w-4 h-4 text-accent" />
            </div>
            <p className="text-2xl sm:text-3xl font-black text-white">{watchlist.length}</p>
            <p className="text-[11px] text-slate-500">Saved for later</p>
          </div>
        </div>
      </div>

      {/* Genre Affinity & Viewing Analytics */}
      <div className="p-6 rounded-3xl bg-card border border-white/10 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Film className="w-4 h-4 text-primary" />
          Genre Affinity & Watch Breakdown
        </h3>
        <div className="space-y-3 pt-2">
          {[
            { name: 'Sci-Fi & Cyberpunk', pct: 45, color: 'bg-primary' },
            { name: 'Action & Adventure', pct: 28, color: 'bg-accent' },
            { name: 'Animation & Anime', pct: 18, color: 'bg-amber-400' },
            { name: 'Drama & Mystery', pct: 9, color: 'bg-emerald-400' },
          ].map((genre) => (
            <div key={genre.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-300">{genre.name}</span>
                <span className="font-bold text-slate-400">{genre.pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full ${genre.color} rounded-full transition-all duration-1000`}
                  style={{ width: `${genre.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/my-list"
          className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              Manage Watchlist
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and organize all {watchlist.length} saved titles
            </p>
          </div>
          <Bookmark className="w-5 h-5 text-primary" />
        </Link>

        <Link
          href="/history"
          className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors flex items-center justify-between group"
        >
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-primary transition-colors">
              Viewing History
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Resume progress across {history.length} watched titles
            </p>
          </div>
          <Clock className="w-5 h-5 text-primary" />
        </Link>
      </div>
    </div>
  );
}
