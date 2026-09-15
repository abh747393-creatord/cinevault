'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconClapperboardPlay,
  IconPlus,
  IconTrashBinMinimalistic,
  IconEye,
  IconRefresh,
  IconStar,
  IconStars,
} from '@/components/ui/icons';
import { AdminTable, Column } from '@/components/admin/admin-table';
import { AdminSearch } from '@/components/admin/admin-search';
import { AdminFilters } from '@/components/admin/admin-filters';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { ConfirmDialog } from '@/components/admin/confirm-dialog';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';

export default function AdminContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Add Content Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'movie' | 'tv' | 'anime'>('movie');
  const [newYear, setNewYear] = useState(2024);
  const [newRating, setNewRating] = useState(8.5);
  const [newDesc, setNewDesc] = useState('');
  const [newPoster, setNewPoster] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Dialog
  const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchQuery,
        type: selectedType,
      });
      const res = await fetch(`/api/admin/content?${params}`, {
        headers: { 'x-admin-role': 'admin' },
      });
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [currentPage, searchQuery, selectedType]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': 'admin',
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          contentType: newType,
          year: newYear,
          rating: newRating,
          description: newDesc,
          posterUrl: newPoster,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewTitle('');
        setNewDesc('');
        setNewPoster('');
        fetchContent();
      }
    } catch (err) {
      console.error('Failed to add content:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/admin/content?id=${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'x-admin-role': 'admin' },
      });
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error('Failed to delete content:', err);
    }
  };

  const columns: Column<ContentItem>[] = [
    {
      key: 'title',
      header: 'Title & Poster',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow">
            {row.posterUrl ? (
              <img src={row.posterUrl} alt={row.title} className="w-full h-full object-cover" />
            ) : (
              <IconClapperboardPlay className="w-5 h-5 m-auto mt-4 text-slate-600" />
            )}
          </div>
          <div>
            <div className="font-bold text-white leading-tight">{row.title}</div>
            <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{row.description}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'contentType',
      header: 'Format',
      render: (row) => <StatusBadge variant={row.contentType} />,
    },
    {
      key: 'year',
      header: 'Year',
      render: (row) => <span className="font-mono text-slate-300">{row.year}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1 font-bold text-amber-400">
          <IconStar className="w-3.5 h-3.5 fill-amber-400" />
          <span>{row.rating?.toFixed(1) || '8.0'}</span>
        </div>
      ),
    },
    {
      key: 'quality',
      header: 'Resolution',
      render: (row) => <StatusBadge variant={row.quality === '4K' ? '4k' : '1080p'} label={row.quality || '1080p'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={row.contentType === 'movie' ? `/movie/${row.slug || row.id}` : `/tv/${row.slug || row.id}`}
            target="_blank"
          >
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="View on Consumer Website"
            >
              <IconEye className="w-3.5 h-3.5" />
            </button>
          </Link>

          <button
            type="button"
            onClick={() => setDeleteTarget(row)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
            title="Delete Title"
          >
            <IconTrashBinMinimalistic className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconClapperboardPlay className="w-7 h-7 text-primary" />
            Content Catalog Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, inspect metadata, and register media entries across all genres and provider endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchContent}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="gap-1.5 text-xs font-bold"
          >
            <IconPlus className="w-4 h-4" />
            Add Media Entry
          </Button>
        </div>
      </div>

      {/* Quick Nav Sub-tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { label: 'All Media', href: '/admin/content', active: true },
          { label: 'Movies Catalog', href: '/admin/content/movies', active: false },
          { label: 'TV Series', href: '/admin/content/tv', active: false },
          { label: 'Anime Hub', href: '/admin/content/anime', active: false },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={tab.href}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              tab.active
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="w-full md:w-80">
          <AdminSearch
            value={searchQuery}
            onSearch={(val) => {
              setSearchQuery(val);
              setCurrentPage(1);
            }}
            placeholder="Search catalog by title or keyword..."
          />
        </div>

        <AdminFilters
          options={[
            { label: 'All Types', value: 'all' },
            { label: 'Movies', value: 'movie' },
            { label: 'TV Shows', value: 'tv' },
            { label: 'Anime', value: 'anime' },
          ]}
          selectedValue={selectedType}
          onSelectValue={(val) => {
            setSelectedType(val);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Table */}
      <AdminTable columns={columns} data={items} isLoading={loading} />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={12}
        onPageChange={setCurrentPage}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        title="Remove Media Entry?"
        description={`Are you sure you want to remove "${deleteTarget?.title}" from the catalog? This will delete associated playback routes.`}
        confirmText="Delete Title"
        isDestructive={true}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add Media Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-card border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <IconPlus className="w-4 h-4 text-primary" />
                Register New Media Entry
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-300">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Dune: Part Two"
                  className="w-full h-9 px-3 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full h-9 px-2 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  >
                    <option value="movie" className="bg-[#12161f]">Movie</option>
                    <option value="tv" className="bg-[#12161f]">TV Show</option>
                    <option value="anime" className="bg-[#12161f]">Anime</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Release Year</label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(parseInt(e.target.value, 10))}
                    className="w-full h-9 px-3 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300">Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={newRating}
                    onChange={(e) => setNewRating(parseFloat(e.target.value))}
                    className="w-full h-9 px-3 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Poster Image URL</label>
                <input
                  type="url"
                  value={newPoster}
                  onChange={(e) => setNewPoster(e.target.value)}
                  placeholder="https://image.tmdb.org/t/p/w500/..."
                  className="w-full h-9 px-3 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300">Synopsis</label>
                <textarea
                  rows={3}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Brief synopsis..."
                  className="w-full p-2.5 mt-1 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isSubmitting}
                  className="text-xs font-bold"
                >
                  {isSubmitting ? 'Registering...' : 'Save & Publish'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
