'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  IconArrowLeft,
  IconServer,
  IconBolt,
  IconCheckCircle,
  IconAlertTriangle,
  IconRefresh,
} from '@/components/ui/icons';
import { StatusBadge } from '@/components/admin/status-badge';
import { Button } from '@/components/ui/button';

export default function AdminProviderDetailPage() {
  const params = useParams();
  const providerId = params.id as string;

  const [provider, setProvider] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testQuery, setTestQuery] = useState('Inception');
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [diagResult, setDiagResult] = useState<any>(null);

  const fetchProvider = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}`);
      if (res.ok) {
        const data = await res.json();
        setProvider(data.provider);
      }
    } catch (err) {
      console.error('Failed to load provider detail:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  const handleRunDiagnostic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    setIsDiagnosing(true);
    setDiagResult(null);

    try {
      const res = await fetch(`/api/admin/providers/${providerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery.trim() }),
      });
      const data = await res.json();
      setDiagResult(data);
    } catch (err: any) {
      setDiagResult({ error: err.message || 'Diagnostic failed' });
    } finally {
      setIsDiagnosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link href="/admin/providers">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-slate-400 hover:text-white">
            <IconArrowLeft className="w-3.5 h-3.5" />
            Back to Providers
          </Button>
        </Link>
      </div>

      {/* Provider Details Card */}
      <div className="p-6 rounded-3xl bg-card border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center">
            <IconServer className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white">{provider?.name || providerId}</h1>
              <StatusBadge variant={provider?.status || 'healthy'} />
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Identifier: <span className="text-white">{provider?.id}</span> • Slug: <span className="text-white">{provider?.slug}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            Cascade Priority #{provider?.priority || 1}
          </span>
        </div>
      </div>

      {/* Live Diagnostic Test Console */}
      <div className="p-6 rounded-2xl bg-card border border-white/10 space-y-4">
        <div className="flex items-center gap-2">
          <IconBolt className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Live Provider Diagnostics Console</h3>
        </div>
        <p className="text-xs text-slate-400">
          Dispatch a live query to test this provider's search index and response latency in isolation.
        </p>

        <form onSubmit={handleRunDiagnostic} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Search query to benchmark..."
            className="flex-1 h-10 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary"
          />
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isDiagnosing}
            className="gap-2 shrink-0 text-xs font-bold"
          >
            {isDiagnosing && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Execute Diagnostic Test
          </Button>
        </form>

        {diagResult && (
          <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 font-mono text-xs text-slate-300 animate-fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold text-white flex items-center gap-2">
                {diagResult.success ? (
                  <IconCheckCircle className="w-4 h-4 text-emerald-400" />
                ) : (
                  <IconAlertTriangle className="w-4 h-4 text-rose-400" />
                )}
                {diagResult.success ? 'Diagnostic Query Successful' : 'Diagnostic Encountered Error'}
              </span>
              {diagResult.latencyMs && (
                <span className="text-emerald-400 font-bold">{diagResult.latencyMs} ms latency</span>
              )}
            </div>

            <div className="text-[11px] space-y-1">
              <p>Query: <span className="text-white font-bold">{testQuery}</span></p>
              <p>Results Returned: <span className="text-white font-bold">{diagResult.count ?? 0} items</span></p>
            </div>

            {diagResult.results && (
              <pre className="p-3 rounded-lg bg-black/80 border border-white/5 overflow-x-auto text-[11px] text-emerald-300/90 max-h-60">
                {JSON.stringify(diagResult.results, null, 2)}
              </pre>
            )}

            {diagResult.error && (
              <p className="text-rose-400">{diagResult.error}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
