import { RUST_API_BASE, CANONICAL_BACKEND_URL } from '@/lib/api/moviebox-client';

export interface UpstreamRelease {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  html_url: string;
  prerelease: boolean;
}

export interface BackendStatus {
  online: boolean;
  version: string | null;
  endpoint: string;
  error?: string;
}

export interface UpdateWorkflowInfo {
  scriptName: string;
  recommendedCommand: string;
  dryRunCommand: string;
  restartCommand: string;
  safetyGuarantees: string[];
}

export interface UpdateCheckResult {
  installedVersion: string;
  installedSource: 'gateway' | 'offline';
  latestVersion: string;
  updateAvailable: boolean;
  latestRelease: UpstreamRelease | null;
  recentReleases: UpstreamRelease[];
  versionDiffNotes: string;
  backendStatus: BackendStatus;
  updateWorkflow: UpdateWorkflowInfo;
  checkFailed: boolean;
  checkErrorMessage?: string;
  checkedAt: string;
}

export interface VerificationStep {
  name: string;
  status: 'success' | 'failed' | 'skipped';
  message: string;
}

export interface UpdatePreparationResult {
  success: boolean;
  targetVersion: string;
  installedVersion: string;
  verified: boolean;
  dryRun: boolean;
  message: string;
  steps: VerificationStep[];
  hostUpdater: {
    script: string;
    command: string;
    dryRunCommand: string;
    restartCommand: string;
  };
  error?: string;
  code?: 'INVALID_VERSION' | 'UNVERIFIED_RELEASE' | 'CONCURRENT_REQUEST' | 'INTERNAL_ERROR';
}

// In-memory cache for GitHub release queries (5-minute TTL)
let cachedCheckResult: { data: UpdateCheckResult; expiresAt: number } | null = null;
let inFlightCheck: Promise<UpdateCheckResult> | null = null;
let isPrepareInProgress = false;

// Strict stable semver regex: digits and dots only, exactly three parts, max 4 digits per part.
// Prevents any command injection, path traversal, or shell metacharacters.
const STABLE_SEMVER_REGEX = /^[0-9]{1,4}\.[0-9]{1,4}\.[0-9]{1,4}$/;

/**
 * Standard semantic version comparison: returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export function compareSemver(v1: string, v2: string): number {
  const clean1 = v1.replace(/^v/i, '').trim();
  const clean2 = v2.replace(/^v/i, '').trim();

  const parts1 = clean1.split('.').map((p) => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map((p) => parseInt(p, 10) || 0);

  const len = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < len; i++) {
    const a = parts1[i] || 0;
    const b = parts2[i] || 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}

/**
 * Fetches official upstream releases from GitHub API with bounded 8s timeout.
 * Filters strictly to stable (non-prerelease) releases.
 */
export async function fetchUpstreamReleases(): Promise<UpstreamRelease[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('https://api.github.com/repos/mesamirh/MovieBox-Tui/releases?per_page=15', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'CineVault-Admin-Update-Checker',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`GitHub API returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid GitHub API response structure: expected array');
    }

    return data
      .filter((r: any) => !r.prerelease)
      .map((r: any) => ({
        tag_name: String(r.tag_name || '').trim(),
        name: String(r.name || r.tag_name || 'Release').trim(),
        published_at: String(r.published_at || '').trim(),
        body: String(r.body || '').trim(),
        html_url: String(r.html_url || '').trim(),
        prerelease: false,
      }));
  } catch (err: any) {
    clearTimeout(timer);
    throw new Error(`Upstream release check failed: ${err.message || err}`);
  }
}

/**
 * Checks the live backend gateway health by querying the canonical backend /health endpoint.
 * Never queries localhost in production or on Vercel.
 * Bounded timeout of 3500ms prevents hanging.
 * Never exposes credentials, tokens, or local filesystem paths.
 */
export async function checkBackendGatewayHealth(): Promise<BackendStatus> {
  const targetBase = RUST_API_BASE || CANONICAL_BACKEND_URL;
  const canonicalUrl = `${targetBase.replace(/\/+$/, '')}/health`;
  const sanitizedEndpoint = targetBase.replace(/\/+$/, '');

  try {
    const remoteCtrl = new AbortController();
    const remoteTimer = setTimeout(() => remoteCtrl.abort(), 3500);
    const remoteRes = await fetch(canonicalUrl, { signal: remoteCtrl.signal, cache: 'no-store' });
    clearTimeout(remoteTimer);

    if (remoteRes.ok) {
      const data = await remoteRes.json();
      return {
        online: true,
        version: typeof data.version === 'string' ? data.version.trim() : null,
        endpoint: sanitizedEndpoint,
      };
    }
  } catch (e: any) {
    // Backend is offline or unreachable
  }

  return {
    online: false,
    version: null,
    endpoint: sanitizedEndpoint,
    error: 'Backend service offline or unreachable (503)',
  };
}

/**
 * Builds the update workflow details with safe, copyable host-side commands.
 */
export function buildUpdateWorkflowInfo(targetVersion: string): UpdateWorkflowInfo {
  const clean = targetVersion.replace(/^v/i, '').trim();
  return {
    scriptName: 'scripts/safe-updater.ps1',
    recommendedCommand: `powershell -ExecutionPolicy Bypass -File .\\scripts\\safe-updater.ps1 -TargetVersion ${clean}`,
    dryRunCommand: `powershell -ExecutionPolicy Bypass -File .\\scripts\\safe-updater.ps1 -TargetVersion ${clean} -DryRun`,
    restartCommand: `powershell -ExecutionPolicy Bypass -File .\\scripts\\safe-updater.ps1 -TargetVersion ${clean} -RestartService`,
    safetyGuarantees: [
      'Strictly pins dependencies to verified official GitHub stable release tags',
      'Atomic backup of Cargo.toml and Cargo.lock before modification',
      'Automated cargo check and cargo test build verification',
      'Automatic atomic rollback if any compilation or test step fails',
      'Concurrency mutex prevents duplicate updates running simultaneously',
      'Isolated to authorized backend machine — no remote command execution on Vercel',
    ],
  };
}

/**
 * Comprehensive update check combining installed gateway metadata and upstream releases.
 * Fully decoupled from host filesystem and serverless-safe.
 * Includes concurrency coalescing to prevent redundant API calls.
 */
export async function checkMovieBoxUpdates(forceFresh: boolean = false): Promise<UpdateCheckResult> {
  const now = Date.now();
  if (!forceFresh && cachedCheckResult && cachedCheckResult.expiresAt > now) {
    return cachedCheckResult.data;
  }

  if (inFlightCheck) {
    return inFlightCheck;
  }

  inFlightCheck = (async () => {
    try {
      const backendStatus = await checkBackendGatewayHealth();

      let releases: UpstreamRelease[] = [];
      let upstreamError: string | null = null;
      try {
        releases = await fetchUpstreamReleases();
      } catch (err: any) {
        upstreamError = err.message || String(err);
      }

      const latestRelease = releases[0] || null;
      const latestVersion = latestRelease ? latestRelease.tag_name.replace(/^v/i, '').trim() : '0.1.24';

      const installedVersion = backendStatus.online && backendStatus.version
        ? backendStatus.version
        : 'Unavailable (Backend Offline)';
      const installedSource = backendStatus.online ? 'gateway' : 'offline';

      const updateAvailable = backendStatus.online && backendStatus.version
        ? compareSemver(latestVersion, backendStatus.version) > 0
        : false;

      let versionDiffNotes = '';
      if (latestRelease && latestRelease.body) {
        versionDiffNotes = latestRelease.body;
      } else if (upstreamError) {
        versionDiffNotes = `Notice: Unable to fetch release notes from GitHub (${upstreamError}).`;
      } else {
        versionDiffNotes = 'Running the latest confirmed release.';
      }

      const updateWorkflow = buildUpdateWorkflowInfo(latestVersion);

      const result: UpdateCheckResult = {
        installedVersion,
        installedSource,
        latestVersion,
        updateAvailable,
        latestRelease,
        recentReleases: releases.slice(0, 5),
        versionDiffNotes,
        backendStatus,
        updateWorkflow,
        checkFailed: !!upstreamError && releases.length === 0,
        checkErrorMessage: upstreamError || undefined,
        checkedAt: new Date().toISOString(),
      };

      cachedCheckResult = {
        data: result,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };

      return result;
    } finally {
      inFlightCheck = null;
    }
  })();

  return inFlightCheck;
}

/**
 * Validates a target update version against official upstream releases and strict semantic formatting.
 * Does NOT execute any system commands or modify any files on the Next.js/Vercel host.
 * Includes concurrency locking to prevent multiple preparations simultaneously.
 */
export async function prepareSafeUpdate(options: {
  targetVersion: string;
  dryRun?: boolean;
}): Promise<UpdatePreparationResult> {
  if (isPrepareInProgress) {
    return {
      success: false,
      targetVersion: options.targetVersion,
      installedVersion: 'unknown',
      verified: false,
      dryRun: !!options.dryRun,
      message: 'Another update preparation is currently in progress. Please wait a moment and retry.',
      steps: [
        {
          name: 'Concurrency Lock',
          status: 'failed',
          message: 'Concurrent update preparation request rejected to prevent race conditions.',
        },
      ],
      hostUpdater: { script: '', command: '', dryRunCommand: '', restartCommand: '' },
      error: 'Concurrent update request rejected.',
      code: 'CONCURRENT_REQUEST',
    };
  }

  isPrepareInProgress = true;
  try {
    const steps: VerificationStep[] = [];
    const targetClean = options.targetVersion.replace(/^v/i, '').trim();

    // Step 1: Semantic Version Format Validation (strictly digits and dots)
    if (!STABLE_SEMVER_REGEX.test(targetClean)) {
      return {
        success: false,
        targetVersion: targetClean,
        installedVersion: 'unknown',
        verified: false,
        dryRun: !!options.dryRun,
        message: `Invalid semantic version string: "${options.targetVersion}". Only stable releases (e.g., 0.1.24) with digits and dots are permitted.`,
        steps: [
          {
            name: 'Version Syntax Validation',
            status: 'failed',
            message: `Invalid format: "${options.targetVersion}". Special characters and wildcards are strictly prohibited.`,
          },
        ],
        hostUpdater: { script: '', command: '', dryRunCommand: '', restartCommand: '' },
        error: `Invalid version syntax "${options.targetVersion}".`,
        code: 'INVALID_VERSION',
      };
    }

    steps.push({
      name: 'Version Syntax Validation',
      status: 'success',
      message: `Stable semver format verified: v${targetClean}`,
    });

    // Step 2: Upstream GitHub Tag Verification (official stable releases only)
    const releases = await fetchUpstreamReleases().catch(() => []);
    const matchingRelease = releases.find(
      (r) => r.tag_name.replace(/^v/i, '').trim() === targetClean
    );

    if (!matchingRelease) {
      return {
        success: false,
        targetVersion: targetClean,
        installedVersion: 'unknown',
        verified: false,
        dryRun: !!options.dryRun,
        message: `Target version "${targetClean}" does not match any official upstream stable release tag on GitHub.`,
        steps: [
          ...steps,
          {
            name: 'Upstream Release Verification',
            status: 'failed',
            message: `Version v${targetClean} not found in upstream mesamirh/MovieBox-Tui stable releases.`,
          },
        ],
        hostUpdater: { script: '', command: '', dryRunCommand: '', restartCommand: '' },
        error: `Unverified release: version "${targetClean}" not found in upstream releases.`,
        code: 'UNVERIFIED_RELEASE',
      };
    }

    steps.push({
      name: 'Upstream Release Verification',
      status: 'success',
      message: `Verified against official stable release: "${matchingRelease.name}" (${matchingRelease.tag_name})`,
    });

    // Step 3: Backend Gateway Health Check
    const backendHealth = await checkBackendGatewayHealth();
    steps.push({
      name: 'Backend Gateway Reachability',
      status: backendHealth.online ? 'success' : 'skipped',
      message: backendHealth.online
        ? `Gateway online at ${backendHealth.endpoint} (reported version: v${backendHealth.version || 'unknown'})`
        : 'Backend gateway is currently offline (503). Update can be prepared and verified on host machine.',
    });

    const workflow = buildUpdateWorkflowInfo(targetClean);

    return {
      success: true,
      targetVersion: targetClean,
      installedVersion: backendHealth.version || 'unknown',
      verified: true,
      dryRun: !!options.dryRun,
      message: options.dryRun
        ? `Dry-run pre-flight checks passed for v${targetClean}. Pre-flight verified without modifying source files.`
        : `Pre-flight verification passed for v${targetClean}. Pinned host update command generated.`,
      steps,
      hostUpdater: {
        script: workflow.scriptName,
        command: workflow.recommendedCommand,
        dryRunCommand: workflow.dryRunCommand,
        restartCommand: workflow.restartCommand,
      },
    };
  } finally {
    isPrepareInProgress = false;
  }
}
