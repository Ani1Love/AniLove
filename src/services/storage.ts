import { UserMediaListItem, UserSettings, Anime } from '../types';

const SETTINGS_KEY = 'anilove_settings_v3';
const SETTINGS_KEY_LEGACY = 'anilili_settings_v3';
const LIBRARY_KEY = 'anilove_library_v3';
const LIBRARY_KEY_LEGACY = 'anilili_library_v3';
const NOTIFICATIONS_KEY = 'anilove_notifications_v3';
const NOTIFICATIONS_KEY_LEGACY = 'anilili_notifications_v3';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  twoWaySyncEnabled: true,
  syncEpisodeProgress: true,
  syncWatchStatus: true,
  syncScores: true,
  anilistToken: null,
  anilistUser: null,
  importUsername: null,
  lastSyncTimestamp: null,
  notificationsEnabled: true,
  notifyAiringEpisodes: true,
  notifySyncUpdates: true,
  notifyDailyDigest: true,
  browserPushEnabled: false,
  preferredAudio: 'sub',
  preferredLanguages: ['SUB', 'DUB'],
  preferredServers: ['official-link'],
  autoPlayNextEpisode: true,
  defaultStreamServer: 'auto',
};

export function getStoredSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY) || localStorage.getItem(SETTINGS_KEY_LEGACY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    console.error('Error reading stored settings:', e);
    return DEFAULT_SETTINGS;
  }
}

export const getUserSettings = getStoredSettings;

export function saveStoredSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving stored settings:', e);
  }
}

export const saveUserSettings = saveStoredSettings;

export function getStoredLibrary(): UserMediaListItem[] {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY) || localStorage.getItem(LIBRARY_KEY_LEGACY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored library:', e);
    return [];
  }
}

export const getUserLibrary = getStoredLibrary;

export function saveStoredLibrary(items: UserMediaListItem[]): void {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving stored library:', e);
  }
}

export const saveUserLibrary = saveStoredLibrary;

export function updateLibraryItem(
  library: UserMediaListItem[],
  anime: Anime,
  updates: Partial<UserMediaListItem>
): UserMediaListItem[] {
  const index = library.findIndex(i => i.mediaId === anime.id);
  let updated: UserMediaListItem[];

  if (index >= 0) {
    updated = [...library];
    updated[index] = {
      ...updated[index],
      ...updates,
      media: anime,
      updatedAt: Date.now(),
    };
  } else {
    const newItem: UserMediaListItem = {
      mediaId: anime.id,
      status: updates.status || 'PLANNING',
      progress: updates.progress || 0,
      score: updates.score || 0,
      updatedAt: Date.now(),
      media: anime,
      ...updates,
    };
    updated = [newItem, ...library];
  }

  saveStoredLibrary(updated);
  return updated;
}

export const upsertLibraryItem = (library: UserMediaListItem[], item: UserMediaListItem) =>
  updateLibraryItem(library, item.media, item);

export function removeLibraryItem(library: UserMediaListItem[], mediaId: number): UserMediaListItem[] {
  const updated = library.filter(i => i.mediaId !== mediaId);
  saveStoredLibrary(updated);
  return updated;
}

export function exportLibraryAsJSON(library: UserMediaListItem[], settings?: UserSettings): void {
  const data = {
    exportedAt: new Date().toISOString(),
    version: '3.0',
    library,
    settings: settings ? { theme: settings.theme, importUsername: settings.importUsername } : undefined,
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `anilove-library-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportLibraryToJson = (library: UserMediaListItem[]) => exportLibraryAsJSON(library);

export function importLibraryFromJSON(
  file: File,
  onSuccess: (library: UserMediaListItem[], settings?: UserSettings) => void,
  onError: (errorMsg: string) => void
): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const content = e.target?.result as string;
      const parsed = JSON.parse(content);
      const importedLib: UserMediaListItem[] = Array.isArray(parsed) ? parsed : parsed.library || [];
      if (!Array.isArray(importedLib)) {
        throw new Error('Invalid JSON format: missing library array.');
      }
      onSuccess(importedLib, parsed.settings);
    } catch (err: any) {
      onError(err.message || 'Failed to parse JSON backup file.');
    }
  };
  reader.onerror = () => {
    onError('Failed to read file from disk.');
  };
  reader.readAsText(file);
}

export const importLibraryFromJson = (jsonStr: string, currentLibrary: UserMediaListItem[]): UserMediaListItem[] => {
  const data = JSON.parse(jsonStr);
  const importedItems: UserMediaListItem[] = Array.isArray(data) ? data : data.library || [];
  const map = new Map<number, UserMediaListItem>();
  currentLibrary.forEach(item => map.set(item.mediaId, item));
  importedItems.forEach(item => {
    if (item.mediaId && item.media) {
      map.set(item.mediaId, item);
    }
  });
  const merged = Array.from(map.values());
  saveStoredLibrary(merged);
  return merged;
};

export function getStoredNotifications(): import('../types').AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY) || localStorage.getItem(NOTIFICATIONS_KEY_LEGACY);
    if (!raw) {
      return [
        {
          id: 'welcome-1',
          type: 'system',
          title: 'Welcome to AniLove PRO!',
          message: 'Explore trending anime, track episodes with AniList two-way sync, and monitor weekly schedules.',
          timestamp: Date.now() - 3600000,
          read: false,
        },
      ];
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored notifications:', e);
    return [];
  }
}

export function saveStoredNotifications(notifications: import('../types').AppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error('Error saving stored notifications:', e);
  }
}

const WATCH_HISTORY_KEY = 'anilove_watch_history_v2';
const WATCH_HISTORY_KEY_LEGACY = 'anilove_watch_history_v1';

export function getStoredWatchHistory(): import('../types').WatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_KEY) || localStorage.getItem(WATCH_HISTORY_KEY_LEGACY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('Error reading stored watch history:', e);
    return [];
  }
}

export function saveStoredWatchHistory(history: import('../types').WatchHistoryEntry[]): void {
  try {
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Error saving stored watch history:', e);
  }
}

export function recordWatchProgress(entry: {
  anime: import('../types').Anime;
  episodeNumber: number;
  episodeTitle?: string;
  seasonTitle?: string;
  currentTime: number;
  duration: number;
  thumbnailStyle?: import('../types').ThumbnailAppearance;
}): import('../types').WatchHistoryEntry[] {
  const currentHistory = getStoredWatchHistory();
  const existingIdx = currentHistory.findIndex(
    h => h.animeId === entry.anime.id && h.episodeNumber === entry.episodeNumber
  );

  const newEntry: import('../types').WatchHistoryEntry = {
    animeId: entry.anime.id,
    anime: entry.anime,
    episodeNumber: entry.episodeNumber,
    episodeTitle: entry.episodeTitle,
    seasonTitle: entry.seasonTitle,
    currentTime: Math.max(0, Math.round(entry.currentTime)),
    duration: Math.max(1, Math.round(entry.duration || 1440)),
    lastWatchedAt: Date.now(),
    thumbnailStyle: entry.thumbnailStyle || 'snapshot',
    completed: entry.duration > 0 && entry.currentTime / entry.duration > 0.9,
  };

  let updated: import('../types').WatchHistoryEntry[];
  if (existingIdx >= 0) {
    updated = [...currentHistory];
    updated[existingIdx] = {
      ...updated[existingIdx],
      ...newEntry,
      thumbnailStyle: entry.thumbnailStyle || updated[existingIdx].thumbnailStyle || 'snapshot',
    };
    // Move to top
    const [item] = updated.splice(existingIdx, 1);
    updated.unshift(item);
  } else {
    // If different episode of same anime exists, we keep entries but put newest on top
    updated = [newEntry, ...currentHistory.filter(h => !(h.animeId === entry.anime.id && h.episodeNumber === entry.episodeNumber))];
  }

  // Keep max 50 recent items
  updated = updated.slice(0, 50);
  saveStoredWatchHistory(updated);
  return updated;
}

export function removeWatchHistoryItem(animeId: number, episodeNumber?: number): import('../types').WatchHistoryEntry[] {
  const current = getStoredWatchHistory();
  const updated = current.filter(item => {
    if (item.animeId !== animeId) return true;
    if (episodeNumber !== undefined && item.episodeNumber !== episodeNumber) return true;
    return false;
  });
  saveStoredWatchHistory(updated);
  return updated;
}

export function updateWatchHistoryThumbnailStyle(
  animeId: number,
  thumbnailStyle: import('../types').ThumbnailAppearance
): import('../types').WatchHistoryEntry[] {
  const current = getStoredWatchHistory();
  const updated = current.map(item => (item.animeId === animeId ? { ...item, thumbnailStyle } : item));
  saveStoredWatchHistory(updated);
  return updated;
}

export function clearWatchHistory(): void {
  saveStoredWatchHistory([]);
}
