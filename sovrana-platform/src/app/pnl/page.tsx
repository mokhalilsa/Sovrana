'use client';

import { useState } from 'react';
import { TrendingUp, Filter } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
} from 'recharts';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import { mockPnlSnapshots } from '@/lib/mock-data';
import { formatUSD, getPnlColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {formatUSD(entry.value)}
          </p>
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

  // Aggregate by date for chart
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

  // Cumulative PnL
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profit & Loss</h1>
          <p className="text-sm text-gray-500 mt-1">Performance analytics and PnL tracking</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Total PnL</p>
          <p className={`text-2xl font-bold ${getPnlColor(totalPnl)}`}>{formatUSD(totalPnl)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Realized PnL</p>
          <p className={`text-2xl font-bold ${getPnlColor(totalRealized)}`}>{formatUSD(totalRealized)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Total Volume</p>
          <p className="text-2xl font-bold text-white">{formatUSD(totalVolume)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Total Trades</p>
          <p className="text-2xl font-bold text-white">{totalTrades}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-500" />
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
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Daily PnL Breakdown</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="realized" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Realized" />
              <Bar dataKey="unrealized" fill="#22c55e" radius={[2, 2, 0, 0]} name="Unrealized" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cumulative PnL */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Cumulative PnL</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cumulativeData}>
              <defs>
                <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="cumulative" stroke="#8b5cf6" fill="url(#colorCumulative)" strokeWidth={2} name="Cumulative PnL" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Daily Volume & Trade Count</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Snapshots Table */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-4">PnL Snapshots</h3>
        <DataTable
          columns={[
            { key: 'date', header: 'Date', render: (s) => <span className="text-sm">{format(parseISO(s.snapshot_date), 'MMM dd, yyyy')}</span> },
            { key: 'agent', header: 'Agent', render: (s) => <span className="text-sm font-medium text-gray-200">{s.agent_name}</span> },
            { key: 'realized', header: 'Realized', render: (s) => <span className={`font-mono text-sm ${getPnlColor(s.realized_pnl)}`}>{formatUSD(s.realized_pnl)}</span> },
            { key: 'unrealized', header: 'Unrealized', render: (s) => <span className={`font-mono text-sm ${getPnlColor(s.unrealized_pnl)}`}>{formatUSD(s.unrealized_pnl)}</span> },
            { key: 'total', header: 'Total PnL', render: (s) => <span className={`font-mono text-sm font-medium ${getPnlColor(s.total_pnl)}`}>{formatUSD(s.total_pnl)}</span> },
            { key: 'volume', header: 'Volume', render: (s) => <span className="font-mono text-sm">{formatUSD(s.total_volume)}</span> },
            { key: 'trades', header: 'Trades', render: (s) => <span className="text-sm">{s.trade_count}</span> },
          ]}
          data={filtered}
          pageSize={10}
        />
      </div>
    </div>
  );
}
