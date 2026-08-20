import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, X, Play, Star, Plus, Minus, Check, Bookmark, Tv, Film,
  Calendar, Clock, Building2, Sparkles, Share2, ExternalLink,
  ChevronRight, Users, MessageSquare, AlertCircle, RefreshCw, Layers,
  MoreVertical, Music, Headphones, Info, Eye, EyeOff, Search,
  LayoutGrid, List, Download, ChevronDown, ChevronUp, FastForward,
  CheckCircle2, Volume2, Sparkle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Anime, AnimeDetail, UserMediaListItem, MediaListStatus, AnimeTrailer, ThumbnailAppearance } from '../types';
import { fetchAnimeDetails, sanitizeDescription } from '../services/anilist';
import { ProVideoPlayer } from './ProVideoPlayer';

interface AnimeDetailModalProps {
  anime: Anime | null;
  isOpen: boolean;
  onClose: () => void;
  userItem?: UserMediaListItem;
  onUpdateStatus: (anime: Anime, status: MediaListStatus) => void;
  onUpdateProgress: (anime: Anime, newProgress: number) => void;
  onUpdateScore: (anime: Anime, newScore: number) => void;
  onOpenTrailer: (trailer: AnimeTrailer, title: string) => void;
  onNavigateToAnime: (anime: Anime) => void;
  onSelectGenre?: (genre: string) => void;
  onSelectStudio?: (studio: string) => void;
  isTwoWaySyncActive: boolean;
  initialEpisode?: number;
  initialTime?: number;
  startInWatchMode?: boolean;
  onPlayStream?: (anime: Anime, episodeNumber?: number, startTime?: number) => void;
}

type DetailTab = 'overview' | 'episodes' | 'recommendations' | 'music' | 'relations' | 'characters';

export const AnimeDetailModal: React.FC<AnimeDetailModalProps> = ({
  anime,
  isOpen,
  onClose,
  userItem,
  onUpdateStatus,
  onUpdateProgress,
  onUpdateScore,
  onOpenTrailer,
  onNavigateToAnime,
  onSelectGenre,
  onSelectStudio,
  isTwoWaySyncActive,
  initialEpisode,
  initialTime,
  startInWatchMode,
  onPlayStream,
}) => {
  const [details, setDetails] = useState<AnimeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('overview');
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  
  // Streaming & Episode UI State
  const [playingEpisode, setPlayingEpisode] = useState<number | null>(null);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState<number>(0);
  const [episodeSearchQuery, setEpisodeSearchQuery] = useState<string>('');
  const [episodeViewMode, setEpisodeViewMode] = useState<'list' | 'grid'>('list');
  const [showFullSynopsis, setShowFullSynopsis] = useState<boolean>(false);
  const [audioMode, setAudioMode] = useState<'SUB' | 'DUB'>('SUB');

  const playerRef = useRef<HTMLDivElement>(null);

  // Close kebab menu on outside click
  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveMenuId(null);
    };
    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  // Load detailed anime relations & recommendations
  useEffect(() => {
    if (!isOpen || !anime) {
      setDetails(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    if (startInWatchMode || initialEpisode) {
      setActiveTab('episodes');
      setPlayingEpisode(initialEpisode || (userItem?.progress ? userItem.progress : 1));
    } else {
      setActiveTab('overview');
      setPlayingEpisode(null);
    }
    setEpisodeSearchQuery('');
    setShowFullSynopsis(false);

    fetchAnimeDetails(anime.id)
      .then(data => {
        if (isMounted) {
          setDetails(data);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Error fetching anime details:', err);
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, anime?.id, startInWatchMode, initialEpisode]);

  // Handle ESC key to return to main catalog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentAnime = details || anime;
  const title = currentAnime?.title?.english || currentAnime?.title?.romaji || currentAnime?.title?.userPreferred || 'Unknown Title';
  const nativeTitle = currentAnime?.title?.native;
  const romajiTitle = currentAnime?.title?.romaji;
  const coverUrl = currentAnime?.coverImage?.extraLarge || currentAnime?.coverImage?.large || currentAnime?.coverImage?.medium || '';
  const bannerUrl = currentAnime?.bannerImage || coverUrl;
  const score = currentAnime?.averageScore ? (currentAnime.averageScore / 10).toFixed(1) : null;
  const episodesTotal = typeof currentAnime?.episodes === 'number' ? currentAnime.episodes : null;
  const cleanDescription = sanitizeDescription(currentAnime?.description);

  const currentProgress = userItem?.progress ?? 0;
  const currentStatus = userItem?.status;
  const currentScore = userItem?.score ?? 0;

  const primaryStudio = currentAnime?.studios?.nodes?.[0]?.name;

  const handleStepProgress = (delta: number) => {
    if (!currentAnime) return;
    const max = episodesTotal || 9999;
    const nextVal = Math.max(0, Math.min(max, currentProgress + delta));
    if (nextVal !== currentProgress) {
      if (episodesTotal && nextVal === episodesTotal) {
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      }
      onUpdateProgress(currentAnime, nextVal);
    }
  };

  const handleStudioClick = (studioName: string) => {
    if (onSelectStudio) {
      onSelectStudio(studioName);
      onClose();
    }
  };

  const handleGenreClick = (genreName: string) => {
    if (onSelectGenre) {
      onSelectGenre(genreName);
      onClose();
    }
  };

  const handleCopyLink = () => {
    const shareText = `${title} — Watch & Track on AniLove\n${window.location.origin}`;
    navigator.clipboard.writeText(shareText).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  // Generate Seasons
  const seasons = useMemo(() => {
    if (!currentAnime) return [];
    const defaultSeason = {
      id: currentAnime.id,
      title: 'Season 1',
      year: currentAnime.seasonYear || currentAnime.startDate?.year || 2024,
      episodesCount: episodesTotal || 24,
      anime: currentAnime,
    };

    if (!details?.relations?.edges || details.relations.edges.length === 0) {
      return [{
        ...defaultSeason,
        seasonLabel: 'Season 1',
        displayTitle: `Season 1 (${defaultSeason.year})`
      }];
    }

    // Look for prequel/sequel/side-story TV/ONA entries
    const relatedSeasons = details.relations.edges
      .filter(edge => ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY'].includes(edge.relationType) && edge.node.format === 'TV')
      .map(edge => ({
        id: edge.node.id,
        title: edge.node.title?.english || edge.node.title?.romaji || 'Season',
        year: edge.node.seasonYear || edge.node.startDate?.year || 2020,
        episodesCount: edge.node.episodes || 12,
        anime: edge.node,
      }));

    // Combine current anime and related seasons deduplicated by id
    const all = [defaultSeason];
    relatedSeasons.forEach(r => {
      if (!all.some(a => a.id === r.id)) {
        all.push(r);
      }
    });

    // Sort by year
    all.sort((a, b) => a.year - b.year);
    
    // Label as Season 1, Season 2, Season 3 etc.
    return all.map((s, idx) => ({
      ...s,
      seasonLabel: `Season ${idx + 1}`,
      displayTitle: `Season ${idx + 1} (${s.year})`
    }));
  }, [currentAnime, details, episodesTotal]);

  // Generate Episodes
  const episodeList = useMemo(() => {
    if (!currentAnime) return [];
    const count = episodesTotal || (details?.streamingEpisodes?.length ? details.streamingEpisodes.length : 24);
    const streaming = details?.streamingEpisodes || [];

    const fallbackTitles = [
      'The End of the Beginning and the Beginning of the End',
      'Reunion with the Witch',
      'Starting Life from Zero in Another World',
      'The Happy Roswaal Mansion Family',
      'The Morning of Our Promise is Still Distant',
      'The Sound of Chains',
      'Natsuki Subaru\'s Restart',
      'I Cried, Cried My Lungs Out, and Stopped Crying',
      'The Meaning of Courage',
      'Fanatical Methods Like a Demon',
      'Rem',
      'Return to the Capital',
      'Self-Proclaimed Knight Natsuki Subaru',
      'The Sickness Called Despair',
      'The Outside of Madness',
      'The Greedy King of Desires',
      'Disgrace Upon Disgrace',
      'From Zero',
      'Battle Against the White Whale',
      'Wilhelm van Astrea',
      'A Wager Defying Despair',
      'A Flash of Sloth',
      'Nefarious Sloth',
      'The Self-Proclaimed Knight and the Greatest Knight',
      'That\'s All This Story Is About'
    ];

    return Array.from({ length: Math.min(count, 100) }, (_, i) => {
      const epNum = i + 1;
      const streamInfo = streaming[i];
      
      let epTitle = streamInfo?.title;
      if (epTitle) {
        epTitle = epTitle.replace(/^Episode\s*\d+\s*[-:]\s*/i, '');
      } else {
        epTitle = fallbackTitles[(epNum - 1) % fallbackTitles.length];
      }

      return {
        number: epNum,
        title: epTitle,
        thumbnail: streamInfo?.thumbnail || bannerUrl || coverUrl,
        url: streamInfo?.url,
        duration: '24m',
        synopsis: cleanDescription || `Episode ${epNum} of ${title}. Follow the thrilling unfolding events and character journeys as the plot deepens.`
      };
    });
  }, [currentAnime, episodesTotal, details?.streamingEpisodes, bannerUrl, coverUrl, title, cleanDescription]);

  // Filtered episodes based on search
  const filteredEpisodes = useMemo(() => {
    if (!episodeSearchQuery.trim()) return episodeList;
    const q = episodeSearchQuery.toLowerCase().trim();
    return episodeList.filter(
      ep => ep.number.toString() === q || ep.title.toLowerCase().includes(q)
    );
  }, [episodeList, episodeSearchQuery]);



  if (!isOpen || !anime || !currentAnime) return null;

  return (
    <AnimatePresence>
      <motion.div
        id="anime-detail-page-view"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 15 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="fixed inset-0 z-[90] bg-[#090b14] overflow-y-auto min-h-screen text-slate-100 flex flex-col"
      >
        {/* Sticky Page Navigation Header */}
        <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-8 py-3 bg-[#090b14]/90 backdrop-blur-xl border-b border-slate-800/90 shadow-lg">
          <div className="flex items-center gap-3 min-w-0">
            <button
              id="detail-back-to-catalog-btn"
              onClick={onClose}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white text-xs sm:text-sm font-bold border border-slate-700 transition active:scale-95 shrink-0 shadow-sm"
              title="Return to Discover"
            >
              <ArrowLeft className="w-4 h-4 text-indigo-400" />
              <span>Back</span>
            </button>

            {/* Breadcrumb Trail */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 truncate">
              <span className="hover:text-slate-200 cursor-pointer" onClick={onClose}>Discover</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              {currentAnime.genres && currentAnime.genres[0] && (
                <>
                  <button
                    onClick={() => handleGenreClick(currentAnime.genres![0])}
                    className="hover:text-indigo-400 font-medium text-slate-300 transition"
                  >
                    {currentAnime.genres[0]}
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                </>
              )}
              <span className="font-semibold text-slate-200 truncate">{title}</span>
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/80 transition"
              title="Share Anime"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            {currentAnime.siteUrl && (
              <a
                href={currentAnime.siteUrl}
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 border border-sky-500/30 text-sky-300 hover:text-sky-200 text-xs font-semibold transition"
                title="View on AniList.co"
              >
                <span>AniList</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close View"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Hero Panorama Banner Backdrop */}
        <div className="relative w-full h-56 sm:h-80 lg:h-96 bg-slate-950 overflow-hidden shrink-0">
          {bannerUrl && (
            <img
              src={bannerUrl}
              alt={title}
              className="w-full h-full object-cover object-center filter brightness-[0.55] scale-105"
              referrerPolicy="no-referrer"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#090b14] via-[#090b14]/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#090b14]/80 via-transparent to-transparent" />
        </div>

        {/* Main Content Area */}
        <div className="relative max-w-7xl w-full mx-auto px-4 sm:px-8 pb-16 -mt-28 sm:-mt-36 z-10 flex-1">
          {/* Header Card Profile */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 text-center md:text-left">
            {/* Large Poster Image */}
            <div className="relative w-40 sm:w-52 lg:w-60 aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 shrink-0 ring-4 ring-black/40">
              <img
                src={coverUrl}
                alt={title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {score && (
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md text-amber-300 text-xs sm:text-sm font-extrabold border border-amber-500/40 shadow-lg">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  <span>{score}</span>
                </div>
              )}
            </div>

            {/* Title, Studio & Key Metas */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
                {currentAnime.format && (
                  <span className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
                    {currentAnime.format.replace('_', ' ')}
                  </span>
                )}
                {currentAnime.status && (
                  <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold">
                    {currentAnime.status}
                  </span>
                )}
                {currentAnime.seasonYear && (
                  <span className="text-xs text-slate-400 font-medium">
                    {currentAnime.season || ''} {currentAnime.seasonYear}
                  </span>
                )}
                {currentAnime.duration && (
                  <span className="text-xs text-slate-400 font-medium">
                    • {currentAnime.duration} mins/ep
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {title}
              </h1>

              {(romajiTitle || nativeTitle) && (
                <p className="text-xs sm:text-sm text-slate-400">
                  {romajiTitle !== title ? romajiTitle : ''} {nativeTitle && `• ${nativeTitle}`}
                </p>
              )}

              {/* Functional Studio and Genre Badges */}
              <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start pt-1">
                {/* Clickable Studio Tag */}
                {primaryStudio && (
                  <button
                    type="button"
                    onClick={() => handleStudioClick(primaryStudio)}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md hover:scale-105 active:scale-95 transition cursor-pointer"
                    title={`Click to explore anime produced by ${primaryStudio}`}
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>Studio: {primaryStudio}</span>
                  </button>
                )}

                {/* Clickable Genre Tags */}
                {currentAnime.genres && currentAnime.genres.map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleGenreClick(g)}
                    className="px-3 py-1 rounded-lg bg-slate-800/85 hover:bg-slate-700 text-slate-200 hover:text-indigo-300 text-xs font-medium border border-slate-700/70 hover:border-indigo-500/50 hover:scale-105 active:scale-95 transition cursor-pointer"
                    title={`Click to filter by genre: ${g}`}
                  >
                    #{g}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Bar & Library Status Dashboard */}
          <div className="mt-8 p-4 sm:p-6 rounded-2xl bg-[#111424] border border-slate-800/90 shadow-xl flex flex-col lg:flex-row items-center justify-between gap-5">
            {/* Left Action Buttons */}
            <div className="flex items-center gap-3 flex-wrap w-full lg:w-auto justify-center md:justify-start">
              <button
                id="detail-watch-stream-btn"
                onClick={() => {
                  setActiveTab('episodes');
                  setPlayingEpisode(null);
                  setTimeout(() => {
                    const tabsNav = document.getElementById('modal-tab-nav');
                    if (tabsNav) {
                      tabsNav.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }, 50);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-600 hover:from-orange-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-orange-950/60 transition active:scale-95 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Watch Episodes</span>
              </button>

              {currentAnime.trailer && currentAnime.trailer.id && (
                <button
                  id="detail-watch-trailer-btn"
                  onClick={() => onOpenTrailer(currentAnime.trailer!, title)}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition"
                >
                  <Film className="w-4 h-4 text-red-400" />
                  <span>Trailer</span>
                </button>
              )}

              {/* Status Dropdown */}
              <div className="relative">
                <select
                  id="detail-status-select"
                  value={currentStatus || ''}
                  onChange={e => onUpdateStatus(currentAnime, e.target.value as MediaListStatus)}
                  className="px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-sm font-semibold outline-none cursor-pointer hover:bg-slate-700 transition shadow-inner"
                >
                  <option value="">+ Add to Library</option>
                  <option value="CURRENT">Watching</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PLANNING">Planning</option>
                  <option value="PAUSED">Paused</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>
            </div>

            {/* Right Tracking Controls: Episode Counter & Score Rating */}
            <div className="flex items-center gap-4 flex-wrap justify-center md:justify-end w-full lg:w-auto">
              {/* Episode Stepper */}
              <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium">Episode:</span>
                <button
                  disabled={currentProgress <= 0}
                  onClick={() => handleStepProgress(-1)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition"
                  title="Decrease episode"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>

                <span className="text-sm font-bold text-indigo-400 px-1">
                  {currentProgress} / {episodesTotal || '?'}
                </span>

                <button
                  onClick={() => handleStepProgress(1)}
                  className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition shadow-sm active:scale-95"
                  title="Increase episode"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Score Rating */}
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <select
                  value={currentScore}
                  onChange={e => onUpdateScore(currentAnime, Number(e.target.value))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-amber-300 outline-none cursor-pointer"
                >
                  <option value="0">Score: --</option>
                  {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map(n => (
                    <option key={n} value={n} className="bg-slate-900 text-slate-100">
                      {n} / 10
                    </option>
                  ))}
                </select>
              </div>

              {/* 2-Way Sync Status Pulse */}
              {isTwoWaySyncActive && (
                <div
                  title="Two-Way Cloud Sync Active with AniList"
                  className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold px-3 py-2 rounded-xl bg-emerald-950/60 border border-emerald-500/30"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>AniList Linked</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 sm:gap-6 mt-8 border-b border-slate-800/90 overflow-x-auto pb-0 scrollbar-none">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'episodes', label: 'Episodes' },
              { id: 'recommendations', label: 'More Like This' },
              { id: 'music', label: 'Featured Music' },
              { id: 'relations', label: 'Relations' },
              { id: 'characters', label: 'Cast' },
            ].map(tab => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as DetailTab);
                    if (tab.id === 'episodes' && playingEpisode === null && userItem?.progress) {
                      // Keep in browser mode initially or open last watched if requested
                    }
                  }}
                  className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold transition relative whitespace-nowrap cursor-pointer ${
                    active
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  {active && (
                    <motion.div
                      layoutId="detailTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Contents */}
          <div className="py-8">
            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Cols: Synopsis & Production Info */}
                <div className="lg:col-span-2 space-y-6 text-left">
                  <div className="space-y-3">
                    <h3 className="text-base font-bold uppercase tracking-wider text-slate-300">
                      Synopsis
                    </h3>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed whitespace-pre-line">
                      {cleanDescription}
                    </p>
                  </div>

                  {/* Studio & Production Metadata Grid */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                      Anime Information & Studio Production
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                      {/* Studios List with Search Action */}
                      <div className="col-span-2 sm:col-span-1">
                        <div className="text-slate-400 font-medium">Studios</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {currentAnime.studios?.nodes && currentAnime.studios.nodes.length > 0 ? (
                            currentAnime.studios.nodes.map(st => (
                              <button
                                key={st.name}
                                type="button"
                                onClick={() => handleStudioClick(st.name)}
                                className="px-2 py-0.5 rounded-md bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-[11px] transition shadow-sm hover:scale-105"
                                title={`Search all anime produced by ${st.name}`}
                              >
                                {st.name}
                              </button>
                            ))
                          ) : (
                            <span className="text-slate-300">Unknown</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 font-medium">Duration</div>
                        <div className="font-semibold text-slate-200 mt-1">
                          {currentAnime.duration ? `${currentAnime.duration} mins/ep` : 'Standard'}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 font-medium">Source Material</div>
                        <div className="font-semibold text-slate-200 mt-1">
                          {currentAnime.source ? currentAnime.source.replace('_', ' ') : 'Original'}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 font-medium">Total Episodes</div>
                        <div className="font-semibold text-slate-200 mt-1">
                          {episodesTotal || 'Ongoing / Unknown'}
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 font-medium">Community Mean Score</div>
                        <div className="font-semibold text-amber-300 mt-1 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400" />
                          <span>{currentAnime.meanScore ? `${currentAnime.meanScore}%` : 'N/A'}</span>
                        </div>
                      </div>

                      <div>
                        <div className="text-slate-400 font-medium">Popularity Ranking</div>
                        <div className="font-semibold text-slate-200 mt-1">
                          #{currentAnime.popularity || '--'}
                        </div>
                      </div>
                    </div>

                    {/* Genres clickable row */}
                    <div className="pt-3 border-t border-slate-800">
                      <div className="text-slate-400 font-medium text-xs mb-2">Genres (Click to browse)</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {currentAnime.genres && currentAnime.genres.map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleGenreClick(g)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/80 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition hover:scale-105 active:scale-95"
                            title={`Filter by genre: ${g}`}
                          >
                            #{g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right 1 Col: Official Links & Streaming */}
                <div className="space-y-5 text-left">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-300">
                    Official Links & Media
                  </h3>
                  <div className="space-y-2.5">
                    {currentAnime.siteUrl && (
                      <a
                        href={currentAnime.siteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-sky-300 hover:text-sky-200 transition shadow-sm"
                      >
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-sky-400" />
                          <span>AniList Database Entry</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </a>
                    )}

                    {details?.externalLinks && details.externalLinks.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800/80 text-xs font-medium text-slate-300 hover:text-white transition"
                      >
                        <span className="truncate">{link.site}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EPISODES & STREAMING (Matches User Screenshots 1 & 2) */}
            {activeTab === 'episodes' && (
              <div className="space-y-6 text-left">
                {/* State 1: Active Episode Video Player (Pro Video Player) */}
                {playingEpisode !== null ? (
                  <div ref={playerRef} className="space-y-6">
                    {/* Feature-Packed Crunchyroll-Inspired Video Player */}
                    <ProVideoPlayer
                      anime={currentAnime}
                      episodeNumber={playingEpisode}
                      episodeTitle={episodeList.find(e => e.number === playingEpisode)?.title}
                      seasonTitle={seasons[selectedSeasonIdx]?.displayTitle ? seasons[selectedSeasonIdx].seasonLabel : undefined}
                      episodesList={episodeList}
                      initialTime={initialTime || 0}
                      onEpisodeChange={ep => {
                        setPlayingEpisode(ep);
                        onUpdateProgress(currentAnime, ep);
                      }}
                      onClosePlayer={() => setPlayingEpisode(null)}
                    />

                    {/* Episodes List in Active Playing View */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                          <span>Episodes</span>
                          <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                            {episodesTotal || episodeList.length}
                          </span>
                        </h3>

                        <button
                          type="button"
                          onClick={() => setPlayingEpisode(null)}
                          className="text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          Close Player
                        </button>
                      </div>

                      {/* Filter Search Bar */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            placeholder="Filter episodes..."
                            value={episodeSearchQuery}
                            onChange={e => setEpisodeSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-8 py-2 rounded-xl bg-[#121628] border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                          />
                          {episodeSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEpisodeSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1 bg-[#121628] border border-slate-800 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => setEpisodeViewMode('list')}
                            className={`p-1.5 rounded-lg transition ${
                              episodeViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <List className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEpisodeViewMode('grid')}
                            className={`p-1.5 rounded-lg transition ${
                              episodeViewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <LayoutGrid className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Episode List Rows with Highlighted Active Item (Screenshot 2) */}
                      <div className="space-y-3">
                        {filteredEpisodes.map(ep => {
                          const isCurrentPlaying = playingEpisode === ep.number;
                          const isWatched = ep.number <= currentProgress;

                          return (
                            <div
                              key={ep.number}
                              onClick={() => {
                                if (onPlayStream) {
                                  onClose();
                                  onPlayStream(currentAnime, ep.number, 0);
                                } else {
                                  setPlayingEpisode(ep.number);
                                  playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                              }}
                              className={`group flex items-center justify-between gap-4 p-3 rounded-2xl border transition cursor-pointer select-none ${
                                isCurrentPlaying
                                  ? 'bg-[#171b30] border-2 border-indigo-500/80 shadow-lg shadow-indigo-600/10'
                                  : 'bg-[#101424] hover:bg-[#151a30] border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              {/* Thumbnail with EP badge */}
                              <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800/80">
                                <img
                                  src={ep.thumbnail}
                                  alt={ep.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                                <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 text-[10px] sm:text-xs font-bold text-white tracking-tight">
                                  EP {ep.number}
                                </div>
                              </div>

                              {/* Titles */}
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-indigo-300 transition line-clamp-1 leading-snug">
                                  {ep.title}
                                </h4>
                                <p className={`text-xs mt-1 font-semibold ${isCurrentPlaying ? 'text-indigo-400' : 'text-slate-400'}`}>
                                  {isCurrentPlaying ? 'Now playing' : `Episode ${ep.number}`}
                                </p>
                              </div>

                              {/* Watched Action */}
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  const nextProgress = isWatched ? ep.number - 1 : ep.number;
                                  onUpdateProgress(currentAnime, nextProgress);
                                }}
                                className={`p-2 rounded-xl transition ${
                                  isWatched
                                    ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40'
                                    : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                                }`}
                                title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                              >
                                <Eye className={`w-5 h-5 ${isWatched ? 'text-indigo-400 fill-indigo-400/20' : ''}`} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* State 2: Episodes Browser (Matches Screenshot 1) */
                  <div className="space-y-6">
                    {/* Season Selector Pills Row (Screenshot 1) */}
                    <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                      {seasons.map((season, idx) => {
                        const isSelected = selectedSeasonIdx === idx;
                        return (
                          <button
                            key={season.id || idx}
                            type="button"
                            onClick={() => {
                              setSelectedSeasonIdx(idx);
                              if (season.anime && season.anime.id !== currentAnime.id) {
                                onNavigateToAnime(season.anime);
                              }
                            }}
                            className={`px-4 py-2.5 rounded-full text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 shrink-0 cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                : 'bg-[#121628] border border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span>{season.seasonLabel || `Season ${idx + 1}`}</span>
                            <span className={`text-[11px] font-normal ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>
                              ({season.year})
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Filter Episodes Search Bar & List/Grid toggle (Screenshot 1) */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Filter episodes..."
                          value={episodeSearchQuery}
                          onChange={e => setEpisodeSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-[#121628] border border-slate-800 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                        />
                        {episodeSearchQuery && (
                          <button
                            type="button"
                            onClick={() => setEpisodeSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-1 bg-[#121628] border border-slate-800 p-1 rounded-xl shrink-0">
                        <button
                          type="button"
                          onClick={() => setEpisodeViewMode('list')}
                          className={`p-1.5 rounded-lg transition ${
                            episodeViewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="List View"
                        >
                          <List className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEpisodeViewMode('grid')}
                          className={`p-1.5 rounded-lg transition ${
                            episodeViewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                          }`}
                          title="Grid View"
                        >
                          <LayoutGrid className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Episode Items (Screenshot 1) */}
                    <div className="space-y-3">
                      {filteredEpisodes.map(ep => {
                        const isWatched = ep.number <= currentProgress;

                        return (
                          <div
                            key={ep.number}
                            onClick={() => {
                              if (onPlayStream) {
                                onClose();
                                onPlayStream(currentAnime, ep.number, 0);
                              } else {
                                setPlayingEpisode(ep.number);
                                setTimeout(() => {
                                  playerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }, 100);
                              }
                            }}
                            className="group flex items-center justify-between gap-4 p-3 rounded-2xl bg-[#101424] hover:bg-[#151a30] border border-slate-800/80 hover:border-slate-700 transition cursor-pointer select-none"
                          >
                            {/* Left: Thumbnail with EP Badge */}
                            <div className="relative w-36 sm:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0 border border-slate-800/80">
                              <img
                                src={ep.thumbnail}
                                alt={ep.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                              <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/85 text-[10px] sm:text-xs font-bold text-white tracking-tight">
                                EP {ep.number}
                              </div>
                            </div>

                            {/* Middle: Title & Episode Number Subtitle */}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-indigo-300 transition line-clamp-1 leading-snug">
                                {ep.title}
                              </h4>
                              <p className="text-xs text-slate-400 mt-1">
                                Episode {ep.number}
                              </p>
                            </div>

                            {/* Right: Eye Icon for Watched Progress */}
                            <button
                              type="button"
                              onClick={e => {
                                e.stopPropagation();
                                const nextProgress = isWatched ? ep.number - 1 : ep.number;
                                onUpdateProgress(currentAnime, nextProgress);
                              }}
                              className={`p-2 rounded-xl transition ${
                                isWatched
                                  ? 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40'
                                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'
                              }`}
                              title={isWatched ? 'Mark as unwatched' : 'Mark as watched'}
                            >
                              <Eye className={`w-5 h-5 ${isWatched ? 'text-indigo-400 fill-indigo-400/20' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: FEATURED MUSIC */}
            {activeTab === 'music' && (
              <div className="space-y-6 text-left">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Music className="w-4 h-4 text-orange-400" />
                    <span>Original Soundtracks & Theme Songs</span>
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opening Theme Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
                      <Headphones className="w-4 h-4" />
                      <span>Opening Themes (OP)</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Explore official opening theme songs, music videos, and full tracks for <strong className="text-white">{title}</strong>.
                    </p>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' anime opening OP full song')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600/90 hover:bg-orange-600 text-white text-xs font-bold transition shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Listen Opening Themes on YouTube</span>
                    </a>
                  </div>

                  {/* Ending Theme Card */}
                  <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                      <Music className="w-4 h-4" />
                      <span>Ending Themes (ED) & OST</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Listen to official ending themes and soundtrack compositions by prominent Japanese anime composers.
                    </p>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' anime ending ED OST soundtrack')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600/90 hover:bg-indigo-600 text-white text-xs font-bold transition shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Search Soundtracks on YouTube</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: MORE LIKE THIS (RECOMMENDATIONS) - Sharp Rectangles & Compact Shorter Height */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4 text-left">
                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-x-3.5 sm:gap-x-5 gap-y-6 sm:gap-y-8">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                      <div key={i} className="space-y-2">
                        <div className="aspect-[2/3] w-full bg-slate-900 animate-pulse rounded-none" />
                        <div className="h-4 w-3/4 bg-slate-900 animate-pulse rounded-none" />
                        <div className="h-3 w-1/2 bg-slate-900 animate-pulse rounded-none" />
                      </div>
                    ))}
                  </div>
                ) : details?.recommendations?.nodes && details.recommendations.nodes.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-x-3.5 sm:gap-x-5 gap-y-6 sm:gap-y-8">
                    {details.recommendations.nodes
                      .filter(rec => rec.mediaRecommendation)
                      .map(rec => {
                        const recAnime = rec.mediaRecommendation!;
                        const recTitle = recAnime.title?.english || recAnime.title?.romaji || recAnime.title?.userPreferred || 'Anime';
                        const recCover = recAnime.coverImage?.large || recAnime.coverImage?.extraLarge || recAnime.coverImage?.medium;
                        const isMenuOpen = activeMenuId === recAnime.id;

                        return (
                          <div
                            key={rec.id}
                            className="group flex flex-col select-none cursor-pointer"
                            onClick={() => onNavigateToAnime(recAnime)}
                          >
                            {/* Sharp Rectangle Poster: 0px border-radius, shorter crisp vertical appearance */}
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900 rounded-none shadow-md border border-slate-800/80 group-hover:border-orange-500/60 transition duration-200">
                              <img
                                src={recCover}
                                alt={recTitle}
                                className="w-full h-full object-cover rounded-none group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              {/* Dark ambient bottom vignette */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Anime Title underneath */}
                            <h4
                              className="font-bold text-xs sm:text-sm text-white truncate mt-2 leading-snug group-hover:text-orange-400 transition"
                              title={recTitle}
                            >
                              {recTitle}
                            </h4>

                            {/* Subtitle row with Dub | Sub and three-dots kebab menu */}
                            <div className="flex items-center justify-between text-xs text-slate-400 mt-0.5">
                              <span className="font-normal truncate">
                                {recAnime.format === 'MOVIE' ? 'Movie • Dub | Sub' : 'Dub | Sub'}
                              </span>

                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation();
                                    setActiveMenuId(isMenuOpen ? null : recAnime.id);
                                  }}
                                  className="p-1 -mr-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition"
                                  title="More options"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>

                                {/* Kebab dropdown menu */}
                                {isMenuOpen && (
                                  <div
                                    className="absolute right-0 bottom-full mb-1.5 z-40 w-44 rounded-xl bg-[#141829] border border-slate-700 shadow-2xl p-1.5 text-xs text-slate-200 space-y-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                                    onClick={e => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onNavigateToAnime(recAnime);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-slate-200 hover:text-white font-medium"
                                    >
                                      <Info className="w-3.5 h-3.5 text-indigo-400" />
                                      <span>View Details</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onUpdateStatus(recAnime, 'PLANNING');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-slate-200 hover:text-white font-medium"
                                    >
                                      <Bookmark className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Add to Planning</span>
                                    </button>
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        onUpdateStatus(recAnime, 'CURRENT');
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-800 text-left text-slate-200 hover:text-white font-medium"
                                    >
                                      <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                                      <span>Start Watching</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 text-sm">
                    No community recommendations recorded yet for this title.
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: RELATIONS & FRANCHISE */}
            {activeTab === 'relations' && (
              <div className="space-y-4 text-left">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-300">
                  Franchise Watch Order & Related Series
                </h3>

                {loading ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="aspect-[2/3] rounded-none bg-slate-900 animate-pulse" />
                    ))}
                  </div>
                ) : details?.relations?.edges && details.relations.edges.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-x-3.5 sm:gap-x-5 gap-y-6">
                    {details.relations.edges.map((rel, idx) => {
                      const relNode = rel.node;
                      const relTitle = relNode.title?.english || relNode.title?.romaji || 'Related Anime';
                      const relCover = relNode.coverImage?.large || relNode.coverImage?.medium;

                      return (
                        <div
                          key={idx}
                          onClick={() => onNavigateToAnime(relNode)}
                          className="group flex flex-col select-none cursor-pointer"
                        >
                          <div className="relative aspect-[2/3] w-full overflow-hidden bg-slate-900 rounded-none shadow-md border border-slate-800 hover:border-orange-500/60 transition">
                            <img
                              src={relCover}
                              alt={relTitle}
                              className="w-full h-full object-cover rounded-none group-hover:scale-105 transition duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-none bg-indigo-600 text-white text-[10px] font-bold uppercase shadow-sm">
                              {rel.relationType.replace('_', ' ')}
                            </div>
                          </div>
                          <h5 className="font-bold text-xs sm:text-sm text-slate-200 group-hover:text-orange-400 truncate mt-2">
                            {relTitle}
                          </h5>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {relNode.format || 'Anime'} {relNode.seasonYear ? `• ${relNode.seasonYear}` : ''}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-16 text-center text-slate-500 text-sm">
                    No official franchise relations recorded for this series.
                  </div>
                )}
              </div>
            )}

            {/* TAB 6: CHARACTERS & CAST */}
            {activeTab === 'characters' && (
              <div className="space-y-4 text-left">
                <h3 className="text-base font-bold uppercase tracking-wider text-slate-300">
                  Characters & Voice Cast
                </h3>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-20 rounded-2xl bg-slate-900 animate-pulse" />
                    ))}
                  </div>
                ) : details?.characters?.edges && details.characters.edges.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {details.characters.edges.map((edge, idx) => {
                      const charNode = edge.node;
                      const vaNode = edge.voiceActors?.[0];

                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-900 border border-slate-800/80 text-xs"
                        >
                          {/* Character */}
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={charNode.image?.medium || charNode.image?.large}
                              alt={charNode.name.full}
                              className="w-12 h-16 object-cover rounded-xl bg-slate-800 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                            <div className="truncate">
                              <div className="font-bold text-slate-200 truncate">{charNode.name.full}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{edge.role}</div>
                            </div>
                          </div>

                          {/* Voice Actor */}
                          {vaNode && (
                            <div className="flex items-center gap-3 text-right min-w-0 pl-2">
                              <div className="truncate">
                                <div className="font-semibold text-slate-300 truncate">{vaNode.name.full}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5">Japanese</div>
                              </div>
                              <img
                                src={vaNode.image?.medium || vaNode.image?.large}
                                alt={vaNode.name.full}
                                className="w-12 h-16 object-cover rounded-xl bg-slate-800 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 text-sm">
                    No character or voice actor records found.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
