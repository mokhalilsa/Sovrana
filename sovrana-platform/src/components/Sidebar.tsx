'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Bot, Signal, ShoppingCart, Receipt,
  Briefcase, TrendingUp, Globe, ScrollText,
  ChevronLeft, ChevronRight, Wifi, ArrowUpDown, Wallet,
  Zap,
} from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/signals', label: 'Signals', icon: Signal },
  { href: '/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/fills', label: 'Fills', icon: Receipt },
  { href: '/positions', label: 'Positions', icon: Briefcase },
  { href: '/pnl', label: 'PnL', icon: TrendingUp },
  { href: '/markets', label: 'Markets', icon: Globe },
  { href: '/audit-log', label: 'Audit Log', icon: ScrollText },
];

const liveItems = [
  { href: '/live-markets', label: 'Live Markets', icon: Wifi },
  { href: '/live-positions', label: 'Live Positions', icon: Wallet },
  { href: '/live-trades', label: 'Live Trades', icon: ArrowUpDown },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-[#0c1020]/95 backdrop-blur-2xl border-r border-slate-800/50 flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[72px]' : 'w-[260px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[72px] border-b border-slate-800/50">
        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
          <Zap className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <h1 className="text-lg font-extrabold text-white tracking-tight">Sovrana</h1>
            <p className="text-[10px] text-slate-600 font-medium -mt-0.5 tracking-wide">POLYMARKET AGENT PLATFORM</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        {!collapsed && <p className="section-title px-3 mb-3">Operations</p>}
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${isActive ? 'nav-link-active' : 'nav-link'} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Live Data Divider */}
        <div className="pt-5 pb-3">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-3">
              <div className="h-px flex-1 bg-slate-800/60" />
              <span className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.15em]">Live API</span>
              <div className="h-px flex-1 bg-slate-800/60" />
            </div>
          ) : (
            <div className="h-px bg-slate-800/60 mx-3" />
          )}
        </div>

        {liveItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${isActive ? 'nav-link-active' : 'nav-link'} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-3 border-t border-slate-800/50">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/40 transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>

      {/* Status */}
      {!collapsed && (
        <div className="px-5 py-4 border-t border-slate-800/50">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[11px] text-slate-600 font-medium">System Operational</span>
          </div>
        </div>
      )}
    </aside>
  );
}
