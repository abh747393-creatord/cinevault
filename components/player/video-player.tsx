'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  IconPlay,
  IconPause,
  IconVolumeHigh,
  IconVolumeCross,
  IconFullScreen,
  IconQuitFullScreen,
  IconBackward10Seconds,
  IconForward10Seconds,
  IconSettings,
  IconSubtitle,
  IconSkipNext,
  IconSkipPrevious,
  IconList,
  IconAlertCircle,
  IconPIP,
  IconClapperboardPlay,
  IconServer,
  IconSquareShareLine,
  IconTranslate,
  IconCheck,
} from '@/components/ui/icons';
import { StreamSource, SubtitleTrack } from '@/types/providers';
import { ContentItem, Episode } from '@/types/content';
import { formatSeconds, cn } from '@/lib/utils';
import { saveWatchProgress } from '@/lib/storage/local-storage-store';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

export interface SubtitleCue {
  id?: string;
  start: number;
  end: number;
  text: string;
}

function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.trim().replace(',', '.').split(':');
  if (parts.length === 3) {
    const hours = parseFloat(parts[0]);
    const minutes = parseFloat(parts[1]);
    const seconds = parseFloat(parts[2]);
    return (isNaN(hours) ? 0 : hours) * 3600 + (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
  } else if (parts.length === 2) {
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
  }
  return 0;
}

export function parseSubtitleText(raw: string): SubtitleCue[] {
  if (!raw) return [];
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length === 0) continue;
    if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE')) continue;

    let timeLineIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIndex = i;
        break;
      }
    }
    if (timeLineIndex === -1) continue;

    const timeParts = lines[timeLineIndex].split('-->');
    if (timeParts.length < 2) continue;

    const start = parseTimeToSeconds(timeParts[0]);
    const end = parseTimeToSeconds(timeParts[1].trim().split(/\s+/)[0]);
    const textLines = lines.slice(timeLineIndex + 1);
    const text = textLines
      .join('\n')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (text && end > start) {
      cues.push({ start, end, text });
    }
  }
  return cues;
}

async function fetchSubtitleText(src: string): Promise<string> {
  if (src.startsWith('data:')) {
    const commaIdx = src.indexOf(',');
    if (commaIdx !== -1) {
      return decodeURIComponent(src.slice(commaIdx + 1));
    }
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

function formatLanguageCode(langCode?: string): string {
  if (!langCode) return 'Original Audio';
  const clean = langCode.toLowerCase().trim();
  const map: Record<string, string> = {
    en: 'English',
    eng: 'English',
    hi: 'Hindi',
    hin: 'Hindi',
    ta: 'Tamil',
    tam: 'Tamil',
    te: 'Telugu',
    tel: 'Telugu',
    es: 'Spanish',
    spa: 'Spanish',
    fr: 'French',
    fra: 'French',
    fre: 'French',
    de: 'German',
    deu: 'German',
    ger: 'German',
    ja: 'Japanese',
    jpn: 'Japanese',
    ko: 'Korean',
    kor: 'Korean',
    zh: 'Chinese',
    zho: 'Chinese',
    chi: 'Chinese',
    it: 'Italian',
    ita: 'Italian',
    pt: 'Portuguese',
    por: 'Portuguese',
    ru: 'Russian',
    rus: 'Russian',
    ar: 'Arabic',
    ara: 'Arabic',
    tr: 'Turkish',
    tur: 'Turkish',
    ml: 'Malayalam',
    mal: 'Malayalam',
    kn: 'Kannada',
    kan: 'Kannada',
    bn: 'Bengali',
    ben: 'Bengali',
    und: 'Original Audio',
  };
  return map[clean] || (clean.length === 2 || clean.length === 3 ? clean.toUpperCase() : clean);
}

export interface UnifiedAudioTrack {
  id: string;
  label: string;
  language: string;
  type: 'dash' | 'dub' | 'stream' | 'default';
  dashTrack?: any;
  dubSubjectId?: string;
}

export interface UnifiedSubtitleTrack {
  id: string;
  label: string;
  language: string;
  type: 'dash' | 'vtt';
  src?: string;
  dashTrackIndex?: number;
}

interface VideoPlayerProps {
  content: ContentItem;
  streams: StreamSource[];
  episode?: Episode;
  initialTime?: number;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
  onToggleEpisodeDrawer?: () => void;
}

export function VideoPlayer({
  content,
  streams,
  episode,
  initialTime = 0,
  onNextEpisode,
  onPrevEpisode,
  onToggleEpisodeDrawer,
}: VideoPlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleVideoPause = useCallback(() => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    pauseTimeoutRef.current = setTimeout(() => {
      if (videoRef.current?.paused) {
        setIsPlaying(false);
      }
    }, 200);
  }, []);

  const handleVideoPlaying = useCallback(() => {
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    setIsLoading(false);
    setIsPlaying(true);
  }, []);

  // Active stream sources (can be updated when switching audio dubs)
  const [activeStreams, setActiveStreams] = useState<StreamSource[]>(streams);
  useEffect(() => {
    if (streams && streams.length > 0) {
      setActiveStreams(streams);
    }
  }, [streams]);

  // Active stream index
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const currentStream = activeStreams[currentStreamIndex] || activeStreams[0];

  // Play mode: 'stream' (HTML5 CDN) or 'trailer' (YouTube 4K official preview)
  const [playMode, setPlayMode] = useState<'stream' | 'trailer'>(() => {
    return streams && streams.length > 0 ? 'stream' : (content.youtubeId ? 'trailer' : 'stream');
  });

  // Auto-switch to stream mode when live streams are loaded
  useEffect(() => {
    if (activeStreams && activeStreams.length > 0) {
      setPlayMode('stream');
    }
  }, [activeStreams]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Compute legitimate alternative streams that possess a valid playable URL
  const validAlternativeStreams = useMemo(() => {
    return activeStreams.filter(
      (s, idx) => idx !== currentStreamIndex && Boolean(s?.url && s.url.trim().length > 0)
    );
  }, [activeStreams, currentStreamIndex]);

  // Unified stream error/unavailable state (handles both network/playback errors and missing stream URLs)
  const isStreamUnavailable = useMemo(() => {
    if (playMode !== 'stream') return false;
    if (hasError) return true;
    if (!activeStreams || activeStreams.length === 0) return true;
    if (!currentStream || !currentStream.url || currentStream.url.trim().length === 0) return true;
    return false;
  }, [playMode, hasError, activeStreams, currentStream]);

  // DASH in-manifest tracks discovered directly from MediaPlayer
  const [dashAudioTracks, setDashAudioTracks] = useState<any[]>([]);
  const [currentDashAudioTrack, setCurrentDashAudioTrack] = useState<any>(null);
  const [dashTextTracks, setDashTextTracks] = useState<any[]>([]);

  // Unified Audio Tracks (DASH adaptation sets + Stream metadata + Provider dubs)
  const allAudioTracks = useMemo<UnifiedAudioTrack[]>(() => {
    const list: UnifiedAudioTrack[] = [];
    const seen = new Set<string>();

    // 1. Real in-stream DASH audio tracks (highest fidelity, direct MSE switching without reload)
    if (dashAudioTracks && dashAudioTracks.length > 0) {
      for (const t of dashAudioTracks) {
        const id = `dash-audio-${t.index}`;
        if (!seen.has(id)) {
          seen.add(id);
          const lang = t.lang || 'und';
          let labelText = '';
          if (typeof t.labels?.[0] === 'string') {
            labelText = t.labels[0];
          } else if (t.labels?.[0]?.text) {
            labelText = t.labels[0].text;
          } else if (lang === 'und' && dashAudioTracks.length === 1) {
            labelText = 'Original Audio';
          } else {
            const formatted = formatLanguageCode(lang);
            labelText = formatted === 'English' ? 'English (Original)' : `${formatted} Dub`;
          }

          list.push({
            id,
            label: labelText,
            language: lang,
            type: 'dash',
            dashTrack: t,
          });
        }
      }
    }

    // 2. Stream metadata audio tracks (if present from API)
    if (list.length === 0 && currentStream?.audioTracks && currentStream.audioTracks.length > 0) {
      for (const a of currentStream.audioTracks) {
        if (!seen.has(a.id)) {
          seen.add(a.id);
          list.push({
            id: a.id,
            label: a.label || formatLanguageCode(a.language),
            language: a.language,
            type: 'stream',
          });
        }
      }
    }

    // 3. MovieBox external dub subjects (if content has alternate audio releases)
    if (content.dubs && content.dubs.length > 0) {
      for (const d of content.dubs) {
        const dubKey = `dub-${d.subject_id}`;
        if (!seen.has(dubKey)) {
          seen.add(dubKey);
          list.push({
            id: dubKey,
            label: d.label || `${formatLanguageCode(d.language)} Dub`,
            language: d.language,
            type: 'dub',
            dubSubjectId: d.subject_id,
          });
        }
      }
    }

    // 4. Guaranteed fallback when single audio stream
    if (list.length === 0) {
      list.push({
        id: 'default-audio',
        label: 'Original Audio',
        language: 'en',
        type: 'default',
      });
    }

    return list;
  }, [dashAudioTracks, currentStream?.audioTracks, content.dubs]);

  const [activeAudioId, setActiveAudioId] = useState<string>('default-audio');

  // Unified Subtitle Tracks (In-band DASH text tracks + External VTT subtitles)
  const allSubtitleTracks = useMemo<UnifiedSubtitleTrack[]>(() => {
    const list: UnifiedSubtitleTrack[] = [];
    const seen = new Set<string>();

    // 1. In-band DASH text tracks
    if (dashTextTracks && dashTextTracks.length > 0) {
      for (const t of dashTextTracks) {
        const id = `dash-text-${t.index}`;
        if (!seen.has(id)) {
          seen.add(id);
          const lang = t.lang || 'en';
          const labelText =
            typeof t.labels?.[0] === 'string'
              ? t.labels[0]
              : t.labels?.[0]?.text || formatLanguageCode(lang);
          list.push({
            id,
            label: labelText,
            language: lang,
            type: 'dash',
            dashTrackIndex: t.index,
          });
        }
      }
    }

    // 2. External VTT subtitles from current stream
    if (currentStream?.subtitles && currentStream.subtitles.length > 0) {
      for (const s of currentStream.subtitles) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          list.push({
            id: s.id,
            label: s.label || formatLanguageCode(s.language),
            language: s.language,
            type: 'vtt',
            src: s.src,
          });
        }
      }
    }

    return list;
  }, [dashTextTracks, currentStream?.subtitles]);

  const [isSwitchingAudio, setIsSwitchingAudio] = useState(false);
  const [audioNotification, setAudioNotification] = useState<string | null>(null);

  // Settings dropdowns
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');
  const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
  const [activeCueText, setActiveCueText] = useState<string | null>(null);

  const activeSubtitleRef = useRef(activeSubtitle);
  const subtitleCuesRef = useRef(subtitleCues);
  const activeCueTextRef = useRef(activeCueText);

  useEffect(() => {
    activeSubtitleRef.current = activeSubtitle;
  }, [activeSubtitle]);

  useEffect(() => {
    subtitleCuesRef.current = subtitleCues;
  }, [subtitleCues]);

  // Keep activeAudioId in sync with DASH current track or active dub
  useEffect(() => {
    if (currentDashAudioTrack) {
      setActiveAudioId(`dash-audio-${currentDashAudioTrack.index}`);
    } else if (allAudioTracks.length > 0 && !allAudioTracks.some((t) => t.id === activeAudioId)) {
      setActiveAudioId(allAudioTracks[0].id);
    }
  }, [currentDashAudioTrack, allAudioTracks, activeAudioId]);

  // Clear auto-hide controls timer while any dropdown menu is actively open
  useEffect(() => {
    if (showAudioMenu || showSubtitleMenu || showSettingsMenu) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    }
  }, [showAudioMenu, showSubtitleMenu, showSettingsMenu]);

  // Fetch and parse subtitle cues whenever activeSubtitle changes or stream changes
  useEffect(() => {
    if (activeSubtitle === 'off') {
      setSubtitleCues([]);
      setActiveCueText(null);
      activeCueTextRef.current = null;
      return;
    }

    const vttTrack = allSubtitleTracks.find((s) => s.id === activeSubtitle && s.type === 'vtt');
    if (!vttTrack || !vttTrack.src) {
      setSubtitleCues([]);
      setActiveCueText(null);
      activeCueTextRef.current = null;
      return;
    }

    let isMounted = true;
    fetchSubtitleText(vttTrack.src)
      .then((raw) => {
        if (!isMounted) return;
        const cues = parseSubtitleText(raw);
        setSubtitleCues(cues);
      })
      .catch((err) => {
        console.warn('[VideoPlayer] Subtitle cue fetch failed:', err);
        if (isMounted) {
          setSubtitleCues([]);
          setActiveCueText(null);
          activeCueTextRef.current = null;
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeSubtitle, allSubtitleTracks]);

  // Pause HTML5 video playback when switched to trailer mode
  useEffect(() => {
    if (playMode === 'trailer' && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, [playMode]);

  // Track whether user preference has been applied for current media to prevent fighting error fallbacks
  const hasAppliedPreferencesRef = useRef(false);

  useEffect(() => {
    hasAppliedPreferencesRef.current = false;
  }, [content.id, episode?.id]);

  // Auto-apply user preferences for stream quality and subtitle ONCE on content load
  useEffect(() => {
    if (!user || activeStreams.length === 0 || hasAppliedPreferencesRef.current) return;
    hasAppliedPreferencesRef.current = true;

    if (user.defaultQuality && user.defaultQuality !== 'auto') {
      const matchIdx = activeStreams.findIndex((s) => s.quality === user.defaultQuality);
      if (matchIdx >= 0) setCurrentStreamIndex(matchIdx);
    }

    if (user.preferredSubtitleLanguage && user.preferredSubtitleLanguage !== 'Off') {
      const pref = user.preferredSubtitleLanguage.toLowerCase();
      const firstStream = activeStreams[0];
      const subMatch = firstStream?.subtitles?.find(
        (s) => s.label.toLowerCase().includes(pref) || s.language.toLowerCase().includes(pref)
      );
      if (subMatch) {
        setActiveSubtitle(subMatch.id);
      }
    }
  }, [user, activeStreams]);

  // Sync progress callback
  const syncProgress = useCallback(
    (time: number, dur: number) => {
      if (dur > 0 && time > 0) {
        saveWatchProgress(content, Math.floor(time), Math.floor(dur), episode?.id);
      }
    },
    [content, episode]
  );

  const dashPlayerRef = useRef<any>(null);

  // Switch Audio Dub / Language (fetches MovieBox streams for target audio track)
  const handleAudioDubChange = async (dubId: string, dubLabel: string) => {
    setIsSwitchingAudio(true);
    setAudioNotification(`Switching audio to ${dubLabel}...`);
    setShowAudioMenu(false);

    const video = videoRef.current;
    const savedTime = video?.currentTime || currentTime || 0;
    const wasPlaying = !video?.paused;

    try {
      const epParam = episode?.id ? `&episodeId=${encodeURIComponent(episode.id)}` : '';
      const res = await fetch(`/api/stream/${content.id}?dubId=${encodeURIComponent(dubId)}${epParam}`);
      if (res.ok) {
        const data = await res.json();
        if (data.streams && data.streams.length > 0) {
          setActiveStreams(data.streams);
          setCurrentStreamIndex(0);
          setHasError(false);

          setAudioNotification(`Audio: ${dubLabel}`);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.currentTime = savedTime;
              if (wasPlaying) {
                videoRef.current.play().catch(() => {});
              }
            }
          }, 350);
        }
      }
    } catch (err) {
      console.error('Failed to change audio dub:', err);
      setAudioNotification(`Failed to load ${dubLabel}`);
    } finally {
      setIsSwitchingAudio(false);
      setTimeout(() => setAudioNotification(null), 3000);
    }
  };

  // Unified Audio track switcher (switches in-stream DASH AdaptationSet immediately or fetches alternate dub release)
  const handleSelectAudioTrack = async (track: UnifiedAudioTrack) => {
    if (track.type === 'dash' && track.dashTrack && dashPlayerRef.current) {
      try {
        dashPlayerRef.current.setCurrentTrack(track.dashTrack);
        setCurrentDashAudioTrack(track.dashTrack);
        setActiveAudioId(track.id);
        setAudioNotification(`Audio: ${track.label}`);
        setTimeout(() => setAudioNotification(null), 3000);
      } catch (err) {
        console.warn('[VideoPlayer] DASH track switch failed:', err);
      }
      setShowAudioMenu(false);
      return;
    }

    if (track.type === 'dub' && track.dubSubjectId) {
      setActiveAudioId(track.id);
      await handleAudioDubChange(track.dubSubjectId, track.label);
      return;
    }

    setActiveAudioId(track.id);
    setShowAudioMenu(false);
  };

  // Initialize dash.js for MPEG-DASH streams or native HTML5 for direct files
  useEffect(() => {
    if (playMode !== 'stream' || !currentStream?.url || !videoRef.current) return;

    const videoElement = videoRef.current;
    const streamUrl = currentStream.url;
    const isDash =
      streamUrl.includes('.mpd') ||
      streamUrl.includes('/dash/') ||
      streamUrl.includes('/manifest.mpd');

    let isCancelled = false;

    // Destroy any existing player instance
    if (dashPlayerRef.current) {
      try {
        dashPlayerRef.current.reset();
        dashPlayerRef.current.destroy();
      } catch {}
      dashPlayerRef.current = null;
    }

    setIsLoading(true);
    setHasError(false);

    if (isDash) {
      import('dashjs')
        .then((dashModule) => {
          if (isCancelled || !videoRef.current) return;

          const dashjs: any = (dashModule as any).default || dashModule;
          const player = dashjs.MediaPlayer().create();

          player.updateSettings({
            debug: {
              logLevel: 0, // LOG_LEVEL_NONE (completely eliminates console log memory leak)
            },
            streaming: {
              lowLatencyEnabled: false,
              fastSwitchEnabled: true,
              buffer: {
                bufferPruningInterval: 3, // Aggressively prune played chunks every 3s
                bufferToKeep: 6, // Keep only 6 seconds behind playback
                bufferTimeDefault: 8, // Keep only 8 seconds forward buffer
                bufferTimeAtTopQuality: 10, // Max 10 seconds ahead
                bufferTimeAtTopQualityLongForm: 12, // Never buffer 60 seconds ahead
                longFormContentDurationThreshold: 100000, // Prevent 60s buffer explosion
                flushBufferAtTrackSwitch: true, // Flush old buffers on audio/quality switch
                resetSourceBuffersForTrackSwitch: true, // Reset SourceBuffers on track switch
                reuseExistingSourceBuffers: false, // Do not accumulate old allocations
                enableSeekDecorrelationFix: true,
              },
              retryAttempts: {
                MPD: 3,
                XLink: 3,
                InitializationSegment: 3,
                IndexSegment: 3,
                MediaSegment: 3,
                BitrateSegment: 3,
              },
              abr: {
                autoSwitchBitrate: {
                  video: true,
                  audio: true,
                },
                limitBitrateByPortal: true,
              },
            },
          });

          player.initialize(videoElement, streamUrl, false);

          const updateTracksFromPlayer = () => {
            try {
              const aTracks = player.getTracksFor('audio');
              if (aTracks && aTracks.length > 0) {
                setDashAudioTracks(aTracks);
                const currA = player.getCurrentTrackFor('audio');
                if (currA) setCurrentDashAudioTrack(currA);
              }
            } catch {}
            try {
              const tTracks = player.getTracksFor('text');
              if (tTracks && tTracks.length > 0) {
                setDashTextTracks(tTracks);
              }
            } catch {}
          };

          player.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
            console.warn('Dash.js error:', e);
            handleVideoError();
          });

          player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
            // Verify MSE could mount a supported video track
            try {
              const videoTracks = player.getTracksFor('video');
              if (videoTracks && videoTracks.length === 0) {
                console.warn('[Dash.js] No supported video track found in MSE! Falling back to direct MP4...');
                handleVideoError();
              }
            } catch {}
            updateTracksFromPlayer();
          });

          player.on(dashjs.MediaPlayer.events.CAN_PLAY, () => {
            setIsLoading(false);
            setHasError(false);
            updateTracksFromPlayer();
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => {
            handleVideoPlaying();
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_PAUSED, () => {
            handleVideoPause();
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_WAITING, () => {
            setIsLoading(true);
          });

          player.on(dashjs.MediaPlayer.events.PLAYBACK_METADATA_LOADED, () => {
            if (videoElement) {
              setDuration(videoElement.duration);
              if (initialTime > 0 && initialTime < videoElement.duration * 0.95) {
                videoElement.currentTime = initialTime;
              }
            }
            setIsLoading(false);
            updateTracksFromPlayer();
          });

          dashPlayerRef.current = player;
        })
        .catch((err) => {
          console.error('Failed to load dashjs:', err);
          if (videoElement) {
            videoElement.src = streamUrl;
            videoElement.load();
          }
        });
    } else {
      videoElement.src = streamUrl;
      videoElement.load();
    }

    return () => {
      isCancelled = true;
      setDashAudioTracks([]);
      setCurrentDashAudioTrack(null);
      setDashTextTracks([]);
      if (dashPlayerRef.current) {
        try {
          dashPlayerRef.current.reset();
          dashPlayerRef.current.destroy();
        } catch {}
        dashPlayerRef.current = null;
      }
      if (videoElement) {
        try {
          videoElement.pause();
          videoElement.removeAttribute('src');
          videoElement.load();
        } catch {}
      }
    };
  }, [currentStream?.url, playMode]);

  // Initial resume seek
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      if (initialTime > 0 && initialTime < video.duration * 0.95) {
        video.currentTime = initialTime;
      }
      setIsLoading(false);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [initialTime, currentStream]);

  // Periodic progress saving (every 10s)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying && videoRef.current) {
        syncProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isPlaying, syncProgress]);

  // Save on unload / unmount and thoroughly purge media buffers
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        syncProgress(videoRef.current.currentTime, videoRef.current.duration);
        try {
          videoRef.current.pause();
          videoRef.current.removeAttribute('src');
          videoRef.current.load();
        } catch {}
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    };
  }, [syncProgress]);

  // Keyboard controls
  useEffect(() => {
    if (playMode === 'trailer') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyM':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekDelta(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekDelta(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, volume, isMuted, isFullscreen]);

  // Controls auto-hide on mouse idle
  const handleMouseMove = () => {
    if (isStreamUnavailable) {
      setShowControls(false);
      return;
    }
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    // Only auto-hide controls if no dropdown menus are actively open
    if (isPlaying && !showAudioMenu && !showSubtitleMenu && !showSettingsMenu) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (pauseTimeoutRef.current) {
      clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      syncProgress(video.currentTime, video.duration);
    }
  };

  const handleVideoClick = () => {
    if (showAudioMenu || showSubtitleMenu || showSettingsMenu) {
      setShowAudioMenu(false);
      setShowSubtitleMenu(false);
      setShowSettingsMenu(false);
      return;
    }
    togglePlay();
  };

  const seekDelta = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Number(e.target.value);
    video.currentTime = target;
    setCurrentTime(target);
  };

  const adjustVolume = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    const newVol = Math.max(0, Math.min(1, volume + delta));
    video.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    setVolume(val);
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('Picture-in-picture error:', err);
    }
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSettingsMenu(false);
  };

  const handleVideoError = () => {
    const video = videoRef.current;
    const savedTime = video?.currentTime || currentTime || 0;
    const wasPlaying = !video?.paused;

    console.warn(`[Player] Current stream failed or unsupported: ${currentStream?.url}`);
    if (currentStreamIndex < activeStreams.length - 1) {
      const nextIdx = currentStreamIndex + 1;
      console.info(`[Player] Auto-switching to fallback mirror index ${nextIdx}...`);
      setCurrentStreamIndex(nextIdx);
      setIsLoading(true);
      setHasError(false);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = savedTime;
          if (wasPlaying) {
            videoRef.current.play().catch(() => {});
          }
        }
      }, 350);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  };

  // Black screen detection: auto-switch to direct MP4 if audio plays but videoWidth remains 0
  useEffect(() => {
    if (playMode !== 'stream' || hasError || isLoading) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      if (video && !video.paused && video.currentTime > 1.2) {
        if (video.videoWidth > 0) {
          // Video frames render normally; stop timer to conserve CPU
          clearInterval(interval);
          return;
        }
        if (video.videoWidth === 0 && activeStreams.length > 1 && currentStreamIndex < activeStreams.length - 1) {
          console.warn('[Player] Black screen detected (audio playing but videoWidth=0). Switching to direct MP4 mirror...');
          clearInterval(interval);
          setAudioNotification('Switching to direct MP4 mirror for video display...');
          handleVideoError();
        }
      }
    }, 1200);

    return () => clearInterval(interval);
  }, [playMode, hasError, isLoading, currentStreamIndex, activeStreams]);

  const handleQualityChange = (index: number) => {
    const video = videoRef.current;
    const time = video?.currentTime || currentTime || 0;
    const playing = !video?.paused;
    setCurrentStreamIndex(index);
    setHasError(false);
    setIsLoading(true);
    setShowSettingsMenu(false);

    // Maintain time position on quality switch
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        if (playing) videoRef.current.play().catch(() => {});
      }
    }, 150);
  };

  const handleSubtitleChange = (subId: string) => {
    if (subId === 'off') {
      if (dashPlayerRef.current) {
        try {
          dashPlayerRef.current.setTextTrack(-1);
        } catch {}
      }
      const video = videoRef.current;
      if (video) {
        for (let i = 0; i < video.textTracks.length; i++) {
          video.textTracks[i].mode = 'disabled';
        }
      }
      setActiveSubtitle('off');
      setSubtitleCues([]);
      setActiveCueText(null);
      activeCueTextRef.current = null;
      setShowSubtitleMenu(false);
      return;
    }

    const match = allSubtitleTracks.find((t) => t.id === subId);
    if (!match) {
      setActiveSubtitle('off');
      setShowSubtitleMenu(false);
      return;
    }

    if (match.type === 'dash' && typeof match.dashTrackIndex === 'number' && dashPlayerRef.current) {
      try {
        dashPlayerRef.current.setTextTrack(match.dashTrackIndex);
      } catch {}
      setActiveSubtitle(match.id);
      setShowSubtitleMenu(false);
      return;
    }

    if (match.type === 'vtt') {
      if (dashPlayerRef.current) {
        try {
          dashPlayerRef.current.setTextTrack(-1);
        } catch {}
      }
      const video = videoRef.current;
      if (video) {
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          if (track.id === match.id || track.language === match.language) {
            track.mode = 'hidden';
          } else {
            track.mode = 'disabled';
          }
        }
      }
      setActiveSubtitle(match.id);
      setShowSubtitleMenu(false);
      return;
    }
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    setCurrentTime(time);

    // Update buffer progress
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }

    // High performance subtitle cue matching directly in timeupdate without extra React render cycle
    if (activeSubtitleRef.current !== 'off' && subtitleCuesRef.current.length > 0) {
      const cue = subtitleCuesRef.current.find((c) => time >= c.start && time <= c.end);
      const text = cue ? cue.text : null;
      if (text !== activeCueTextRef.current) {
        activeCueTextRef.current = text;
        setActiveCueText(text);
      }
    } else if (activeCueTextRef.current) {
      activeCueTextRef.current = null;
      setActiveCueText(null);
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div className="w-full max-w-full space-y-3 overflow-hidden">
      {/* Source & Audio Track Selector Header */}
      <div className="space-y-2.5 p-2.5 sm:p-3.5 bg-card/60 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
        {/* Source Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <IconServer className="w-3.5 h-3.5 text-primary" />
              Source:
            </span>

            {activeStreams.map((s, idx) => {
              const isDash = s.url?.includes('.mpd') || s.url?.includes('/dash/') || s.url?.includes('/manifest.mpd');
              const label = isDash
                ? `⚡ CineVault Ultra (Multi-Res)`
                : `⚡ CineVault CDN (${s.quality || 'MP4'})`;

              return (
                <button
                  key={s.id || idx}
                  onClick={() => {
                    setPlayMode('stream');
                    handleQualityChange(idx);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    playMode === 'stream' && currentStreamIndex === idx
                      ? 'bg-gradient-to-r from-red-600 to-amber-600 text-white shadow-lg shadow-red-600/30 ring-1 ring-red-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {label}
                </button>
              );
            })}

            {content.youtubeId && (
              <button
                onClick={() => setPlayMode('trailer')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  playMode === 'trailer'
                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-1 ring-primary-light'
                    : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                }`}
              >
                <IconClapperboardPlay className="w-3.5 h-3.5 text-accent" />
                Official 4K Trailer
              </button>
            )}

            {content.youtubeId && (
              <a
                href={`https://www.youtube.com/watch?v=${content.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 hover:text-white bg-red-600/10 hover:bg-red-600 border border-red-500/30 hover:border-red-600 transition-all flex items-center gap-1.5 ml-auto sm:ml-0 shadow-sm"
                title="Watch Trailer on YouTube"
              >
                <IconSquareShareLine className="w-3.5 h-3.5" />
                Open on YouTube
              </a>
            )}
          </div>

          <div className="text-xs font-medium text-slate-400">
            {playMode === 'trailer' ? (
              <span className="text-accent flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-accent" />
                Official YouTube 4K Preview
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1.5 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                CineVault Ultra CDN ({currentStream?.quality || '1080p'})
              </span>
            )}
          </div>
        </div>

        {/* Audio Track / Dubs Row */}
        {allAudioTracks.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
              <IconTranslate className="w-3.5 h-3.5 text-emerald-400" />
              Audio Track:
            </span>

            {allAudioTracks.map((track) => {
              const isActive = track.id === activeAudioId;
              return (
                <button
                  key={track.id}
                  onClick={() => handleSelectAudioTrack(track)}
                  disabled={isSwitchingAudio}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10'
                  }`}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  {track.label}
                </button>
              );
            })}

            {isSwitchingAudio && (
              <span className="text-xs text-amber-400 flex items-center gap-1.5 ml-2 font-medium">
                <span className="w-2.5 h-2.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                Changing audio...
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Video Container with DirectComposition anti-flicker clipping */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none flex items-center justify-center"
        style={{
          backgroundColor: '#000000',
          WebkitMaskImage: '-webkit-radial-gradient(white, black)',
          clipPath: 'inset(0 round 1rem)',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          isolation: 'isolate',
          contain: 'paint',
        }}
      >
        {/* Anti-flicker Inset Border Overlay */}
        <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none z-20" />

        {/* Audio Notification Toast */}
        {audioNotification && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-emerald-500/50 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-2xl z-40 flex items-center gap-2 pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {audioNotification}
          </div>
        )}

        {playMode === 'trailer' && content.youtubeId ? (
          <div className="w-full h-full relative bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${content.youtubeId}?autoplay=1&rel=0&modestbranding=1`}
              title={`${content.title} Official Trailer`}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        ) : (
          <>
            {/* Video Element or Stream Unavailable Screen */}
            {isStreamUnavailable ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 sm:p-6 text-center z-30 space-y-3 sm:space-y-4 overflow-y-auto max-h-full">
                <IconAlertCircle className="w-10 h-10 sm:w-12 sm:h-12 text-accent animate-bounce flex-shrink-0" />
                <div className="space-y-1 max-w-md">
                  <h3 className="text-base sm:text-xl font-bold text-white">Stream Temporarily Unavailable</h3>
                  <p className="text-xs sm:text-sm text-slate-400">
                    The requested stream could not be loaded from this provider.
                  </p>
                </div>

                {/* Quick Quality / Mirror Selection - only if valid alternative streams exist */}
                {validAlternativeStreams.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2 max-w-md">
                    <span className="text-xs text-slate-400 w-full mb-0.5 font-medium">Available qualities:</span>
                    {validAlternativeStreams.map((s) => {
                      const streamIdx = activeStreams.findIndex((item) => item.id === s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setHasError(false);
                            handleQualityChange(streamIdx !== -1 ? streamIdx : 0);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white shadow-lg transition-all"
                        >
                          {s.quality} ({s.providerName || 'Mirror'})
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 pt-1">
                  {content.youtubeId && (
                    <Button
                      variant="accent"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setHasError(false);
                        setPlayMode('trailer');
                      }}
                    >
                      Watch Official 4K Trailer
                    </Button>
                  )}

                  {activeStreams.length > 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setHasError(false);
                        const nextIdx = (currentStreamIndex + 1) % activeStreams.length;
                        handleQualityChange(nextIdx);
                      }}
                    >
                      Try Another Source
                    </Button>
                  )}

                  <Button
                    variant="primary"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setHasError(false);
                      setIsLoading(true);
                      videoRef.current?.load();
                    }}
                  >
                    Retry Stream
                  </Button>
                </div>
              </div>
            ) : currentStream ? (
              <video
                ref={videoRef}
                crossOrigin="anonymous"
                className="w-full h-full object-contain cursor-pointer bg-black"
                style={{
                  backgroundColor: '#000000',
                  transform: 'translateZ(0)',
                  WebkitTransform: 'translateZ(0)',
                  outline: 'none',
                }}
                onClick={handleVideoClick}
                onTimeUpdate={handleTimeUpdate}
                onWaiting={() => setIsLoading(true)}
                onPlaying={handleVideoPlaying}
                onPause={handleVideoPause}
                onError={handleVideoError}
                playsInline
              >
                {currentStream.subtitles?.map((sub: SubtitleTrack) => (
                  <track
                    key={sub.id}
                    id={sub.id}
                    kind="subtitles"
                    src={sub.src}
                    srcLang={sub.language}
                    label={sub.label}
                  />
                ))}
              </video>
            ) : null}

            {/* Loading Spinner */}
            {isLoading && !isStreamUnavailable && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* Subtitle Cue Overlay (Netflix-style floating caption) */}
            {!isStreamUnavailable && activeSubtitle !== 'off' && activeCueText && (
              <div
                className={cn(
                  'absolute left-1/2 -translate-x-1/2 max-w-[85%] sm:max-w-[75%] text-center pointer-events-none z-20 transition-all duration-150 px-2',
                  showControls ? 'bottom-24 sm:bottom-28' : 'bottom-8 sm:bottom-12'
                )}
              >
                <span
                  className="inline-block px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-black/85 text-white font-medium text-sm sm:text-base md:text-xl tracking-wide shadow-2xl backdrop-blur-xs border border-white/10"
                  style={{
                    textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.8)',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {activeCueText}
                </span>
              </div>
            )}

            {/* Big Center Play/Pause button indicator on click */}
            {!isPlaying && !isLoading && !isStreamUnavailable && showControls && (
              <button
                onClick={togglePlay}
                className="absolute w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 z-20 animate-fade-in focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                aria-label="Play video"
                title="Play video"
              >
                <IconPlay className="w-9 h-9 text-white ml-1" variant="Bold" />
              </button>
            )}

            {/* Player Header (Title, Episode) */}
            {!isStreamUnavailable && (
              <div
                className={`absolute top-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between transition-opacity duration-300 z-30 ${
                  showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
              >
                <div>
                  <h2 className="text-base sm:text-xl font-bold text-white drop-shadow">
                    {content.title}
                  </h2>
                  {episode && (
                    <p className="text-xs sm:text-sm text-slate-300">
                      Episode {episode.episodeNumber}: {episode.title}
                    </p>
                  )}
                </div>

                {onToggleEpisodeDrawer && (
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={onToggleEpisodeDrawer}
                    className="flex items-center gap-1.5 text-xs"
                    aria-label="Open episodes drawer"
                  >
                    <IconList className="w-4 h-4" />
                    Episodes
                  </Button>
                )}
              </div>
            )}

            {/* Player Controls Bottom Bar */}
            {!isStreamUnavailable && (
        <div
          className={`absolute bottom-0 left-0 right-0 p-2 sm:p-4 md:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-1.5 sm:space-y-3 transition-opacity duration-300 z-30 ${
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Scrubber / Progress Bar */}
          <div className="relative group/scrubber cursor-pointer w-full flex items-center py-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer z-10"
              aria-label="Seek progress"
            />

            <div className="relative w-full h-1 group-hover/scrubber:h-2 bg-white/20 rounded-full overflow-hidden transition-all">
              {/* Buffered Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-white/40"
                style={{ width: `${bufferPercent}%` }}
              />
              {/* Played Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 bg-primary"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Thumb marker */}
            <div
              className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-lg pointer-events-none group-hover/scrubber:scale-125 transition-transform"
              style={{ left: `calc(${progressPercent}% - 6px)` }}
            />
          </div>

          {/* Action Controls Toolbar */}
          <div className="flex items-center justify-between text-white w-full max-w-full min-w-0">
            {/* Left Toolbar: Play, Skip, Time, Volume */}
            <div className="flex items-center gap-1 sm:gap-2 md:gap-4 min-w-0 flex-shrink">
              {onPrevEpisode && (
                <button
                  type="button"
                  onClick={onPrevEpisode}
                  className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                  title="Previous Episode"
                  aria-label="Previous Episode"
                >
                  <IconSkipPrevious className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={togglePlay}
                className="p-1 sm:p-2 text-white hover:text-primary transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                aria-label={isPlaying ? 'Pause' : 'Play'}
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <IconPause className="w-5 h-5 sm:w-6 sm:h-6 text-white" variant="Bold" />
                ) : (
                  <IconPlay className="w-5 h-5 sm:w-6 sm:h-6 text-white" variant="Bold" />
                )}
              </button>

              {onNextEpisode && (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                  title="Next Episode"
                  aria-label="Next Episode"
                >
                  <IconSkipNext className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => seekDelta(-10)}
                className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                title="Rewind 10 seconds (Left Arrow)"
                aria-label="Rewind 10 seconds"
              >
                <IconBackward10Seconds className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              <button
                type="button"
                onClick={() => seekDelta(10)}
                className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                title="Fast Forward 10 seconds (Right Arrow)"
                aria-label="Fast Forward 10 seconds"
              >
                <IconForward10Seconds className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center gap-1 sm:gap-2 group/volume flex-shrink-0">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <IconVolumeCross className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                  ) : (
                    <IconVolumeHigh className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>

                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-14 sm:w-20 md:w-24 h-1 accent-primary bg-white/20 rounded-lg cursor-pointer hidden md:block"
                  aria-label="Volume"
                />
              </div>

              {/* Time Stamp */}
              <div className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-300 whitespace-nowrap ml-0.5 sm:ml-1">
                <span>{formatSeconds(currentTime)}</span>
                <span className="mx-0.5 sm:mx-1 text-slate-500">/</span>
                <span>{formatSeconds(duration)}</span>
              </div>
            </div>

            {/* Right Toolbar: Audio Dubs, Subtitles, Speed, Settings, PiP, Fullscreen */}
            <div className="flex items-center gap-0.5 sm:gap-1.5 md:gap-3 flex-shrink-0 relative">
              {/* Audio Track Menu Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAudioMenu((prev) => !prev);
                    setShowSubtitleMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className={`p-1.5 sm:p-2 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0 touch-manipulation ${
                    showAudioMenu ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Audio Languages"
                  aria-label="Audio Languages"
                >
                  <IconTranslate className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showAudioMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-11 sm:bottom-12 right-0 w-48 sm:w-56 max-w-[calc(100vw-1.5rem)] max-h-40 sm:max-h-56 overflow-y-auto bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl space-y-1 z-50 text-xs select-none touch-manipulation"
                  >
                    <div className="font-bold text-slate-300 px-2 py-1 border-b border-white/10 mb-1 flex items-center gap-1.5">
                      <IconTranslate className="w-3.5 h-3.5 text-emerald-400" />
                      Audio Languages
                    </div>
                    {allAudioTracks.map((track) => {
                      const isActive = track.id === activeAudioId;
                      return (
                        <button
                          key={track.id}
                          type="button"
                          onClick={() => handleSelectAudioTrack(track)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between touch-manipulation ${
                            isActive ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                          }`}
                        >
                          <span className="truncate mr-1">{track.label}</span>
                          {isActive && <IconCheck className="w-3.5 h-3.5 flex-shrink-0" />}
                        </button>
                      );
                    })}
                    {allAudioTracks.length === 1 && (
                      <div className="px-2.5 py-1 text-[10px] text-slate-400 italic border-t border-white/5 mt-1">
                        Single audio track stream
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Subtitles Menu Toggle */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSubtitleMenu((prev) => !prev);
                    setShowAudioMenu(false);
                    setShowSettingsMenu(false);
                  }}
                  className={`p-1.5 sm:p-2 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0 touch-manipulation ${
                    showSubtitleMenu || activeSubtitle !== 'off' ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Subtitles"
                  aria-label="Subtitles"
                >
                  <IconSubtitle className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showSubtitleMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-11 sm:bottom-12 right-0 w-44 sm:w-52 max-w-[calc(100vw-1.5rem)] max-h-40 sm:max-h-56 overflow-y-auto bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl space-y-1 z-50 text-xs select-none touch-manipulation"
                  >
                    <div className="font-bold text-slate-300 px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                      <span>Subtitles</span>
                      <IconSubtitle className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSubtitleChange('off')}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between touch-manipulation ${
                        activeSubtitle === 'off' ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      <span>Off</span>
                      {activeSubtitle === 'off' && <IconCheck className="w-3.5 h-3.5" />}
                    </button>
                    {allSubtitleTracks.length > 0 ? (
                      allSubtitleTracks.map((sub) => {
                        const isActive = activeSubtitle === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubtitleChange(sub.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between touch-manipulation ${
                              isActive ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            <span className="truncate mr-1">{sub.label}</span>
                            {isActive && <IconCheck className="w-3.5 h-3.5 flex-shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-2.5 py-1 text-[11px] text-slate-400 italic">
                        No subtitles available
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Settings Menu Toggle (Speed, Quality) */}
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSettingsMenu((prev) => !prev);
                    setShowSubtitleMenu(false);
                    setShowAudioMenu(false);
                  }}
                  className={`p-1.5 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0 touch-manipulation ${
                    showSettingsMenu ? 'text-primary bg-primary/10' : 'text-slate-300 hover:text-white'
                  }`}
                  title="Playback Settings"
                  aria-label="Playback Settings"
                >
                  <IconSettings className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>

                {showSettingsMenu && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute bottom-11 sm:bottom-12 right-0 w-52 sm:w-56 max-w-[calc(100vw-1.5rem)] max-h-48 sm:max-h-64 overflow-y-auto bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl space-y-3 z-50 text-xs select-none touch-manipulation"
                  >
                    {/* Quality selector */}
                    <div>
                      <div className="font-bold text-slate-300 mb-1.5">Quality</div>
                      <div className="grid grid-cols-3 gap-1">
                        {activeStreams.map((s, idx) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => handleQualityChange(idx)}
                            className={`py-1 px-1.5 rounded text-center font-medium ${
                              idx === currentStreamIndex
                                ? 'bg-primary text-white font-bold'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            {s.quality}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Playback speed selector */}
                    <div>
                      <div className="font-bold text-slate-300 mb-1.5">Speed</div>
                      <div className="grid grid-cols-4 gap-1">
                        {[0.75, 1, 1.25, 1.5, 2].map((sp) => (
                          <button
                            key={sp}
                            type="button"
                            onClick={() => handleSpeedChange(sp)}
                            className={`py-1 px-1 rounded text-center font-medium ${
                              playbackSpeed === sp
                                ? 'bg-primary text-white font-bold'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300'
                            }`}
                          >
                            {sp}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Picture in Picture */}
              <button
                type="button"
                onClick={togglePiP}
                className="p-1 sm:p-2 text-slate-300 hover:text-white hidden sm:block rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                title="Picture in Picture"
                aria-label="Picture in Picture"
              >
                <IconPIP className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="p-1 sm:p-2 text-slate-300 hover:text-white rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none flex-shrink-0"
                title="Fullscreen (F)"
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              >
                {isFullscreen ? <IconQuitFullScreen className="w-4 h-4 sm:w-5 sm:h-5" /> : <IconFullScreen className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>
            </div>
          </div>
        </div>
      )}
          </>
        )}
      </div>
    </div>
  );
}
