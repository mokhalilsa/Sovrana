'use client';

import { useState } from 'react';
import { Receipt, Filter } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Fills</h1>
          <p className="text-sm text-gray-500 mt-1">Executed trade fills across all agents</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card px-4 py-2">
            <p className="text-[10px] text-gray-500 uppercase">Total Volume</p>
            <p className="text-sm font-semibold text-white">{formatUSD(totalVolume)}</p>
          </div>
          <div className="card px-4 py-2">
            <p className="text-[10px] text-gray-500 uppercase">Total Fees</p>
            <p className="text-sm font-semibold text-red-400">{formatUSD(totalFees)}</p>
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
        <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)} className="input-dark text-sm">
          <option value="all">All Sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <span className="text-xs text-gray-500">{filtered.length} fills</span>
      </div>

      {/* Fills Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Fill ID',
            render: (f) => <span className="text-xs text-gray-500 font-mono">{f.id}</span>,
          },
          {
            key: 'order', header: 'Order ID',
            render: (f) => <span className="text-xs text-gray-500 font-mono">{f.order_id}</span>,
          },
          {
            key: 'agent', header: 'Agent',
            render: (f) => <p className="text-sm font-medium text-gray-200">{f.agent_name}</p>,
          },
          {
            key: 'side', header: 'Side',
            render: (f) => <StatusBadge status={f.side} />,
          },
          {
            key: 'market', header: 'Market',
            render: (f) => <span className="text-sm text-gray-300">{f.condition_id}</span>,
          },
          {
            key: 'price', header: 'Fill Price',
            render: (f) => <span className="font-mono text-sm">${f.fill_price.toFixed(4)}</span>,
          },
          {
            key: 'size', header: 'Fill Size',
            render: (f) => <span className="font-mono text-sm">{formatUSD(f.fill_size_usdc)}</span>,
          },
          {
            key: 'fee', header: 'Fee',
            render: (f) => <span className="font-mono text-sm text-red-400">{formatUSD(f.fee_usdc)}</span>,
          },
          {
            key: 'time', header: 'Filled At',
            render: (f) => (
              <span className="text-xs text-gray-500">
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
