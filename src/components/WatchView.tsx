import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle2,
  List,
  LayoutGrid,
  Search,
  X,
  Tv,
  Calendar,
  Star,
  Film,
  Building2,
  Eye,
  Info,
  Clock,
  Radio,
  Sliders,
} from 'lucide-react';
import { Anime, AnimeDetail, UserMediaListItem, MediaListStatus, ThumbnailAppearance } from '../types';
import { fetchAnimeDetails, sanitizeDescription } from '../services/anilist';
import { ProVideoPlayer } from './ProVideoPlayer';

interface EpisodeItem {
  number: number;
  title: string;
  thumbnail: string;
  synopsis?: string;
  filler?: boolean;
}

interface WatchViewProps {
  anime: Anime;
  episodeNumber: number;
  initialTime?: number;
  onBack: () => void;
  onEpisodeChange: (episodeNumber: number) => void;
  onUpdateStatus: (anime: Anime, status: MediaListStatus) => void;
  onUpdateProgress: (anime: Anime, newProgress: number) => void;
  onOpenDetails: (anime: Anime) => void;
  userItem?: UserMediaListItem;
  isTwoWaySyncActive?: boolean;
}

export const WatchView: React.FC<WatchViewProps> = ({
  anime,
  episodeNumber,
  initialTime = 0,
  onBack,
  onEpisodeChange,
  onUpdateStatus,
  onUpdateProgress,
  onOpenDetails,
  userItem,
  isTwoWaySyncActive = false,
}) => {
  const [details, setDetails] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState<string>('');
  const [episodeViewMode, setEpisodeViewMode] = useState<'list' | 'grid'>('list');
  const [showFullSynopsis, setShowFullSynopsis] = useState<boolean>(false);
  const [thumbnailStyle, setThumbnailStyle] = useState<ThumbnailAppearance>('snapshot');

  const title = anime.title?.english || anime.title?.romaji || anime.title?.userPreferred || 'Anime';
  const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium;
  const currentProgress = userItem?.progress || 0;
  const episodesTotal = anime.episodes || details?.episodes || 24;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [anime.id, episodeNumber]);

  // Load detailed AniList metadata & relations
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetchAnimeDetails(anime.id)
      .then(data => {
        if (isMounted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [anime.id]);

  // Compute Seasons
  const seasons = useMemo(() => {
    const list: Array<{
      id: number;
      seasonLabel: string;
      displayTitle: string;
      year: number | string;
      anime: Anime;
      episodesCount: number;
    }> = [];

    list.push({
      id: anime.id,
      seasonLabel: 'Season 1',
      displayTitle: title,
      year: anime.seasonYear || anime.startDate?.year || 'Current',
      anime,
      episodesCount: episodesTotal,
    });

    if (details?.relations?.edges) {
      details.relations.edges.forEach(edge => {
        if (edge.relationType === 'SEQUEL' || edge.relationType === 'PREQUEL' || edge.relationType === 'SIDE_STORY') {
          const relNode = edge.node;
          const label =
            edge.relationType === 'SEQUEL'
              ? `Season ${list.length + 1}`
              : edge.relationType === 'PREQUEL'
              ? 'Prequel'
              : 'Side Story';

          list.push({
            id: relNode.id,
            seasonLabel: label,
            displayTitle: relNode.title?.english || relNode.title?.romaji || title,
            year: relNode.seasonYear || 'Series',
            anime: {
              ...relNode,
              title: relNode.title,
              coverImage: relNode.coverImage,
              bannerImage: relNode.bannerImage,
              episodes: relNode.episodes,
              format: relNode.format,
              averageScore: relNode.averageScore,
              genres: relNode.genres,
            } as Anime,
            episodesCount: relNode.episodes || 12,
          });
        }
      });
    }

    return list;
  }, [anime, details, episodesTotal, title]);

  // Generate complete episodes catalog
  const episodeList = useMemo<EpisodeItem[]>(() => {
    const total = seasons[selectedSeasonIdx]?.episodesCount || episodesTotal;
    const banner = anime.bannerImage || coverUrl;

    return Array.from({ length: total }, (_, i) => {
      const epNum = i + 1;
      return {
        number: epNum,
        title: `Episode ${epNum}`,
        thumbnail: banner,
        synopsis: details?.description
          ? sanitizeDescription(details.description)
          : `Official Episode ${epNum} of ${title}. Watch in Full HD with Multi-audio and English Subtitles.`,
        filler: epNum % 7 === 0 && epNum > 15,
      };
    });
  }, [seasons, selectedSeasonIdx, episodesTotal, anime.bannerImage, coverUrl, details?.description, title]);

  // Filter episodes by search query
  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery.trim()) return episodeList;
    const q = episodeSearchQuery.toLowerCase().trim();
    return episodeList.filter(
      ep => ep.title.toLowerCase().includes(q) || `episode ${ep.number}`.includes(q) || `${ep.number}` === q
    );
  }, [episodeList, episodeSearchQuery]);

  const currentEpisodeData = episodeList.find(e => e.number === episodeNumber) || {
    number: episodeNumber,
    title: `Episode ${episodeNumber}`,
    synopsis: details?.description ? sanitizeDescription(details.description) : undefined,
  };

  const hasNextEpisode = episodeNumber < episodeList.length;
  const hasPrevEpisode = episodeNumber > 1;

  const handleNextEpisode = () => {
    if (hasNextEpisode) {
      onEpisodeChange(episodeNumber + 1);
      onUpdateProgress(anime, episodeNumber);
    }
  };

  const handlePrevEpisode = () => {
    if (hasPrevEpisode) {
      onEpisodeChange(episodeNumber - 1);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Sticky Header */}
      <header className="sticky top-0 z-40 bg-black/95 backdrop-blur-xl border-b border-neutral-800/80 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Back Button & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white text-xs font-bold border border-neutral-700 transition active:scale-95 shrink-0 cursor-pointer"
              title="Return to previous screen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black text-white truncate max-w-xs sm:max-w-md md:max-w-lg">
                {title}
              </h1>
              <div className="flex items-center gap-2 text-xs text-neutral-400 font-medium truncate">
                <span className="text-blue-400 font-bold">Episode {episodeNumber}</span>
                <span>•</span>
                <span className="truncate">{currentEpisodeData.title}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick actions (View Anime Details, AniList Sync Badge) */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isTwoWaySyncActive && (
              <div
                title="Auto-syncing episode progress with AniList"
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AniList Synced</span>
              </div>
            )}

            <button
              onClick={() => onOpenDetails(anime)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-bold border border-indigo-500/40 transition cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Anime Info</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Watch Page Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 space-y-6">
        {/* Theatrical Video Player Component */}
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 bg-black">
          <ProVideoPlayer
            anime={anime}
            episodeNumber={episodeNumber}
            episodeTitle={currentEpisodeData.title}
            seasonTitle={seasons[selectedSeasonIdx]?.displayTitle ? seasons[selectedSeasonIdx].seasonLabel : undefined}
            episodesList={episodeList}
            initialTime={initialTime}
            onEpisodeChange={ep => {
              onEpisodeChange(ep);
              onUpdateProgress(anime, ep);
            }}
            onClosePlayer={onBack}
            onThumbnailStyleChange={style => setThumbnailStyle(style)}
            initialThumbnailStyle={thumbnailStyle}
          />
        </div>

        {/* Player Controls & Episode Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-[#0a0a0d] border border-neutral-800 shadow-2xl">
          {/* Episode Quick Switch Buttons */}
          <div className="flex items-center gap-2">
            <button
              disabled={!hasPrevEpisode}
              onClick={handlePrevEpisode}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold border border-neutral-700 disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev Ep</span>
            </button>

            <button
              disabled={!hasNextEpisode}
              onClick={handleNextEpisode}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-950/40 border border-blue-500/50 disabled:opacity-40 disabled:pointer-events-none transition active:scale-95 cursor-pointer"
            >
              <span>Next Ep</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Watched Status & Episode Counter */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                const isCurrentlyWatched = episodeNumber <= currentProgress;
                const newProgress = isCurrentlyWatched ? episodeNumber - 1 : episodeNumber;
                onUpdateProgress(anime, newProgress);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
                episodeNumber <= currentProgress
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400'
                  : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white'
              }`}
            >
              <Eye className="w-4 h-4" />
              <span>{episodeNumber <= currentProgress ? 'Watched' : 'Mark as Watched'}</span>
            </button>

            <div className="px-3.5 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs font-bold text-neutral-300">
              Ep <span className="text-blue-400">{episodeNumber}</span> of {episodesTotal}
            </div>
          </div>
        </div>

        {/* Episode Catalog Browser (Full Width - Overview Removed as Requested) */}
        <div className="w-full text-left">
          <div className="p-5 sm:p-6 rounded-2xl bg-[#0a0a0d] border border-neutral-800 space-y-4">
            {/* Header with Season selector and view switch */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Tv className="w-4 h-4 text-blue-400" />
                <h3 className="font-black text-sm sm:text-base text-white tracking-tight">
                  Episodes
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 text-[11px] font-bold">
                  {episodeList.length}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('list')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    episodeViewMode === 'list' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setEpisodeViewMode('grid')}
                  className={`p-1.5 rounded-lg transition cursor-pointer ${
                    episodeViewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Seasons Selector (if multiple seasons/sequels exist) */}
            {seasons.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {seasons.map((season, idx) => {
                  const isSelected = selectedSeasonIdx === idx;
                  return (
                    <button
                      key={season.id || idx}
                      type="button"
                      onClick={() => setSelectedSeasonIdx(idx)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                          : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700'
                      }`}
                    >
                      {season.seasonLabel} ({season.episodesCount} eps)
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Search Filter */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter episode number..."
                value={episodeSearchQuery}
                onChange={e => setEpisodeSearchQuery(e.target.value)}
                className="w-full pl-10 pr-8 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-blue-500 transition"
              />
              {episodeSearchQuery && (
                <button
                  type="button"
                  onClick={() => setEpisodeSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Episode Grid or List */}
            {episodeViewMode === 'grid' ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredEpisodes.map(ep => {
                  const isCurrent = ep.number === episodeNumber;
                  const isWatched = ep.number <= currentProgress;

                  return (
                    <button
                      key={ep.number}
                      onClick={() => {
                        onEpisodeChange(ep.number);
                        onUpdateProgress(anime, ep.number);
                      }}
                      className={`p-3 rounded-xl text-center font-bold text-xs transition border cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-900/80 text-white border-blue-500 shadow-lg shadow-blue-950/60 ring-2 ring-blue-500/40'
                          : isWatched
                          ? 'bg-emerald-950/30 border-emerald-600/30 text-emerald-300 hover:bg-neutral-900'
                          : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:bg-neutral-800 hover:text-white'
                      }`}
                    >
                      <div>EP {ep.number}</div>
                      {isWatched && !isCurrent && (
                        <div className="text-[10px] text-emerald-400 mt-0.5">Watched</div>
                      )}
                      {isCurrent && <div className="text-[10px] text-blue-300 mt-0.5 font-black">Playing</div>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                {filteredEpisodes.map(ep => {
                  const isCurrent = ep.number === episodeNumber;
                  const isWatched = ep.number <= currentProgress;

                  return (
                    <div
                      key={ep.number}
                      onClick={() => {
                        onEpisodeChange(ep.number);
                        onUpdateProgress(anime, ep.number);
                      }}
                      className={`group flex items-center justify-between gap-3.5 p-2.5 rounded-xl border transition cursor-pointer select-none ${
                        isCurrent
                          ? 'bg-blue-950/70 border-blue-600/90 shadow-lg shadow-blue-950/40 ring-1 ring-blue-500/30'
                          : 'bg-neutral-900/90 hover:bg-neutral-800/80 border-neutral-800/80 hover:border-neutral-700'
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-neutral-900 shrink-0 border border-neutral-700/60">
                        <img
                          src={ep.thumbnail}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/85 text-[10px] font-bold text-white">
                          EP {ep.number}
                        </div>
                        {isCurrent && (
                          <div className="absolute inset-0 bg-blue-600/40 flex items-center justify-center">
                            <Play className="w-5 h-5 fill-white text-white drop-shadow" />
                          </div>
                        )}
                      </div>

                      {/* Title & Info */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-bold text-xs sm:text-sm truncate leading-snug ${
                            isCurrent ? 'text-blue-300' : 'text-neutral-200 group-hover:text-white'
                          }`}
                        >
                          {ep.title}
                        </h4>
                        <p className={`text-[11px] mt-0.5 ${isCurrent ? 'text-blue-400 font-medium' : 'text-neutral-400'}`}>
                          {isCurrent ? 'Currently Playing' : isWatched ? 'Completed' : 'Ready to watch'}
                        </p>
                      </div>

                      {/* Watched Checkmark */}
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          const nextProgress = isWatched ? ep.number - 1 : ep.number;
                          onUpdateProgress(anime, nextProgress);
                        }}
                        className={`p-2 rounded-lg transition ${
                          isWatched
                            ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                            : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800'
                        }`}
                        title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                      >
                        <Eye className={`w-4 h-4 ${isWatched ? 'text-emerald-400 fill-emerald-400/20' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
