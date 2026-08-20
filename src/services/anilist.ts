import { Anime, AnimeDetail, AiringScheduleItem, AniListUser, MediaListStatus, UserMediaListItem } from '../types';

export const ANILIST_API_URL = 'https://graphql.anilist.co';
export const ANILIST_CLIENT_ID = '49024';

export function getAniListAuthUrl(): string {
  // Implicit grant flow using configured AniList Client ID
  const redirectUri = encodeURIComponent(window.location.origin + window.location.pathname);
  return `https://anilist.co/api/v2/oauth/authorize?client_id=${ANILIST_CLIENT_ID}&response_type=token`;
}

export const getOAuthLoginUrl = getAniListAuthUrl;

export function parseOAuthTokenFromHash(): string | null {
  if (!window.location.hash) return null;
  const hash = window.location.hash.substring(1);
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export function sanitizeDescription(raw?: string): string {
  if (!raw) return 'No synopsis available for this title.';
  return raw
    .replace(/~!\s*([\s\S]*?)\s*!~/g, '$1') // remove spoiler tags but preserve text
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/__|\*\*|\*|~~/g, '')
    .trim();
}

export function getCurrentSeasonAndYear(): { season: 'WINTER' | 'SPRING' | 'SUMMER' | 'FALL'; year: number } {
  const date = new Date();
  const month = date.getMonth(); // 0-11
  const year = date.getFullYear();
  
  if (month >= 0 && month <= 2) return { season: 'WINTER', year };
  if (month >= 3 && month <= 5) return { season: 'SPRING', year };
  if (month >= 6 && month <= 8) return { season: 'SUMMER', year };
  return { season: 'FALL', year };
}

const MEDIA_CARD_FRAGMENT = `
  id
  idMal
  title {
    romaji
    english
    native
    userPreferred
  }
  coverImage {
    extraLarge
    large
    medium
    color
  }
  bannerImage
  format
  episodes
  duration
  status
  season
  seasonYear
  averageScore
  meanScore
  popularity
  genres
  description
  source
  studios(isMain: true) {
    nodes {
      id
      name
      isAnimationStudio
    }
  }
  nextAiringEpisode {
    id
    episode
    airingAt
    timeUntilAiring
  }
  trailer {
    id
    site
    thumbnail
  }
  siteUrl
`;

async function executeQuery<T>(query: string, variables: Record<string, any> = {}, accessToken?: string | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(ANILIST_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  const json = await response.json();

  if (json.errors && json.errors.length > 0) {
    const errorMsg = json.errors.map((e: any) => e.message).join(', ');
    throw new Error(errorMsg || 'AniList GraphQL Error');
  }

  return json.data as T;
}

export async function fetchTrendingAnime(page: number = 1, perPage: number = 18): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;
  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, { page, perPage });
  return data.Page.media;
}

export async function fetchPopularAnime(page: number = 1, perPage: number = 18): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;
  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, { page, perPage });
  return data.Page.media;
}

export const fetchPopularSeason = fetchPopularAnime;

export async function fetchTopRatedAnime(page: number = 1, perPage: number = 18): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (sort: SCORE_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;
  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, { page, perPage });
  return data.Page.media;
}

export async function fetchNewestAnime(page: number = 1, perPage: number = 18): Promise<Anime[]> {
  const query = `
    query ($page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (sort: START_DATE_DESC, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;
  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, { page, perPage });
  return data.Page.media;
}

export async function searchAnimeAdvanced({
  search,
  genres = [],
  status,
  format,
  sort = 'POPULARITY_DESC',
  page = 1,
  perPage = 30,
}: {
  search?: string;
  genres?: string[];
  status?: string;
  format?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}): Promise<Anime[]> {
  const query = `
    query ($search: String, $genre_in: [String], $status: MediaStatus, $format: MediaFormat, $sort: [MediaSort], $page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (search: $search, genre_in: $genre_in, status: $status, format: $format, sort: $sort, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;

  const variables: Record<string, any> = {
    page,
    perPage,
    sort: search && search.trim() ? ['SEARCH_MATCH'] : [sort],
  };

  if (search && search.trim()) variables.search = search.trim();
  if (genres && genres.length > 0 && !genres.includes('All')) variables.genre_in = genres;
  if (status && status !== 'All') variables.status = status;
  if (format && format !== 'All') variables.format = format;

  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, variables);
  return data.Page.media;
}

export async function searchAnime(
  queryOrOptions: string | { search?: string; genre?: string; status?: string; sort?: string; page?: number; perPage?: number },
  page: number = 1,
  perPage: number = 24,
  genre?: string,
  status?: string
): Promise<Anime[]> {
  let searchStr: string | undefined;
  let genreVal: string | undefined = genre;
  let statusVal: string | undefined = status;
  let pageVal: number = page;
  let perPageVal: number = perPage;

  if (typeof queryOrOptions === 'object') {
    searchStr = queryOrOptions.search;
    genreVal = queryOrOptions.genre;
    statusVal = queryOrOptions.status;
    pageVal = queryOrOptions.page || 1;
    perPageVal = queryOrOptions.perPage || 24;
  } else {
    searchStr = queryOrOptions;
  }

  const query = `
    query ($search: String, $genre: String, $status: MediaStatus, $sort: [MediaSort], $page: Int, $perPage: Int) {
      Page (page: $page, perPage: $perPage) {
        media (search: $search, genre: $genre, status: $status, sort: $sort, type: ANIME, isAdult: false) {
          ${MEDIA_CARD_FRAGMENT}
        }
      }
    }
  `;

  const variables: Record<string, any> = {
    page: pageVal,
    perPage: perPageVal,
    sort: searchStr && searchStr.trim() ? ['SEARCH_MATCH'] : ['POPULARITY_DESC'],
  };

  if (searchStr && searchStr.trim()) variables.search = searchStr.trim();
  if (genreVal && genreVal !== 'All') variables.genre = genreVal;
  if (statusVal && statusVal !== 'All') variables.status = statusVal;

  const data = await executeQuery<{ Page: { media: Anime[] } }>(query, variables);
  return data.Page.media;
}

export async function fetchAiringSchedule(airingAt_greater: number, airingAt_lesser: number): Promise<AiringScheduleItem[]> {
  const query = `
    query ($airingAt_greater: Int, $airingAt_lesser: Int, $page: Int) {
      Page (page: $page, perPage: 50) {
        pageInfo {
          hasNextPage
          currentPage
        }
        airingSchedules (airingAt_greater: $airingAt_greater, airingAt_lesser: $airingAt_lesser, sort: TIME) {
          id
          episode
          airingAt
          timeUntilAiring
          media {
            ${MEDIA_CARD_FRAGMENT}
          }
        }
      }
    }
  `;

  let allSchedules: AiringScheduleItem[] = [];
  let page = 1;
  let hasNextPage = true;
  const maxPages = 8; // Fetch up to 400 airing schedule entries across the week

  while (hasNextPage && page <= maxPages) {
    try {
      const data = await executeQuery<{
        Page: {
          pageInfo?: { hasNextPage: boolean };
          airingSchedules: AiringScheduleItem[];
        };
      }>(query, {
        airingAt_greater,
        airingAt_lesser,
        page,
      });

      const items = data.Page?.airingSchedules || [];
      const validItems = items.filter(item => item.media && !item.media.isAdult);
      allSchedules = allSchedules.concat(validItems);

      hasNextPage = Boolean(data.Page?.pageInfo?.hasNextPage) && items.length >= 50;
      page++;
    } catch (err) {
      console.error(`Error fetching airing schedule page ${page}:`, err);
      break;
    }
  }

  // Deduplicate entries by unique ID or media ID + episode
  const seenIds = new Set<string>();
  return allSchedules.filter(item => {
    const key = `${item.id || item.media?.id}-${item.episode}`;
    if (seenIds.has(key)) return false;
    seenIds.add(key);
    return true;
  });
}

export async function fetchAnimeDetails(id: number): Promise<AnimeDetail> {
  const query = `
    query ($id: Int) {
      Media (id: $id, type: ANIME) {
        ${MEDIA_CARD_FRAGMENT}
        relations {
          edges {
            relationType
            node {
              ${MEDIA_CARD_FRAGMENT}
            }
          }
        }
        recommendations (sort: RATING_DESC, perPage: 24) {
          nodes {
            id
            rating
            mediaRecommendation {
              ${MEDIA_CARD_FRAGMENT}
            }
          }
        }
        characters (sort: ROLE, perPage: 12) {
          edges {
            role
            node {
              id
              name {
                full
                native
              }
              image {
                large
                medium
              }
            }
            voiceActors (language: JAPANESE) {
              id
              name {
                full
                native
              }
              image {
                large
                medium
              }
              language
            }
          }
        }
        externalLinks {
          id
          url
          site
          icon
          color
        }
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
      }
    }
  `;
  const data = await executeQuery<{ Media: AnimeDetail }>(query, { id });
  return data.Media;
}

export async function fetchAnimeByStudio(studioName: string, page: number = 1, perPage: number = 30): Promise<Anime[]> {
  const cleanName = studioName.trim();
  if (!cleanName) return [];

  // Strategy 1: Search studios list via Page
  const pageStudioQuery = `
    query ($studio: String, $perPage: Int) {
      Page (page: 1, perPage: 6) {
        studios (search: $studio, sort: SEARCH_MATCH) {
          id
          name
          isAnimationStudio
          media (sort: POPULARITY_DESC, type: ANIME, isAdult: false, perPage: $perPage) {
            nodes {
              ${MEDIA_CARD_FRAGMENT}
            }
          }
        }
      }
    }
  `;

  try {
    const data = await executeQuery<{
      Page?: {
        studios?: {
          id: number;
          name: string;
          isAnimationStudio?: boolean;
          media?: {
            nodes: Anime[];
          };
        }[];
      };
    }>(pageStudioQuery, { studio: cleanName, perPage });

    const studios = data.Page?.studios || [];
    const mediaMap = new Map<number, Anime>();
    for (const st of studios) {
      st.media?.nodes?.forEach(m => {
        if (!mediaMap.has(m.id)) {
          mediaMap.set(m.id, m);
        }
      });
    }
    if (mediaMap.size > 0) {
      return Array.from(mediaMap.values());
    }
  } catch (err) {
    console.warn(`Page studios search query failed for "${cleanName}":`, err);
  }

  // Strategy 2: Search direct Studio by name
  const singleStudioQuery = `
    query ($studio: String, $page: Int, $perPage: Int) {
      Studio (search: $studio) {
        id
        name
        isAnimationStudio
        media (sort: POPULARITY_DESC, type: ANIME, isAdult: false, page: $page, perPage: $perPage) {
          nodes {
            ${MEDIA_CARD_FRAGMENT}
          }
        }
      }
    }
  `;

  try {
    const data = await executeQuery<{
      Studio?: {
        id: number;
        name: string;
        media?: {
          nodes: Anime[];
        };
      };
    }>(singleStudioQuery, { studio: cleanName, page, perPage });

    if (data.Studio?.media?.nodes && data.Studio.media.nodes.length > 0) {
      return data.Studio.media.nodes;
    }
  } catch (err) {
    console.warn(`Single Studio search failed for "${cleanName}":`, err);
  }

  // Strategy 3: Fallback to keyword media search
  try {
    const fallbackSearch = await searchAnimeAdvanced({ search: cleanName, page: 1, perPage });
    return fallbackSearch;
  } catch (err) {
    console.error(`All studio search strategies failed for "${cleanName}":`, err);
    return [];
  }
}

// Option 1: One-Time Playlist Import (Static Copy · No Login · No Sync)
export async function fetchUserAnimeList(username: string): Promise<UserMediaListItem[]> {
  const query = `
    query ($username: String) {
      MediaListCollection (userName: $username, type: ANIME) {
        lists {
          name
          isCustomList
          status
          entries {
            id
            mediaId
            status
            progress
            score(format: POINT_10_DECIMAL)
            updatedAt
            media {
              ${MEDIA_CARD_FRAGMENT}
            }
          }
        }
      }
    }
  `;

  const data = await executeQuery<{
    MediaListCollection: {
      lists: {
        name: string;
        isCustomList: boolean;
        status: MediaListStatus;
        entries: UserMediaListItem[];
      }[];
    };
  }>(query, { username });

  const allEntries: UserMediaListItem[] = [];
  const seenMediaIds = new Set<number>();

  data.MediaListCollection.lists.forEach(list => {
    list.entries.forEach(entry => {
      if (!seenMediaIds.has(entry.mediaId)) {
        seenMediaIds.add(entry.mediaId);
        allEntries.push({
          id: entry.id,
          mediaId: entry.mediaId,
          status: entry.status || list.status || 'CURRENT',
          progress: entry.progress || 0,
          score: entry.score || 0,
          updatedAt: entry.updatedAt || Date.now(),
          media: entry.media,
        });
      }
    });
  });

  return allEntries;
}

export const fetchUserMediaList = fetchUserAnimeList;

// Option 2: Authenticated Two-Way Cloud Sync
export async function fetchAuthenticatedViewer(accessToken: string): Promise<AniListUser> {
  const query = `
    query {
      Viewer {
        id
        name
        avatar {
          large
          medium
        }
        bannerImage
        statistics {
          anime {
            count
            meanScore
            minutesWatched
            episodesWatched
          }
        }
      }
    }
  `;
  const data = await executeQuery<{ Viewer: AniListUser }>(query, {}, accessToken);
  return data.Viewer;
}

export const fetchViewerProfile = fetchAuthenticatedViewer;

export async function syncMediaListEntryToAniList(
  accessToken: string,
  mediaId: number,
  status?: MediaListStatus,
  progress?: number,
  score?: number,
  id?: number
): Promise<{ id: number; status: MediaListStatus; progress: number; score: number }> {
  const mutation = `
    mutation ($id: Int, $mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
      SaveMediaListEntry (id: $id, mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
        id
        mediaId
        status
        progress
        score
      }
    }
  `;
  const data = await executeQuery<{
    SaveMediaListEntry: {
      id: number;
      mediaId: number;
      status: MediaListStatus;
      progress: number;
      score: number;
    };
  }>(mutation, { id, mediaId, status, progress, score }, accessToken);

  return data.SaveMediaListEntry;
}

export const saveMediaListEntry = (
  accessToken: string,
  variables: { mediaId: number; status?: MediaListStatus; progress?: number; score?: number; id?: number }
) => syncMediaListEntryToAniList(accessToken, variables.mediaId, variables.status, variables.progress, variables.score, variables.id);

export async function deleteMediaListEntry(accessToken: string, id: number): Promise<boolean> {
  const mutation = `
    mutation ($id: Int) {
      DeleteMediaListEntry (id: $id) {
        deleted
      }
    }
  `;
  const data = await executeQuery<{ DeleteMediaListEntry: { deleted: boolean } }>(mutation, { id }, accessToken);
  return data.DeleteMediaListEntry.deleted;
}
