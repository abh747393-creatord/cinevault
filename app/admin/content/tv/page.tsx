'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconTV,
  IconEye,
  IconRefresh,
  IconStar,
  IconArrowLeft,
  IconLayers,
} from '@/components/ui/icons';
import { AdminTable, Column } from '@/components/admin/admin-table';
import { AdminSearch } from '@/components/admin/admin-search';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';
import { ContentItem } from '@/types/content';

export default function AdminTvCatalogPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchTvShows = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12',
        search: searchQuery,
        type: 'tv',
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
      console.error('Failed to load TV series:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTvShows();
  }, [currentPage, searchQuery]);

  const columns: Column<ContentItem>[] = [
    {
      key: 'title',
      header: 'Show Title',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-14 rounded-lg bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow">
            {row.posterUrl ? (
              <img src={row.posterUrl} alt={row.title} className="w-full h-full object-cover" />
            ) : (
              <IconTV className="w-5 h-5 m-auto mt-4 text-slate-600" />
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
      key: 'year',
      header: 'First Aired',
      render: (row) => <span className="font-mono text-slate-300">{row.year}</span>,
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (row) => (
        <div className="flex items-center gap-1 font-bold text-amber-400">
          <IconStar className="w-3.5 h-3.5 fill-amber-400" />
          <span>{row.rating?.toFixed(1) || '8.2'}</span>
        </div>
      ),
    },
    {
      key: 'seasons',
      header: 'Seasons / Episodes',
      render: (row) => (
        <span className="font-mono text-xs text-purple-400 font-semibold">
          {row.seasons?.length || 1} Seasons • {row.seasons?.[0]?.episodes?.length || 8} Eps
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Live View',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/tv/${row.slug || row.id}`} target="_blank">
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="View on Live Site"
            >
              <IconEye className="w-3.5 h-3.5" />
            </button>
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/content" className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
              <IconArrowLeft className="w-3 h-3" />
              Content Catalog
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconTV className="w-7 h-7 text-purple-400" />
            TV Series Catalog ({totalItems})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Episodic streaming, season packages, and multi-episode drawer structures.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchTvShows}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Shows
        </Button>
      </div>

      {/* Search */}
      <div className="w-full md:w-80">
        <AdminSearch
          value={searchQuery}
          onSearch={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          placeholder="Search TV series..."
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
    </div>
  );
}
