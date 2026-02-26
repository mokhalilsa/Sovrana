'use client';

import { useState } from 'react';
import { Signal as SignalIcon, Check, X, Filter } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import { mockSignals } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Signal } from '@/types';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const agentNames = [...new Set(signals.map((s) => s.agent_name))];

  const filtered = signals.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterSide !== 'all' && s.side !== filterSide) return false;
    if (filterAgent !== 'all' && s.agent_name !== filterAgent) return false;
    return true;
  });

  const approveSignal = (id: string) => {
    setSignals(signals.map((s) => s.id === id ? { ...s, status: 'approved' as const } : s));
  };

  const rejectSignal = (id: string) => {
    setSignals(signals.map((s) => s.id === id ? { ...s, status: 'rejected' as const, rejection_reason: 'Manually rejected' } : s));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Signals</h1>
          <p className="text-sm text-gray-500 mt-1">AI-generated trading signals from all agents</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-yellow-900 text-yellow-300">
            {signals.filter((s) => s.status === 'pending').length} Pending
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Filters:</span>
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-dark text-sm">
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="executed">Executed</option>
          <option value="expired">Expired</option>
        </select>
        <select value={filterSide} onChange={(e) => setFilterSide(e.target.value)} className="input-dark text-sm">
          <option value="all">All Sides</option>
          <option value="buy">Buy</option>
          <option value="sell">Sell</option>
        </select>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="input-dark text-sm">
          <option value="all">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <span className="text-xs text-gray-500">{filtered.length} signals</span>
      </div>

      {/* Signals Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Signal ID',
            render: (s) => <span className="text-xs text-gray-500 font-mono">{s.id}</span>,
          },
          {
            key: 'agent', header: 'Agent',
            render: (s) => (
              <div>
                <p className="text-sm font-medium text-gray-200">{s.agent_name}</p>
                <p className="text-xs text-gray-500">{s.agent_id}</p>
              </div>
            ),
          },
          {
            key: 'side', header: 'Side',
            render: (s) => <StatusBadge status={s.side} />,
          },
          {
            key: 'market', header: 'Market',
            render: (s) => <span className="text-sm text-gray-300">{s.condition_id}</span>,
          },
          {
            key: 'price', header: 'Price',
            render: (s) => <span className="font-mono text-sm">${s.price.toFixed(3)}</span>,
          },
          {
            key: 'size', header: 'Size (USDC)',
            render: (s) => <span className="font-mono text-sm">{formatUSD(s.size_usdc)}</span>,
          },
          {
            key: 'confidence', header: 'Confidence',
            render: (s) => (
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-[#2d3748] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      s.confidence >= 0.8 ? 'bg-green-500' :
                      s.confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${s.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono">{(s.confidence * 100).toFixed(0)}%</span>
              </div>
            ),
          },
          {
            key: 'status', header: 'Status',
            render: (s) => (
              <div>
                <StatusBadge status={s.status} />
                {s.rejection_reason && (
                  <p className="text-[10px] text-red-400 mt-1">{s.rejection_reason}</p>
                )}
              </div>
            ),
          },
          {
            key: 'time', header: 'Time',
            render: (s) => <span className="text-xs text-gray-500">{format(parseISO(s.created_at), 'HH:mm:ss')}</span>,
          },
          {
            key: 'actions', header: 'Actions',
            render: (s) => s.status === 'pending' ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => approveSignal(s.id)}
                  className="p-1.5 rounded bg-green-600/10 text-green-400 hover:bg-green-600/20 transition-colors"
                  title="Approve"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => rejectSignal(s.id)}
                  className="p-1.5 rounded bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-colors"
                  title="Reject"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : <span className="text-xs text-gray-600">-</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
