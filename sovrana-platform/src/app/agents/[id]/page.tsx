'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Bot, Power, PowerOff, AlertTriangle,
  TrendingUp, DollarSign, Signal, ShoppingCart,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatusBadge from '@/components/StatusBadge';
import StatsCard from '@/components/StatsCard';
import DataTable from '@/components/DataTable';
import {
  mockAgents, mockRiskLimits, mockSignals, mockOrders,
  mockPositions, mockPnlSnapshots,
} from '@/lib/mock-data';
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

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params.id as string;

  const agent = mockAgents.find((a) => a.id === agentId);
  const risk = mockRiskLimits.find((r) => r.agent_id === agentId);
  const agentSignals = mockSignals.filter((s) => s.agent_id === agentId);
  const agentOrders = mockOrders.filter((o) => o.agent_id === agentId);
  const agentPositions = mockPositions.filter((p) => p.agent_id === agentId);
  const agentPnl = mockPnlSnapshots.filter((p) => p.agent_id === agentId);

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-lg text-gray-400">Agent not found</p>
          <Link href="/agents" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
            Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const pnlData = agentPnl.map((s) => ({
    date: format(parseISO(s.snapshot_date), 'MMM dd'),
    realized: s.realized_pnl,
    unrealized: s.unrealized_pnl,
    total: s.total_pnl,
  }));

  const totalRealized = agentPnl.reduce((sum, s) => sum + s.realized_pnl, 0);
  const totalVolume = agentPnl.reduce((sum, s) => sum + s.total_volume, 0);
  const totalTrades = agentPnl.reduce((sum, s) => sum + s.trade_count, 0);

  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Agent Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
              agent.status === 'running' ? 'bg-green-600/10' :
              agent.status === 'errored' ? 'bg-red-600/10' :
              'bg-gray-600/10'
            }`}>
              <Bot className={`w-7 h-7 ${
                agent.status === 'running' ? 'text-green-400' :
                agent.status === 'errored' ? 'text-red-400' :
                'text-gray-400'
              }`} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{agent.name}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{agent.description}</p>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={agent.status} />
                <StatusBadge status={agent.mode} />
                {agent.is_simulate && <span className="badge bg-purple-900 text-purple-300">Simulation</span>}
                {agent.kill_switch && <span className="badge bg-red-900 text-red-300">Kill Switch Active</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className={`btn-secondary flex items-center gap-2 text-sm ${agent.is_enabled ? '' : 'opacity-60'}`}>
              {agent.is_enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
              {agent.is_enabled ? 'Enabled' : 'Disabled'}
            </button>
            <button className="btn-danger flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Kill Switch
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Realized PnL" value={formatUSD(totalRealized)} icon={TrendingUp} color="green" />
        <StatsCard title="Total Volume" value={formatUSD(totalVolume)} icon={DollarSign} color="blue" />
        <StatsCard title="Total Trades" value={totalTrades} icon={ShoppingCart} color="purple" />
        <StatsCard title="Active Signals" value={agentSignals.filter((s) => s.status === 'pending' || s.status === 'approved').length} icon={Signal} color="yellow" />
      </div>

      {/* Risk Limits */}
      {risk && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Risk Limits</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Max Order Size</p>
              <p className="text-lg font-semibold text-white">{formatUSD(risk.max_order_size_usdc)}</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Max Exposure</p>
              <p className="text-lg font-semibold text-white">{formatUSD(risk.max_exposure_usdc)}</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Daily Loss Cap</p>
              <p className="text-lg font-semibold text-white">{formatUSD(risk.daily_loss_cap_usdc)}</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Slippage Cap</p>
              <p className="text-lg font-semibold text-white">{risk.slippage_cap_pct}%</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Cooldown</p>
              <p className="text-lg font-semibold text-white">{risk.cooldown_seconds}s</p>
            </div>
            <div className="bg-[#0f1117] rounded-lg px-4 py-3">
              <p className="text-[10px] text-gray-500 uppercase">Max Open Orders</p>
              <p className="text-lg font-semibold text-white">{risk.max_open_orders}</p>
            </div>
          </div>
        </div>
      )}

      {/* PnL Chart */}
      {pnlData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">PnL History</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="colorTotal2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d3748" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={{ stroke: '#2d3748' }} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#22c55e" fill="url(#colorTotal2)" strokeWidth={2} name="Total PnL" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Signals */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Recent Signals ({agentSignals.length})</h3>
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: (s) => <span className="text-xs text-gray-500 font-mono">{s.id}</span> },
            { key: 'side', header: 'Side', render: (s) => <StatusBadge status={s.side} /> },
            { key: 'condition', header: 'Market', render: (s) => <span className="text-sm">{s.condition_id}</span> },
            { key: 'price', header: 'Price', render: (s) => <span className="font-mono">${s.price.toFixed(3)}</span> },
            { key: 'size', header: 'Size', render: (s) => <span className="font-mono">{formatUSD(s.size_usdc)}</span> },
            { key: 'confidence', header: 'Confidence', render: (s) => <span className="font-mono">{(s.confidence * 100).toFixed(0)}%</span> },
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          ]}
          data={agentSignals}
          pageSize={5}
        />
      </div>

      {/* Positions */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Positions ({agentPositions.length})</h3>
        <DataTable
          columns={[
            { key: 'condition', header: 'Market', render: (p) => <span className="text-sm">{p.condition_id}</span> },
            { key: 'side', header: 'Side', render: (p) => <StatusBadge status={p.side} /> },
            { key: 'size', header: 'Size', render: (p) => <span className="font-mono">{formatUSD(p.size_usdc)}</span> },
            { key: 'entry', header: 'Avg Entry', render: (p) => <span className="font-mono">${p.avg_entry_price.toFixed(3)}</span> },
            { key: 'current', header: 'Current', render: (p) => <span className="font-mono">${(p.current_price || 0).toFixed(3)}</span> },
            { key: 'upnl', header: 'Unrealized PnL', render: (p) => <span className={`font-mono font-medium ${getPnlColor(p.unrealized_pnl || 0)}`}>{formatUSD(p.unrealized_pnl || 0)}</span> },
            { key: 'open', header: 'Status', render: (p) => <StatusBadge status={p.is_open ? 'running' : 'stopped'} /> },
          ]}
          data={agentPositions}
          pageSize={5}
        />
      </div>
    </div>
  );
}
