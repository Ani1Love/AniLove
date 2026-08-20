import React, { useState } from 'react';
import {
  Settings, Bell, RefreshCw, Download, Upload, ShieldCheck,
  CheckCircle2, AlertCircle, LogOut, ArrowRight, UserCheck,
  FileJson, Sparkles, ExternalLink, Play, Volume2, Database,
  Sliders, Smartphone, Check, Moon, Sun, Info, BellRing,
  Trash2, Send
} from 'lucide-react';
import { UserSettings, UserMediaListItem, MediaListStatus, StreamServerId } from '../types';
import { getAniListAuthUrl, fetchUserMediaList, fetchAuthenticatedViewer } from '../services/anilist';
import { DEFAULT_PREFERRED_STREAM_SERVER_IDS, STREAM_PROVIDERS, STREAM_PROVIDER_IDS } from '../services/streamingProviders';

interface SettingsViewProps {
  settings: UserSettings;
  onSaveSettings: (newSettings: UserSettings) => void;
  onImportList: (items: UserMediaListItem[], username: string) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'sync', message: string, title?: string) => void;
  onExportBackup: () => void;
  onImportBackup: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSendTestNotification: () => void;
  libraryCount: number;
}

type SettingsSection = 'anilist' | 'notifications' | 'player' | 'backup' | 'about';

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSaveSettings,
  onImportList,
  onShowToast,
  onExportBackup,
  onImportBackup,
  onSendTestNotification,
  libraryCount,
}) => {
  const [activeSection, setActiveSection] = useState<SettingsSection>('anilist');

  // Option 1: Import Playlist state
  const [importUsername, setImportUsername] = useState(settings.importUsername || '');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportTypes, setSelectedImportTypes] = useState({
    CURRENT: true,
    COMPLETED: true,
    PLANNING: true,
    PAUSED: true,
    DROPPED: true,
  });
  const getPreferredServers = () => settings.preferredServers || DEFAULT_PREFERRED_STREAM_SERVER_IDS;
  const isStreamServerId = (serverId: string): serverId is StreamServerId =>
    STREAM_PROVIDER_IDS.includes(serverId as StreamServerId);

  const getProviderOptionLabel = (provider: (typeof STREAM_PROVIDERS)[number], rankIndex: number) => {
    const isDefaultForRank = provider.id === DEFAULT_PREFERRED_STREAM_SERVER_IDS[rankIndex];
    const label = provider.description ? `${provider.label} (${provider.description})` : provider.label;

    return isDefaultForRank ? `★ ${label}` : label;
  };

  const updatePreferredServer = (rankIndex: number, serverId: StreamServerId) => {
    const current = getPreferredServers();
    const updated = [...DEFAULT_PREFERRED_STREAM_SERVER_IDS] as StreamServerId[];

    for (let index = 0; index < updated.length; index += 1) {
      updated[index] = current[index] || DEFAULT_PREFERRED_STREAM_SERVER_IDS[index];
    }

    updated[rankIndex] = serverId;

    onSaveSettings({
      ...settings,
      preferredServers: updated,
    });
  };


  // Option 2: Two-Way Sync manual token state
  const [manualToken, setManualToken] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);

  // HANDLER: Import Public Playlist
  const handleImportPlaylist = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = importUsername.trim();
    if (!username) {
      onShowToast('error', 'Please enter a valid AniList username.', 'Username Required');
      return;
    }

    setIsImporting(true);
    try {
      const items = await fetchUserMediaList(username);
      if (!items || items.length === 0) {
        onShowToast('info', `No anime lists found for user "${username}". Make sure the profile is public.`, 'No Records');
        setIsImporting(false);
        return;
      }

      const filtered = items.filter(item => selectedImportTypes[item.status as keyof typeof selectedImportTypes]);
      onImportList(filtered, username);

      onSaveSettings({
        ...settings,
        importUsername: username,
      });

      onShowToast(
        'success',
        `Successfully imported ${filtered.length} anime entries from ${username}'s AniList!`,
        'Playlist Imported'
      );
    } catch (err: any) {
      console.error('Import error:', err);
      onShowToast('error', err.message || 'Failed to fetch AniList playlist.', 'Import Failed');
    } finally {
      setIsImporting(false);
    }
  };

  // HANDLER: Connect AniList OAuth
  const handleConnectOAuth = () => {
    const authUrl = getAniListAuthUrl();
    window.location.href = authUrl;
  };

  // HANDLER: Save Manual OAuth Token
  const handleSaveManualToken = async () => {
    const token = manualToken.trim();
    if (!token) {
      onShowToast('error', 'Please enter an OAuth Access Token.', 'Token Missing');
      return;
    }

    setIsValidatingToken(true);
    try {
      const user = await fetchAuthenticatedViewer(token);
      if (!user) {
        throw new Error('Invalid token or AniList server error.');
      }

      onSaveSettings({
        ...settings,
        anilistToken: token,
        anilistUser: user,
        twoWaySyncEnabled: true,
        lastSyncTimestamp: Date.now(),
      });

      setManualToken('');
      onShowToast(
        'sync',
        `Connected to AniList account "${user.name}". Two-way cloud sync is now active!`,
        'Account Connected'
      );
    } catch (err: any) {
      console.error('Token validation error:', err);
      onShowToast('error', err.message || 'Could not authenticate with this token.', 'Auth Error');
    } finally {
      setIsValidatingToken(false);
    }
  };

  // HANDLER: Disconnect AniList
  const handleDisconnect = () => {
    onSaveSettings({
      ...settings,
      anilistToken: null,
      anilistUser: null,
      twoWaySyncEnabled: false,
    });
    onShowToast('info', 'Disconnected from AniList account.', 'Logged Out');
  };

  // HANDLER: Request Browser Notification Permission
  const handleRequestPushPermission = async () => {
    if (!('Notification' in window)) {
      onShowToast('error', 'Browser notifications are not supported in this browser.', 'Not Supported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        onSaveSettings({
          ...settings,
          browserPushEnabled: true,
          notificationsEnabled: true,
        });
        onShowToast('success', 'Browser push notifications enabled successfully!', 'Permission Granted');
      } else {
        onSaveSettings({
          ...settings,
          browserPushEnabled: false,
        });
        onShowToast('info', 'Notification permission was denied in browser settings.', 'Denied');
      }
    } catch (e) {
      console.error('Push error:', e);
    }
  };

  const isConnected = Boolean(settings.anilistToken && settings.anilistUser);

  return (
    <div id="settings-page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30 mb-2">
            <Settings className="w-3.5 h-3.5" />
            <span>Preferences & Integration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Settings & Account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your AniList cloud synchronization, notification alerts, playback preferences, and data backups.
          </p>
        </div>

        {/* Quick Connection Status Badge */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AniList Connected ({settings.anilistUser?.name})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              <span>AniList Offline (Local Mode)</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Sidebar Tabs Navigation + Content Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Category Navigation (Tabs) */}
        <div className="lg:col-span-4 space-y-2">
          <div className="bg-[#121626] border border-slate-800/80 rounded-2xl p-2 shadow-xl space-y-1">
            <button
              onClick={() => setActiveSection('anilist')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition text-left ${
                activeSection === 'anilist'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${activeSection === 'anilist' ? 'text-white' : 'text-indigo-400'}`} />
              <div className="flex-1">
                <div>AniList Integration</div>
                <div className="text-[10px] font-normal opacity-80">Two-way sync & playlist import</div>
              </div>
              {isConnected && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
            </button>

            <button
              onClick={() => setActiveSection('notifications')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition text-left ${
                activeSection === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Bell className={`w-4 h-4 ${activeSection === 'notifications' ? 'text-white' : 'text-amber-400'}`} />
              <div className="flex-1">
                <div>Notifications & Alerts</div>
                <div className="text-[10px] font-normal opacity-80">Airing reminders & push alerts</div>
              </div>
              {settings.notificationsEnabled && <span className="w-2 h-2 rounded-full bg-amber-400" />}
            </button>

            <button
              onClick={() => setActiveSection('player')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition text-left ${
                activeSection === 'player'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Play className={`w-4 h-4 ${activeSection === 'player' ? 'text-white' : 'text-emerald-400'}`} />
              <div className="flex-1">
                <div>Player & Streaming</div>
                <div className="text-[10px] font-normal opacity-80">Sub/Dub audio & autoplay</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('backup')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition text-left ${
                activeSection === 'backup'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className={`w-4 h-4 ${activeSection === 'backup' ? 'text-white' : 'text-cyan-400'}`} />
              <div className="flex-1">
                <div>Data, Backup & Cache</div>
                <div className="text-[10px] font-normal opacity-80">Export JSON & storage tools</div>
              </div>
            </button>

            <button
              onClick={() => setActiveSection('about')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm transition text-left ${
                activeSection === 'about'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Info className={`w-4 h-4 ${activeSection === 'about' ? 'text-white' : 'text-purple-400'}`} />
              <div className="flex-1">
                <div>About & System Info</div>
                <div className="text-[10px] font-normal opacity-80">Version 2.4.0 & API status</div>
              </div>
            </button>
          </div>

          {/* Quick Library Stats Box */}
          <div className="bg-[#121626] border border-slate-800/80 rounded-2xl p-4 shadow-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Local Library Status
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-lg font-black text-indigo-400">{libraryCount}</div>
                <div className="text-[10px] text-slate-400">Tracked Anime</div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                <div className="text-lg font-black text-emerald-400">
                  {isConnected ? 'Active' : 'Offline'}
                </div>
                <div className="text-[10px] text-slate-400">Cloud Sync</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section Content */}
        <div className="lg:col-span-8 bg-[#121626] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* SECTION 1: ANILIST INTEGRATION */}
          {activeSection === 'anilist' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-indigo-400" />
                  <span>AniList Synchronization</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Sync watch progress, episode milestones, and status bidirectionally with your official AniList profile.
                </p>
              </div>

              {/* Connected Account Card if logged in */}
              {isConnected ? (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-500/40 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3.5">
                      {settings.anilistUser?.avatar?.large ? (
                        <img
                          src={settings.anilistUser.avatar.large}
                          alt={settings.anilistUser.name}
                          className="w-12 h-12 rounded-xl object-cover ring-2 ring-indigo-500 shadow-md"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-lg text-white">
                          {settings.anilistUser?.name?.charAt(0) || 'U'}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base text-white">
                            {settings.anilistUser?.name}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            Connected
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {settings.anilistUser?.statistics?.anime?.count ?? 0} Anime in profile • Mean score:{' '}
                          {settings.anilistUser?.statistics?.anime?.meanScore ?? 'N/A'}%
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-950/60 hover:bg-red-900/80 border border-red-500/40 text-red-300 font-semibold text-xs transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Disconnect</span>
                    </button>
                  </div>

                  {/* Sync Settings Switches */}
                  <div className="pt-4 border-t border-indigo-500/20 space-y-3">
                    <h5 className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Two-Way Sync Rules
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/30 border border-indigo-500/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.syncEpisodeProgress}
                          onChange={e => onSaveSettings({ ...settings, syncEpisodeProgress: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs text-slate-300 font-medium">Episode Progress</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/30 border border-indigo-500/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.syncWatchStatus}
                          onChange={e => onSaveSettings({ ...settings, syncWatchStatus: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs text-slate-300 font-medium">Watch Status</span>
                      </label>

                      <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-black/30 border border-indigo-500/20 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.syncScores}
                          onChange={e => onSaveSettings({ ...settings, syncScores: e.target.checked })}
                          className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                        />
                        <span className="text-xs text-slate-300 font-medium">User Ratings</span>
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                /* Connect Options */
                <div className="space-y-6">
                  {/* OAuth Button */}
                  <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-base flex items-center gap-2">
                        <span>One-Click AniList OAuth Login</span>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </h4>
                      <p className="text-xs text-slate-400">
                        Authorize AniLili to read and update your anime watch lists in real time.
                      </p>
                    </div>
                    <button
                      onClick={handleConnectOAuth}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition shrink-0"
                    >
                      <span>Authorize with AniList</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Manual OAuth Token Alternative */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
                    <h4 className="font-bold text-slate-200 text-sm">
                      Manual Token Authorization (Alternative)
                    </h4>
                    <p className="text-xs text-slate-400">
                      If popups are restricted in your browser, generate a Personal Access Token on AniList and paste it below:
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <input
                        type="password"
                        placeholder="Paste AniList Bearer Access Token..."
                        value={manualToken}
                        onChange={e => setManualToken(e.target.value)}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b0e1b] border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                      />
                      <button
                        onClick={handleSaveManualToken}
                        disabled={isValidatingToken || !manualToken.trim()}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs transition shrink-0"
                      >
                        {isValidatingToken ? 'Verifying...' : 'Connect Token'}
                      </button>
                    </div>
                  </div>

                  {/* Public Playlist Import (No login required) */}
                  <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">
                        Import Public Playlist (No Login Required)
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Download a snapshot copy of any public AniList username's anime list into your local library.
                      </p>
                    </div>

                    <form onSubmit={handleImportPlaylist} className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <input
                          type="text"
                          placeholder="e.g. your_anilist_username"
                          value={importUsername}
                          onChange={e => setImportUsername(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b0e1b] border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isImporting || !importUsername.trim()}
                          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shrink-0 flex items-center justify-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isImporting ? 'Importing...' : 'Import List'}</span>
                        </button>
                      </div>

                      {/* Filter checkboxes */}
                      <div className="flex items-center gap-3 flex-wrap pt-1 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">Import:</span>
                        {(['CURRENT', 'PLANNING', 'COMPLETED', 'PAUSED', 'DROPPED'] as const).map(type => (
                          <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedImportTypes[type]}
                              onChange={e => setSelectedImportTypes(prev => ({ ...prev, [type]: e.target.checked }))}
                              className="w-3.5 h-3.5 text-indigo-600 rounded bg-slate-900 border-slate-700"
                            />
                            <span className="capitalize">{String(type).toLowerCase()}</span>
                          </label>
                        ))}
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: NOTIFICATIONS & ALERTS */}
          {activeSection === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <span>Notification Center & Alerts</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Configure broadcast schedule notifications, airing alerts for your watchlist, and push notifications.
                </p>
              </div>

              {/* Master Notification Switch */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-slate-200 text-sm">
                    In-App Notification System
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Enable notification badges, airing alerts, and toast banners.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.notificationsEnabled}
                    onChange={e => onSaveSettings({ ...settings, notificationsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>

              {/* Specific Notification Preferences */}
              <div className={`space-y-3 transition-opacity ${settings.notificationsEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-200">
                      Watchlist Airing Episode Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Notify me when a new episode of an anime in my library broadcasts.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifyAiringEpisodes}
                    onChange={e => onSaveSettings({ ...settings, notifyAiringEpisodes: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-200">
                      AniList Two-Way Sync Alerts
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Show in-app toasts when progress or status updates sync to AniList.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.notifySyncUpdates}
                    onChange={e => onSaveSettings({ ...settings, notifySyncUpdates: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                  />
                </div>

                <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-slate-200">
                      Native Browser Push Notifications
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Receive desktop or mobile notifications even when the tab is backgrounded.
                    </div>
                  </div>
                  <button
                    onClick={handleRequestPushPermission}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      settings.browserPushEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {settings.browserPushEnabled ? 'Enabled' : 'Request Permission'}
                  </button>
                </div>
              </div>

              {/* Test Notification Button */}
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-indigo-200">
                    Test Notification Dispatch
                  </h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Trigger a sample airing alert to test notification popup banners and browser permissions.
                  </p>
                </div>
                <button
                  onClick={onSendTestNotification}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition shrink-0 shadow-md shadow-indigo-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Alert</span>
                </button>
              </div>
            </div>
          )}

          {/* SECTION 3: PLAYER & STREAMING PREFERENCES */}
          {activeSection === 'player' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Play className="w-5 h-5 text-emerald-400" />
                  <span>Player & Streaming Preferences</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Customize your default audio language, video player options, and server configurations.
                </p>
              </div>

              {/* Preferred Audio Language Ranking (1st and 2nd Priority) */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-indigo-400" />
                      <span>Preferred Audio Language (Priority Order)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Configure your #1 and #2 preferred audio playback formats (Sub vs Dub).
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-[11px] font-bold text-indigo-300">
                    Auto-Synced with Player
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Priority 1 */}
                  <div className="p-3.5 rounded-xl bg-[#0b0e1b] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="text-amber-400">1st Preference (Primary):</span>
                      <span className="px-2 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-[10px] text-amber-300 font-black">Rank 1</span>
                    </div>
                    <select
                      value={settings.preferredLanguages?.[0] || 'sub'}
                      onChange={e => {
                        const first = e.target.value as 'sub' | 'dub';
                        const second = first === 'sub' ? 'dub' : 'sub';
                        onSaveSettings({
                          ...settings,
                          preferredAudio: first,
                          preferredLanguages: [first, second],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="sub">Japanese Audio with English Subtitles (SUB)</option>
                      <option value="dub">English Voice Dubbing (DUB)</option>
                    </select>
                  </div>

                  {/* Priority 2 */}
                  <div className="p-3.5 rounded-xl bg-[#0b0e1b] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="text-indigo-400">2nd Preference (Fallback):</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-950/70 border border-indigo-500/40 text-[10px] text-indigo-300 font-black">Rank 2</span>
                    </div>
                    <select
                      value={settings.preferredLanguages?.[1] || (settings.preferredLanguages?.[0] === 'dub' ? 'sub' : 'dub')}
                      onChange={e => {
                        const second = e.target.value as 'sub' | 'dub';
                        const first = settings.preferredLanguages?.[0] || 'sub';
                        onSaveSettings({
                          ...settings,
                          preferredLanguages: [first, second],
                        });
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="sub">Japanese Audio with English Subtitles (SUB)</option>
                      <option value="dub">English Voice Dubbing (DUB)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preferred Streaming Server Ranking (Priority 1, 2, 3) */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-orange-400" />
                      <span>Preferred Streaming Server Order (1 / 2 / 3)</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select up to 3 streaming servers in order of priority. If server 1 is unavailable, player falls back seamlessly.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-500/30 text-[11px] font-bold text-orange-300">
                    Scraping Compatible
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Server Rank 1 */}
                  <div className="p-3.5 rounded-xl bg-[#0b0e1b] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-emerald-400">1st Priority Server:</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-[10px] text-emerald-300 font-black">#1</span>
                    </div>
                    <select
                      value={settings.preferredServers?.[0] || DEFAULT_PREFERRED_STREAM_SERVER_IDS[0]}
                      onChange={e => {
                        if (isStreamServerId(e.target.value)) updatePreferredServer(0, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {STREAM_PROVIDERS.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {getProviderOptionLabel(provider, 0)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Server Rank 2 */}
                  <div className="p-3.5 rounded-xl bg-[#0b0e1b] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-400">2nd Priority Server:</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-500/40 text-[10px] text-amber-300 font-black">#2</span>
                    </div>
                    <select
                      value={settings.preferredServers?.[1] || DEFAULT_PREFERRED_STREAM_SERVER_IDS[1]}
                      onChange={e => {
                        if (isStreamServerId(e.target.value)) updatePreferredServer(1, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {STREAM_PROVIDERS.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {getProviderOptionLabel(provider, 1)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Server Rank 3 */}
                  <div className="p-3.5 rounded-xl bg-[#0b0e1b] border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-indigo-400">3rd Priority Server:</span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/40 text-[10px] text-indigo-300 font-black">#3</span>
                    </div>
                    <select
                      value={settings.preferredServers?.[2] || DEFAULT_PREFERRED_STREAM_SERVER_IDS[2]}
                      onChange={e => {
                        if (isStreamServerId(e.target.value)) updatePreferredServer(2, e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {STREAM_PROVIDERS.map(provider => (
                        <option key={provider.id} value={provider.id}>
                          {getProviderOptionLabel(provider, 2)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Autoplay Next Episode */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-200">
                    Auto-Play Next Episode
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Automatically advance and track the next episode when playback completes.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.autoPlayNextEpisode}
                  onChange={e => onSaveSettings({ ...settings, autoPlayNextEpisode: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700"
                />
              </div>

              {/* Stream Server Selection */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">
                  Default Video Mirror Server
                </h4>
                <select
                  value={settings.defaultStreamServer || 'auto'}
                  onChange={e => onSaveSettings({ ...settings, defaultStreamServer: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0b0e1b] border border-slate-800 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="auto">Auto Select (Fastest Available HD Source)</option>
                  {STREAM_PROVIDERS.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.description ? `${provider.label} (${provider.description})` : provider.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* SECTION 4: DATA, BACKUP & CACHE */}
          {activeSection === 'backup' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Database className="w-5 h-5 text-cyan-400" />
                  <span>Data, Backups & Local Cache</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Export your watch history, import backups across devices, or manage local browser storage.
                </p>
              </div>

              {/* Export / Import Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Export Library Backup</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Download a complete `.json` file containing your tracked anime, episode progress, and custom status.
                    </p>
                  </div>
                  <button
                    onClick={onExportBackup}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition flex items-center justify-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON Backup</span>
                  </button>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                      <Upload className="w-4 h-4 text-indigo-400" />
                      <span>Restore Library Backup</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Load and merge an existing `.json` library backup file from your device.
                    </p>
                  </div>
                  <label className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Select Backup File</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={onImportBackup}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: ABOUT */}
          {activeSection === 'about' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Info className="w-5 h-5 text-purple-400" />
                  <span>About AniLove PRO</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  High-performance Anime Tracker & Streaming Platform powered by AniList GraphQL.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 text-xs text-slate-300 leading-relaxed">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-semibold text-slate-400">Application Version</span>
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    v2.4.0 (Latest Release)
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-semibold text-slate-400">AniList GraphQL API</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Operational
                  </span>
                </div>

                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="font-semibold text-slate-400">Streaming Engine</span>
                  <span className="text-indigo-300 font-medium">Multi-Source HD Mirrors</span>
                </div>

                <p className="text-[11px] text-slate-500 pt-2">
                  Disclaimer: AniLove does not host or store any media files on its servers. All content is retrieved from third-party streaming services and official AniList metadata feeds.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
