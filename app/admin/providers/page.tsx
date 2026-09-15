'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  IconServer,
  IconBolt,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
  IconArrowRightUp,
  IconSettings,
  IconEye,
} from '@/components/ui/icons';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/providers');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const toggleProvider = async (providerId: string, currentEnabled: boolean) => {
    setUpdatingId(providerId);
    try {
      const res = await fetch('/api/admin/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerId, enabled: !currentEnabled }),
      });
      if (res.ok) {
        setProviders((prev) =>
          prev.map((p) => (p.id === providerId ? { ...p, enabled: !currentEnabled } : p))
        );
      }
    } catch (err) {
      console.error('Failed to toggle provider:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconServer className="w-7 h-7 text-primary" />
            Streaming Providers & Resolver Nodes
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage multi-tier stream resolution cascade, provider priority, and health telemetry.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchProviders}
          disabled={loading}
          className="gap-1.5 text-xs"
        >
          <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Nodes
        </Button>
      </div>

      {/* Provider Cascade Architecture Notice */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
          <IconBolt className="w-4 h-4 text-amber-400" />
          Resolver Failover Cascade Hierarchy
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">1. MovieBox Rust Daemon</span>
          <span className="text-slate-500">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">2. Local DB (Supabase)</span>
          <span className="text-slate-500">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">3. Open Source Archive</span>
          <span className="text-slate-500">→</span>
          <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 font-mono">4. TMDB Metadata Adapter</span>
        </div>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const isUpdating = updatingId === p.id;
          return (
            <div
              key={p.id}
              className={`p-5 rounded-2xl border transition-all space-y-4 flex flex-col justify-between ${
                p.enabled
                  ? 'bg-card border-white/15 hover:border-white/25'
                  : 'bg-card/40 border-white/5 opacity-60'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{p.name}</h3>
                      <StatusBadge variant={p.status || 'healthy'} />
                    </div>
                    <span className="font-mono text-[11px] text-slate-500">Slug: {p.slug}</span>
                  </div>

                  <span className="px-2 py-0.5 rounded bg-white/5 text-[10px] font-mono text-slate-400 border border-white/10">
                    Priority #{p.priority}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 text-[10px] block">Latency</span>
                    <span className="font-mono font-bold text-emerald-400">
                      {p.latencyMs ? `${p.latencyMs} ms` : 'Standby'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="text-slate-500 text-[10px] block">Status</span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {p.enabled ? 'Active Routing' : 'Disabled'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => toggleProvider(p.id, p.enabled)}
                  disabled={isUpdating}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                    p.enabled
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                  }`}
                >
                  {isUpdating ? 'Updating...' : p.enabled ? 'Disable Provider' : 'Enable Provider'}
                </button>

                <Link href={`/admin/providers/${p.slug || p.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <IconBolt className="w-3.5 h-3.5 text-amber-400" />
                    Run Diagnostics
                  </Button>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
