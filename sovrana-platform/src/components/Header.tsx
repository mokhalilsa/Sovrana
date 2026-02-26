'use client';

import { Bell, Search, User, Settings, Command } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  return (
    <header className="h-[72px] bg-[#0c1020]/80 backdrop-blur-2xl border-b border-slate-800/50 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Search */}
      <div className={`relative w-[420px] transition-all duration-300 ${searchFocused ? 'w-[480px]' : ''}`}>
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input
          type="text"
          placeholder="Search agents, signals, orders..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="input-dark w-full pl-11 pr-20 py-2.5"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-slate-700/50 text-[10px] text-slate-500 font-mono">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Settings */}
        <button className="p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
          <Settings className="w-[18px] h-[18px]" />
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all duration-200">
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-[#0c1020]" />
        </button>

        {/* Divider */}
        <div className="w-px h-8 bg-slate-800/60 mx-2" />

        {/* User */}
        <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-800/40 transition-all duration-200 group">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/10 group-hover:shadow-blue-500/20 transition-shadow">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-slate-200">Operator</p>
            <p className="text-[11px] text-slate-600 font-medium">Admin</p>
          </div>
        </button>
      </div>
    </header>
  );
}
