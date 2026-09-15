'use client';

import React, { useState, useEffect } from 'react';
import {
  IconClockCircle,
  IconClapperboardPlay,
  IconRefresh,
} from '@/components/ui/icons';
import { AdminTable, Column } from '@/components/admin/admin-table';
import { AdminSearch } from '@/components/admin/admin-search';
import { AdminPagination } from '@/components/admin/admin-pagination';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export default function AdminWatchHistoryPage() {
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15',
        search: searchQuery,
      });
      const res = await fetch(`/api/admin/watch-history?${params}`);
      if (res.ok) {
        const data = await res.json();
        setActivity(data.activity || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load global watch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentPage, searchQuery]);

  const columns: Column<any>[] = [
    {
      key: 'contentTitle',
      header: 'Media Title',
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-12 rounded bg-white/5 border border-white/10 overflow-hidden shrink-0 shadow">
            {row.posterUrl ? (
              <img src={row.posterUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <IconClapperboardPlay className="w-4 h-4 m-auto mt-4 text-slate-600" />
            )}
          </div>
          <div>
            <div className="font-bold text-white leading-tight">{row.contentTitle || 'Title'}</div>
            <span className="text-[10px] text-slate-500 uppercase">{row.contentType || 'Movie'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'userName',
      header: 'Viewer Account',
      render: (row) => (
        <div>
          <div className="font-semibold text-slate-200">{row.userName || 'Guest Viewer'}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.userEmail || 'Active Session'}</div>
        </div>
      ),
    },
    {
      key: 'progressSeconds',
      header: 'Playback Progress',
      render: (row) => {
        const progress = Math.min(
          100,
          Math.round(((row.progressSeconds || 1) / Math.max(row.durationSeconds || 5400, 1)) * 100)
        );
        return (
          <div className="w-36 space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>{Math.round((row.progressSeconds || 0) / 60)} min</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        );
      },
    },
    {
      key: 'completed',
      header: 'State',
      render: (row) => (
        <StatusBadge
          variant={row.completed ? 'active' : 'movie'}
          label={row.completed ? 'Finished' : 'In Progress'}
        />
      ),
    },
    {
      key: 'device',
      header: 'Device Environment',
      render: (row) => <span className="text-slate-400 font-mono text-[11px]">{row.device || 'Web Client'}</span>,
    },
    {
      key: 'updatedAt',
      header: 'Last Active',
      render: (row) => (
        <span className="text-slate-400 font-mono text-[11px]">
          {row.updatedAt ? new Date(row.updatedAt).toLocaleTimeString() : 'Just now'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconClockCircle className="w-7 h-7 text-primary" />
            Global Watch Activity Telemetry
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Streaming session logs, progress tracking, and client playback analytics across CineVault.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchHistory}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Activity
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
          placeholder="Search by title, user, or email..."
        />
      </div>

      {/* Table */}
      <AdminTable columns={columns} data={activity} isLoading={loading} />

      {/* Pagination */}
      <AdminPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={15}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
