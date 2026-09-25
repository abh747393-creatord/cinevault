'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  IconServer,
  IconRefresh,
  IconCheckCircle,
  IconAlertTriangle,
  IconShieldTick,
  IconBolt,
  IconClockCircle,
  IconClose,
  IconArrowRightUp,
  IconAlertCircle,
  IconCopy,
  IconCPU,
} from '@/components/ui/icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { UpdateCheckResult, UpdatePreparationResult } from '@/lib/admin/update-checker';

export default function AdminUpdatesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [isDryRunMode, setIsDryRunMode] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [preparingUpdate, setPreparingUpdate] = useState(false);
  const [prepResult, setPrepResult] = useState<UpdatePreparationResult | null>(null);
  const [prepError, setPrepError] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const fetchUpdateStatus = useCallback(async (force: boolean = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/admin/updates${force ? '?force=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}: Failed to inspect updates`);
      }
      const json: UpdateCheckResult = await res.json();
      setData(json);
      if (json.checkFailed) {
        setError(json.checkErrorMessage || 'Unable to retrieve upstream release information from GitHub.');
      }
    } catch (err: any) {
      console.error('[AdminUpdatesPage] Fetch failed:', err);
      setError(err.message || 'Unable to connect to update service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUpdateStatus();
  }, [fetchUpdateStatus]);

  const handlePrepareUpdate = async (dryRun: boolean = false) => {
    if (!data?.latestVersion) return;
    setPreparingUpdate(true);
    setPrepError(null);
    setPrepResult(null);

    try {
      const res = await fetch('/api/admin/updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirm: true,
          targetVersion: data.latestVersion,
          dryRun,
        }),
      });

      const result: UpdatePreparationResult = await res.json();
      setPrepResult(result);
      if (!result.success) {
        setPrepError(result.error || 'Update preparation failed.');
      }
    } catch (err: any) {
      setPrepError(err.message || 'Network error while preparing update.');
    } finally {
      setPreparingUpdate(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    setTimeout(() => setCopiedCmd(null), 3000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
              <IconServer className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              MovieBox-TUI Engine & Updates
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Administrative lifecycle control, pinned dependency versioning, and secure host-side updates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="glass"
            size="sm"
            onClick={() => fetchUpdateStatus(true)}
            disabled={refreshing || loading || preparingUpdate}
            className="text-xs font-semibold gap-1.5"
          >
            <IconRefresh className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-primary' : ''}`} />
            {refreshing ? 'Checking...' : 'Check for Updates'}
          </Button>

          {data?.updateAvailable && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setShowUpdateModal(true);
                setIsDryRunMode(false);
                setConfirmedCheckbox(false);
                setPrepResult(null);
                setPrepError(null);
              }}
              className="text-xs font-bold gap-1.5 shadow-lg shadow-primary/20"
            >
              <IconBolt className="w-3.5 h-3.5" />
              Prepare Update to v{data.latestVersion}
            </Button>
          )}
        </div>
      </div>

      {/* State 3: Update Check Failed Banner */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">State: Update Check Failed</p>
              <p>{error}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchUpdateStatus(true)}
            disabled={refreshing}
            className="text-xs font-semibold shrink-0"
          >
            Retry Check
          </Button>
        </div>
      )}

      {/* State 2: Backend Offline Banner */}
      {data && !data.backendStatus.online && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <IconAlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-white">State: Backend Gateway Offline (503)</p>
              <p className="text-slate-300">
                The streaming backend at <code className="font-mono bg-black/40 px-1 py-0.5 rounded text-amber-300">{data.backendStatus.endpoint}</code> is currently unreachable.
                Media playback and live catalog lookups require the backend service to be running.
              </p>
            </div>
          </div>
          <Button
            variant="glass"
            size="sm"
            onClick={() => fetchUpdateStatus(true)}
            disabled={refreshing}
            className="text-xs font-semibold shrink-0"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Primary Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Installed Version Card */}
        <div className="p-5 rounded-2xl bg-[#0e1218] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Installed Engine Version</span>
            <span className="font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-white/10">
              {data?.backendStatus.online ? 'Live Gateway' : 'Offline'}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              {data ? (data.backendStatus.online ? `v${data.installedVersion}` : 'Offline') : '...'}
            </span>
            <span className="text-xs text-slate-400">Rust Core</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1 border-t border-white/5">
            <span className={`w-2 h-2 rounded-full ${data?.backendStatus.online ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            <span>{data?.backendStatus.online ? 'Verified via backend gateway' : 'Gateway unreachable (503)'}</span>
          </div>
        </div>

        {/* State 1: Upstream Official Version & Update Available */}
        <div className="p-5 rounded-2xl bg-[#0e1218] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Upstream Official Release</span>
            {data?.updateAvailable ? (
              <Badge variant="accent" size="sm" className="text-[10px] font-bold">
                Update Available
              </Badge>
            ) : (
              <Badge variant="outline" size="sm" className="text-[10px] text-emerald-400 border-emerald-500/30">
                Up to Date
              </Badge>
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-mono">
              v{data ? data.latestVersion : '...'}
            </span>
            <span className="text-xs text-slate-400">GitHub Release</span>
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-white/5">
            <span>Released: {data?.latestRelease?.published_at ? new Date(data.latestRelease.published_at).toLocaleDateString() : 'Recent'}</span>
            {data?.latestRelease?.html_url && (
              <a
                href={data.latestRelease.html_url}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-0.5"
              >
                Notes <IconArrowRightUp className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Streaming Gateway Status Card */}
        <div className="p-5 rounded-2xl bg-[#0e1218] border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Backend Gateway Daemon</span>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data?.backendStatus?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {data?.backendStatus?.online ? 'Online' : 'Offline / Standby'}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 truncate pt-1 border-t border-white/5">
            Endpoint: <span className="font-mono text-slate-300">{data?.backendStatus?.endpoint || 'Canonical Backend'}</span>
          </div>
        </div>
      </div>

      {/* Root-Cause Diagnostic Advisory */}
      <div className="p-5 rounded-2xl bg-[#0e1218] border border-amber-500/20 text-xs space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
          <IconAlertCircle className="w-4 h-4" />
          <span>Catalog Diagnostic Notice: "Unable to load movies"</span>
        </div>
        <p className="text-slate-300 leading-relaxed">
          The movies catalog loading issue occurs when the backend daemon or network tunnel (<code className="text-amber-300 bg-black/40 px-1 py-0.5 rounded">desktop-p1cthbu.tailbb54ee.ts.net</code>) is offline following system reboot, returning an HTTP 503 Service Unavailable.
        </p>
        <p className="text-slate-400 leading-relaxed">
          Upstream diff analysis confirms that the MovieBox scraper client was <strong className="text-white">not modified</strong> in <code className="text-white">v0.1.24</code>. Updating the engine version is an administrative maintenance task and will not resolve an offline background service.
        </p>
      </div>

      {/* State 7: Rollback Architecture Card */}
      <div className="p-6 rounded-3xl bg-[#0e1218] border border-white/10 space-y-4">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <IconShieldTick className="w-4 h-4 text-emerald-400" />
          <span>State: Rollback Architecture & Concurrency Mutex</span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          For security and serverless architecture integrity, CineVault decouples update inspection from installation. Vercel routes never execute Cargo, Git, or arbitrary shell commands. Actual dependency compilation, test verification, and atomic rollback execute strictly on the authorized backend host machine with mutex protection.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="font-bold text-white block">1. Serverless Decoupling</span>
            <p>Vercel never runs Cargo, Git, or shell commands. Zero risk of SSRF or filesystem exposure.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="font-bold text-white block">2. Mutex Concurrency Lock</span>
            <p>An active lockfile (<code className="text-slate-200">.updater.lock</code>) prevents concurrent update executions.</p>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
            <span className="font-bold text-white block">3. Atomic Rollback</span>
            <p>If compilation or tests fail on the backend host, <code className="text-slate-200">Cargo.toml</code> and <code className="text-slate-200">Cargo.lock</code> are immediately restored from backups.</p>
          </div>
        </div>
      </div>

      {/* Release Notes & Changelog Section */}
      <div className="p-6 rounded-3xl bg-[#0e1218] border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="space-y-0.5">
            <h2 className="text-base font-bold text-white">Release Notes: v{data?.latestVersion}</h2>
            <p className="text-xs text-slate-400">
              Official changelog published by the MovieBox-TUI upstream maintainers.
            </p>
          </div>
          {data?.checkedAt && (
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <IconClockCircle className="w-3.5 h-3.5" />
              Checked {new Date(data.checkedAt).toLocaleTimeString()}
            </span>
          )}
        </div>

        <div className="bg-black/40 rounded-2xl p-4 sm:p-5 border border-white/5 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed">
          {data?.versionDiffNotes || 'Loading release notes...'}
        </div>
      </div>

      {/* Update Preparation Modal: States 4 (Dry-Run), 5 (In Progress), 6 (Success), 7 (Rollback) */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-xl bg-[#0e1218] border border-white/15 rounded-3xl p-6 sm:p-7 space-y-6 shadow-2xl relative">
            <button
              onClick={() => {
                if (!preparingUpdate) setShowUpdateModal(false);
              }}
              disabled={preparingUpdate}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              aria-label="Close"
            >
              <IconClose className="w-5 h-5" />
            </button>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                  <IconBolt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    Update Workflow: MovieBox-TUI v{data?.latestVersion}
                  </h3>
                  <div className="flex items-center gap-2 pt-0.5">
                    {/* State 4: Dry-Run Indicator */}
                    {isDryRunMode ? (
                      <Badge variant="accent" size="sm" className="text-[10px]">
                        State: Dry-Run Simulation (0 files modified)
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm" className="text-[10px] text-slate-300">
                        Mode: Production Host Updater
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-slate-300 space-y-2.5">
              <div className="flex items-center gap-2">
                <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verifies target release tag with official GitHub API</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Enforces strict stable semver (no arbitrary scripts or binaries)</span>
              </div>
              <div className="flex items-center gap-2">
                <IconCheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Requires authorized host execution with atomic rollback protection</span>
              </div>
            </div>

            {/* State 5: Update in Progress Indicator */}
            {preparingUpdate && (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-xs text-primary flex items-center gap-3 animate-pulse">
                <IconRefresh className="w-5 h-5 animate-spin shrink-0" />
                <div>
                  <p className="font-bold text-white">State: Update in Progress...</p>
                  <p className="text-slate-300 text-[11px]">Validating upstream release tags and generating verified host commands.</p>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {prepError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 space-y-1">
                <p className="font-bold text-white">Verification Error</p>
                <p>{prepError}</p>
              </div>
            )}

            {/* State 6: Success & State 4: Dry-Run Result */}
            {prepResult && (
              <div className="space-y-4 p-4 rounded-2xl bg-black/50 border border-white/10 text-xs">
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-white text-[11px]">
                      {prepResult.dryRun ? 'State: Dry-Run Verification' : 'State: Verification Success'}
                    </p>
                    <Badge variant={prepResult.success ? 'outline' : 'accent'} size="sm" className="text-[10px] text-emerald-400 border-emerald-500/30">
                      {prepResult.success ? 'PASSED' : 'FAILED'}
                    </Badge>
                  </div>
                  {prepResult.steps.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-300">
                      <span>{s.name}</span>
                      <span className={s.status === 'success' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                        {s.status.toUpperCase()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Host Command Display */}
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <p className="text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                    <IconCPU className="w-3.5 h-3.5 text-primary" />
                    Authorized Host Updater Command:
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Run this command in the <code className="text-white">moviebox-tui-repo</code> directory on the backend host machine:
                  </p>
                  <div className="p-3 rounded-xl bg-black border border-white/10 font-mono text-[11px] text-emerald-400 flex items-center justify-between gap-2 break-all">
                    <span>{prepResult.dryRun ? prepResult.hostUpdater.dryRunCommand : prepResult.hostUpdater.command}</span>
                    <button
                      onClick={() => copyToClipboard(prepResult.dryRun ? prepResult.hostUpdater.dryRunCommand : prepResult.hostUpdater.command, 'apply')}
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                      title="Copy command"
                    >
                      <IconCopy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {copiedCmd === 'apply' && (
                    <p className="text-[10px] text-emerald-400 font-semibold">✓ Copied to clipboard!</p>
                  )}

                  {!prepResult.dryRun && prepResult.hostUpdater.restartCommand && (
                    <div className="pt-2">
                      <p className="text-[11px] text-slate-400 mb-1">Or run full lifecycle (compile + safe process restart + live /health check):</p>
                      <div className="p-2.5 rounded-xl bg-black/60 border border-white/5 font-mono text-[11px] text-slate-300 flex items-center justify-between gap-2 break-all">
                        <span>{prepResult.hostUpdater.restartCommand}</span>
                        <button
                          onClick={() => copyToClipboard(prepResult.hostUpdater.restartCommand, 'restart')}
                          className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white shrink-0"
                          title="Copy command"
                        >
                          <IconCopy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {copiedCmd === 'restart' && (
                        <p className="text-[10px] text-emerald-400 font-semibold">✓ Full lifecycle command copied!</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mode selection & Confirmation */}
            {!prepResult?.success && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <span className="text-xs text-slate-300 font-medium">Execution Mode:</span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="radio"
                      name="updateMode"
                      checked={!isDryRunMode}
                      onChange={() => setIsDryRunMode(false)}
                      disabled={preparingUpdate}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Live Host Update</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="radio"
                      name="updateMode"
                      checked={isDryRunMode}
                      onChange={() => setIsDryRunMode(true)}
                      disabled={preparingUpdate}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Dry-Run Simulation</span>
                  </label>
                </div>

                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedCheckbox}
                    onChange={(e) => setConfirmedCheckbox(e.target.checked)}
                    disabled={preparingUpdate}
                    className="mt-0.5 rounded border-white/20 bg-black/50 text-primary focus:ring-primary h-4 w-4"
                  />
                  <span className="text-xs text-slate-300">
                    I confirm that I am an authorized administrator and want to verify and prepare the host updater workflow for v{data?.latestVersion}.
                  </span>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowUpdateModal(false)}
                disabled={preparingUpdate}
                className="text-xs"
              >
                {prepResult?.success ? 'Close' : 'Cancel'}
              </Button>

              {!prepResult?.success && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handlePrepareUpdate(isDryRunMode)}
                  disabled={!confirmedCheckbox || preparingUpdate}
                  className="text-xs font-bold gap-1.5"
                >
                  <IconShieldTick className={`w-3.5 h-3.5 ${preparingUpdate ? 'animate-spin' : ''}`} />
                  {preparingUpdate ? 'Verifying...' : isDryRunMode ? 'Run Dry-Run Check' : 'Verify & Generate Command'}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
