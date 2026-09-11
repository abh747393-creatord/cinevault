'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Shield,
  Film,
  Users,
  Server,
  Tag,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SEED_CONTENT, SEED_GENRES } from '@/lib/data/catalog-seed';
import { ContentItem } from '@/types/content';
import { providerResolver } from '@/lib/providers/resolver';

export default function AdminDashboardPage() {
  const { user, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'providers' | 'users' | 'genres'>('overview');

  // Local state for admin CRUD demo
  const [contentList, setContentList] = useState<ContentItem[]>(SEED_CONTENT);
  const [providersList, setProvidersList] = useState(providerResolver.getProvidersMetadata());
  const [genreList, setGenreList] = useState(SEED_GENRES);
  const [searchContentQuery, setSearchContentQuery] = useState('');

  // New content modal form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'movie' | 'tv' | 'anime'>('movie');
  const [newYear, setNewYear] = useState(2024);
  const [newRating, setNewRating] = useState(8.5);
  const [newDesc, setNewDesc] = useState('');

  // Access Control check
  if (!user || user.role !== 'admin') {
    return (
      <div className="max-w-lg mx-auto py-24 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Shield className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-white">Admin Authorization Required</h2>
        <p className="text-xs text-slate-400">
          This section is restricted to administrative staff. You are currently signed in as{' '}
          <strong className="text-white capitalize">{user?.role || 'Guest'}</strong>.
        </p>

        {user && (
          <div className="pt-2">
            <Button
              variant="accent"
              size="sm"
              onClick={() => switchRole('admin')}
              className="gap-2"
            >
              Elevate Role to Admin (Demo Mode)
            </Button>
          </div>
        )}

        <div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="mt-2 text-slate-400">
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleDeleteContent = (id: string) => {
    if (confirm('Are you sure you want to remove this title from the catalog?')) {
      setContentList((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleToggleFeatured = (id: string) => {
    setContentList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, featured: !c.featured } : c))
    );
  };

  const handleToggleProvider = (id: string) => {
    setProvidersList((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !p.enabled } : p))
    );
  };

  const handleAddContentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newItem: ContentItem = {
      id: `c-custom-${Date.now()}`,
      title: newTitle,
      contentType: newType,
      slug: newTitle.toLowerCase().replace(/\s+/g, '-'),
      year: newYear,
      rating: newRating,
      description: newDesc || 'No synopsis provided.',
      posterUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      backdropUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1600&auto=format&fit=crop&q=80',
      releaseDate: `${newYear}-01-01`,
      runtime: 90,
      language: 'English',
      status: 'released',
      genres: [SEED_GENRES[0]],
      quality: '1080p',
    };

    setContentList([newItem, ...contentList]);
    setShowAddModal(false);
    setNewTitle('');
    setNewDesc('');
  };

  const filteredContent = contentList.filter((c) =>
    c.title.toLowerCase().includes(searchContentQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-12 py-8 sm:py-12 space-y-8">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              CineVault Administration
            </h1>
            <Badge variant="accent" size="sm">Admin</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage catalog metadata, provider adapter fallbacks, genres, and system telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs">
              Live Site
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-white/10 pb-3">
        {[
          { id: 'overview', label: 'System Overview', icon: Activity },
          { id: 'content', label: `Content Catalog (${contentList.length})`, icon: Film },
          { id: 'providers', label: 'Provider Adapters', icon: Server },
          { id: 'users', label: 'User Roles', icon: Users },
          { id: 'genres', label: 'Genres', icon: Tag },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow-lg'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Total Titles</span>
              <p className="text-3xl font-black text-white">{contentList.length}</p>
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Active in database
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Active Providers</span>
              <p className="text-3xl font-black text-white">
                {providersList.filter((p) => p.enabled).length} / {providersList.length}
              </p>
              <p className="text-[11px] text-slate-400">Fallback cascade enabled</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">System Health</span>
              <p className="text-3xl font-black text-emerald-400">100%</p>
              <p className="text-[11px] text-emerald-400">All stream routes operational</p>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-white/10 space-y-1">
              <span className="text-xs text-slate-400 font-semibold">Security / RLS</span>
              <p className="text-3xl font-black text-primary">Active</p>
              <p className="text-[11px] text-slate-400">Row Level Security enabled</p>
            </div>
          </div>

          {/* Quick System Telemetry */}
          <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
            <h3 className="text-sm font-bold text-white">Provider Pipeline Status</h3>
            <div className="space-y-3">
              {providersList.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${p.enabled ? 'bg-emerald-400' : 'bg-red-400'}`} />
                    <div>
                      <p className="font-bold text-white">{p.name}</p>
                      <p className="text-[11px] text-slate-400">Priority: #{p.priority} • Slug: {p.slug}</p>
                    </div>
                  </div>

                  <Badge variant={p.enabled ? 'primary' : 'outline'} size="sm">
                    {p.enabled ? 'ONLINE' : 'OFFLINE'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content Management Tab */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchContentQuery}
                onChange={(e) => setSearchContentQuery(e.target.value)}
                placeholder="Filter titles..."
                className="w-full h-9 pl-9 pr-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
              />
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4" />
              Add New Title
            </Button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Year</th>
                  <th className="p-3.5">Rating</th>
                  <th className="p-3.5">Featured</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {filteredContent.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-3.5 font-bold text-white flex items-center gap-2">
                      <img src={item.posterUrl} alt="" className="w-6 h-8 object-cover rounded" />
                      {item.title}
                    </td>
                    <td className="p-3.5 capitalize">{item.contentType}</td>
                    <td className="p-3.5">{item.year}</td>
                    <td className="p-3.5 font-semibold text-amber-300">★ {item.rating}</td>
                    <td className="p-3.5">
                      <button
                        onClick={() => handleToggleFeatured(item.id)}
                        className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase transition-colors ${
                          item.featured ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-500'
                        }`}
                      >
                        {item.featured ? 'Featured' : 'Standard'}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteContent(item.id)}
                        className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Providers Tab */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-xs text-slate-300">
            <strong>Provider Fallback Architecture:</strong> When streaming a video, CineVault queries Provider A (Local DB / PostgreSQL). If no source is found, it cascades gracefully to Provider B (Open Cinema Archive), followed by external adapters without leaking credentials to the client.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {providersList.map((p) => (
              <div key={p.id} className="p-5 rounded-2xl bg-card border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    <h4 className="text-sm font-bold text-white">{p.name}</h4>
                  </div>
                  <Badge variant={p.enabled ? 'primary' : 'outline'} size="sm">
                    Priority #{p.priority}
                  </Badge>
                </div>

                <div className="text-xs text-slate-400 space-y-1">
                  <p>Slug: <code className="text-white">{p.slug}</code></p>
                  <p>Status: <span className={p.status === 'active' ? 'text-emerald-400' : 'text-slate-400'}>{p.status.toUpperCase()}</span></p>
                </div>

                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Adapter Toggle</span>
                  <button
                    onClick={() => handleToggleProvider(p.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      p.enabled ? 'bg-primary text-white' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {p.enabled ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-card">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5 border-b border-white/10 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                <tr className="hover:bg-white/5">
                  <td className="p-3.5 font-bold text-white">{user.displayName} (You)</td>
                  <td className="p-3.5">{user.email}</td>
                  <td className="p-3.5"><Badge variant="accent">{user.role}</Badge></td>
                  <td className="p-3.5 text-emerald-400 font-semibold">Active Session</td>
                </tr>
                <tr className="hover:bg-white/5">
                  <td className="p-3.5 font-bold text-white">Open Cinema Bot</td>
                  <td className="p-3.5">bot@cinevault.local</td>
                  <td className="p-3.5"><Badge variant="outline">Moderator</Badge></td>
                  <td className="p-3.5 text-slate-400">Service Worker</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Genres Tab */}
      {activeTab === 'genres' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {genreList.map((g) => (
              <div key={g.id} className="p-3.5 rounded-xl bg-card border border-white/10 flex items-center justify-between text-xs font-semibold text-white">
                <span>{g.name}</span>
                <span className="text-slate-500 font-normal">{g.slug}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Title Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-white">Add New Catalog Title</h3>
            <form onSubmit={handleAddContentSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Movie or Show Title"
                  className="w-full h-9 px-3 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full h-9 px-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
                  >
                    <option value="movie" className="bg-card">Movie</option>
                    <option value="tv" className="bg-card">TV Show</option>
                    <option value="anime" className="bg-card">Anime</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value))}
                    className="w-full h-9 px-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newRating}
                    onChange={(e) => setNewRating(parseFloat(e.target.value))}
                    className="w-full h-9 px-2 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Synopsis</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Plot summary..."
                  className="w-full p-2.5 text-xs bg-white/5 border border-white/10 rounded-xl text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Save to Catalog
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
