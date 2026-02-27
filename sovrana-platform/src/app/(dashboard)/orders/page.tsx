'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ShoppingCart, Filter, XCircle, ArrowUpRight, ArrowDownRight, X,
  Loader2, RefreshCw, Wifi, WifiOff,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { formatUSD } from '@/lib/utils';
import { format } from 'date-fns';

interface LiveOrder {
  id: string;
  market: string;
  asset_id: string;
  side: string;
  original_size: string;
  size_matched: string;
  price: string;
  status: string;
  outcome: string;
  order_type: string;
  created_at: string;
  expiration: string;
}

export default function OrdersPage() {
  const { addToast } = useToast();
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSide, setFilterSide] = useState<string>('all');

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders) {
          setOrders(data.orders);
          setConnected(true);
        }
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    addToast('success', 'Orders Refreshed', 'Order data updated from Polymarket.');
  };

  const filtered = orders.filter(o => {
    if (filterSide !== 'all' && o.side !== filterSide) return false;
    return true;
  });

  const activeCount = filtered.filter(o => o.status === 'LIVE' || o.status === 'OPEN').length;
  const matchedCount = filtered.filter(o => o.status === 'MATCHED').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Orders</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> LIVE</> : <><WifiOff className="w-3 h-3 mr-1" /> OFFLINE</>}
            </span>
          </div>
          <p className="text-sm text-slate-500">Open orders on your Polymarket account</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{activeCount} Active</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{matchedCount} Matched</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={filterSide}
          onChange={(e) => setFilterSide(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sides</option>
          <option value="BUY">Buy Only</option>
          <option value="SELL">Sell Only</option>
        </select>
        {filterSide !== 'all' && (
          <button onClick={() => { setFilterSide('all'); addToast('info', 'Filters Cleared', 'All filters have been reset.'); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} orders</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Loading orders from Polymarket...</span>
        </div>
      )}

      {/* Orders Table */}
      {!loading && filtered.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Side</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Outcome</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Type</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Price</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Size</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Matched</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Created</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Market</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((order) => {
                  const price = parseFloat(order.price || '0');
                  const origSize = parseFloat(order.original_size || '0');
                  const matched = parseFloat(order.size_matched || '0');
                  const createdAt = order.created_at ? format(new Date(order.created_at), 'MMM dd, HH:mm') : 'N/A';
                  return (
                    <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {order.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {order.side}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">{order.outcome || 'N/A'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 capitalize font-medium">{order.order_type || 'GTC'}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right font-mono">${price.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right font-mono">{origSize.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-500 text-right font-mono">{matched.toLocaleString()}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          order.status === 'LIVE' || order.status === 'OPEN' ? 'bg-blue-50 text-blue-700' :
                          order.status === 'MATCHED' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{createdAt}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{order.market?.slice(0, 10)}...</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="card p-16 text-center">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No Open Orders</h3>
          <p className="text-sm text-slate-400">You have no open orders on Polymarket right now.</p>
        </div>
      )}
    </div>
  );
}
