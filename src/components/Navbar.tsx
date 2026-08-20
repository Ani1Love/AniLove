import React from 'react';
import { Home, Sparkles, Calendar, Bookmark, Settings, RefreshCw, Heart, Search } from 'lucide-react';
import { UserSettings, AppNotification, Anime } from '../types';
import { NotificationCenter } from './NotificationCenter';

export type TabType = 'home' | 'discover' | 'schedule' | 'library' | 'settings';

interface NavbarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  settings: UserSettings;
  libraryCount: number;
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  settings,
  libraryCount,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onOpenDetails,
  onPlayStream,
}) => {
  const isTwoWayConnected = Boolean(settings.twoWaySyncEnabled && settings.anilistToken);

  return (
    <header className="sticky top-0 z-40 bg-[#090b14]/90 backdrop-blur-xl border-b border-slate-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo - Heart Icon */}
        <div
          onClick={() => onSelectTab('home')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-pink-500/30 group-hover:scale-105 transition">
            <Heart className="w-5 h-5 text-white fill-white transition-transform group-hover:scale-110" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-lg text-white tracking-tight">AniLove</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                PRO
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium leading-none">
              Stream & Sync
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800">
          <button
            id="nav-tab-home"
            onClick={() => onSelectTab('home')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'home'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>

          <button
            id="nav-tab-discover"
            onClick={() => onSelectTab('discover')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'discover'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Discover</span>
          </button>

          <button
            id="nav-tab-schedule"
            onClick={() => onSelectTab('schedule')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'schedule'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Schedule</span>
          </button>

          <button
            id="nav-tab-library"
            onClick={() => onSelectTab('library')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'library'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span>My Library</span>
            {libraryCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                {libraryCount}
              </span>
            )}
          </button>

          <button
            id="nav-tab-settings"
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              currentTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
            {isTwoWayConnected && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            )}
          </button>
        </nav>

        {/* Right Section: Search Toggle + Sync Badge + Notification Bell */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Search Button (Opens Discover Tab) */}
          <button
            id="nav-search-toggle"
            onClick={() => onSelectTab('discover')}
            className={`flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border transition shadow-sm cursor-pointer ${
              currentTab === 'discover'
                ? 'bg-indigo-600 text-white border-indigo-400'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700'
            }`}
            title="Search Anime, Characters, Studios (Discover)"
          >
            <Search className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline text-xs font-semibold">Search</span>
          </button>

          {/* Cloud Sync State Chip */}
          <div
            onClick={() => onSelectTab('settings')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer text-xs transition"
            title={
              isTwoWayConnected
                ? `AniList 2-Way Sync Active (${settings.anilistUser?.name || 'Connected'})`
                : 'AniList Account Not Linked'
            }
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isTwoWayConnected ? 'text-emerald-400' : 'text-slate-500'
              }`}
            />
            <span
              className={`font-semibold ${
                isTwoWayConnected ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              {isTwoWayConnected ? '2-Way Synced' : 'Offline Mode'}
            </span>
          </div>

          {/* Real-time Notification Center Bell */}
          <NotificationCenter
            notifications={notifications}
            onMarkAsRead={onMarkAsRead}
            onMarkAllAsRead={onMarkAllAsRead}
            onClearAll={onClearAll}
            onOpenDetails={onOpenDetails}
            onPlayStream={onPlayStream}
          />
        </div>
      </div>
    </header>
  );
};
