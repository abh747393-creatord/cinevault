'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconUser,
  IconShield,
  IconClockCircle,
  IconBookmark,
  IconCheckCircle,
  IconClapperboardPlay,
  IconRefresh,
} from '@/components/ui/icons';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchUser = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (err) {
      console.error('Failed to load user detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [userId]);

  const handleRoleToggle = async () => {
    if (!userData?.user) return;
    const nextRole = userData.user.role === 'admin' ? 'user' : 'admin';
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      });
      if (res.ok) {
        setUserData((prev: any) => ({
          ...prev,
          user: { ...prev.user, role: nextRole },
        }));
      }
    } catch (err) {
      console.error('Failed to toggle role:', err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const { user, watchHistory = [], watchlist = [] } = userData || {};

  return (
    <div className="space-y-6">
      {/* Top back navigation */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-400 hover:text-white">
            <IconArrowLeft className="w-3.5 h-3.5" />
            Back to User Directory
          </Button>
        </Link>
      </div>

      {/* User Profile Header Card */}
      <div className="p-6 rounded-3xl bg-card border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black text-white uppercase">
            {user?.displayName?.charAt(0) || user?.username?.charAt(0) || <IconUser className="w-8 h-8" />}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{user?.displayName || user?.username || 'User'}</h1>
              <StatusBadge variant={user?.role || 'user'} />
            </div>
            <p className="text-xs text-slate-400 font-mono">{user?.email}</p>
            <p className="text-[11px] text-slate-500">
              Account ID: <span className="font-mono">{user?.id}</span> • Member since{' '}
              {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Jan 2024'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant={user?.role === 'admin' ? 'outline' : 'primary'}
            size="sm"
            onClick={handleRoleToggle}
            disabled={updating}
            className="text-xs gap-1.5 font-bold w-full md:w-auto"
          >
            <IconShield className="w-4 h-4" />
            {user?.role === 'admin' ? 'Demote to Standard User' : 'Elevate to Super Admin'}
          </Button>
        </div>
      </div>

      {/* Grid: Preferences & Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
          <span className="text-xs font-semibold text-slate-400">Preferred Audio Language</span>
          <p className="text-lg font-bold text-white">{user?.preferredLanguage || 'English'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
          <span className="text-xs font-semibold text-slate-400">Default Video Quality</span>
          <p className="text-lg font-bold text-emerald-400">{user?.defaultQuality || '1080p'}</p>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
          <span className="text-xs font-semibold text-slate-400">Total Watched Sessions</span>
          <p className="text-lg font-bold text-primary">{watchHistory.length} Sessions</p>
        </div>
      </div>

      {/* User Activity: Watch History & Watchlist */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Watch History */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <IconClockCircle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-white">Playback Activity History</h3>
          </div>

          {watchHistory.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No watch sessions recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {watchHistory.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-10 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0">
                      {item.content?.poster_url ? (
                        <img src={item.content.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <IconClapperboardPlay className="w-4 h-4 m-auto mt-3 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{item.content?.title || item.content_id}</div>
                      <span className="text-[10px] text-slate-500">
                        {Math.round((item.progress_seconds || 0) / 60)} minutes watched
                      </span>
                    </div>
                  </div>
                  <StatusBadge variant={item.completed ? 'active' : 'movie'} label={item.completed ? 'Finished' : 'In Progress'} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <IconBookmark className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Saved to Watchlist</h3>
          </div>

          {watchlist.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No items added to watchlist.</p>
          ) : (
            <div className="space-y-3">
              {watchlist.map((item: any, idx: number) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-10 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0">
                      {item.content?.poster_url ? (
                        <img src={item.content.poster_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <IconClapperboardPlay className="w-4 h-4 m-auto mt-3 text-slate-600" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white">{item.content?.title || item.content_id}</div>
                      <span className="text-[10px] text-slate-500 capitalize">{item.content?.content_type || 'Media'}</span>
                    </div>
                  </div>
                  <StatusBadge variant="default" label="Bookmarked" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
