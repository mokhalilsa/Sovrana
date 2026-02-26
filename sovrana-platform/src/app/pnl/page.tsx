'use client';

import { useState } from 'react';
import { TrendingUp, Filter, DollarSign, Activity, BarChart3 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import DataTable from '@/components/DataTable';
import { mockPnlSnapshots } from '@/lib/mock-data';
import { formatUSD, getPnlColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#111827] border border-slate-700/60 rounded-xl p-3.5 shadow-2xl backdrop-blur-xl">
        <p className="text-[11px] text-slate-500 font-medium mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm font-semibold text-slate-200">
              {entry.name}: {formatUSD(entry.value)}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PnlPage() {
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const agentNames = [...new Set(mockPnlSnapshots.map((s) => s.agent_name))];

  const filtered = mockPnlSnapshots.filter((s) => {
    if (filterAgent !== 'all' && s.agent_name !== filterAgent) return false;
    return true;
  });

  const dateMap = new Map<string, { realized: number; unrealized: number; total: number; volume: number; trades: number }>();
  filtered.forEach((s) => {
    const existing = dateMap.get(s.snapshot_date) || { realized: 0, unrealized: 0, total: 0, volume: 0, trades: 0 };
    dateMap.set(s.snapshot_date, {
      realized: existing.realized + s.realized_pnl,
      unrealized: existing.unrealized + s.unrealized_pnl,
      total: existing.total + s.total_pnl,
      volume: existing.volume + s.total_volume,
      trades: existing.trades + s.trade_count,
    });
  });

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date: format(parseISO(date), 'MMM dd'),
      ...data,
    }));

  let cumulative = 0;
  const cumulativeData = chartData.map((d) => {
    cumulative += d.total;
    return { ...d, cumulative };
  });

  const totalPnl = filtered.reduce((sum, s) => sum + s.total_pnl, 0);
  const totalRealized = filtered.reduce((sum, s) => sum + s.realized_pnl, 0);
  const totalVolume = filtered.reduce((sum, s) => sum + s.total_volume, 0);
  const totalTrades = filtered.reduce((sum, s) => sum + s.trade_count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Profit & Loss</h1>
        <p className="text-sm text-slate-500 mt-1">Performance analytics and PnL tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatsCard title="Total PnL" value={`${totalPnl >= 0 ? '+' : ''}${formatUSD(totalPnl)}`} icon={TrendingUp} color={totalPnl >= 0 ? 'green' : 'red'} trend={{ value: 8.5, label: 'vs last week' }} />
        <StatsCard title="Realized PnL" value={`${totalRealized >= 0 ? '+' : ''}${formatUSD(totalRealized)}`} icon={DollarSign} color="blue" />
        <StatsCard title="Total Volume" value={formatUSD(totalVolume)} icon={BarChart3} color="purple" />
        <StatsCard title="Total Trades" value={totalTrades.toString()} icon={Activity} color="cyan" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Agent</span>
        </div>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="input-dark text-sm">
          <option value="all">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily PnL */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Daily PnL Breakdown</h3>
              <p className="text-xs text-slate-600 mt-1">Realized vs Unrealized</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-blue-500" />
                <span className="text-slate-500 font-medium">Realized</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-medium">Unrealized</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} barSize={20}>
              <defs>
                <linearGradient id="barRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.3} />
                </linearGradient>
                <linearGradient id="barUnrealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="realized" fill="url(#barRealized)" radius={[6, 6, 0, 0]} name="Realized" />
              <Bar dataKey="unrealized" fill="url(#barUnrealized)" radius={[6, 6, 0, 0]} name="Unrealized" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative PnL */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-white">Cumulative PnL</h3>
              <p className="text-xs text-slate-600 mt-1">Running total over time</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="url(#colorCumulative)" strokeWidth={2.5} name="Cumulative PnL" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-white">Daily Volume</h3>
            <p className="text-xs text-slate-600 mt-1">Trading volume over time</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barSize={32}>
            <defs>
              <linearGradient id="barVolume" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="url(#barVolume)" radius={[8, 8, 0, 0]} name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Snapshots Table */}
      <div>
        <h3 className="text-sm font-bold text-white mb-4">PnL Snapshots</h3>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (s) => <span className="text-sm font-mono text-slate-300">{format(parseISO(s.snapshot_date), 'MMM dd, yyyy')}</span> },
            { key: 'agent', header: 'Agent', render: (s) => <span className="text-sm font-semibold text-slate-200">{s.agent_name}</span> },
            { key: 'realized', header: 'Realized', render: (s) => <span className={`font-mono text-sm font-bold ${getPnlColor(s.realized_pnl)}`}>{formatUSD(s.realized_pnl)}</span> },
            { key: 'unrealized', header: 'Unrealized', render: (s) => <span className={`font-mono text-sm font-bold ${getPnlColor(s.unrealized_pnl)}`}>{formatUSD(s.unrealized_pnl)}</span> },
            { key: 'total', header: 'Total PnL', render: (s) => <span className={`font-mono text-sm font-extrabold ${getPnlColor(s.total_pnl)}`}>{formatUSD(s.total_pnl)}</span> },
            { key: 'volume', header: 'Volume', render: (s) => <span className="font-mono text-sm text-slate-300">{formatUSD(s.total_volume)}</span> },
            { key: 'trades', header: 'Trades', render: (s) => <span className="text-sm font-semibold text-slate-300">{s.trade_count}</span> },
          ]}
          data={filtered}
          pageSize={10}
        />
      </div>
    </div>
  );
}
