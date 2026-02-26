'use client';

import { useState } from 'react';
import { ShoppingCart, Filter, XCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import { mockOrders } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { Order } from '@/types';

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSide, setFilterSide] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');

  const agentNames = [...new Set(orders.map((o) => o.agent_name))];

  const filtered = orders.filter((o) => {
    if (filterStatus !== 'all' && o.status !== filterStatus) return false;
    if (filterSide !== 'all' && o.side !== filterSide) return false;
    if (filterAgent !== 'all' && o.agent_name !== filterAgent) return false;
    return true;
  });

  const cancelOrder = (id: string) => {
    setOrders(orders.map((o) => o.id === id ? { ...o, status: 'cancelled' as const } : o));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">All trading orders placed by agents on Polymarket</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-blue-900 text-blue-300">
            {orders.filter((o) => o.status === 'placed' || o.status === 'pending').length} Active
          </span>
          <span className="badge bg-green-900 text-green-300">
            {orders.filter((o) => o.status === 'filled').length} Filled
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
        <span className="text-xs text-gray-500">{filtered.length} orders</span>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={[
          {
            key: 'id', header: 'Order ID',
            render: (o) => (
              <div>
                <span className="text-xs text-gray-500 font-mono">{o.id}</span>
                {o.polymarket_order_id && (
                  <p className="text-[10px] text-gray-600 font-mono">{o.polymarket_order_id}</p>
                )}
              </div>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (o) => (
              <div>
                <p className="text-sm font-medium text-gray-200">{o.agent_name}</p>
              </div>
            ),
          },
          {
            key: 'side', header: 'Side',
            render: (o) => <StatusBadge status={o.side} />,
          },
          {
            key: 'type', header: 'Type',
            render: (o) => <span className="text-sm text-gray-300 capitalize">{o.order_type}</span>,
          },
          {
            key: 'market', header: 'Market',
            render: (o) => <span className="text-sm text-gray-300">{o.condition_id}</span>,
          },
          {
            key: 'price', header: 'Price',
            render: (o) => <span className="font-mono text-sm">{o.price ? `$${o.price.toFixed(3)}` : 'Market'}</span>,
          },
          {
            key: 'size', header: 'Size (USDC)',
            render: (o) => <span className="font-mono text-sm">{formatUSD(o.size_usdc)}</span>,
          },
          {
            key: 'status', header: 'Status',
            render: (o) => (
              <div>
                <StatusBadge status={o.status} />
                {o.block_reason && (
                  <p className="text-[10px] text-red-400 mt-1">{o.block_reason}</p>
                )}
              </div>
            ),
          },
          {
            key: 'placed', header: 'Placed At',
            render: (o) => (
              <span className="text-xs text-gray-500">
                {o.placed_at ? format(parseISO(o.placed_at), 'HH:mm:ss') : '-'}
              </span>
            ),
          },
          {
            key: 'actions', header: '',
            render: (o) => (o.status === 'placed' || o.status === 'pending' || o.status === 'partial') ? (
              <button
                onClick={() => cancelOrder(o.id)}
                className="p-1.5 rounded bg-red-600/10 text-red-400 hover:bg-red-600/20 transition-colors"
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
    </div>
  );
}
