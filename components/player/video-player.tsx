'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Settings as SettingsIcon,
  Subtitles,
  SkipForward,
  SkipBack,
  List,
  AlertCircle,
  PictureInPicture2,
} from 'lucide-react';
import { StreamSource, SubtitleTrack } from '@/types/providers';
import { ContentItem, Episode } from '@/types/content';
import { formatSeconds } from '@/lib/utils';
import { saveWatchProgress } from '@/lib/storage/local-storage-store';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';

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

  // Active stream source
  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const currentStream = streams[currentStreamIndex] || streams[0];

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

  // Settings dropdowns
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);
  const [activeSubtitle, setActiveSubtitle] = useState<string>('off');

  // Auto-apply user preferences for stream quality and subtitle
  useEffect(() => {
    if (!user || streams.length === 0) return;

    if (user.defaultQuality && user.defaultQuality !== 'auto') {
      const matchIdx = streams.findIndex((s) => s.quality === user.defaultQuality);
      if (matchIdx >= 0) setCurrentStreamIndex(matchIdx);
    }

    if (user.preferredSubtitleLanguage && user.preferredSubtitleLanguage !== 'Off') {
      const pref = user.preferredSubtitleLanguage.toLowerCase();
      const subMatch = currentStream?.subtitles?.find(
        (s) => s.label.toLowerCase().includes(pref) || s.language.toLowerCase().includes(pref)
      );
      if (subMatch) {
        setActiveSubtitle(subMatch.id);
        if (videoRef.current) {
          for (let i = 0; i < videoRef.current.textTracks.length; i++) {
            const track = videoRef.current.textTracks[i];
            if (track.id === subMatch.id || track.language === subMatch.language) {
              track.mode = 'showing';
            }
          }
        }
      }
    }
  }, [user, streams, currentStream]);

  // Sync progress callback
  const syncProgress = useCallback(
    (time: number, dur: number) => {
      if (dur > 0 && time > 0) {
        saveWatchProgress(content, Math.floor(time), Math.floor(dur), episode?.id);
      }
    },
    [content, episode]
  );

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

  // Save on unload / unmount
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        syncProgress(videoRef.current.currentTime, videoRef.current.duration);
      }
    };
  }, [syncProgress]);

  // Keyboard controls
  useEffect(() => {
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
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowSettingsMenu(false);
        setShowSubtitleMenu(false);
      }, 3500);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
      syncProgress(video.currentTime, video.duration);
    }
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

  const handleQualityChange = (index: number) => {
    const video = videoRef.current;
    if (!video) return;
    const time = video.currentTime;
    const playing = !video.paused;
    setCurrentStreamIndex(index);
    setShowSettingsMenu(false);

    // Maintain time position on quality switch
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = time;
        if (playing) videoRef.current.play().catch(() => {});
      }
    }, 100);
  };

  const handleSubtitleChange = (subId: string) => {
    const video = videoRef.current;
    if (!video) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (subId === 'off') {
        track.mode = 'disabled';
      } else if (track.id === subId || track.language === subId) {
        track.mode = 'showing';
      } else {
        track.mode = 'disabled';
      }
    }
    setActiveSubtitle(subId);
    setShowSubtitleMenu(false);
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    // Update buffer progress
    if (video.buffered.length > 0) {
      setBufferedEnd(video.buffered.end(video.buffered.length - 1));
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl group select-none flex items-center justify-center border border-white/10"
    >
      {/* Video Element */}
      {currentStream ? (
        <video
          ref={videoRef}
          src={currentStream.url}
          className="w-full h-full object-contain cursor-pointer"
          onClick={togglePlay}
          onTimeUpdate={handleTimeUpdate}
          onWaiting={() => setIsLoading(true)}
          onPlaying={() => {
            setIsLoading(false);
            setIsPlaying(true);
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
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
              default={sub.default}
            />
          ))}
        </video>
      ) : (
        <div className="text-center p-8 space-y-3">
          <AlertCircle className="w-12 h-12 text-accent mx-auto" />
          <h3 className="text-lg font-bold text-white">This source is temporarily unavailable</h3>
          <p className="text-sm text-slate-400 max-w-md">
            The requested stream could not be loaded from this provider. Please try selecting another source.
          </p>
        </div>
      )}

      {/* Loading Spinner */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm p-6 text-center z-30">
          <AlertCircle className="w-12 h-12 text-accent mb-3 animate-bounce" />
          <h3 className="text-xl font-bold text-white mb-1">Video Stream Unavailable</h3>
          <p className="text-sm text-slate-400 max-w-md mb-4">
            Could not stream media from current provider. Please try reloading or choose an alternative quality.
          </p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setHasError(false);
              setIsLoading(true);
              videoRef.current?.load();
            }}
          >
            Retry Stream
          </Button>
        </div>
      )}

      {/* Big Center Play/Pause button indicator on click */}
      {!isPlaying && !isLoading && !hasError && (
        <button
          onClick={togglePlay}
          className="absolute w-20 h-20 rounded-full bg-primary/90 hover:bg-primary text-white flex items-center justify-center shadow-2xl transition-all scale-100 hover:scale-110 z-20"
          aria-label="Play video"
        >
          <Play className="w-9 h-9 fill-white ml-1" />
        </button>
      )}

      {/* Player Header (Title, Episode) */}
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
          >
            <List className="w-4 h-4" />
            Episodes
          </Button>
        )}
      </div>

      {/* Player Controls Bottom Bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3 transition-opacity duration-300 z-30 ${
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
            className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg pointer-events-none group-hover/scrubber:scale-125 transition-transform"
            style={{ left: `calc(${progressPercent}% - 7px)` }}
          />
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex items-center justify-between text-white">
          {/* Left Toolbar: Play, Skip, Time, Volume */}
          <div className="flex items-center gap-2 sm:gap-4">
            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                className="p-2 text-slate-300 hover:text-white"
                title="Previous Episode"
              >
                <SkipBack className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={togglePlay}
              className="p-2 text-white hover:text-primary transition-colors"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white" />}
            </button>

            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                className="p-2 text-slate-300 hover:text-white"
                title="Next Episode"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            )}

            <button
              onClick={() => seekDelta(-10)}
              className="p-2 text-slate-300 hover:text-white"
              title="Rewind 10 seconds (Left Arrow)"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => seekDelta(10)}
              className="p-2 text-slate-300 hover:text-white"
              title="Fast Forward 10 seconds (Right Arrow)"
            >
              <RotateCw className="w-5 h-5" />
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 group/volume">
              <button
                onClick={toggleMute}
                className="p-2 text-slate-300 hover:text-white"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-accent" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 sm:w-24 h-1 accent-primary bg-white/20 rounded-lg cursor-pointer hidden sm:block"
                aria-label="Volume"
              />
            </div>

            {/* Time Stamp */}
            <div className="text-xs sm:text-sm font-medium text-slate-300 ml-1">
              <span>{formatSeconds(currentTime)}</span>
              <span className="mx-1 text-slate-500">/</span>
              <span>{formatSeconds(duration)}</span>
            </div>
          </div>

          {/* Right Toolbar: Subtitles, Speed, Settings, PiP, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-3 relative">
            {/* Subtitles Menu Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubtitleMenu(!showSubtitleMenu);
                  setShowSettingsMenu(false);
                }}
                className={`p-2 transition-colors ${
                  activeSubtitle !== 'off' ? 'text-primary' : 'text-slate-300 hover:text-white'
                }`}
                title="Subtitles"
              >
                <Subtitles className="w-5 h-5" />
              </button>

              {showSubtitleMenu && (
                <div className="absolute bottom-12 right-0 w-48 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl space-y-1 z-50 text-xs">
                  <div className="font-bold text-slate-300 px-2 py-1 border-b border-white/10 mb-1">
                    Subtitles
                  </div>
                  <button
                    onClick={() => handleSubtitleChange('off')}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                      activeSubtitle === 'off' ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    Off
                  </button>
                  {currentStream?.subtitles?.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => handleSubtitleChange(sub.id)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors ${
                        activeSubtitle === sub.id ? 'bg-primary text-white font-bold' : 'hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Settings Menu Toggle (Speed, Quality) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSettingsMenu(!showSettingsMenu);
                  setShowSubtitleMenu(false);
                }}
                className="p-2 text-slate-300 hover:text-white"
                title="Playback Settings"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>

              {showSettingsMenu && (
                <div className="absolute bottom-12 right-0 w-56 bg-card/95 backdrop-blur-xl border border-white/10 rounded-xl p-3 shadow-2xl space-y-3 z-50 text-xs">
                  {/* Quality selector */}
                  <div>
                    <div className="font-bold text-slate-300 mb-1.5">Quality</div>
                    <div className="grid grid-cols-3 gap-1">
                      {streams.map((s, idx) => (
                        <button
                          key={s.id}
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
              onClick={togglePiP}
              className="p-2 text-slate-300 hover:text-white hidden sm:block"
              title="Picture in Picture"
            >
              <PictureInPicture2 className="w-5 h-5" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-300 hover:text-white"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
