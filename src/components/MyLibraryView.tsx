import React, { useState, useMemo } from 'react';
import { Bookmark, Star, Clock, CheckCircle2, Play, Plus, Minus, Search, Layers, TrendingUp, Sparkles, Filter } from 'lucide-react';
import confetti from 'canvas-confetti';
import { Anime, UserMediaListItem, MediaListStatus } from '../types';
import { AnimeCard } from './AnimeCard';

interface MyLibraryViewProps {
  library: UserMediaListItem[];
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
  onUpdateStatus: (anime: Anime, status: MediaListStatus) => void;
  onUpdateProgress: (anime: Anime, newProgress: number) => void;
  onGoToDiscover: () => void;
  onSelectGenre?: (genre: string) => void;
  onSelectStudio?: (studio: string) => void;
  isTwoWaySyncActive: boolean;
}

export const MyLibraryView: React.FC<MyLibraryViewProps> = ({
  library,
  onOpenDetails,
  onPlayStream,
  onUpdateStatus,
  onUpdateProgress,
  onGoToDiscover,
  onSelectGenre,
  onSelectStudio,
  isTwoWaySyncActive,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | MediaListStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'updated' | 'score' | 'title' | 'progress'>('updated');

  // Compute overall user statistics
  const stats = useMemo(() => {
    let totalEpisodes = 0;
    let scoredItems = 0;
    let scoreSum = 0;
    let totalMinutes = 0;

    library.forEach(item => {
      const ep = item.progress || 0;
      totalEpisodes += ep;
      const duration = item.media.duration || 24;
      totalMinutes += ep * duration;
      if (item.score > 0) {
        scoredItems++;
        scoreSum += item.score;
      }
    });

    const meanScore = scoredItems > 0 ? (scoreSum / scoredItems).toFixed(1) : '--';
    const hours = Math.floor(totalMinutes / 60);

    return {
      totalAnime: library.length,
      totalEpisodes,
      meanScore,
      hoursWatched: hours,
    };
  }, [library]);

  // Counts by status
  const counts = useMemo(() => {
    const res: Record<string, number> = {
      ALL: library.length,
      CURRENT: 0,
      COMPLETED: 0,
      PLANNING: 0,
      PAUSED: 0,
      DROPPED: 0,
    };
    library.forEach(item => {
      if (res[item.status] !== undefined) {
        res[item.status]++;
      }
    });
    return res;
  }, [library]);

  // Filtered & Sorted items
  const displayedItems = useMemo(() => {
    let list = library;
    if (activeFilter !== 'ALL') {
      list = list.filter(item => item.status === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => {
        const title = (item.media.title?.english || item.media.title?.romaji || item.media.title?.userPreferred || '').toLowerCase();
        return title.includes(q);
      });
    }

    // Sort
    return [...list].sort((a, b) => {
      if (sortBy === 'score') return (b.score || 0) - (a.score || 0);
      if (sortBy === 'title') {
        const tA = (a.media.title?.english || a.media.title?.romaji || '').toLowerCase();
        const tB = (b.media.title?.english || b.media.title?.romaji || '').toLowerCase();
        return tA.localeCompare(tB);
      }
      if (sortBy === 'progress') return (b.progress || 0) - (a.progress || 0);
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
  }, [library, activeFilter, searchQuery, sortBy]);

  return (
    <div id="my-library-view" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Stats Banner */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
              <Bookmark className="w-3.5 h-3.5" />
              <span>Personal Watchlist & Library</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              My Anime Collection
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Track episodes, scores, and watching status with real-time sync.
            </p>
          </div>

          {isTwoWaySyncActive && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg shadow-emerald-950/30">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AniList Two-Way Cloud Sync Connected</span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 p-4 rounded-2xl bg-[#121626] border border-slate-800 shadow-xl">
          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Total Anime</span>
            </div>
            <div className="text-2xl font-black text-white mt-1">{stats.totalAnime}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Episodes Watched</span>
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">{stats.totalEpisodes}</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Clock className="w-4 h-4 text-sky-400" />
              <span>Hours Watched</span>
            </div>
            <div className="text-2xl font-black text-sky-300 mt-1">{stats.hoursWatched}h</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Star className="w-4 h-4 text-amber-400" />
              <span>Mean Score</span>
            </div>
            <div className="text-2xl font-black text-amber-300 mt-1">{stats.meanScore}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'ALL', label: 'All' },
            { id: 'CURRENT', label: 'Watching' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'PLANNING', label: 'Planning' },
            { id: 'PAUSED', label: 'Paused' },
            { id: 'DROPPED', label: 'Dropped' },
          ].map(tab => {
            const active = activeFilter === tab.id;
            const count = counts[tab.id] || 0;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 whitespace-nowrap ${
                  active
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  active ? 'bg-indigo-800 text-white' : 'bg-slate-900 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search library..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 outline-none cursor-pointer"
          >
            <option value="updated">Recently Updated</option>
            <option value="score">Highest Score</option>
            <option value="progress">Most Episodes</option>
            <option value="title">Title (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Library Grid */}
      {displayedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {displayedItems.map(item => (
            <AnimeCard
              key={item.mediaId}
              anime={item.media}
              userItem={item}
              onOpenDetails={onOpenDetails}
              onPlayStream={onPlayStream}
              onUpdateStatus={onUpdateStatus}
              onUpdateProgress={onUpdateProgress}
              onSelectGenre={onSelectGenre}
              onSelectStudio={onSelectStudio}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 sm:p-16 text-center text-slate-400 rounded-3xl bg-[#121626] border border-slate-800 space-y-4">
          <Bookmark className="w-12 h-12 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-200">
              {searchQuery ? `No matches for "${searchQuery}" in your list` : 'Your Watchlist is Empty'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {searchQuery
                ? 'Try searching with a different keyword or filter.'
                : 'Start tracking anime from the Discover section or import your playlist via Settings!'}
            </p>
          </div>

          {!searchQuery && (
            <button
              onClick={onGoToDiscover}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              Explore Trending Anime
            </button>
          )}
        </div>
      )}
    </div>
  );
};
