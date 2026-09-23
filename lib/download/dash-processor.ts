import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import { Readable } from 'stream';

export interface DashRepresentation {
  id: string;
  bandwidth: number;
  width?: number;
  height?: number;
  codecs: string;
  sampleRate?: number;
  initTemplate: string;
  mediaTemplate: string;
  segmentCount: number;
}

export interface ParsedDashManifest {
  baseUrl: string;
  video: DashRepresentation;
  audio: DashRepresentation;
}

/**
 * Dynamically resolves the FFmpeg executable across Windows, Linux, and macOS.
 */
export function resolveFfmpegPath(): string | null {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  // 1. Check system PATH via where.exe (Windows) or which (Unix)
  try {
    const cmd = process.platform === 'win32' ? 'where.exe ffmpeg' : 'which ffmpeg';
    const out = execSync(cmd, { stdio: ['pipe', 'pipe', 'ignore'] })
      .toString()
      .trim()
      .split(/\r?\n/)[0];
    if (out && fs.existsSync(out)) return out;
  } catch {}

  // 2. Check Windows WinGet install paths
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || '';
    if (localAppData) {
      const wingetPackages = path.join(localAppData, 'Microsoft', 'WinGet', 'Packages');
      if (fs.existsSync(wingetPackages)) {
        const findBin = (dir: string): string | null => {
          try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const e of entries) {
              const full = path.join(dir, e.name);
              if (e.isDirectory()) {
                if (e.name.toLowerCase() === 'bin' && fs.existsSync(path.join(full, 'ffmpeg.exe'))) {
                  return path.join(full, 'ffmpeg.exe');
                }
                const sub = findBin(full);
                if (sub) return sub;
              }
            }
          } catch {}
          return null;
        };
        const found = findBin(wingetPackages);
        if (found) return found;
      }
      const wingetLink = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', 'ffmpeg.exe');
      if (fs.existsSync(wingetLink)) return wingetLink;
    }
  }

  // 3. Check standard Unix paths
  for (const p of ['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/homebrew/bin/ffmpeg']) {
    if (fs.existsSync(p)) return p;
  }

  return null;
}

/**
 * Dynamically parses an MPEG-DASH MPD manifest to locate video & audio adaptation sets and representations.
 */
export function parseDashManifest(
  xml: string,
  rawUrl: string,
  requestedQuality?: string,
  requestedAudio?: string
): ParsedDashManifest {
  // 1. Extract BaseURL
  let baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1);
  const baseMatch = xml.match(/<BaseURL>([^<]+)<\/BaseURL>/i);
  if (baseMatch && baseMatch[1]) {
    baseUrl = baseMatch[1];
  }

  // 2. Parse AdaptationSets
  const adaptationSets: Array<{
    isVideo: boolean;
    isAudio: boolean;
    lang: string;
    representations: DashRepresentation[];
  }> = [];

  const setRegex = /<AdaptationSet([\s\S]*?)<\/AdaptationSet>/gi;
  let setMatch: RegExpExecArray | null;

  while ((setMatch = setRegex.exec(xml)) !== null) {
    const setHeader = setMatch[1];
    const fullSet = setMatch[0];

    const mimeType = (setHeader.match(/mimeType="([^"]+)"/i) || [])[1] || '';
    const contentType = (setHeader.match(/contentType="([^"]+)"/i) || [])[1] || '';
    const lang = (setHeader.match(/lang="([^"]+)"/i) || [])[1] || '';

    // SegmentTemplate at AdaptationSet level
    const setInitMatch = fullSet.match(/<SegmentTemplate[^>]*initialization="([^"]+)"/i);
    const setMediaMatch = fullSet.match(/<SegmentTemplate[^>]*media="([^"]+)"/i);

    const setInitTemplate = setInitMatch ? setInitMatch[1] : '';
    const setMediaTemplate = setMediaMatch ? setMediaMatch[1] : '';

    // Calculate segment count from timeline
    const timelineMatch = fullSet.match(/<SegmentTimeline>([\s\S]*?)<\/SegmentTimeline>/i);
    let setSegmentCount = 0;
    if (timelineMatch && timelineMatch[1]) {
      const sRegex = /<S\s+([^>]+)\/>/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = sRegex.exec(timelineMatch[1])) !== null) {
        const rMatch = sMatch[1].match(/r="(\d+)"/i);
        const repeat = rMatch ? parseInt(rMatch[1], 10) : 0;
        setSegmentCount += 1 + repeat;
      }
    }

    // Representations inside AdaptationSet
    const repRegex = /<Representation([\s\S]*?)(?:<\/Representation>|\/>)/gi;
    let repMatch: RegExpExecArray | null;
    const representations: DashRepresentation[] = [];

    while ((repMatch = repRegex.exec(fullSet)) !== null) {
      const repAttrs = repMatch[1];
      const id = (repAttrs.match(/\bid="([^"]+)"/i) || [])[1] || '';
      const bandwidth = parseInt((repAttrs.match(/\bbandwidth="(\d+)"/i) || [])[1] || '0', 10);
      const width = parseInt((repAttrs.match(/\bwidth="(\d+)"/i) || [])[1] || '0', 10);
      const height = parseInt((repAttrs.match(/\bheight="(\d+)"/i) || [])[1] || '0', 10);
      const codecs = (repAttrs.match(/\bcodecs="([^"]+)"/i) || [])[1] || '';
      const sampleRate = parseInt((repAttrs.match(/\baudioSamplingRate="(\d+)"/i) || [])[1] || '0', 10);

      const repInitMatch = repAttrs.match(/initialization="([^"]+)"/i);
      const repMediaMatch = repAttrs.match(/media="([^"]+)"/i);

      representations.push({
        id,
        bandwidth,
        width: width > 0 ? width : undefined,
        height: height > 0 ? height : undefined,
        codecs,
        sampleRate: sampleRate > 0 ? sampleRate : undefined,
        initTemplate: repInitMatch ? repInitMatch[1] : setInitTemplate || `init-stream$RepresentationID$.m4s`,
        mediaTemplate: repMediaMatch ? repMediaMatch[1] : setMediaTemplate || `chunk-stream$RepresentationID$-$Number%05d$.m4s`,
        segmentCount: setSegmentCount > 0 ? setSegmentCount : 50,
      });
    }

    const isVideo =
      contentType.toLowerCase() === 'video' ||
      mimeType.toLowerCase().startsWith('video') ||
      representations.some((r) => (r.height && r.height > 0) || /hev|avc|h26/i.test(r.codecs));

    const isAudio =
      contentType.toLowerCase() === 'audio' ||
      mimeType.toLowerCase().startsWith('audio') ||
      representations.some((r) => (r.sampleRate && r.sampleRate > 0) || /mp4a|aac/i.test(r.codecs));

    adaptationSets.push({
      isVideo,
      isAudio,
      lang,
      representations,
    });
  }

  // 3. Dynamically Select Video Representation
  const videoSets = adaptationSets.filter((s) => s.isVideo);
  const allVideoReps = videoSets.flatMap((s) => s.representations);
  allVideoReps.sort((a, b) => (b.height || 0) - (a.height || 0) || b.bandwidth - a.bandwidth);

  if (allVideoReps.length === 0) {
    throw new Error('No valid video representations found in DASH manifest.');
  }

  let selectedVideo = allVideoReps[0];
  if (requestedQuality && allVideoReps.length > 0) {
    const q = requestedQuality.toLowerCase();
    let targetHeight = 1080;
    if (q.includes('720')) targetHeight = 720;
    else if (q.includes('480')) targetHeight = 480;
    else if (q.includes('360')) targetHeight = 360;
    else if (q.includes('2160') || q.includes('4k')) targetHeight = 2160;

    selectedVideo = allVideoReps.reduce((prev, curr) => {
      const prevDiff = Math.abs((prev.height || 0) - targetHeight);
      const currDiff = Math.abs((curr.height || 0) - targetHeight);
      return currDiff < prevDiff ? curr : prev;
    }, allVideoReps[0]);
  }

  // 4. Dynamically Select Audio Representation
  const audioSets = adaptationSets.filter((s) => s.isAudio);
  if (audioSets.length === 0) {
    throw new Error('No valid audio adaptation sets found in DASH manifest.');
  }

  let selectedAudioSet = audioSets[0];
  if (requestedAudio && audioSets.length > 1) {
    const cleanAudioReq = requestedAudio.toLowerCase();
    const matchedSet = audioSets.find(
      (s) => s.lang && cleanAudioReq.includes(s.lang.toLowerCase())
    );
    if (matchedSet) selectedAudioSet = matchedSet;
  }

  const allAudioReps = selectedAudioSet.representations;
  allAudioReps.sort((a, b) => b.bandwidth - a.bandwidth);
  const selectedAudio = allAudioReps[0];

  if (!selectedAudio) {
    throw new Error('No valid audio representation found in DASH manifest.');
  }

  return {
    baseUrl,
    video: selectedVideo,
    audio: selectedAudio,
  };
}

/**
 * Downloads all segments for a specific track to an output file.
 */
export async function downloadTrackSegments(options: {
  baseUrl: string;
  representation: DashRepresentation;
  outputPath: string;
  maxSegments?: number;
  abortSignal?: AbortSignal;
}): Promise<void> {
  const { baseUrl, representation, outputPath, maxSegments, abortSignal } = options;

  const initFilename = representation.initTemplate.replace('$RepresentationID$', representation.id);
  const initUrl = `${baseUrl}${initFilename}`;

  // Fetch init segment
  const initRes = await fetch(initUrl, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    signal: abortSignal,
  });

  if (!initRes.ok) {
    throw new Error(`Failed to fetch init segment for track ${representation.id}: HTTP ${initRes.status}`);
  }

  const writeStream = fs.createWriteStream(outputPath);

  try {
    const initBuf = Buffer.from(await initRes.arrayBuffer());
    writeStream.write(initBuf);

    const totalSegs = maxSegments
      ? Math.min(maxSegments, representation.segmentCount)
      : representation.segmentCount;

    for (let seg = 1; seg <= totalSegs; seg++) {
      if (abortSignal?.aborted) {
        throw new Error('Download aborted by user.');
      }

      const segNumPadded = String(seg).padStart(5, '0');
      const chunkFilename = representation.mediaTemplate
        .replace('$RepresentationID$', representation.id)
        .replace('$Number%05d$', segNumPadded);

      const chunkUrl = `${baseUrl}${chunkFilename}`;

      let chunkData: Buffer | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (abortSignal?.aborted) break;
        try {
          const chunkRes = await fetch(chunkUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal: abortSignal,
          });

          if (!chunkRes.ok) {
            if (chunkRes.status === 404) {
              chunkData = null;
              break;
            }
          } else {
            chunkData = Buffer.from(await chunkRes.arrayBuffer());
            break;
          }
        } catch (e: any) {
          if (abortSignal?.aborted) throw e;
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
          }
        }
      }

      if (!chunkData) {
        // Reached end of available media chunks
        break;
      }

      // Write chunk to file stream
      const canContinue = writeStream.write(chunkData);
      if (!canContinue) {
        await new Promise<void>((resolve) => writeStream.once('drain', () => resolve()));
      }
    }
  } finally {
    await new Promise<void>((resolve) => {
      writeStream.end(() => resolve());
    });
  }
}

/**
 * Concurrency limiter for FFmpeg multiplexing.
 */
let activeMuxCount = 0;
const MAX_CONCURRENT_MUX = 3;
const muxQueue: Array<() => void> = [];

async function acquireMuxSlot(): Promise<() => void> {
  if (activeMuxCount < MAX_CONCURRENT_MUX) {
    activeMuxCount++;
    return () => {
      activeMuxCount--;
      const next = muxQueue.shift();
      if (next) next();
    };
  }

  return new Promise((resolve) => {
    muxQueue.push(() => {
      activeMuxCount++;
      resolve(() => {
        activeMuxCount--;
        const next = muxQueue.shift();
        if (next) next();
      });
    });
  });
}

/**
 * Runs FFmpeg stream copy to multiplex video and audio into a standard playable MP4 file.
 */
export async function muxTracksWithFfmpeg(options: {
  ffmpegPath: string;
  videoPath: string;
  audioPath: string;
  outputPath: string;
  abortSignal?: AbortSignal;
}): Promise<void> {
  const { ffmpegPath, videoPath, audioPath, outputPath, abortSignal } = options;

  if (fs.existsSync(outputPath)) {
    fs.unlinkSync(outputPath);
  }

  const releaseSlot = await acquireMuxSlot();

  try {
    if (abortSignal?.aborted) {
      throw new Error('Download aborted by user.');
    }

    const args = [
      '-y',
      '-i', videoPath,
      '-i', audioPath,
      '-c', 'copy',
      '-movflags', '+faststart',
      outputPath,
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString();
      });

      const onAbort = () => {
        child.kill('SIGKILL');
        reject(new Error('Muxing cancelled by user.'));
      };

      if (abortSignal) {
        abortSignal.addEventListener('abort', onAbort, { once: true });
      }

      child.on('error', (err) => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        reject(new Error(`Failed to start FFmpeg: ${err.message}`));
      });

      child.on('close', (code) => {
        if (abortSignal) abortSignal.removeEventListener('abort', onAbort);
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg muxing failed with exit code ${code}: ${stderr.slice(-300)}`));
        }
      });
    });
  } finally {
    releaseSlot();
  }
}

/**
 * Sweeps the CineVault temporary directory for stale files older than 30 minutes.
 */
export async function sweepStaleTempFiles(): Promise<void> {
  try {
    const baseDir = path.join(os.tmpdir(), 'cinevault-download');
    if (!fs.existsSync(baseDir)) return;

    const entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
    const now = Date.now();
    const MAX_AGE = 30 * 60 * 1000; // 30 minutes

    for (const e of entries) {
      const fullPath = path.join(baseDir, e.name);
      try {
        const stat = await fs.promises.stat(fullPath);
        if (now - stat.mtimeMs > MAX_AGE) {
          await fs.promises.rm(fullPath, { recursive: true, force: true });
        }
      } catch {}
    }
  } catch {}
}
