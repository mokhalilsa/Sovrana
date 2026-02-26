'use client';

import { useState } from 'react';
import { Briefcase, Filter } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Positions</h1>
          <p className="text-sm text-gray-500 mt-1">Current and historical positions across all agents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card px-4 py-2">
            <p className="text-[10px] text-gray-500 uppercase">Total Exposure</p>
            <p className="text-sm font-semibold text-white">{formatUSD(totalSize)}</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-[10px] text-gray-500 uppercase">Unrealized PnL</p>
            <p className={`text-sm font-semibold ${getPnlColor(totalUnrealized)}`}>{formatUSD(totalUnrealized)}</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-[10px] text-gray-500 uppercase">Realized PnL</p>
            <p className={`text-sm font-semibold ${getPnlColor(totalRealized)}`}>{formatUSD(totalRealized)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Filters:</span>
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
        <span className="text-xs text-gray-500">{filtered.length} positions</span>
      </div>

      {/* Positions Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'ID',
            render: (p) => <span className="text-xs text-gray-500 font-mono">{p.id}</span>,
          },
          {
            key: 'agent', header: 'Agent',
            render: (p) => <p className="text-sm font-medium text-gray-200">{p.agent_name}</p>,
          },
          {
            key: 'market', header: 'Market',
            render: (p) => <span className="text-sm text-gray-300">{p.condition_id}</span>,
          },
          {
            key: 'side', header: 'Side',
            render: (p) => <StatusBadge status={p.side} />,
          },
          {
            key: 'size', header: 'Size (USDC)',
            render: (p) => <span className="font-mono text-sm">{formatUSD(p.size_usdc)}</span>,
          },
          {
            key: 'entry', header: 'Avg Entry',
            render: (p) => <span className="font-mono text-sm">${p.avg_entry_price.toFixed(4)}</span>,
          },
          {
            key: 'current', header: 'Current Price',
            render: (p) => <span className="font-mono text-sm">{p.current_price ? `$${p.current_price.toFixed(4)}` : '-'}</span>,
          },
          {
            key: 'upnl', header: 'Unrealized PnL',
            render: (p) => (
              <span className={`font-mono text-sm font-medium ${getPnlColor(p.unrealized_pnl || 0)}`}>
                {(p.unrealized_pnl || 0) >= 0 ? '+' : ''}{formatUSD(p.unrealized_pnl || 0)}
              </span>
            ),
          },
          {
            key: 'rpnl', header: 'Realized PnL',
            render: (p) => (
              <span className={`font-mono text-sm font-medium ${getPnlColor(p.realized_pnl)}`}>
                {p.realized_pnl >= 0 ? '+' : ''}{formatUSD(p.realized_pnl)}
              </span>
            ),
          },
          {
            key: 'status', header: 'Status',
            render: (p) => (
              <span className={`badge ${p.is_open ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                {p.is_open ? 'Open' : 'Closed'}
              </span>
            ),
          },
          {
            key: 'opened', header: 'Opened',
            render: (p) => <span className="text-xs text-gray-500">{format(parseISO(p.opened_at), 'MMM dd, HH:mm')}</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
