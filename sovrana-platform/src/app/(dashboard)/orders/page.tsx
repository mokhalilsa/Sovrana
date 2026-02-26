'use client';

import { useState } from 'react';
import { ShoppingCart, Filter, XCircle, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { mockOrders } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Order } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const { addToast } = useToast();

  const [confirmCancel, setConfirmCancel] = useState<{ isOpen: boolean; orderId: string; agentName: string }>({
    isOpen: false, orderId: '', agentName: '',
  });

  const agentNames = [...new Set(orders.map((o) => o.agent_name))];

  const filtered = orders.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (filterSide !== 'all' && o.side !== filterSide) return false;
    if (filterAgent !== 'all' && o.agent_name !== filterAgent) return false;
    return true;
  });

  const handleCancelOrder = (id: string, agentName: string) => {
    setConfirmCancel({ isOpen: true, orderId: id, agentName });
  };

  const confirmCancelAction = () => {
    setOrders(prev => prev.map(o => o.id === confirmCancel.orderId ? { ...o, status: 'cancelled' as const } : o));
    addToast('warning', 'Order Cancelled', `Order from ${confirmCancel.agentName} has been cancelled.`);
  };

  const handleClearFilters = () => {
    setFilterStatus('all');
    setFilterSide('all');
    setFilterAgent('all');
    addToast('info', 'Filters Cleared', 'All filters have been reset.');
  };

  const activeCount = orders.filter((o) => o.status === 'placed' || o.status === 'pending').length;
  const filledCount = orders.filter((o) => o.status === 'filled').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Orders</h1>
          <p className="text-sm text-slate-500 mt-1">All trading orders placed by agents on Polymarket</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-info">{activeCount} Active</span>
          <span className="badge-success">{filledCount} Filled</span>
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
          <option value="placed">Placed</option>
          <option value="partial">Partial</option>
          <option value="filled">Filled</option>
          <option value="cancelled">Cancelled</option>
          <option value="rejected">Rejected</option>
          <option value="blocked">Blocked</option>
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
        <span className="text-xs text-slate-500 font-medium ml-auto">{filtered.length} orders</span>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Order',
            render: (o) => (
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${o.side === 'buy' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {o.side === 'buy' ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-red-600" />}
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 font-mono">{o.id}</span>
                  {o.polymarket_order_id && (
                    <p className="text-[10px] text-slate-400 font-mono">{o.polymarket_order_id}</p>
                  )}
                </div>
              </div>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (o) => <p className="text-sm font-semibold text-slate-700">{o.agent_name}</p>,
          },
          {
            key: 'side', header: 'Side',
            render: (o) => <StatusBadge status={o.side} />,
          },
          {
            key: 'type', header: 'Type',
            render: (o) => <span className="text-sm text-slate-500 capitalize font-medium">{o.order_type}</span>,
          },
          {
            key: 'market', header: 'Market',
            render: (o) => <span className="text-sm text-slate-400 font-mono">{o.condition_id}</span>,
          },
          {
            key: 'price', header: 'Price',
            render: (o) => <span className="font-mono text-sm font-semibold text-slate-800">{o.price ? `$${o.price.toFixed(3)}` : 'Market'}</span>,
          },
          {
            key: 'size', header: 'Size',
            render: (o) => <span className="font-mono text-sm font-semibold text-slate-800">{formatUSD(o.size_usdc)}</span>,
          },
          {
            key: 'status', header: 'Status',
            render: (o) => (
              <div>
                <StatusBadge status={o.status} />
                {o.block_reason && (
                  <p className="text-[10px] text-red-600/80 mt-1">{o.block_reason}</p>
                )}
              </div>
            ),
          },
          {
            key: 'placed', header: 'Placed',
            render: (o) => (
              <span className="text-xs text-slate-500 font-mono">
                {o.placed_at ? format(parseISO(o.placed_at), 'HH:mm:ss') : '—'}
              </span>
            ),
          },
          {
            key: 'actions', header: '',
            render: (o) => (o.status === 'placed' || o.status === 'pending' || o.status === 'partial') ? (
              <button
                onClick={() => handleCancelOrder(o.id, o.agent_name)}
                className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-all ring-1 ring-red-200 cursor-pointer"
                title="Cancel Order"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            ) : null,
          },
        ]}
        data={filtered}
        pageSize={10}
      />

      {/* Confirm Cancel Dialog */}
      <ConfirmDialog
        isOpen={confirmCancel.isOpen}
        onClose={() => setConfirmCancel(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmCancelAction}
        title="Cancel Order"
        message={`Are you sure you want to cancel this order from ${confirmCancel.agentName}? This will attempt to cancel the order on Polymarket.`}
        confirmText="Cancel Order"
        variant="danger"
      />
    </div>
  );
}
