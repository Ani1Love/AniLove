import React, { useState, useEffect, useRef } from 'react';
import { Play, Info, Plus, Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Anime, UserMediaListItem } from '../types';
import { sanitizeDescription } from '../services/anilist';

interface HeroSpotlightProps {
  animeList?: Anime[];
  featuredAnime?: Anime | null;
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
  onQuickTrack?: (anime: Anime) => void;
  userLibrary?: UserMediaListItem[];
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({
  animeList = [],
  featuredAnime,
  onOpenDetails,
  onPlayStream,
  onQuickTrack,
  userLibrary = [],
}) => {
  const list = animeList.length > 0 ? animeList : featuredAnime ? [featuredAnime] : [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<number>(1);

  // Swipe detection refs
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const isDraggingRef = useRef<boolean>(false);

  // Helper to change slide with direction tracking
  const paginate = (newDirection: number) => {
    setDirection(newDirection);
    setCurrentIndex(prev => (prev + newDirection + list.length) % list.length);
  };

  // Auto-advance spotlight every 7.5 seconds
  useEffect(() => {
    if (list.length <= 1) return;
    const interval = setInterval(() => {
      setDirection(1);
      setCurrentIndex(prev => (prev + 1) % list.length);
    }, 7500);
    return () => clearInterval(interval);
  }, [list.length]);

  if (list.length === 0) return null;

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchStartX.current = clientX;
    touchEndX.current = clientX;
    isDraggingRef.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    touchEndX.current = clientX;
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const deltaX = touchStartX.current - touchEndX.current;
    const swipeThreshold = 45; // min 45px swipe

    if (deltaX > swipeThreshold) {
      // Swiped Left -> Next
      paginate(1);
    } else if (deltaX < -swipeThreshold) {
      // Swiped Right -> Prev
      paginate(-1);
    }
  };

  const currentAnime = list[currentIndex] || list[0];
  const title = currentAnime.title?.english || currentAnime.title?.romaji || currentAnime.title?.userPreferred || 'Trending Anime';
  const banner = currentAnime.bannerImage || currentAnime.coverImage?.extraLarge || currentAnime.coverImage?.large;
  const desc = sanitizeDescription(currentAnime.description);
  const score = currentAnime.averageScore ? (currentAnime.averageScore / 10).toFixed(1) : null;
  const isTracked = userLibrary.some(item => item.mediaId === currentAnime.id);

  return (
    <div
      className="relative w-full overflow-hidden bg-[#090b14] select-none cursor-grab active:cursor-grabbing"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
    >
      {/* Featured Spotlight Panorama Container */}
      <div className="relative w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[560px] flex items-end pb-12 sm:pb-16 pt-20 px-4 sm:px-8 lg:px-12">
        {/* Backdrop Image with AnimatePresence transition */}
        <AnimatePresence mode="popLayout" initial={false}>
          {banner && (
            <motion.div
              key={`bg-${currentAnime.id}`}
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1.02 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="absolute inset-0 z-0 overflow-hidden"
            >
              <img
                src={banner}
                alt={title}
                className="w-full h-full object-cover object-center filter brightness-50 blur-[0.5px] pointer-events-none"
                referrerPolicy="no-referrer"
              />
              {/* Cinematic Gradient Overlays */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090b14] via-[#090b14]/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#090b14] via-[#090b14]/60 to-transparent" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Spotlight Details Card with Motion Transition */}
        <div className="relative z-10 max-w-4xl mx-auto sm:mx-0 text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${currentAnime.id}`}
              initial={{ opacity: 0, x: direction * 40, y: 10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -direction * 40, y: -10 }}
              transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
              className="space-y-4"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-bold backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Trending Spotlight #{currentIndex + 1}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1] drop-shadow-lg">
                {title}
              </h1>

              {/* Badges */}
              <div className="flex items-center gap-2.5 flex-wrap text-xs sm:text-sm font-semibold text-slate-300">
                {score && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{score} Rating</span>
                  </div>
                )}
                {currentAnime.format && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200 uppercase font-bold text-[11px] sm:text-xs">
                    {currentAnime.format.replace('_', ' ')}
                  </span>
                )}
                {currentAnime.seasonYear && (
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-200">
                    {currentAnime.season ? `${currentAnime.season} ` : ''}{currentAnime.seasonYear}
                  </span>
                )}
                {currentAnime.genres && currentAnime.genres.slice(0, 3).map(g => (
                  <span
                    key={g}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950/70 border border-indigo-500/40 text-indigo-200 font-medium text-xs"
                  >
                    #{g}
                  </span>
                ))}
              </div>

              {/* Synopsis */}
              <p className="text-xs sm:text-sm text-slate-300 line-clamp-3 max-w-2xl leading-relaxed opacity-90 drop-shadow">
                {desc}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2 flex-wrap" onClick={e => e.stopPropagation()}>
                <button
                  id="spotlight-watch-btn"
                  onClick={() => onPlayStream(currentAnime)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-950/60 transition transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Watch Series</span>
                </button>

                <button
                  id="spotlight-info-btn"
                  onClick={() => onOpenDetails(currentAnime)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-white font-semibold text-sm backdrop-blur-md border border-slate-700 transition cursor-pointer"
                >
                  <Info className="w-4 h-4" />
                  <span>Details & Cast</span>
                </button>

                {onQuickTrack && (
                  <button
                    id="spotlight-track-btn"
                    onClick={() => onQuickTrack(currentAnime)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition cursor-pointer ${
                      isTracked
                        ? 'bg-emerald-600/80 hover:bg-emerald-600 text-white'
                        : 'bg-indigo-600/80 hover:bg-indigo-600 text-white'
                    }`}
                    title={isTracked ? 'In Watchlist' : 'Add to Watchlist'}
                  >
                    <Plus className="w-4 h-4" />
                    <span className="hidden sm:inline">{isTracked ? 'Tracked' : 'Track'}</span>
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Minimal Swipeable Slide Indicators */}
        {list.length > 1 && (
          <div
            className="absolute bottom-4 right-4 sm:right-8 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-slate-800/80 shadow-lg"
            onClick={e => e.stopPropagation()}
          >
            {list.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setDirection(idx > currentIndex ? 1 : -1);
                  setCurrentIndex(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentIndex === idx ? 'w-6 bg-indigo-500 shadow-sm shadow-indigo-500/50' : 'w-2 bg-slate-600 hover:bg-slate-400'
                }`}
                title={`Slide ${idx + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

