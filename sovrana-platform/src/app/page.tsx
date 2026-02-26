'use client';

import {
  Bot, TrendingUp, DollarSign, Briefcase, Signal,
  ShoppingCart, Receipt, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';
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
  { name: 'Running', value: mockAgents.filter((a) => a.status === 'running').length, color: '#22c55e' },
  { name: 'Idle', value: mockAgents.filter((a) => a.status === 'idle').length, color: '#3b82f6' },
  { name: 'Errored', value: mockAgents.filter((a) => a.status === 'errored').length, color: '#ef4444' },
  { name: 'Stopped', value: mockAgents.filter((a) => a.status === 'stopped').length, color: '#eab308' },
].filter((d) => d.value > 0);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-3 shadow-xl">
        <p className="text-xs text-gray-400 mb-1">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <p key={idx} className="text-sm font-medium" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number' ? formatUSD(entry.value) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const stats = mockDashboardStats;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Real-time overview of all trading agent operations</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Agents"
          value={`${stats.active_agents} / ${stats.total_agents}`}
          subtitle="Currently running"
          icon={Bot}
          trend={{ value: 12, label: 'vs last week' }}
          color="blue"
        />
        <StatsCard
          title="Total PnL"
          value={formatUSD(stats.total_pnl)}
          subtitle="Across all agents"
          icon={TrendingUp}
          trend={{ value: 8.5, label: 'vs yesterday' }}
          color="green"
        />
        <StatsCard
          title="Total Volume"
          value={formatUSD(stats.total_volume)}
          subtitle="24h trading volume"
          icon={DollarSign}
          trend={{ value: -3.2, label: 'vs yesterday' }}
          color="purple"
        />
        <StatsCard
          title="Open Positions"
          value={stats.open_positions}
          subtitle={`${stats.pending_signals} pending signals`}
          icon={Briefcase}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PnL Chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">PnL Performance</h3>
              <p className="text-xs text-gray-500 mt-0.5">Alpha Sentinel - Last 7 days</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-gray-400">Realized</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <span className="text-gray-400">Total</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={pnlChartData}>
              <defs>
                <linearGradient id="colorRealized" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="realized" stroke="#3b82f6" fill="url(#colorRealized)" strokeWidth={2} name="Realized" />
              <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#colorTotal)" strokeWidth={2} name="Total" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Agent Status Pie */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Agent Status Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={agentStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {agentStatusData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#1a1f2e] border border-[#2d3748] rounded-lg p-2 shadow-xl">
                        <p className="text-sm text-gray-200">{payload[0].name}: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {agentStatusData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-400">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-white">Trading Volume</h3>
            <p className="text-xs text-gray-500 mt-0.5">Alpha Sentinel - Daily volume and trade count</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={volumeChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
            <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
            <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="volume" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Volume" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Row: Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Signals */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Signals</h3>
          <div className="space-y-3">
            {mockSignals.slice(0, 5).map((signal) => (
              <div key={signal.id} className="flex items-center justify-between py-2 border-b border-[#2d3748]/50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={signal.side} />
                  <div>
                    <p className="text-sm text-gray-200">{signal.agent_name}</p>
                    <p className="text-xs text-gray-500">{signal.condition_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-200">{formatUSD(signal.size_usdc)}</p>
                  <StatusBadge status={signal.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Positions */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Open Positions</h3>
          <div className="space-y-3">
            {mockPositions.filter((p) => p.is_open).map((pos) => (
              <div key={pos.id} className="flex items-center justify-between py-2 border-b border-[#2d3748]/50 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusBadge status={pos.side} />
                  <div>
                    <p className="text-sm text-gray-200">{pos.agent_name}</p>
                    <p className="text-xs text-gray-500">{pos.condition_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-200">{formatUSD(pos.size_usdc)}</p>
                  <p className={`text-xs font-medium ${getPnlColor(pos.unrealized_pnl || 0)}`}>
                    {(pos.unrealized_pnl || 0) >= 0 ? '+' : ''}{formatUSD(pos.unrealized_pnl || 0)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
