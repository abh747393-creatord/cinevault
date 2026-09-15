'use client';

import React, { useState, useEffect } from 'react';
import {
  IconBarChart,
  IconChartLineUp,
  IconClockCircle,
  IconRefresh,
  IconServer,
} from '@/components/ui/icons';
import { AdminFilters, TimeframeFilter } from '@/components/admin/admin-filters';
import { AdminStatCard } from '@/components/admin/admin-stat-card';
import { AdminAreaChart, AdminBarChart } from '@/components/admin/admin-chart';
import { Button } from '@/components/ui/button';

export default function AdminAnalyticsPage() {
  const [timeframe, setTimeframe] = useState<TimeframeFilter>('7d');
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics?range=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeframe]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <IconBarChart className="w-7 h-7 text-primary" />
            Platform Analytics & Streaming Trends
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Aggregate viewership performance, format popularity, and network delivery statistics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AdminFilters timeframe={timeframe} onTimeframeChange={setTimeframe} />

          <Button
            variant="outline"
            size="sm"
            onClick={fetchAnalytics}
            disabled={loading}
            className="gap-1.5 text-xs"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          title="Total Streams"
          value={analyticsData?.summary?.totalStreams?.toLocaleString() || '3,480'}
          subtitle={`Across past ${timeframe}`}
          icon={<IconChartLineUp className="w-5 h-5 text-primary" />}
          trend={{ value: 16, isPositive: true }}
          accentColor="primary"
        />

        <AdminStatCard
          title="Avg Completion"
          value={analyticsData?.summary?.avgCompletionRate || '78.4%'}
          subtitle="Finished past 80% runtime"
          icon={<IconClockCircle className="w-5 h-5 text-emerald-400" />}
          trend={{ value: 4, isPositive: true }}
          accentColor="emerald"
        />

        <AdminStatCard
          title="Avg Session"
          value={`${analyticsData?.summary?.avgWatchDurationMinutes || 46} min`}
          subtitle="Continuous playback"
          icon={<IconClockCircle className="w-5 h-5 text-amber-400" />}
          trend={{ value: 9, isPositive: true }}
          accentColor="amber"
        />

        <AdminStatCard
          title="Top Provider Node"
          value="MovieBox Rust"
          subtitle="Tokio High-Perf Engine"
          icon={<IconServer className="w-5 h-5 text-purple-400" />}
          accentColor="purple"
        />
      </div>

      {/* Time Series Area Chart */}
      <AdminAreaChart
        title={`Viewership Trajectory (${timeframe === '30d' ? '30 Days' : timeframe === '90d' ? '90 Days' : '7 Days'})`}
        subtitle="Daily active stream volume and chunk transfers"
        data={analyticsData?.timeSeries || []}
        height={260}
        color="#e50914"
        valueSuffix=" streams"
      />

      {/* Category Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AdminBarChart
          title="Most Streamed Genres"
          subtitle="Top categories by audience demand"
          data={analyticsData?.genres || []}
          barColor="bg-primary"
          valueSuffix="streams"
        />

        <AdminBarChart
          title="Format Distribution"
          subtitle="Movies vs Episodic TV vs Anime"
          data={analyticsData?.contentTypes || []}
          barColor="bg-purple-500"
          valueSuffix="titles"
        />

        <AdminBarChart
          title="Playback Resolution"
          subtitle="Device stream quality selection"
          data={analyticsData?.qualities || []}
          barColor="bg-emerald-500"
          valueSuffix="%"
        />
      </div>
    </div>
  );
}
