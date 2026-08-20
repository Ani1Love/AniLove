import { Anime } from '../types';

export type StreamLanguage = 'SUB' | 'DUB';
export type StreamResolution = 'auto' | '1080p' | '720p' | '480p';

export interface StreamProvider {
  id: string;
  label: string;
  kind: 'official' | 'user-configured' | 'legal';
  description: string;
}

export interface StreamSource {
  provider: StreamProvider;
  url: string;
  language: StreamLanguage;
  resolution: StreamResolution;
  isEmbeddable: boolean;
  external: boolean;
}

export type StreamSourceStatus = 'available' | 'unavailable' | 'error';

export interface ResolveEpisodeSourceInput {
  anime: Anime;
  episodeNumber: number;
  providerId?: string;
  language: StreamLanguage;
  resolution?: StreamResolution;
}

export interface ResolveEpisodeSourceResult {
  status: StreamSourceStatus;
  source?: StreamSource;
  message?: string;
}

const OFFICIAL_LINK_PROVIDER: StreamProvider = {
  id: 'official-link',
  label: 'Official stream',
  kind: 'official',
  description: 'Uses official streaming links returned by AniList metadata.',
};

export const STREAM_PROVIDERS: StreamProvider[] = [OFFICIAL_LINK_PROVIDER];

export const DEFAULT_STREAM_PROVIDER_ID = OFFICIAL_LINK_PROVIDER.id;

export const isStreamProviderId = (providerId: string): providerId is typeof DEFAULT_STREAM_PROVIDER_ID =>
  STREAM_PROVIDERS.some(provider => provider.id === providerId);

const normalize = (value?: string) => value?.trim().toLowerCase() || '';

const episodeMatches = (title: string | undefined, episodeNumber: number) => {
  const normalized = normalize(title);
  if (!normalized) return false;

  return [
    `episode ${episodeNumber}`,
    `ep ${episodeNumber}`,
    `#${episodeNumber}`,
    `${episodeNumber}`,
  ].some(marker => normalized.includes(marker));
};

export async function resolveEpisodeSource({
  anime,
  episodeNumber,
  providerId = OFFICIAL_LINK_PROVIDER.id,
  language,
  resolution = 'auto',
}: ResolveEpisodeSourceInput): Promise<ResolveEpisodeSourceResult> {
  const provider = STREAM_PROVIDERS.find(item => item.id === providerId);

  if (!provider) {
    return {
      status: 'unavailable',
      message: 'Selected streaming provider is not available.',
    };
  }

  try {
    const detail = anime as Anime & {
      streamingEpisodes?: Array<{ title?: string; url?: string; site?: string }>;
    };
    const streamingEpisode = detail.streamingEpisodes?.find(episode => {
      if (!episode.url) return false;
      return episodeMatches(episode.title, episodeNumber) || detail.streamingEpisodes?.length === 1;
    });
    const url = streamingEpisode?.url || anime.siteUrl;

    if (!url) {
      return {
        status: 'unavailable',
        message: 'No source available',
      };
    }

    return {
      status: 'available',
      source: {
        provider,
        url,
        language,
        resolution,
        isEmbeddable: false,
        external: true,
      },
    };
  } catch (error) {
    console.error('Unable to resolve stream source:', error);
    return {
      status: 'error',
      message: 'No source available',
    };
  }
}
