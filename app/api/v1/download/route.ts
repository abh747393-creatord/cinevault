import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { providerResolver } from '@/lib/providers/resolver';
import { RUST_API_BASE } from '@/lib/api/moviebox-client';
import { MIDNIGHT_COOKIE_NAME, verifyMidnightSessionToken } from '@/lib/security/midnight-session';
import { getMidnightSettings } from '@/lib/security/midnight-store';
import { sanitizeFilename, formatDownloadFilename } from '@/lib/download/download-manager';
import {
  resolveFfmpegPath,
  parseDashManifest,
  downloadTrackSegments,
  muxTracksWithFfmpeg,
  sweepStaleTempFiles,
} from '@/lib/download/dash-processor';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contentId = searchParams.get('contentId');
  const typeParam = searchParams.get('type');
  const seasonStr = searchParams.get('season') || '0';
  const episodeStr = searchParams.get('episode') || '0';
  const episodeId = searchParams.get('episodeId') || undefined;
  const streamIndexStr = searchParams.get('streamIndex') || '0';
  const requestedQuality = searchParams.get('quality') || undefined;
  const sourceUrl = searchParams.get('sourceUrl') || undefined;
  const audioTrackId = searchParams.get('audioTrackId') || undefined;
  const isMidnightParam = searchParams.get('isMidnight') === 'true';
  const maxSegmentsParam = searchParams.get('maxSegments');
  const maxSegments = maxSegmentsParam ? parseInt(maxSegmentsParam, 10) : undefined;

  if (!contentId || typeof contentId !== 'string') {
    return NextResponse.json({ error: 'Missing contentId parameter' }, { status: 400 });
  }

  const seasonNumber = parseInt(seasonStr, 10) || 1;
  const episodeNumber = parseInt(episodeStr, 10) || 0;
  const streamIndex = parseInt(streamIndexStr, 10) || 0;

  // 1. Immediate Midnight / Mature Content Authorization Gate
  const sessionCookie = request.cookies.get(MIDNIGHT_COOKIE_NAME)?.value;
  const settings = await getMidnightSettings();
  const sessionCheck = verifyMidnightSessionToken(sessionCookie, settings.passcodeVersion);

  if (isMidnightParam || contentId.toLowerCase().includes('midnight')) {
    if (!sessionCheck.valid || !sessionCheck.disclaimerAccepted) {
      return NextResponse.json(
        { error: 'Midnight authorization and age verification required to download this media.' },
        { status: 403 }
      );
    }
  }

  // 2. Resolve content details for metadata & security checks
  let content = null;
  let isTv = typeParam === 'tv' || episodeNumber > 0 || !!episodeId;

  if (isTv) {
    content = await providerResolver.resolveTvShow(contentId);
    if (!content) {
      content = await providerResolver.resolveMovie(contentId);
      if (content) isTv = false;
    }
  } else {
    content = await providerResolver.resolveMovie(contentId);
    if (!content) {
      content = await providerResolver.resolveTvShow(contentId);
      if (content) isTv = true;
    }
  }

  if (!content) {
    return NextResponse.json({ error: 'Content details not found' }, { status: 404 });
  }

  // Post-resolve check for Midnight genre tag
  const hasMidnightGenre =
    content.genres?.some((g) => g.id === 'g-midnight' || g.slug === 'midnight') ||
    content.title?.toLowerCase().includes('midnight');

  if (hasMidnightGenre && (!sessionCheck.valid || !sessionCheck.disclaimerAccepted)) {
    return NextResponse.json(
      { error: 'Midnight authorization and age verification required to download this media.' },
      { status: 403 }
    );
  }

  // 3. Resolve legitimate provider streams
  const resolvedStreams = await providerResolver.resolveStreams(
    content.id,
    episodeId || (episodeNumber > 0 ? `s${seasonNumber}e${episodeNumber}` : undefined),
    audioTrackId
  );

  console.log('[DownloadApi] content.id:', content.id, 'resolvedStreams count:', resolvedStreams?.length, 'url:', resolvedStreams?.[0]?.url);

  if (!resolvedStreams || resolvedStreams.length === 0) {
    return NextResponse.json(
      { error: 'No downloadable provider streams available for this content.' },
      { status: 404 }
    );
  }

  // Match requested stream against server-resolved list to prevent SSRF
  let targetStream = resolvedStreams[0];
  if (sourceUrl) {
    const matched = resolvedStreams.find(
      (s) => s.url === sourceUrl || s.url.includes(sourceUrl) || sourceUrl.includes(s.url)
    );
    if (matched) targetStream = matched;
  } else if (streamIndex < resolvedStreams.length) {
    targetStream = resolvedStreams[streamIndex];
  }

  if (!targetStream?.url) {
    return NextResponse.json(
      { error: 'Download unavailable for this source.' },
      { status: 422 }
    );
  }

  // 4. Construct clean, OS-compliant filename
  let activeEpisode = undefined;
  if (isTv || content.contentType === 'tv') {
    if (content.seasons) {
      for (const s of content.seasons) {
        const ep = s.episodes.find(
          (e) => e.id === episodeId || e.episodeNumber === episodeNumber
        );
        if (ep) {
          activeEpisode = ep;
          break;
        }
      }
    }
    if (!activeEpisode && episodeNumber > 0) {
      activeEpisode = {
        id: episodeId || `s${seasonNumber}e${episodeNumber}`,
        seasonId: `s-${seasonNumber}`,
        episodeNumber,
        title: `Episode ${episodeNumber}`,
        description: `Season ${seasonNumber} Episode ${episodeNumber}`,
        thumbnailUrl: '',
        runtime: 45,
      };
    }
  }

  const filename = formatDownloadFilename(content, activeEpisode, seasonNumber);

  // 5. Determine Stream Type: Direct MP4 vs DASH vs HLS
  let rawUrl = targetStream.url;
  if (rawUrl.startsWith('/')) {
    rawUrl = `${RUST_API_BASE}${rawUrl}`;
  }

  const isDash =
    rawUrl.includes('.mpd') || rawUrl.includes('/dash/') || rawUrl.includes('/manifest.mpd');
  const isHls = rawUrl.includes('.m3u8');

  // --- CASE A: Direct MP4 / Progressive Stream ---
  if (!isDash && !isHls) {
    try {
      const forwardHeaders: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://sportslive.wine',
      };

      const range = request.headers.get('range');
      if (range) forwardHeaders['Range'] = range;

      const upstreamRes = await fetch(rawUrl, {
        headers: forwardHeaders,
      });

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return NextResponse.json(
          { error: `Upstream download failed with status ${upstreamRes.status}` },
          { status: upstreamRes.status }
        );
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Content-Type', upstreamRes.headers.get('content-type') || 'video/mp4');
      const safeFilename = filename.replace(/["\r\n]/g, '_');
      responseHeaders.set('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
      responseHeaders.set('Accept-Ranges', 'bytes');

      const cl = upstreamRes.headers.get('content-length');
      if (cl) responseHeaders.set('Content-Length', cl);

      const cr = upstreamRes.headers.get('content-range');
      if (cr) responseHeaders.set('Content-Range', cr);

      return new NextResponse(upstreamRes.body, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    } catch (err: any) {
      console.error('[DownloadApi] Direct MP4 download error:', err);
      return NextResponse.json(
        { error: 'Unable to stream download file from provider.' },
        { status: 502 }
      );
    }
  }

  // --- CASE B: DASH Stream (.mpd) ---
  if (isDash) {
    try {
      // First, check if there is an alternate direct MP4 mirror available among resolved streams
      const directMirror = resolvedStreams.find(
        (s) =>
          s.url &&
          !s.url.includes('.mpd') &&
          !s.url.includes('/dash/') &&
          !s.url.includes('.m3u8')
      );

      if (directMirror?.url) {
        let directUrl = directMirror.url;
        if (directUrl.startsWith('/')) {
          directUrl = `${RUST_API_BASE}${directUrl}`;
        }

        const upstreamRes = await fetch(directUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://sportslive.wine',
          },
        });

        if (upstreamRes.ok || upstreamRes.status === 206) {
          const responseHeaders = new Headers();
          responseHeaders.set('Content-Type', 'video/mp4');
          const safeFilename = filename.replace(/["\r\n]/g, '_');
          responseHeaders.set('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
          responseHeaders.set('Accept-Ranges', 'bytes');
          const cl = upstreamRes.headers.get('content-length');
          if (cl) responseHeaders.set('Content-Length', cl);

          return new NextResponse(upstreamRes.body, {
            status: upstreamRes.status,
            headers: responseHeaders,
          });
        }
      }

      // Fetch the DASH manifest
      const manifestRes = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: request.signal,
      });

      if (!manifestRes.ok) {
        console.error('[DownloadApi] manifest fetch failed:', rawUrl, 'status:', manifestRes.status);
        return NextResponse.json(
          { error: `Download unavailable for this DASH manifest (HTTP ${manifestRes.status}).` },
          { status: 502 }
        );
      }

      const xml = await manifestRes.text();

      // Dynamic MPD parsing: locates video & audio tracks
      const { baseUrl, video, audio } = parseDashManifest(
        xml,
        rawUrl,
        requestedQuality,
        audioTrackId
      );

      // Safe temporary directory for processing
      const tempDir = path.join(
        os.tmpdir(),
        'cinevault-download',
        `${Date.now()}-${crypto.randomUUID()}`
      );
      await fs.promises.mkdir(tempDir, { recursive: true });

      const videoTrackPath = path.join(tempDir, 'video-track.mp4');
      const audioTrackPath = path.join(tempDir, 'audio-track.mp4');
      const outputPath = path.join(tempDir, 'output.mp4');

      const ffmpegPath = resolveFfmpegPath();
      if (!ffmpegPath) {
        console.warn('[DownloadApi] FFmpeg unavailable in environment. Streaming video track directly.');
        await downloadTrackSegments({
          baseUrl,
          representation: video,
          outputPath: videoTrackPath,
          maxSegments,
          abortSignal: request.signal,
        });

        const videoStream = fs.createReadStream(videoTrackPath);
        videoStream.on('close', () => {
          try {
            fs.rmSync(tempDir, { recursive: true, force: true });
          } catch {}
        });

        const safeFilename = filename.replace(/["\r\n]/g, '_');
        const headers = new Headers();
        headers.set('Content-Type', 'video/mp4');
        headers.set(
          'Content-Disposition',
          `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
        headers.set('Accept-Ranges', 'bytes');
        const st = fs.statSync(videoTrackPath);
        headers.set('Content-Length', String(st.size));

        return new NextResponse(videoStream as unknown as ReadableStream, {
          status: 200,
          headers,
        });
      }

      try {
        // Download video and audio tracks concurrently directly to temp files
        await Promise.all([
          downloadTrackSegments({
            baseUrl,
            representation: video,
            outputPath: videoTrackPath,
            maxSegments,
            abortSignal: request.signal,
          }),
          downloadTrackSegments({
            baseUrl,
            representation: audio,
            outputPath: audioTrackPath,
            maxSegments,
            abortSignal: request.signal,
          }),
        ]);

        if (request.signal.aborted) {
          throw new Error('Download aborted by user.');
        }

        // Mux video and audio tracks with FFmpeg stream copy (no re-encoding)
        await muxTracksWithFfmpeg({
          ffmpegPath,
          videoPath: videoTrackPath,
          audioPath: audioTrackPath,
          outputPath,
          abortSignal: request.signal,
        });

        // Clean up intermediate raw track files immediately to save disk space
        await Promise.all([
          fs.promises.unlink(videoTrackPath).catch(() => {}),
          fs.promises.unlink(audioTrackPath).catch(() => {}),
        ]);

        const stat = await fs.promises.stat(outputPath);
        const fileStream = fs.createReadStream(outputPath);

        // Stream output MP4 to client and delete temp folder on finish or abort
        const webStream = new ReadableStream({
          start(controller) {
            fileStream.on('data', (chunk) => {
              controller.enqueue(chunk);
            });
            fileStream.on('end', () => {
              try {
                controller.close();
              } catch {}
              fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            });
            fileStream.on('error', (err) => {
              try {
                controller.error(err);
              } catch {}
              fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
            });
          },
          cancel() {
            fileStream.destroy();
            fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
          },
        });

        // Trigger background cleanup of any abandoned temp files older than 30 minutes
        sweepStaleTempFiles().catch(() => {});

        const responseHeaders = new Headers();
        responseHeaders.set('Content-Type', 'video/mp4');
        const safeFilename = filename.replace(/["\r\n]/g, '_');
        responseHeaders.set(
          'Content-Disposition',
          `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
        );
        responseHeaders.set('Content-Length', String(stat.size));
        responseHeaders.set('Accept-Ranges', 'bytes');

        return new NextResponse(webStream, {
          status: 200,
          headers: responseHeaders,
        });
      } catch (err: any) {
        await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});
        throw err;
      }
    } catch (dashErr: any) {
      console.error('[DownloadApi] DASH processing error:', dashErr);
      return NextResponse.json(
        { error: 'Download unavailable for this DASH source. Try another available source.' },
        { status: 422 }
      );
    }
  }

  // --- CASE C: HLS Stream (.m3u8) ---
  return NextResponse.json(
    { error: 'Download unavailable for this HLS source. Please choose a progressive MP4 or DASH source.' },
    { status: 422 }
  );
}
