import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  Settings,
  SkipForward,
  SkipBack,
  Flame,
  Zap,
  Image as ImageIcon,
  Tv,
  Layers,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  X,
  ExternalLink,
  Radio,
  Sliders,
  Compass,
} from 'lucide-react';
import { Anime, ThumbnailAppearance, WatchHistoryEntry } from '../types';
import { recordWatchProgress, getStoredWatchHistory, getStoredSettings } from '../services/storage';

interface EpisodeItem {
  number: number;
  title: string;
  thumbnail: string;
  synopsis?: string;
  filler?: boolean;
}

interface ProVideoPlayerProps {
  anime: Anime;
  episodeNumber: number;
  episodeTitle?: string;
  seasonTitle?: string;
  episodesList?: EpisodeItem[];
  initialTime?: number; // timestamp to resume in seconds
  onEpisodeChange?: (episodeNumber: number) => void;
  onClosePlayer?: () => void;
  onThumbnailStyleChange?: (style: ThumbnailAppearance) => void;
  initialThumbnailStyle?: ThumbnailAppearance;
}

export const ProVideoPlayer: React.FC<ProVideoPlayerProps> = ({
  anime,
  episodeNumber,
  episodeTitle,
  seasonTitle,
  episodesList = [],
  initialTime = 0,
  onEpisodeChange,
  onClosePlayer,
  onThumbnailStyleChange,
  initialThumbnailStyle = 'snapshot',
}) => {
  // Player state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(initialTime);
  const [duration, setDuration] = useState<number>(1440); // 24 mins default
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volumeBoost, setVolumeBoost] = useState<number>(100); // 100% to 300%
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [is2xHolding, setIs2xHolding] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isTheaterMode, setIsTheaterMode] = useState<boolean>(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
  const [showThumbnailMenu, setShowThumbnailMenu] = useState<boolean>(false);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [directIframeInteractionMode, setDirectIframeInteractionMode] = useState<boolean>(false);
  const [activeServer, setActiveServer] = useState<'anikoto' | 'vidsrc' | 'embedsu' | '2embed'>('anikoto');
  const [audioMode, setAudioMode] = useState<'SUB' | 'DUB'>('SUB');
  const [quality, setQuality] = useState<'1080p' | '720p' | '480p' | 'auto'>('1080p');
  const [thumbnailStyle, setThumbnailStyle] = useState<ThumbnailAppearance>(initialThumbnailStyle);

  // Synchronize preferred server and language priority from settings
  useEffect(() => {
    try {
      const s = getStoredSettings();
      if (s.preferredServers && s.preferredServers.length > 0) {
        setActiveServer(s.preferredServers[0]);
      }
      if (s.preferredLanguages && s.preferredLanguages.length > 0) {
        setAudioMode(s.preferredLanguages[0] === 'DUB' ? 'DUB' : 'SUB');
      } else if (s.preferredAudio) {
        setAudioMode(s.preferredAudio === 'dub' ? 'DUB' : 'SUB');
      }
    } catch (err) {
      console.error('Error syncing player preferences:', err);
    }
  }, []);

  // Resume toast state
  const [showResumeToast, setShowResumeToast] = useState<boolean>(false);
  const [resumedFromTime, setResumedFromTime] = useState<number>(0);

  // Ripple feedback effects for double taps & gestures
  const [skipForwardEffect, setSkipForwardEffect] = useState<boolean>(false);
  const [skipBackwardEffect, setSkipBackwardEffect] = useState<boolean>(false);

  // Refs
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const holdSpeedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressActiveRef = useRef<boolean>(false);
  const singleTapTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef<number>(0);
  const lastTapCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Format seconds to mm:ss or hh:mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Check saved resume time on initial mount
  useEffect(() => {
    const history = getStoredWatchHistory();
    const existing = history.find(h => h.animeId === anime.id && h.episodeNumber === episodeNumber);
    if (existing && existing.currentTime > 15 && (!existing.duration || existing.currentTime < existing.duration - 30)) {
      setCurrentTime(existing.currentTime);
      setDuration(existing.duration || 1440);
      setResumedFromTime(existing.currentTime);
      setShowResumeToast(true);
      const timer = setTimeout(() => setShowResumeToast(false), 5000);
      return () => clearTimeout(timer);
    } else if (initialTime > 0) {
      setCurrentTime(initialTime);
    }
  }, [anime.id, episodeNumber, initialTime]);

  // Periodic watch progress recorder (saves every 3 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentTime > 5) {
        recordWatchProgress({
          anime,
          episodeNumber,
          episodeTitle: episodeTitle || `Episode ${episodeNumber}`,
          seasonTitle: seasonTitle || anime.title?.english || anime.title?.romaji,
          currentTime,
          duration,
          thumbnailStyle,
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [anime, episodeNumber, episodeTitle, seasonTitle, currentTime, duration, thumbnailStyle]);

  // Simulated playback time advancement (syncs timestamp cleanly)
  useEffect(() => {
    if (!isPlaying) return;
    const speed = is2xHolding ? 2.0 : playbackSpeed;
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        const next = prev + (0.5 * speed);
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, is2xHolding, duration]);

  // Autohide controls on inactivity
  const handleMouseMove = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showSettingsMenu && !showThumbnailMenu && !showEpisodeDrawer) {
        setShowControls(false);
      }
    }, 3500);
  }, [isPlaying, showSettingsMenu, showThumbnailMenu, showEpisodeDrawer]);

  // Touch / Pointer hold for 2X Speed
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Avoid triggering on control bar clicks
    const target = e.target as HTMLElement;
    if (target.closest('.player-controls-interactive')) return;

    if (holdSpeedTimeoutRef.current) {
      clearTimeout(holdSpeedTimeoutRef.current);
    }

    isLongPressActiveRef.current = false;
    holdSpeedTimeoutRef.current = setTimeout(() => {
      isLongPressActiveRef.current = true;
      setIs2xHolding(true);
      // Cancel pending single tap when 2x speed hold activates
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
        tapCountRef.current = 0;
      }
    }, 280); // 280ms hold activates 2x speed
  };

  const handlePointerUp = () => {
    if (holdSpeedTimeoutRef.current) {
      clearTimeout(holdSpeedTimeoutRef.current);
      holdSpeedTimeoutRef.current = null;
    }
    if (is2xHolding || isLongPressActiveRef.current) {
      setIs2xHolding(false);
      // Keep isLongPressActiveRef true briefly to swallow the trailing click event
      setTimeout(() => {
        isLongPressActiveRef.current = false;
      }, 100);
    }
  };

  // Distinct Single Tap vs Double Tap Detection
  const handleGestureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const target = e.target as HTMLElement;
    if (target.closest('.player-controls-interactive')) return;
    if (isLongPressActiveRef.current) {
      isLongPressActiveRef.current = false;
      return;
    }

    const rect = playerContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const width = rect.width;

    tapCountRef.current += 1;

    if (tapCountRef.current === 1) {
      lastTapCoordsRef.current = { x: clickX, y: clickY };
      singleTapTimeoutRef.current = setTimeout(() => {
        // Confirmed Single Tap: Toggle control bar visibility
        tapCountRef.current = 0;
        setShowControls(prev => !prev);
      }, 260);
    } else if (tapCountRef.current >= 2) {
      // Confirmed Double Tap: Cancel single tap timeout immediately
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      tapCountRef.current = 0;

      // Check tap position: Right (>62%), Left (<38%), Center (38-62%)
      if (clickX > width * 0.62) {
        // Double tap right: +10s
        handleSkip(10);
        setSkipForwardEffect(true);
        setTimeout(() => setSkipForwardEffect(false), 600);
      } else if (clickX < width * 0.38) {
        // Double tap left: -10s
        handleSkip(-10);
        setSkipBackwardEffect(true);
        setTimeout(() => setSkipBackwardEffect(false), 600);
      } else {
        // Double tap center: toggle play/pause
        setIsPlaying(prev => !prev);
      }
    }
  };

  const handleSkip = (seconds: number) => {
    setCurrentTime(prev => {
      const next = Math.max(0, Math.min(duration, prev + seconds));
      return next;
    });
  };

  // Fullscreen toggle
  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await playerContainerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Fullscreen request failed:', err);
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Key shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['input', 'textarea', 'select'].includes((e.target as HTMLElement)?.tagName?.toLowerCase())) return;

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          setIsPlaying(prev => !prev);
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleSkip(10);
          setSkipForwardEffect(true);
          setTimeout(() => setSkipForwardEffect(false), 600);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-10);
          setSkipBackwardEffect(true);
          setTimeout(() => setSkipBackwardEffect(false), 600);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(prev => Math.min(1, prev + 0.1));
          setIsMuted(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(prev => Math.max(0, prev - 0.1));
          break;
        case 'KeyM':
          e.preventDefault();
          setIsMuted(prev => !prev);
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyT':
          e.preventDefault();
          setIsTheaterMode(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Compute embed stream URL based on selected server
  const getEmbedStreamUrl = () => {
    const malId = anime.idMal || anime.id;
    const isDub = audioMode === 'DUB';

    switch (activeServer) {
      case 'anikoto':
        return `https://anikoto.com/watch/${malId}?ep=${episodeNumber}&dub=${isDub ? '1' : '0'}`;
      case 'vidsrc':
        return `https://vidsrc.me/embed/anime?id=${malId}&ep=${episodeNumber}`;
      case 'embedsu':
        return `https://embed.su/embed/anime/${malId}/${episodeNumber}`;
      case '2embed':
        return `https://www.2embed.cc/embed/${malId}?ep=${episodeNumber}`;
      default:
        return `https://anikoto.com/watch/${malId}?ep=${episodeNumber}`;
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentEpData = episodesList.find(e => e.number === episodeNumber);
  const displayTitle = currentEpData?.title || episodeTitle || `Episode ${episodeNumber}`;
  const bannerImage = anime.bannerImage || anime.coverImage?.extraLarge || anime.coverImage?.large;

  return (
    <div
      ref={playerContainerRef}
      onMouseMove={handleMouseMove}
      onContextMenu={e => {
        e.preventDefault();
        return false;
      }}
      className={`relative select-none overflow-hidden bg-black font-sans text-white group ${
        isTheaterMode
          ? 'w-full min-h-[540px] sm:min-h-[640px] rounded-none shadow-2xl'
          : 'w-full aspect-video rounded-2xl sm:rounded-3xl border border-slate-800/80 shadow-2xl'
      }`}
    >
      {/* 1. Underlying Video Player Stream / Iframe Frame */}
      <div className="absolute inset-0 z-0 bg-black">
        <iframe
          key={`${activeServer}-${episodeNumber}-${audioMode}`}
          src={getEmbedStreamUrl()}
          title={`${anime.title?.english || anime.title?.romaji} - Episode ${episodeNumber}`}
          className={`w-full h-full border-0 ${directIframeInteractionMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>

      {/* 2. Interactive Gesture Layer (Double tap to skip 10s, single tap for controls, touch-and-hold for 2X speed) */}
      {!directIframeInteractionMode && (
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onClick={handleGestureClick}
          onContextMenu={e => {
            e.preventDefault();
            e.stopPropagation();
            return false;
          }}
          style={{
            WebkitTouchCallout: 'none',
            WebkitUserSelect: 'none',
            userSelect: 'none',
            touchAction: 'manipulation',
          }}
          className="absolute inset-0 z-10 pointer-events-auto cursor-pointer select-none"
        />
      )}

      {/* 3. Discreet 2X Speed Indicator when Holding (Small top badge) */}
      {is2xHolding && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 rounded-md bg-black/85 text-white font-black text-xs tracking-wider border border-neutral-700 shadow-xl backdrop-blur-md">
            2×
          </div>
        </div>
      )}

      {/* 4. Left Ripple Effect (-10s Skip) */}
      {skipBackwardEffect && (
        <div className="absolute left-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-in zoom-in-50 fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white border border-indigo-400/60 shadow-2xl">
            <RotateCcw className="w-6 h-6 animate-spin" />
            <span className="text-[11px] font-black mt-0.5">-10s</span>
          </div>
        </div>
      )}

      {/* 5. Right Ripple Effect (+10s Skip) */}
      {skipForwardEffect && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 z-30 pointer-events-none animate-in zoom-in-50 fade-in duration-300">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-600/90 backdrop-blur-md flex flex-col items-center justify-center text-white border border-indigo-400/60 shadow-2xl">
            <RotateCw className="w-6 h-6 animate-spin" />
            <span className="text-[11px] font-black mt-0.5">+10s</span>
          </div>
        </div>
      )}

      {/* 6. Resume Toast Notification */}
      {showResumeToast && (
        <div className="absolute bottom-20 left-6 z-30 pointer-events-auto animate-in slide-in-from-bottom-3 duration-300">
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#0e0e12]/95 border border-indigo-500/50 shadow-2xl backdrop-blur-xl">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <div className="text-xs">
              <span className="text-neutral-300 font-medium">Resuming from </span>
              <span className="text-indigo-300 font-bold">{formatTime(resumedFromTime)}</span>
            </div>
            <button
              onClick={e => {
                e.stopPropagation();
                setCurrentTime(0);
                setShowResumeToast(false);
              }}
              className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-[11px] font-bold text-amber-300 border border-neutral-700 transition"
            >
              Start Over
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                setShowResumeToast(false);
              }}
              className="text-neutral-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 7. Top Bar Controls Header */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-b from-black/90 via-black/40 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          {/* Anime Title & Episode metadata */}
          <div className="min-w-0">
            {seasonTitle && (
              <div className="text-xs text-slate-300 font-semibold truncate">
                {seasonTitle}
              </div>
            )}
            <h3 className="font-bold text-sm sm:text-base text-white truncate drop-shadow">
              {anime.title?.english || anime.title?.romaji} • Ep {episodeNumber}: {displayTitle}
            </h3>
          </div>

          {/* Top Right Quick Badges */}
          <div className="flex items-center gap-2 shrink-0 player-controls-interactive">
            {/* Audio SUB / DUB switch */}
            <button
              onClick={e => {
                e.stopPropagation();
                setAudioMode(prev => (prev === 'SUB' ? 'DUB' : 'SUB'));
              }}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition border ${
                audioMode === 'DUB'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                  : 'bg-indigo-600/80 text-white border-indigo-400/40 hover:bg-indigo-600'
              }`}
              title="Toggle Sub / Dub Audio"
            >
              {audioMode}
            </button>

            {/* Thumbnail Appearance Button */}
            <button
              onClick={e => {
                e.stopPropagation();
                setShowThumbnailMenu(prev => !prev);
                setShowSettingsMenu(false);
              }}
              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                showThumbnailMenu
                  ? 'bg-indigo-600 text-white border-indigo-400'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800'
              }`}
              title="Customize Episode Thumbnail Appearance"
            >
              <ImageIcon className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline text-xs">Thumb: {thumbnailStyle}</span>
            </button>

            {/* Close Player */}
            {onClosePlayer && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onClosePlayer();
                }}
                className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-900/80 text-slate-300 hover:text-white border border-slate-700 hover:border-rose-500 transition"
                title="Exit player"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 8. Thumbnail Appearance Dropdown Menu */}
      {showThumbnailMenu && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-16 right-6 z-30 w-64 rounded-2xl bg-[#0a0a0c]/98 border border-neutral-800 shadow-2xl p-3.5 backdrop-blur-2xl player-controls-interactive animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
              Thumbnail Appearance
            </span>
            <button onClick={() => setShowThumbnailMenu(false)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-[11px] text-neutral-400 mt-2 mb-3">
            Change how episode cards & history snapshots appear:
          </p>

          <div className="space-y-1.5">
            {[
              { id: 'snapshot', label: '16:9 Episode Snapshot', desc: 'Detailed frame capture from the episode' },
              { id: 'banner', label: 'Cinematic Wide Banner', desc: 'Expansive panorama key visual banner' },
              { id: 'poster', label: 'Official Key Visual Poster', desc: 'Vertical anime cover artwork' },
            ].map(opt => (
              <button
                key={opt.id}
                onClick={() => {
                  setThumbnailStyle(opt.id as ThumbnailAppearance);
                  onThumbnailStyleChange?.(opt.id as ThumbnailAppearance);
                  setShowThumbnailMenu(false);
                }}
                className={`w-full p-2.5 rounded-xl text-left transition flex items-start justify-between gap-2 ${
                  thumbnailStyle === opt.id
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'bg-neutral-900/70 hover:bg-neutral-800 text-neutral-300'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold">{opt.label}</div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">{opt.desc}</div>
                </div>
                {thumbnailStyle === opt.id && <Check className="w-4 h-4 text-emerald-300 shrink-0 mt-0.5" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 9. Player Settings Modal (Speed, Volume Booster, Server, Quality, Direct Iframe Mode) */}
      {showSettingsMenu && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute bottom-20 right-6 z-30 w-72 rounded-2xl bg-[#0a0a0c]/98 border border-neutral-800 shadow-2xl p-4 backdrop-blur-2xl player-controls-interactive animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <div className="flex items-center justify-between pb-2.5 border-b border-neutral-800">
            <span className="text-xs font-bold text-neutral-200 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-indigo-400" />
              Player Options & Booster
            </span>
            <button onClick={() => setShowSettingsMenu(false)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4 py-3 text-xs">
            {/* Volume Booster (100% to 300%) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-neutral-300">
                <span className="flex items-center gap-1.5 font-bold">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  Volume Booster:
                </span>
                <span className="font-black text-amber-400">{volumeBoost}%</span>
              </div>
              <input
                type="range"
                min="100"
                max="300"
                step="25"
                value={volumeBoost}
                onChange={e => setVolumeBoost(Number(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>100% (Normal)</span>
                <span>200% (Boost)</span>
                <span>300% (Max)</span>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="space-y-1.5">
              <div className="text-neutral-300 font-bold">Playback Speed:</div>
              <div className="grid grid-cols-4 gap-1">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5].map(spd => (
                  <button
                    key={spd}
                    onClick={() => {
                      setPlaybackSpeed(spd);
                      setShowSettingsMenu(false);
                    }}
                    className={`py-1.5 rounded-lg text-center font-bold text-xs transition ${
                      playbackSpeed === spd
                        ? 'bg-indigo-600 text-white'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Stream Server */}
            <div className="space-y-1.5">
              <div className="text-neutral-300 font-bold">Streaming Server:</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(['anikoto', 'vidsrc', 'embedsu', '2embed'] as const).map(srv => (
                  <button
                    key={srv}
                    onClick={() => {
                      setActiveServer(srv);
                      setShowSettingsMenu(false);
                    }}
                    className={`py-1.5 px-2 rounded-lg text-left text-xs font-semibold transition ${
                      activeServer === srv
                        ? 'bg-orange-600 text-white font-bold'
                        : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800 border border-neutral-800'
                    }`}
                  >
                    {srv === 'anikoto' ? '★ Anikoto (Fast)' : srv.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Iframe Clicks Toggle */}
            <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-neutral-200">Direct Player Clicks</div>
                <div className="text-[10px] text-neutral-400">Pass clicks directly to iframe video</div>
              </div>
              <button
                type="button"
                onClick={() => setDirectIframeInteractionMode(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                  directIframeInteractionMode
                    ? 'bg-emerald-600 text-white'
                    : 'bg-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                {directIframeInteractionMode ? 'Enabled' : 'Gestures Only'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Bottom Control Bar (Scrubber & Player Buttons) */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="space-y-2 player-controls-interactive" onClick={e => e.stopPropagation()}>
          {/* Progress Timeline Scrubber Bar */}
          <div className="relative group/scrubber cursor-pointer py-2">
            <div className="w-full h-1.5 group-hover/scrubber:h-2.5 rounded-full bg-slate-800/90 overflow-hidden transition-all">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-500 rounded-full transition-all"
                style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
              />
            </div>

            {/* Interactive Slider Input */}
            <input
              type="range"
              min="0"
              max={duration || 1440}
              value={currentTime}
              onChange={e => setCurrentTime(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          {/* Buttons Row */}
          <div className="flex items-center justify-between gap-4 pt-1">
            {/* Left Controls: Play, Skip, Volume, Time */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Play / Pause Button */}
              <button
                onClick={() => setIsPlaying(prev => !prev)}
                className="p-2 sm:p-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white transition transform active:scale-95 shadow-lg shadow-orange-600/30"
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
              </button>

              {/* 10s Rewind */}
              <button
                onClick={() => {
                  handleSkip(-10);
                  setSkipBackwardEffect(true);
                  setTimeout(() => setSkipBackwardEffect(false), 500);
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                title="Skip back 10s (Left Arrow)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* 10s Forward */}
              <button
                onClick={() => {
                  handleSkip(10);
                  setSkipForwardEffect(true);
                  setTimeout(() => setSkipForwardEffect(false), 500);
                }}
                className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                title="Skip forward 10s (Right Arrow)"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              {/* Next Episode Button */}
              {episodesList.length > 0 && onEpisodeChange && (
                <button
                  disabled={episodeNumber >= episodesList.length}
                  onClick={() => onEpisodeChange(episodeNumber + 1)}
                  className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Next Episode"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}

              {/* Volume Slider with Boost tag */}
              <div className="flex items-center gap-1.5 group/vol">
                <button
                  onClick={() => setIsMuted(prev => !prev)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 transition"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={e => {
                    setVolume(Number(e.target.value));
                    setIsMuted(false);
                  }}
                  className="w-16 sm:w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />

                {volumeBoost > 100 && (
                  <span className="text-[10px] font-black text-orange-400 px-1 py-0.5 rounded bg-orange-950/80 border border-orange-500/40">
                    {volumeBoost}%
                  </span>
                )}
              </div>

              {/* Time Display */}
              <div className="text-xs font-mono text-slate-300 font-semibold pl-1">
                <span className="text-white">{formatTime(currentTime)}</span>
                <span className="text-slate-500"> / </span>
                <span className="text-slate-400">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed Badge, Theater, Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Playback speed indicator pill */}
              <button
                onClick={() => setShowSettingsMenu(prev => !prev)}
                className="px-2.5 py-1 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold border border-neutral-800 transition"
                title="Adjust Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {/* Theater Mode Toggle */}
              <button
                onClick={() => setIsTheaterMode(prev => !prev)}
                className={`p-2 rounded-xl border transition hidden sm:flex items-center justify-center ${
                  isTheaterMode
                    ? 'bg-indigo-600 text-white border-indigo-400'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800'
                }`}
                title="Theater Mode (T)"
              >
                <Tv className="w-4 h-4" />
              </button>

              {/* Settings Menu Button */}
              <button
                onClick={() => setShowSettingsMenu(prev => !prev)}
                className={`p-2 rounded-xl border transition ${
                  showSettingsMenu
                    ? 'bg-orange-600 text-white border-orange-400'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border-neutral-800'
                }`}
                title="Video & Audio Booster Settings"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* Fullscreen Button */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition"
                title={isFullscreen ? 'Exit Fullscreen (F)' : 'Fullscreen (F)'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
