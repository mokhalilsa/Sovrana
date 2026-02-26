'use client';

import { useState } from 'react';
import { Signal as SignalIcon, Check, X, Filter, ArrowUpRight, ArrowDownRight, CheckCircle, XCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { mockSignals } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Signal } from '@/types';

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>(mockSignals);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const { addToast } = useToast();

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    signalId: string;
    action: 'approve' | 'reject';
    agentName: string;
  }>({ isOpen: false, signalId: '', action: 'approve', agentName: '' });

  // Bulk actions
  const [selectedSignals, setSelectedSignals] = useState<Set<string>>(new Set());

  const agentNames = [...new Set(signals.map((s) => s.agent_name))];

  const filtered = signals.filter((s) => {
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    if (filterSide !== 'all' && s.side !== filterSide) return false;
    if (filterAgent !== 'all' && s.agent_name !== filterAgent) return false;
    return true;
  });

  const handleApprove = (id: string, agentName: string) => {
    setConfirmDialog({ isOpen: true, signalId: id, action: 'approve', agentName });
  };

  const handleReject = (id: string, agentName: string) => {
    setConfirmDialog({ isOpen: true, signalId: id, action: 'reject', agentName });
  };

  const confirmAction = () => {
    const { signalId, action, agentName } = confirmDialog;
    if (action === 'approve') {
      setSignals(prev => prev.map(s => s.id === signalId ? { ...s, status: 'approved' as const } : s));
      addToast('success', 'Signal Approved', `Signal from ${agentName} has been approved for execution.`);
    } else {
      setSignals(prev => prev.map(s => s.id === signalId ? { ...s, status: 'rejected' as const, rejection_reason: 'Manually rejected by operator' } : s));
      addToast('warning', 'Signal Rejected', `Signal from ${agentName} has been rejected.`);
    }
  };

  const handleBulkApprove = () => {
    const pendingSelected = [...selectedSignals].filter(id => signals.find(s => s.id === id)?.status === 'pending');
    if (pendingSelected.length === 0) {
      addToast('warning', 'No Pending Signals', 'Select pending signals to approve.');
      return;
    }
    setSignals(prev => prev.map(s => pendingSelected.includes(s.id) ? { ...s, status: 'approved' as const } : s));
    addToast('success', 'Bulk Approved', `${pendingSelected.length} signals have been approved.`);
    setSelectedSignals(new Set());
  };

  const handleBulkReject = () => {
    const pendingSelected = [...selectedSignals].filter(id => signals.find(s => s.id === id)?.status === 'pending');
    if (pendingSelected.length === 0) {
      addToast('warning', 'No Pending Signals', 'Select pending signals to reject.');
      return;
    }
    setSignals(prev => prev.map(s => pendingSelected.includes(s.id) ? { ...s, status: 'rejected' as const, rejection_reason: 'Bulk rejected by operator' } : s));
    addToast('warning', 'Bulk Rejected', `${pendingSelected.length} signals have been rejected.`);
    setSelectedSignals(new Set());
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterSide('all');
    setFilterAgent('all');
    addToast('info', 'Filters Cleared', 'All filters have been reset.');
  };

  const pendingCount = signals.filter((s) => s.status === 'pending').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Signals</h1>
          <p className="text-sm text-slate-500 mt-1">AI-generated trading signals from all agents</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedSignals.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">{selectedSignals.size} selected</span>
              <button onClick={handleBulkApprove} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-200 transition-all">
                <CheckCircle className="w-3.5 h-3.5" /> Approve All
              </button>
              <button onClick={handleBulkReject} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200 transition-all">
                <XCircle className="w-3.5 h-3.5" /> Reject All
              </button>
            </div>
          )}
          {pendingCount > 0 && (
            <span className="badge-warning flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
              </span>
              {pendingCount} Pending
            </span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
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
        {(filterStatus !== 'all' || filterSide !== 'all' || filterAgent !== 'all') && (
          <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-500 font-medium ml-auto">{filtered.length} signals</span>
      </div>

      {/* Signals Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Signal',
            render: (s) => (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.side === 'buy' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {s.side === 'buy' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">{s.id}</span>
              </div>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (s) => (
              <div>
                <p className="text-sm font-semibold text-slate-700">{s.agent_name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{s.agent_id}</p>
              </div>
            ),
          },
          {
            key: 'side', header: 'Side',
            render: (s) => <StatusBadge status={s.side} />,
          },
          {
            key: 'market', header: 'Market',
            render: (s) => <span className="text-sm text-slate-400 font-mono">{s.condition_id}</span>,
          },
          {
            key: 'price', header: 'Price',
            render: (s) => <span className="font-mono text-sm font-semibold text-slate-800">${s.price.toFixed(3)}</span>,
          },
          {
            key: 'size', header: 'Size',
            render: (s) => <span className="font-mono text-sm font-semibold text-slate-800">{formatUSD(s.size_usdc)}</span>,
          },
          {
            key: 'confidence', header: 'Confidence',
            render: (s) => (
              <div className="flex items-center gap-2.5">
                <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      s.confidence >= 0.8 ? 'bg-emerald-500' :
                      s.confidence >= 0.6 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${s.confidence * 100}%` }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">{(s.confidence * 100).toFixed(0)}%</span>
              </div>
            ),
          },
          {
            key: 'status', header: 'Status',
            render: (s) => (
              <div>
                <StatusBadge status={s.status} />
                {s.rejection_reason && (
                  <p className="text-[10px] text-red-600/80 mt-1">{s.rejection_reason}</p>
                )}
              </div>
            ),
          },
          {
            key: 'time', header: 'Time',
            render: (s) => <span className="text-xs text-slate-500 font-mono">{format(parseISO(s.created_at), 'HH:mm:ss')}</span>,
          },
          {
            key: 'actions', header: '',
            render: (s) => s.status === 'pending' ? (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleApprove(s.id, s.agent_name)}
                  className="p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all ring-1 ring-emerald-200 cursor-pointer"
                  title="Approve"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReject(s.id, s.agent_name)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all ring-1 ring-red-200 cursor-pointer"
                  title="Reject"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : <span className="text-xs text-slate-400">—</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmAction}
        title={confirmDialog.action === 'approve' ? 'Approve Signal' : 'Reject Signal'}
        message={
          confirmDialog.action === 'approve'
            ? `Approve the trading signal from ${confirmDialog.agentName}? This will queue it for execution.`
            : `Reject the trading signal from ${confirmDialog.agentName}? This action cannot be undone.`
        }
        confirmText={confirmDialog.action === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmDialog.action === 'approve' ? 'success' : 'danger'}
      />
    </div>
  );
}
