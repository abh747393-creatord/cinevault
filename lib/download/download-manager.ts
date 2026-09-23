import { ContentItem, Episode } from '@/types/content';

export interface DownloadProgress {
  status: 'idle' | 'resolving' | 'downloading' | 'completed' | 'cancelled' | 'error';
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes: number | null;
  bytesPerSecond: number;
  etaSeconds: number | null;
  error: string | null;
  filename: string | null;
}

export type ProgressCallback = (progress: DownloadProgress) => void;

/**
 * Sanitize strings into valid OS filenames across Windows, macOS, Linux, and Android.
 */
export function sanitizeFilename(name: string): string {
  if (!name) return 'media.mp4';
  const clean = name
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > 120 ? clean.substring(0, 120).trim() : clean;
}

/**
 * Format standard clean filename for Movies and TV episodes.
 * Movies: "Movie Name (2026).mp4"
 * TV Shows: "Series Name - S01E03.mp4"
 */
export function formatDownloadFilename(
  content: ContentItem,
  episode?: Episode,
  seasonNumber: number = 1
): string {
  const cleanTitle = sanitizeFilename(content.title || 'Video');

  if (content.contentType === 'tv' || episode) {
    const epNum = episode?.episodeNumber ?? 1;
    const sNum = episode?.seasonId
      ? parseInt(episode.seasonId.replace(/\D/g, ''), 10) || seasonNumber
      : seasonNumber;

    const sStr = String(sNum).padStart(2, '0');
    const epStr = String(epNum).padStart(2, '0');
    return `${cleanTitle} - S${sStr}E${epStr}.mp4`;
  }

  const yearStr = content.year ? ` (${content.year})` : '';
  return `${cleanTitle}${yearStr}.mp4`;
}

// Global active download tracker to prevent duplicate downloads
const activeDownloads = new Map<string, { abort: () => void }>();

export function isDownloadActive(key: string): boolean {
  return activeDownloads.has(key);
}

export function cancelDownload(key: string): void {
  const active = activeDownloads.get(key);
  if (active) {
    active.abort();
    activeDownloads.delete(key);
  }
}

export interface StartDownloadParams {
  content: ContentItem;
  episode?: Episode;
  seasonNumber?: number;
  streamIndex?: number;
  quality?: string;
  sourceUrl?: string;
  audioTrackId?: string;
  isMidnight?: boolean;
  onProgress?: ProgressCallback;
}

/**
 * Builds the canonical download endpoint URL with verified parameters.
 */
export function getDownloadUrl({
  content,
  episode,
  seasonNumber = 1,
  streamIndex = 0,
  quality,
  sourceUrl,
  audioTrackId,
  isMidnight,
}: StartDownloadParams): string {
  const queryParams = new URLSearchParams({
    contentId: content.id,
    season: String(seasonNumber),
    episode: String(episode?.episodeNumber || 0),
    streamIndex: String(streamIndex),
  });

  if (content.contentType) queryParams.set('type', content.contentType);
  if (episode?.id) queryParams.set('episodeId', episode.id);
  if (quality) queryParams.set('quality', quality);
  if (audioTrackId) queryParams.set('audioTrackId', audioTrackId);
  if (sourceUrl) queryParams.set('sourceUrl', sourceUrl);
  if (isMidnight) queryParams.set('isMidnight', 'true');

  return `/api/v1/download?${queryParams.toString()}`;
}

/**
 * Initiates native browser download using an anchor tag to stream directly to disk.
 */
export function triggerDirectDownload(params: StartDownloadParams): string {
  const url = getDownloadUrl(params);
  const filename = formatDownloadFilename(params.content, params.episode, params.seasonNumber);

  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return url;
}

/**
 * Initiates a genuine stream download with progress tracking and cancellation.
 */
export async function startDownload({
  content,
  episode,
  seasonNumber = 1,
  streamIndex = 0,
  quality,
  sourceUrl,
  audioTrackId,
  isMidnight,
  onProgress,
}: StartDownloadParams): Promise<void> {
  const downloadKey = `${content.id}:${episode?.id || 'movie'}`;

  if (activeDownloads.has(downloadKey)) {
    throw new Error('A download for this item is already in progress.');
  }

  const abortController = new AbortController();
  activeDownloads.set(downloadKey, {
    abort: () => abortController.abort(),
  });

  const filename = formatDownloadFilename(content, episode, seasonNumber);

  const report = (p: Partial<DownloadProgress>) => {
    if (onProgress) {
      onProgress({
        status: p.status || 'downloading',
        progress: p.progress ?? 0,
        downloadedBytes: p.downloadedBytes ?? 0,
        totalBytes: p.totalBytes ?? null,
        bytesPerSecond: p.bytesPerSecond ?? 0,
        etaSeconds: p.etaSeconds ?? null,
        error: p.error ?? null,
        filename,
      });
    }
  };

  report({ status: 'resolving', progress: 0 });

  try {
    const downloadEndpoint = getDownloadUrl({
      content,
      episode,
      seasonNumber,
      streamIndex,
      quality,
      sourceUrl,
      audioTrackId,
      isMidnight,
    });

    const res = await fetch(downloadEndpoint, {
      signal: abortController.signal,
    });

    if (!res.ok) {
      let errMsg = 'Download unavailable for this source.';
      try {
        const errJson = await res.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {}
      throw new Error(errMsg);
    }

    const totalHeader = res.headers.get('content-length');
    const totalBytes = totalHeader ? parseInt(totalHeader, 10) : null;

    if (!res.body) {
      throw new Error('No readable data received from download server.');
    }

    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let downloadedBytes = 0;
    const startTime = Date.now();
    let lastReportTime = startTime;

    report({
      status: 'downloading',
      progress: 0,
      downloadedBytes: 0,
      totalBytes,
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      if (value) {
        chunks.push(value);
        downloadedBytes += value.length;

        const now = Date.now();
        if (now - lastReportTime >= 250) {
          const elapsedSec = (now - startTime) / 1000;
          const bytesPerSecond = elapsedSec > 0 ? downloadedBytes / elapsedSec : 0;
          const progress = totalBytes && totalBytes > 0
            ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100))
            : 0;
          const etaSeconds = totalBytes && bytesPerSecond > 0 && totalBytes > downloadedBytes
            ? Math.round((totalBytes - downloadedBytes) / bytesPerSecond)
            : null;

          report({
            status: 'downloading',
            progress,
            downloadedBytes,
            totalBytes,
            bytesPerSecond,
            etaSeconds,
          });

          lastReportTime = now;
        }
      }
    }

    // Combine chunks into single Blob and trigger browser save
    const blob = new Blob(chunks as BlobPart[], { type: 'video/mp4' });
    const objectUrl = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
    }, 60000);

    report({
      status: 'completed',
      progress: 100,
      downloadedBytes,
      totalBytes: downloadedBytes,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError' || abortController.signal.aborted) {
      report({ status: 'cancelled', error: 'Download cancelled by user.' });
    } else {
      report({
        status: 'error',
        error: err?.message || 'Download failed. Please try another source.',
      });
    }
  } finally {
    activeDownloads.delete(downloadKey);
  }
}
