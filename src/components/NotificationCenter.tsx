import React, { useState, useRef, useEffect } from 'react';
import {
  Bell, CheckCheck, Trash2, Clock, Play, RefreshCw,
  Sparkles, ExternalLink, Settings, X, Film
} from 'lucide-react';
import { AppNotification, Anime } from '../types';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onOpenDetails: (anime: Anime) => void;
  onPlayStream: (anime: Anime) => void;
  onNavigateToSettings: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onOpenDetails,
  onPlayStream,
  onNavigateToSettings,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'AIRING' | 'SYNC'>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredNotifications = notifications.filter(item => {
    if (filter === 'AIRING') return item.type === 'airing';
    if (filter === 'SYNC') return item.type === 'sync';
    return true;
  });

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="notification-center-trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition shadow-sm"
        title="Notification Center"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-black text-black ring-2 ring-[#090b14] animate-bounce">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          id="notification-dropdown-panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#121626] border border-slate-700/80 shadow-2xl z-50 overflow-hidden flex flex-col max-h-[500px] animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100">
                  Notifications
                </h4>
                <p className="text-[10px] text-slate-400">
                  {unreadCount} unread {unreadCount === 1 ? 'alert' : 'alerts'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllAsRead}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-indigo-400 text-xs transition"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={onClearAll}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 text-xs transition"
                  title="Clear all notifications"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-[#0d101d] border-b border-slate-800/80">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filter === 'ALL'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('AIRING')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filter === 'AIRING'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Airing
            </button>
            <button
              onClick={() => setFilter('SYNC')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                filter === 'SYNC'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Sync
            </button>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-300">
                  No notifications yet
                </p>
                <p className="text-[11px] text-slate-500 max-w-[200px] mx-auto">
                  Airing broadcast alerts and AniList sync logs will appear here.
                </p>
              </div>
            ) : (
              filteredNotifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!item.read) onMarkAsRead(item.id);
                    if (item.anime) {
                      setIsOpen(false);
                      onOpenDetails(item.anime);
                    }
                  }}
                  className={`p-3 transition cursor-pointer flex gap-3 items-start ${
                    item.read
                      ? 'bg-transparent hover:bg-slate-800/40 text-slate-400'
                      : 'bg-indigo-950/20 hover:bg-indigo-950/40 text-slate-200'
                  }`}
                >
                  {/* Icon or Anime Thumbnail */}
                  {item.anime?.coverImage?.medium ? (
                    <img
                      src={item.anime.coverImage.medium}
                      alt={item.title}
                      className="w-10 h-14 rounded-lg object-cover bg-slate-800 shrink-0 ring-1 ring-slate-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
                      {item.type === 'sync' ? <RefreshCw className="w-4 h-4" /> : <Film className="w-4 h-4" />}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <h5 className="font-bold text-xs truncate text-slate-100">
                        {item.title}
                      </h5>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Action buttons if anime is attached */}
                    {item.anime && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            if (!item.read) onMarkAsRead(item.id);
                            setIsOpen(false);
                            onPlayStream(item.anime!);
                          }}
                          className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold"
                        >
                          <Play className="w-3 h-3 fill-emerald-400" />
                          <span>Watch Stream</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {!item.read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer with Settings Link */}
          <div className="p-2.5 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-[11px]">
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateToSettings();
              }}
              className="flex items-center gap-1.5 text-slate-400 hover:text-indigo-400 transition"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Notification Settings</span>
            </button>
            <span className="text-slate-500 text-[10px]">AniLili Broadcasts</span>
          </div>
        </div>
      )}
    </div>
  );
};
