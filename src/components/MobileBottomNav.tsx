import React from 'react';
import { Home, Sparkles, Calendar, Bookmark, Settings } from 'lucide-react';
import { UserSettings } from '../types';
import { TabType } from './Navbar';

interface MobileBottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  settings: UserSettings;
  libraryCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  settings,
  libraryCount,
}) => {
  const isTwoWayConnected = Boolean(settings.twoWaySyncEnabled && settings.anilistToken);

  return (
    <div
      id="mobile-bottom-navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#090b14]/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 py-1.5 flex items-center justify-around"
    >
      <button
        onClick={() => onSelectTab('home')}
        className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${
          currentTab === 'home'
            ? 'text-indigo-400 font-bold'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Home className="w-5 h-5" />
        <span className="text-[10px]">Home</span>
      </button>

      <button
        onClick={() => onSelectTab('discover')}
        className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl transition ${
          currentTab === 'discover'
            ? 'text-indigo-400 font-bold'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-[10px]">Discover</span>
      </button>

      <button
        onClick={() => onSelectTab('schedule')}
        className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl relative transition ${
          currentTab === 'schedule'
            ? 'text-indigo-400 font-bold'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px]">Schedule</span>
        <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
      </button>

      <button
        onClick={() => onSelectTab('library')}
        className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl relative transition ${
          currentTab === 'library'
            ? 'text-indigo-400 font-bold'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Bookmark className="w-5 h-5" />
        <span className="text-[10px]">Library</span>
        {libraryCount > 0 && (
          <span className="absolute top-1 right-1.5 px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold">
            {libraryCount}
          </span>
        )}
      </button>

      <button
        onClick={() => onSelectTab('settings')}
        className={`flex flex-col items-center gap-1 py-1.5 px-2.5 rounded-xl relative transition ${
          currentTab === 'settings'
            ? 'text-indigo-400 font-bold'
            : 'text-slate-500 hover:text-slate-300'
        }`}
      >
        <Settings className="w-5 h-5" />
        <span className="text-[10px]">Settings</span>
        {isTwoWayConnected && (
          <span className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-emerald-400" />
        )}
      </button>
    </div>
  );
};
