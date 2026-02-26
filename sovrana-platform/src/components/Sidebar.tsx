'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Bot, Signal, ShoppingCart, Receipt,
  Briefcase, TrendingUp, Globe, ScrollText, Settings,
  Shield, ChevronLeft, ChevronRight, Wifi, ArrowUpDown, Wallet,
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
      className={`fixed left-0 top-0 h-screen bg-[#1a1f2e] border-r border-[#2d3748] flex flex-col transition-all duration-300 z-50 ${
        collapsed ? 'w-[68px]' : 'w-[240px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-[#2d3748]">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Sovrana</h1>
            <p className="text-[10px] text-gray-500 -mt-0.5">Polymarket Agent Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'nav-link-active' : 'nav-link'}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}

        {/* Live Data Divider */}
        <div className="pt-4 pb-2">
          {!collapsed ? (
            <div className="flex items-center gap-2 px-3">
              <div className="h-px flex-1 bg-[#2d3748]" />
              <span className="text-[10px] text-gray-600 uppercase tracking-wider">Live API</span>
              <div className="h-px flex-1 bg-[#2d3748]" />
            </div>
          ) : (
            <div className="h-px bg-[#2d3748] mx-2" />
          )}
        </div>

        {liveItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'nav-link-active' : 'nav-link'}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="px-3 py-3 border-t border-[#2d3748]">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-gray-100 hover:bg-[#0f1117] transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          {!collapsed && <span className="text-xs">Collapse</span>}
        </button>
      </div>

      {/* Status */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-[#2d3748]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-gray-500">System Operational</span>
          </div>
        </div>
      )}
    </aside>
  );
}
