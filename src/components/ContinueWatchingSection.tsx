import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Bookmark,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Image as ImageIcon,
  Clock,
  Check,
} from 'lucide-react';
import { Anime, WatchHistoryEntry, ThumbnailAppearance, MediaListStatus } from '../types';
import {
  getStoredWatchHistory,
  removeWatchHistoryItem,
  clearWatchHistory,
  updateWatchHistoryThumbnailStyle,
} from '../services/storage';

interface ContinueWatchingSectionProps {
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime, episodeNumber?: number, startTime?: number) => void;
  onUpdateStatus?: (anime: Anime, status: MediaListStatus) => void;
  onExploreTrending?: () => void;
}

export const ContinueWatchingSection: React.FC<ContinueWatchingSectionProps> = ({
  onOpenDetails,
  onPlayStream,
  onUpdateStatus,
  onExploreTrending,
}) => {
  const [history, setHistory] = useState<WatchHistoryEntry[]>([]);
  const [selectedActionItem, setSelectedActionItem] = useState<WatchHistoryEntry | null>(null);
  const [globalThumbnailStyle, setGlobalThumbnailStyle] = useState<ThumbnailAppearance>('snapshot');
  const [showThumbSelector, setShowThumbSelector] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // Load live watch history
  const reloadHistory = () => {
    const data = getStoredWatchHistory();
    setHistory(data);
  };

  useEffect(() => {
    reloadHistory();
    const interval = setInterval(reloadHistory, 2500);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTouchStart = (item: WatchHistoryEntry) => {
    isLongPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      isLongPressTriggeredRef.current = true;
      setSelectedActionItem(item);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCardClick = (item: WatchHistoryEntry) => {
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      return;
    }
    // Resume directly from exact timestamp
    onPlayStream(item.anime, item.episodeNumber, item.currentTime);
  };

  const handleRemoveItem = (item: WatchHistoryEntry) => {
    const updated = removeWatchHistoryItem(item.animeId, item.episodeNumber);
    setHistory(updated);
    setSelectedActionItem(null);
  };

  const handleClearAll = () => {
    clearWatchHistory();
    setHistory([]);
    setSelectedActionItem(null);
  };

  const handleChangeThumbnailStyle = (style: ThumbnailAppearance) => {
    setGlobalThumbnailStyle(style);
    setShowThumbSelector(false);
  };

  // If user has not watched any anime yet, render a sleek empty state (no fake categories/anime)
  if (history.length === 0) {
    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Continue Watching</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-bold border border-slate-700">
              Live History
            </span>
          </h2>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-[#111424]/70 border border-slate-800/80 text-center space-y-3 backdrop-blur-sm">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-base font-bold text-white">No Active Watch History Yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              When you play an episode, your exact timestamp and progress will automatically appear here so you can pick up right where you left off.
            </p>
          </div>
          {onExploreTrending && (
            <button
              onClick={onExploreTrending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/20 transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Explore Trending Anime</span>
            </button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Header with Title, Navigation Arrows, & Appearance Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Continue Watching
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold">
              {history.length} {history.length === 1 ? 'Title' : 'Titles'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time playback history • Swipe left to right to browse your episodes
          </p>
        </div>

        {/* Action toolbar: Thumbnail Style Switcher + Clear All */}
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setShowThumbSelector(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition cursor-pointer"
            title="Switch Thumbnail Appearance"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
            <span className="capitalize hidden sm:inline">{globalThumbnailStyle} View</span>
          </button>

          {showThumbSelector && (
            <div className="absolute right-0 top-full mt-2 z-40 w-52 rounded-2xl bg-[#121628] border border-slate-700 shadow-2xl p-2 text-xs space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95">
              <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Thumbnail Appearance
              </div>
              {[
                { id: 'snapshot', label: '16:9 Episode Snapshot' },
                { id: 'banner', label: 'Cinematic Wide Banner' },
                { id: 'poster', label: 'Vertical Poster Card' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => handleChangeThumbnailStyle(opt.id as ThumbnailAppearance)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-medium transition cursor-pointer ${
                    globalThumbnailStyle === opt.id
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  {globalThumbnailStyle === opt.id && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={handleClearAll}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 hover:border-rose-800/60 text-xs font-medium transition cursor-pointer"
            title="Clear all watch history"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Horizontal Swiping / Scrolling Carousel (Left to Right) */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-4 overflow-x-auto pb-4 pt-1 px-0.5 snap-x scrollbar-none scroll-smooth"
      >
        {history.map(item => {
          const title = item.anime.title?.english || item.anime.title?.romaji || 'Anime';
          const style = item.thumbnailStyle || globalThumbnailStyle;

          // Resolve image by selected thumbnail appearance
          let imageSrc = item.anime.bannerImage || item.anime.coverImage?.extraLarge || item.anime.coverImage?.large;
          if (style === 'poster') {
            imageSrc = item.anime.coverImage?.extraLarge || item.anime.coverImage?.large || imageSrc;
          } else if (style === 'snapshot') {
            // Snapshot mode prefers banner or dynamic fallback
            imageSrc = item.anime.bannerImage || item.anime.coverImage?.extraLarge || item.anime.coverImage?.large;
          }

          const progressPercent = item.duration > 0 ? (item.currentTime / item.duration) * 100 : 0;

          // Compute card width classes
          const cardWidthClass =
            style === 'poster'
              ? 'w-[160px] sm:w-[190px] min-w-[160px] sm:min-w-[190px]'
              : style === 'banner'
              ? 'w-[300px] sm:w-[360px] min-w-[300px] sm:min-w-[360px]'
              : 'w-[280px] sm:w-[320px] min-w-[280px] sm:min-w-[320px]';

          return (
            <div
              key={`${item.animeId}-${item.episodeNumber}`}
              onContextMenu={e => {
                e.preventDefault();
                setSelectedActionItem(item);
              }}
              onTouchStart={() => handleTouchStart(item)}
              onTouchMove={handleTouchEnd}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleCardClick(item)}
              className={`group relative cursor-pointer select-none rounded-2xl overflow-hidden bg-[#121626] border border-slate-800/90 hover:border-indigo-500/80 transition-all duration-300 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col justify-between shrink-0 snap-start ${cardWidthClass}`}
            >
              {/* Thumbnail Container */}
              <div
                className={`relative w-full overflow-hidden bg-slate-900 ${
                  style === 'poster' ? 'aspect-[3/4]' : 'aspect-[16/9]'
                }`}
              >
                <img
                  src={imageSrc}
                  alt={title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />

                {/* Dark Vignette Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/10" />

                {/* Center Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:bg-orange-600 transition-all duration-300">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </div>
                </div>

                {/* Episode Badge top-left */}
                <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/10 text-[11px] font-black text-amber-300 tracking-tight">
                  EP {item.episodeNumber}
                </div>

                {/* Top Right More Options Trigger */}
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    setSelectedActionItem(item);
                  }}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-slate-300 hover:text-white hover:bg-black/80 transition cursor-pointer"
                  title="More actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Timestamp tag bottom right of thumbnail */}
                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-slate-200 font-bold border border-white/10">
                  {formatTime(item.currentTime)} / {formatTime(item.duration)}
                </div>

                {/* Progress Bar at bottom of card banner */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800/90">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-500 transition-all duration-300"
                    style={{ width: `${Math.max(8, Math.min(100, progressPercent))}%` }}
                  />
                </div>
              </div>

              {/* Title & Subtitle Below Banner */}
              <div className="p-3.5 space-y-1 text-left">
                <h3 className="font-bold text-sm text-white truncate group-hover:text-indigo-300 transition">
                  {title}
                </h3>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-indigo-400 truncate mr-2">
                    {item.seasonTitle && item.seasonTitle !== title ? `${item.seasonTitle} • ` : ''}Episode {item.episodeNumber}
                  </span>
                  <span className="text-[11px] text-emerald-400 font-bold shrink-0">
                    {Math.round(progressPercent)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Long-Press / Context Menu Modal */}
      {selectedActionItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedActionItem(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-[#121626] border border-slate-700/80 shadow-2xl p-5 space-y-4 text-left"
            onClick={e => e.stopPropagation()}
          >
            {/* Header info */}
            <div className="flex items-center gap-3">
              <img
                src={selectedActionItem.anime.coverImage?.medium || selectedActionItem.anime.coverImage?.large}
                alt=""
                className="w-12 h-16 rounded-xl object-cover border border-slate-700 shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white line-clamp-1">
                  {selectedActionItem.anime.title?.english || selectedActionItem.anime.title?.romaji}
                </h4>
                <p className="text-xs text-indigo-400 font-semibold mt-0.5">
                  Episode {selectedActionItem.episodeNumber} • Stopped at {formatTime(selectedActionItem.currentTime)}
                </p>
              </div>
            </div>

            {/* Actions list */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  onPlayStream(
                    selectedActionItem.anime,
                    selectedActionItem.episodeNumber,
                    selectedActionItem.currentTime
                  );
                  setSelectedActionItem(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Resume from {formatTime(selectedActionItem.currentTime)}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onPlayStream(selectedActionItem.anime, selectedActionItem.episodeNumber, 0);
                  setSelectedActionItem(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Restart Episode {selectedActionItem.episodeNumber} (0:00)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onOpenDetails(selectedActionItem.anime);
                  setSelectedActionItem(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-400" />
                <span>View Anime Overview & All Episodes</span>
              </button>

              {onUpdateStatus && (
                <button
                  type="button"
                  onClick={() => {
                    onUpdateStatus(selectedActionItem.anime, 'COMPLETED');
                    setSelectedActionItem(null);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mark Series as Completed</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleRemoveItem(selectedActionItem)}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-800/40 text-xs font-semibold transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Remove from Watch History</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setSelectedActionItem(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

