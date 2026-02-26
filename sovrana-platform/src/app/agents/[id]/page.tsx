'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Bot, Power, PowerOff, AlertTriangle,
  TrendingUp, DollarSign, Signal, ShoppingCart, Shield,
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
          <Bot className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-lg text-slate-400 font-semibold">Agent not found</p>
          <Link href="/agents" className="text-blue-400 hover:text-blue-300 text-sm mt-3 inline-block font-medium">
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
    <div className="space-y-8">
      {/* Back Link */}
      <Link href="/agents" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-white transition-colors font-medium">
        <ArrowLeft className="w-4 h-4" />
        Back to Agents
      </Link>

      {/* Agent Header */}
      <div className="card p-7">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
              agent.status === 'running' ? 'bg-emerald-500/10 ring-1 ring-emerald-500/20' :
              agent.status === 'errored' ? 'bg-red-500/10 ring-1 ring-red-500/20' :
              'bg-slate-500/10 ring-1 ring-slate-500/20'
            }`}>
              <Bot className={`w-8 h-8 ${
                agent.status === 'running' ? 'text-emerald-400' :
                agent.status === 'errored' ? 'text-red-400' :
                'text-slate-400'
              }`} />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">{agent.name}</h1>
              <p className="text-sm text-slate-500 mt-1">{agent.description}</p>
              <div className="flex items-center gap-2 mt-3">
                <StatusBadge status={agent.status} dot />
                <StatusBadge status={agent.mode} />
                {agent.is_simulate && <span className="badge-purple">Simulation</span>}
                {agent.kill_switch && <span className="badge-danger">Kill Switch Active</span>}
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatsCard title="Total Realized PnL" value={formatUSD(totalRealized)} icon={TrendingUp} color="green" />
        <StatsCard title="Total Volume" value={formatUSD(totalVolume)} icon={DollarSign} color="blue" />
        <StatsCard title="Total Trades" value={totalTrades} icon={ShoppingCart} color="purple" />
        <StatsCard title="Active Signals" value={agentSignals.filter((s) => s.status === 'pending' || s.status === 'approved').length} icon={Signal} color="yellow" />
      </div>

      {/* Risk Limits */}
      {risk && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Shield className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-white">Risk Limits</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: 'Max Order Size', value: formatUSD(risk.max_order_size_usdc) },
              { label: 'Max Exposure', value: formatUSD(risk.max_exposure_usdc) },
              { label: 'Daily Loss Cap', value: formatUSD(risk.daily_loss_cap_usdc) },
              { label: 'Slippage Cap', value: `${risk.slippage_cap_pct}%` },
              { label: 'Cooldown', value: `${risk.cooldown_seconds}s` },
              { label: 'Max Open Orders', value: risk.max_open_orders.toString() },
            ].map((item) => (
              <div key={item.label} className="bg-slate-900/50 rounded-xl px-4 py-3.5 ring-1 ring-slate-800/40">
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider">{item.label}</p>
                <p className="text-lg font-bold text-white mt-1">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PnL Chart */}
      {pnlData.length > 0 && (
        <div className="card p-6">
          <h3 className="text-sm font-bold text-white mb-5">PnL History</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={pnlData}>
              <defs>
                <linearGradient id="colorTotal2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,41,59,0.5)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#475569', fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="total" stroke="#10b981" fill="url(#colorTotal2)" strokeWidth={2.5} name="Total PnL" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Signals */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-white mb-5">Recent Signals <span className="text-slate-600">({agentSignals.length})</span></h3>
        <DataTable
          columns={[
            { key: 'id', header: 'ID', render: (s) => <span className="text-[11px] text-slate-500 font-mono">{s.id}</span> },
            { key: 'side', header: 'Side', render: (s) => <StatusBadge status={s.side} /> },
            { key: 'condition', header: 'Market', render: (s) => <span className="text-sm text-slate-400 font-mono">{s.condition_id}</span> },
            { key: 'price', header: 'Price', render: (s) => <span className="font-mono text-white font-semibold">${s.price.toFixed(3)}</span> },
            { key: 'size', header: 'Size', render: (s) => <span className="font-mono text-white font-semibold">{formatUSD(s.size_usdc)}</span> },
            { key: 'confidence', header: 'Confidence', render: (s) => (
              <div className="flex items-center gap-2">
                <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full" style={{ width: `${s.confidence * 100}%` }} />
                </div>
                <span className="font-mono text-sm font-semibold text-white">{(s.confidence * 100).toFixed(0)}%</span>
              </div>
            )},
            { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
          ]}
          data={agentSignals}
          pageSize={5}
        />
      </div>

      {/* Positions */}
      <div className="card p-6">
        <h3 className="text-sm font-bold text-white mb-5">Positions <span className="text-slate-600">({agentPositions.length})</span></h3>
        <DataTable
          columns={[
            { key: 'condition', header: 'Market', render: (p) => <span className="text-sm text-slate-400 font-mono">{p.condition_id}</span> },
            { key: 'side', header: 'Side', render: (p) => <StatusBadge status={p.side} /> },
            { key: 'size', header: 'Size', render: (p) => <span className="font-mono text-white font-semibold">{formatUSD(p.size_usdc)}</span> },
            { key: 'entry', header: 'Entry', render: (p) => <span className="font-mono text-slate-300">${p.avg_entry_price.toFixed(3)}</span> },
            { key: 'current', header: 'Current', render: (p) => <span className="font-mono text-slate-300">${(p.current_price || 0).toFixed(3)}</span> },
            { key: 'upnl', header: 'Unrealized PnL', render: (p) => <span className={`font-mono font-bold ${getPnlColor(p.unrealized_pnl || 0)}`}>{formatUSD(p.unrealized_pnl || 0)}</span> },
            { key: 'open', header: 'Status', render: (p) => <StatusBadge status={p.is_open ? 'active' : 'closed'} dot={p.is_open} /> },
          ]}
          data={agentPositions}
          pageSize={5}
        />
      </div>
    </div>
  );
}
