import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/auth/admin-guard';
import { checkMovieBoxUpdates, prepareSafeUpdate } from '@/lib/admin/update-checker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * GET /api/admin/updates
 * Gated by strict admin authorization (verifyAdminRequest).
 * Queries installed version (via backend /health), upstream releases, and backend gateway health.
 * Never executes shell commands or exposes filesystem paths.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized access' },
      { status: auth.statusCode || 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const forceFresh = searchParams.get('force') === 'true' || searchParams.get('refresh') === '1';

  try {
    const result = await checkMovieBoxUpdates(forceFresh);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[AdminUpdatesApi] Check failed:', err);
    return NextResponse.json(
      { error: 'Failed to inspect MovieBox-TUI updates', details: err.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/updates
 * Gated by strict admin authorization (verifyAdminRequest).
 * Validates version syntax and official upstream release tags.
 * Decoupled from host execution: returns pre-flight verification and host updater commands.
 * Never executes shell commands or modifies local repository files from the API route.
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAdminRequest(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: auth.error || 'Unauthorized access' },
      { status: auth.statusCode || 401 }
    );
  }

  try {
    const body = await request.json();
    const { confirm, targetVersion, dryRun } = body || {};

    if (!confirm) {
      return NextResponse.json(
        {
          error: 'Explicit administrator confirmation required before preparing an update.',
          code: 'CONFIRMATION_REQUIRED',
        },
        { status: 400 }
      );
    }

    if (!targetVersion || typeof targetVersion !== 'string') {
      return NextResponse.json(
        { error: 'Target version must be specified as a semantic version string (e.g. "0.1.24").' },
        { status: 400 }
      );
    }

    const result = await prepareSafeUpdate({
      targetVersion: targetVersion.trim(),
      dryRun: !!dryRun,
    });

    const status = result.success ? 200 : result.code === 'CONCURRENT_REQUEST' ? 429 : 400;
    return NextResponse.json(result, { status });
  } catch (err: any) {
    console.error('[AdminUpdatesApi] Update preparation failed:', err?.message || 'Unknown error');
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal error validating update',
      },
      { status: 500 }
    );
  }
}
