'use client';

import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan';
  sparkline?: number[];
}

const colorConfig = {
  blue: {
    icon: 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
    glow: 'group-hover:shadow-glow',
    gradient: 'from-blue-500/5 to-transparent',
    bar: 'bg-blue-500',
  },
  green: {
    icon: 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20',
    glow: 'group-hover:shadow-glow-green',
    gradient: 'from-emerald-500/5 to-transparent',
    bar: 'bg-emerald-500',
  },
  red: {
    icon: 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
    glow: 'group-hover:shadow-glow-red',
    gradient: 'from-red-500/5 to-transparent',
    bar: 'bg-red-500',
  },
  yellow: {
    icon: 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20',
    glow: 'group-hover:shadow-glow',
    gradient: 'from-amber-500/5 to-transparent',
    bar: 'bg-amber-500',
  },
  purple: {
    icon: 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
    glow: 'group-hover:shadow-glow-purple',
    gradient: 'from-purple-500/5 to-transparent',
    bar: 'bg-purple-500',
  },
  cyan: {
    icon: 'bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20',
    glow: 'group-hover:shadow-glow',
    gradient: 'from-cyan-500/5 to-transparent',
    bar: 'bg-cyan-500',
  },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', sparkline }: StatsCardProps) {
  const cfg = colorConfig[color];

  return (
    <div className={`card-hover group p-6 relative overflow-hidden`}>
      {/* Gradient accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-radial ${cfg.gradient} opacity-60 -translate-y-8 translate-x-8`} />

      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="section-title mb-3">{title}</p>
          <p className="stat-value text-white">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-500 mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-3">
              {trend.value >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              )}
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[11px] text-slate-600">{trend.label}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-2xl ${cfg.icon} transition-all duration-300 group-hover:scale-110`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Mini sparkline */}
      {sparkline && sparkline.length > 0 && (
        <div className="flex items-end gap-[2px] mt-4 h-8">
          {sparkline.map((v, i) => {
            const max = Math.max(...sparkline);
            const h = max > 0 ? (v / max) * 100 : 0;
            return (
              <div
                key={i}
                className={`flex-1 rounded-sm ${cfg.bar} opacity-40 group-hover:opacity-70 transition-opacity duration-300`}
                style={{ height: `${Math.max(h, 4)}%` }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
