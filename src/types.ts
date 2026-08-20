export type MediaListStatus = 'CURRENT' | 'PLANNING' | 'COMPLETED' | 'DROPPED' | 'PAUSED' | 'REPEATING';

export interface AnimeTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}

export interface AnimeCover {
  extraLarge?: string;
  large?: string;
  medium?: string;
  color?: string;
}

export interface FuzzyDate {
  year?: number;
  month?: number;
  day?: number;
}

export interface AiringScheduleNode {
  id?: number;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
}

export interface AnimeTrailer {
  id?: string;
  site?: string;
  thumbnail?: string;
}

export interface StudioNode {
  id: number;
  name: string;
  isAnimationStudio?: boolean;
}

export interface VoiceActor {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image?: {
    medium?: string;
    large?: string;
  };
  language?: string;
}

export interface CharacterItem {
  id: number;
  name: {
    full: string;
    native?: string;
  };
  image?: {
    medium?: string;
    large?: string;
  };
  role: string;
  voiceActors?: VoiceActor[];
}

export interface RelationEdge {
  relationType: string;
  node: Anime;
}

export interface RecommendationNode {
  id: number;
  rating?: number;
  mediaRecommendation?: Anime;
}

export interface ExternalLink {
  id: number;
  url: string;
  site: string;
  icon?: string;
  color?: string;
}

export interface StreamingEpisode {
  title?: string;
  thumbnail?: string;
  url?: string;
  site?: string;
}

export interface Anime {
  id: number;
  idMal?: number;
  title: AnimeTitle;
  coverImage: AnimeCover;
  bannerImage?: string;
  format?: string;
  episodes?: number;
  duration?: number;
  status?: string;
  season?: string;
  seasonYear?: number;
  averageScore?: number;
  meanScore?: number;
  popularity?: number;
  genres: string[];
  description?: string;
  source?: string;
  studios?: {
    nodes: StudioNode[];
  };
  nextAiringEpisode?: AiringScheduleNode;
  trailer?: AnimeTrailer;
  isAdult?: boolean;
  siteUrl?: string;
  startDate?: FuzzyDate;
  endDate?: FuzzyDate;
}

export interface AnimeDetail extends Anime {
  relations?: {
    edges: RelationEdge[];
  };
  recommendations?: {
    nodes: RecommendationNode[];
  };
  characters?: {
    edges: {
      role: string;
      node: {
        id: number;
        name: { full: string; native?: string };
        image?: { large?: string; medium?: string };
      };
      voiceActors?: VoiceActor[];
    }[];
  };
  externalLinks?: ExternalLink[];
  streamingEpisodes?: StreamingEpisode[];
}

export interface AiringScheduleItem {
  id: number;
  episode: number;
  airingAt: number;
  timeUntilAiring: number;
  media: Anime;
}

export interface UserMediaListItem {
  id?: number; // AniList list entry ID if synced
  mediaId: number;
  status: MediaListStatus;
  progress: number;
  score: number;
  updatedAt: number;
  media: Anime;
}

export interface AniListUser {
  id: number;
  name: string;
  avatar?: {
    large?: string;
    medium?: string;
  };
  bannerImage?: string;
  statistics?: {
    anime?: {
      count: number;
      meanScore: number;
      minutesWatched: number;
      episodesWatched: number;
    };
  };
}

export interface AppNotification {
  id: string;
  type: 'airing' | 'sync' | 'library' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  anime?: Anime;
  episode?: number;
}

export type StreamServerId = 'anikoto' | 'vidsrc' | 'embedsu' | '2embed';
export type AudioLanguageCode = 'ja' | 'en' | 'hi' | 'ta' | 'te' | 'bn' | 'ml';
export type AudioLanguageMode = 'sub' | 'dub';

export interface AudioLanguagePreference {
  code: AudioLanguageCode;
  label: string;
  mode: AudioLanguageMode;
}

export const SUPPORTED_AUDIO_LANGUAGES: AudioLanguagePreference[] = [
  { code: 'ja', label: 'Japanese + English Subtitles', mode: 'sub' },
  { code: 'en', label: 'English Dub', mode: 'dub' },
  { code: 'hi', label: 'Hindi Dub', mode: 'dub' },
  { code: 'ta', label: 'Tamil Dub', mode: 'dub' },
  { code: 'te', label: 'Telugu Dub', mode: 'dub' },
  { code: 'bn', label: 'Bengali Dub', mode: 'dub' },
  { code: 'ml', label: 'Malayalam Dub', mode: 'dub' },
];

export interface UserSettings {
  theme: 'dark' | 'light';
  twoWaySyncEnabled: boolean;
  syncEpisodeProgress: boolean;
  syncWatchStatus: boolean;
  syncScores: boolean;
  anilistToken: string | null;
  anilistUser: AniListUser | null;
  importUsername: string | null;
  lastSyncTimestamp: number | null;
  // Notifications
  notificationsEnabled: boolean;
  notifyAiringEpisodes: boolean;
  notifySyncUpdates: boolean;
  notifyDailyDigest: boolean;
  browserPushEnabled: boolean;
  // Player & App Preferences
  preferredAudio: 'sub' | 'dub';
  preferredLanguages: AudioLanguagePreference[]; // Ranked language preferences, e.g. Japanese subtitles then English dub
  preferredServers: StreamServerId[]; // e.g. ['anikoto', 'vidsrc', 'embedsu'] (Rank 1, Rank 2, Rank 3)
  autoPlayNextEpisode: boolean;
  defaultStreamServer: string;
}

export type ThumbnailAppearance = 'snapshot' | 'banner' | 'poster';

export interface WatchHistoryEntry {
  animeId: number;
  anime: Anime;
  episodeNumber: number;
  episodeTitle?: string;
  seasonTitle?: string;
  currentTime: number; // in seconds
  duration: number; // in seconds
  lastWatchedAt: number; // timestamp ms
  thumbnailStyle?: ThumbnailAppearance;
  completed?: boolean;
}
