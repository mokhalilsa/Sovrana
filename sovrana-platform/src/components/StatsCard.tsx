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
    icon: 'bg-blue-50 text-blue-600 ring-1 ring-blue-100',
    bar: 'bg-blue-500',
  },
  green: {
    icon: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
    bar: 'bg-emerald-500',
  },
  red: {
    icon: 'bg-red-50 text-red-600 ring-1 ring-red-100',
    bar: 'bg-red-500',
  },
  yellow: {
    icon: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
    bar: 'bg-amber-500',
  },
  purple: {
    icon: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
    bar: 'bg-purple-500',
  },
  cyan: {
    icon: 'bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100',
    bar: 'bg-cyan-500',
  },
};

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, color = 'blue', sparkline }: StatsCardProps) {
  const cfg = colorConfig[color];

  return (
    <div className="card-hover group p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">{title}</p>
          <p className="text-2xl font-extrabold text-slate-800 tracking-tight">{value}</p>
          {subtitle && (
            <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 mt-3">
              {trend.value >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={`text-xs font-bold ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value}%
              </span>
              <span className="text-[11px] text-slate-400">{trend.label}</span>
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
                className={`flex-1 rounded-sm ${cfg.bar} transition-opacity duration-300`}
                style={{ height: `${Math.max(h, 4)}%`, opacity: 0.15 + (i / sparkline.length) * 0.85 }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
