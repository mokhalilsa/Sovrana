'use client';

import { useState } from 'react';
import { Receipt, Filter, ArrowUpRight, ArrowDownRight, DollarSign, Percent } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import StatsCard from '@/components/StatsCard';
import { mockFills } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

export default function FillsPage() {
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');

  const agentNames = [...new Set(mockFills.map((f) => f.agent_name))];

  const filtered = mockFills.filter((f) => {
    if (filterAgent !== 'all' && f.agent_name !== filterAgent) return false;
    if (filterSide !== 'all' && f.side !== filterSide) return false;
    return true;
  });

  const totalVolume = filtered.reduce((sum, f) => sum + f.fill_size_usdc, 0);
  const totalFees = filtered.reduce((sum, f) => sum + f.fee_usdc, 0);
  const avgPrice = filtered.length > 0 ? filtered.reduce((sum, f) => sum + f.fill_price, 0) / filtered.length : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Fills</h1>
          <p className="text-sm text-slate-500 mt-1">Executed trade fills across all agents</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatsCard title="Total Volume" value={formatUSD(totalVolume)} icon={DollarSign} color="blue" subtitle={`${filtered.length} fills`} />
        <StatsCard title="Total Fees" value={formatUSD(totalFees)} icon={Percent} color="red" subtitle="Across all fills" />
        <StatsCard title="Avg Fill Price" value={`$${avgPrice.toFixed(4)}`} icon={Receipt} color="purple" subtitle="Weighted average" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="input-dark text-sm">
          <option value="all">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)} className="input-dark text-sm">
          <option value="all">All Sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <span className="text-xs text-slate-600 font-medium ml-auto">{filtered.length} fills</span>
      </div>

      {/* Fills Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Fill',
            render: (f) => (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${f.side === 'buy' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {f.side === 'buy' ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-mono">{f.id}</span>
                  <p className="text-[10px] text-slate-700 font-mono">{f.order_id}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (f) => <p className="text-sm font-semibold text-slate-200">{f.agent_name}</p>,
          },
          {
            key: 'side', header: 'Side',
            render: (f) => <StatusBadge status={f.side} />,
          },
          {
            key: 'market', header: 'Market',
            render: (f) => <span className="text-sm text-slate-400 font-mono">{f.condition_id}</span>,
          },
          {
            key: 'price', header: 'Fill Price',
            render: (f) => <span className="font-mono text-sm font-semibold text-white">${f.fill_price.toFixed(4)}</span>,
          },
          {
            key: 'size', header: 'Fill Size',
            render: (f) => <span className="font-mono text-sm font-semibold text-white">{formatUSD(f.fill_size_usdc)}</span>,
          },
          {
            key: 'fee', header: 'Fee',
            render: (f) => <span className="font-mono text-sm text-red-400 font-semibold">{formatUSD(f.fee_usdc)}</span>,
          },
          {
            key: 'time', header: 'Filled At',
            render: (f) => (
              <span className="text-xs text-slate-500 font-mono">
                {format(parseISO(f.filled_at), 'MMM dd, HH:mm:ss')}
              </span>
            ),
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
