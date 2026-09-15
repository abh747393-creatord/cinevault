'use client';

import React, { useState } from 'react';
import { IconSettings as SettingsIcon, IconCheck, IconShieldTick, IconGlobal, IconSubtitle, IconMonitor, IconPlay } from '@/components/ui/icons';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { UserRole } from '@/types/user';

export default function SettingsPage() {
  const { user, updateProfile, switchRole } = useAuth();
  const [saved, setSaved] = useState(false);

  const [preferredLanguage, setPreferredLanguage] = useState(user?.preferredLanguage || 'English');
  const [preferredSubtitleLanguage, setPreferredSubtitleLanguage] = useState(user?.preferredSubtitleLanguage || 'English');
  const [defaultQuality, setDefaultQuality] = useState(user?.defaultQuality || '1080p');
  const [autoplayNext, setAutoplayNext] = useState(user?.autoplayNext ?? true);
  const [role, setRole] = useState<UserRole>(user?.role || 'user');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    await updateProfile({
      preferredLanguage,
      preferredSubtitleLanguage,
      defaultQuality,
      autoplayNext,
      role,
    });
    switchRole(role);

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
          <SettingsIcon className="w-7 h-7 text-primary" />
          Streaming Preferences
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure video playback, audio tracks, subtitle defaults, and demo roles.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Playback & Quality */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <IconMonitor className="w-4 h-4 text-primary" />
            Video Playback & Quality
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Default Stream Quality
              </label>
              <select
                value={defaultQuality}
                onChange={(e) => setDefaultQuality(e.target.value as any)}
                className="w-full h-10 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary"
              >
                <option value="auto" className="bg-card">Auto (Adaptive)</option>
                <option value="1080p" className="bg-card">1080p Full HD</option>
                <option value="720p" className="bg-card">720p HD</option>
                <option value="480p" className="bg-card">480p SD</option>
              </select>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoplayNext}
                  onChange={(e) => setAutoplayNext(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded"
                />
                <span className="text-xs font-semibold text-white">
                  Autoplay Next Episode
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Audio & Subtitles */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <IconGlobal className="w-4 h-4 text-accent" />
            Language & Subtitles
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Preferred Audio Language
              </label>
              <select
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary"
              >
                <option value="English" className="bg-card">English (Original / Dub)</option>
                <option value="Japanese" className="bg-card">Japanese (Original)</option>
                <option value="Spanish" className="bg-card">Spanish</option>
                <option value="French" className="bg-card">French</option>
                <option value="German" className="bg-card">German</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Default Subtitle Language
              </label>
              <select
                value={preferredSubtitleLanguage}
                onChange={(e) => setPreferredSubtitleLanguage(e.target.value)}
                className="w-full h-10 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-primary"
              >
                <option value="English" className="bg-card">English [CC]</option>
                <option value="Spanish" className="bg-card">Spanish</option>
                <option value="French" className="bg-card">French</option>
                <option value="Off" className="bg-card">Off (Disabled by default)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Role & Permissions (Demo Mode) */}
        <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <IconShieldTick className="w-4 h-4 text-emerald-400" />
            Account Role & Privileges
          </h3>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Active Role (Instant Demo Toggle)
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['user', 'moderator', 'admin'] as UserRole[]).map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setRole(r)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all ${
                    role === r
                      ? 'bg-primary text-white shadow-lg'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Switching to <strong>Admin</strong> unlocks the <code>/admin</code> control panel to manage content, check provider health, and inspect system logs.
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            size="md"
            className="flex items-center gap-2 px-6"
          >
            {saved ? <IconCheck className="w-4 h-4 text-emerald-400" /> : null}
            {saved ? 'Preferences Saved' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
