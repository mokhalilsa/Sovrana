'use client';

import { useState } from 'react';
import { Briefcase, Filter, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import StatsCard from '@/components/StatsCard';
import { mockPositions } from '@/lib/mock-data';
import { formatUSD, getPnlColor } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function PositionsPage() {
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterOpen, setFilterOpen] = useState<string>('all');

  const agentNames = [...new Set(mockPositions.map((p) => p.agent_name))];

  const filtered = mockPositions.filter((p) => {
    if (filterAgent !== 'all' && p.agent_name !== filterAgent) return false;
    if (filterOpen === 'open' && !p.is_open) return false;
    if (filterOpen === 'closed' && p.is_open) return false;
    return true;
  });

  const totalUnrealized = filtered.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
  const totalRealized = filtered.reduce((sum, p) => sum + p.realized_pnl, 0);
  const totalSize = filtered.filter((p) => p.is_open).reduce((sum, p) => sum + p.size_usdc, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Positions</h1>
        <p className="text-sm text-slate-500 mt-1">Current and historical positions across all agents</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatsCard title="Total Exposure" value={formatUSD(totalSize)} icon={DollarSign} color="blue" subtitle={`${filtered.filter(p => p.is_open).length} open positions`} />
        <StatsCard title="Unrealized PnL" value={`${totalUnrealized >= 0 ? '+' : ''}${formatUSD(totalUnrealized)}`} icon={TrendingUp} color={totalUnrealized >= 0 ? 'green' : 'red'} />
        <StatsCard title="Realized PnL" value={`${totalRealized >= 0 ? '+' : ''}${formatUSD(totalRealized)}`} icon={TrendingDown} color={totalRealized >= 0 ? 'green' : 'red'} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="input-dark text-sm">
          <option value="all">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={filterOpen} onChange={(e) => setFilterOpen(e.target.value)} className="input-dark text-sm">
          <option value="all">All Positions</option>
          <option value="open">Open Only</option>
          <option value="closed">Closed Only</option>
        </select>
        <span className="text-xs text-slate-500 font-medium ml-auto">{filtered.length} positions</span>
      </div>

      {/* Positions Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Position',
            render: (p) => (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${p.side === 'buy' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {p.side === 'buy' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{p.id}</span>
              </div>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (p) => <p className="text-sm font-semibold text-slate-700">{p.agent_name}</p>,
          },
          {
            key: 'market', header: 'Market',
            render: (p) => <span className="text-sm text-slate-400 font-mono">{p.condition_id}</span>,
          },
          {
            key: 'side', header: 'Side',
            render: (p) => <StatusBadge status={p.side} />,
          },
          {
            key: 'size', header: 'Size',
            render: (p) => <span className="font-mono text-sm font-semibold text-slate-800">{formatUSD(p.size_usdc)}</span>,
          },
          {
            key: 'entry', header: 'Entry',
            render: (p) => <span className="font-mono text-sm text-slate-500">${p.avg_entry_price.toFixed(4)}</span>,
          },
          {
            key: 'current', header: 'Current',
            render: (p) => <span className="font-mono text-sm text-slate-500">{p.current_price ? `$${p.current_price.toFixed(4)}` : '—'}</span>,
          },
          {
            key: 'upnl', header: 'Unrealized',
            render: (p) => (
              <span className={`font-mono text-sm font-bold ${getPnlColor(p.unrealized_pnl || 0)}`}>
                {(p.unrealized_pnl || 0) >= 0 ? '+' : ''}{formatUSD(p.unrealized_pnl || 0)}
              </span>
            ),
          },
          {
            key: 'rpnl', header: 'Realized',
            render: (p) => (
              <span className={`font-mono text-sm font-bold ${getPnlColor(p.realized_pnl)}`}>
                {p.realized_pnl >= 0 ? '+' : ''}{formatUSD(p.realized_pnl)}
              </span>
            ),
          },
          {
            key: 'status', header: 'Status',
            render: (p) => (
              <StatusBadge status={p.is_open ? 'active' : 'closed'} dot={p.is_open} />
            ),
          },
          {
            key: 'opened', header: 'Opened',
            render: (p) => <span className="text-xs text-slate-500 font-mono">{format(parseISO(p.opened_at), 'MMM dd, HH:mm')}</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
