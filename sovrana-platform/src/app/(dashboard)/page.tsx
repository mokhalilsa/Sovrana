'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot, TrendingUp, DollarSign, Briefcase, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Clock, AlertTriangle,
  RefreshCw, ExternalLink, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';
import { useToast } from '@/components/Toast';
import { mockDashboardStats, mockPnlSnapshots, mockAgents, mockSignals, mockPositions } from '@/lib/mock-data';
import { formatUSD, getPnlColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

const pnlChartData = mockPnlSnapshots
  .filter((s) => s.agent_name === 'Alpha Sentinel')
  .map((s) => ({
    date: format(parseISO(s.snapshot_date), 'MMM dd'),
    realized: s.realized_pnl,
    unrealized: s.unrealized_pnl,
    total: s.total_pnl,
  }));

const volumeChartData = mockPnlSnapshots
  .filter((s) => s.agent_name === 'Alpha Sentinel')
  .map((s) => ({
    date: format(parseISO(s.snapshot_date), 'MMM dd'),
    volume: s.total_volume,
    trades: s.trade_count,
  }));

const agentStatusData = [
  { name: 'Running', value: mockAgents.filter((a) => a.status === 'running').length, color: '#10b981' },
  { name: 'Idle', value: mockAgents.filter((a) => a.status === 'idle').length, color: '#3b82f6' },
  { name: 'Errored', value: mockAgents.filter((a) => a.status === 'errored').length, color: '#ef4444' },
  { name: 'Stopped', value: mockAgents.filter((a) => a.status === 'stopped').length, color: '#f59e0b' },
].filter((d) => d.value > 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg">
        <p className="text-[11px] text-slate-500 font-medium mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm font-semibold text-slate-700">
              {entry.name}: {typeof entry.value === 'number' ? formatUSD(entry.value) : entry.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const stats = mockDashboardStats;
  const { addToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [volumeRange, setVolumeRange] = useState<'7D' | '30D' | 'ALL'>('7D');

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
      addToast('success', 'Dashboard Refreshed', 'All data has been updated to the latest.');
    }, 1200);
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Operations Dashboard</h1>
            <span className="badge-success text-[10px]">
              <span className="relative flex h-1.5 w-1.5 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
              </span>
              LIVE
            </span>
          </div>
          <p className="text-sm text-slate-500">Real-time overview of all trading agent operations</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2 py-2 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono">{format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <Link href="/agents">
          <StatsCard
            title="Active Agents"
            value={`${stats.active_agents} / ${stats.total_agents}`}
            subtitle="Currently running"
            icon={Bot}
            trend={{ value: 12, label: 'vs last week' }}
            color="blue"
            sparkline={[3, 4, 3, 5, 4, 6, 5]}
          />
        </Link>
        <Link href="/pnl">
          <StatsCard
            title="Total PnL"
            value={formatUSD(stats.total_pnl)}
            subtitle="Across all agents"
            icon={TrendingUp}
            trend={{ value: 8.5, label: 'vs yesterday' }}
            color="green"
            sparkline={[120, 180, 150, 220, 280, 310, 350]}
          />
        </Link>
        <Link href="/live-trades">
          <StatsCard
            title="Total Volume"
            value={formatUSD(stats.total_volume)}
            subtitle="24h trading volume"
            icon={DollarSign}
            trend={{ value: -3.2, label: 'vs yesterday' }}
            color="purple"
            sparkline={[500, 420, 480, 390, 410, 350, 380]}
          />
        </Link>
        <Link href="/positions">
          <StatsCard
            title="Open Positions"
            value={stats.open_positions}
            subtitle={`${stats.pending_signals} pending signals`}
            icon={Briefcase}
            color="cyan"
            sparkline={[8, 10, 9, 12, 11, 14, 12]}
          />
        </Link>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PnL Chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-800">PnL Performance</h3>
              <p className="text-xs text-slate-500 mt-1">Alpha Sentinel — Last 7 days</p>
            </div>
            <div className="flex items-center gap-5 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-blue-500" />
                <span className="text-slate-500 font-medium">Realized</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-1 rounded-full bg-emerald-500" />
                <span className="text-slate-500 font-medium">Total</span>
              </div>
              <Link href="/pnl" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                Details <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={pnlChartData}>
              <defs>
                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="realized" stroke="#3b82f6" fill="url(#colorRealized)" strokeWidth={2.5} name="Realized" dot={false} />
              <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#colorTotal)" strokeWidth={2.5} name="Total" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Pie */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-800">Agent Status</h3>
            <Link href="/agents" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={agentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={4}
                dataKey="value"
                strokeWidth={0}
              >
                {agentStatusData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-2xl">
                        <p className="text-sm font-semibold text-slate-700">{payload[0].name}: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="text-center -mt-[120px] mb-[70px]">
            <p className="text-2xl font-extrabold text-slate-800">{mockAgents.length}</p>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Total</p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            {agentStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-slate-400 font-medium">{entry.name}</span>
                <span className="text-xs text-slate-800 font-bold ml-auto">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Trading Volume</h3>
            <p className="text-xs text-slate-500 mt-1">Alpha Sentinel — Daily volume and trade count</p>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg p-0.5 border border-slate-200">
            {(['7D', '30D', 'ALL'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setVolumeRange(range);
                  addToast('info', `Range Updated`, `Showing ${range === 'ALL' ? 'all time' : `last ${range}`} data.`);
                }}
                className={`px-3 py-1.5 rounded-md text-[10px] font-bold transition-all ${
                  volumeRange === range
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={volumeChartData} barSize={32}>
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.15} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="url(#barGradient)" radius={[8, 8, 0, 0]} name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800">Recent Signals</h3>
            <Link href="/signals" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All ({mockSignals.length}) <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {mockSignals.slice(0, 5).map((signal) => (
              <Link
                key={signal.id}
                href="/signals"
                className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${signal.side === 'buy' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {signal.side === 'buy' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{signal.agent_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{signal.condition_id}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{formatUSD(signal.size_usdc)}</p>
                    <p className="text-[11px] text-slate-500 font-medium">{(signal.confidence * 100).toFixed(0)}% conf</p>
                  </div>
                  <StatusBadge status={signal.status} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-slate-800">Open Positions</h3>
            <Link href="/positions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View All ({mockPositions.filter(p => p.is_open).length}) <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-1">
            {mockPositions.filter((p) => p.is_open).map((pos) => (
              <Link
                key={pos.id}
                href="/positions"
                className="flex items-center justify-between py-3 px-3 rounded-xl hover:bg-slate-50 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${pos.side === 'buy' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    {pos.side === 'buy' ? (
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 group-hover:text-blue-600 transition-colors">{pos.agent_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{pos.condition_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">{formatUSD(pos.size_usdc)}</p>
                  <p className={`text-[11px] font-bold ${getPnlColor(pos.unrealized_pnl || 0)}`}>
                    {(pos.unrealized_pnl || 0) >= 0 ? '+' : ''}{formatUSD(pos.unrealized_pnl || 0)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
