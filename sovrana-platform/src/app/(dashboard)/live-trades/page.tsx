'use client';

import { ArrowUpDown, RefreshCw, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useLiveTrades } from '@/lib/hooks/usePolymarket';
import StatusBadge from '@/components/StatusBadge';

interface LiveTrade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  title: string;
  market_slug: string;
  event_slug: string;
}

export default function LiveTradesPage() {
  const { data, isLoading, error, isLive, refetch } = useLiveTrades(100);
  const trades = (data as LiveTrade[] | null) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Live Trades</h1>
            {isLive && (
              <span className="badge-success text-[10px] flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                LIVE
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500">Real-time trade history from your Polymarket wallet</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refetch} className="btn-primary flex items-center gap-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="badge-neutral">{trades.length} Trades</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-600 font-medium">API Error: {error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && trades.length === 0 && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-400 font-medium">Fetching trade history...</span>
        </div>
      )}

      {/* Trades Table */}
      {trades.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left px-5 py-4 table-header">Time</th>
                <th className="text-left px-5 py-4 table-header">Market</th>
                <th className="text-left px-5 py-4 table-header">Side</th>
                <th className="text-left px-5 py-4 table-header">Outcome</th>
                <th className="text-right px-5 py-4 table-header">Price</th>
                <th className="text-right px-5 py-4 table-header">Size</th>
                <th className="text-right px-5 py-4 table-header">Fee (bps)</th>
                <th className="text-left px-5 py-4 table-header">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={trade.id || idx} className="table-row animate-slide-up" style={{ animationDelay: `${idx * 15}ms` }}>
                  <td className="px-5 py-4 text-xs text-slate-400 font-mono">
                    {trade.match_time ? new Date(trade.match_time).toLocaleString() : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-slate-800 font-semibold text-sm">{trade.title || trade.market_slug || trade.market}</p>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${trade.side === 'BUY' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                        {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3 text-emerald-600" /> : <ArrowDownRight className="w-3 h-3 text-red-600" />}
                      </div>
                      <StatusBadge status={trade.side === 'BUY' ? 'buy' : 'sell'} />
                    </div>
                  </td>
                  <td className="px-5 py-4 text-slate-500 font-medium">{trade.outcome || '—'}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-800 font-bold">${parseFloat(trade.price || '0').toFixed(4)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-500 font-semibold">{parseFloat(trade.size || '0').toFixed(2)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-500">{trade.fee_rate_bps || '—'}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={trade.status?.toLowerCase() || 'matched'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !error && trades.length === 0 && (
        <div className="text-center py-24">
          <ArrowUpDown className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">No trades found</p>
          <p className="text-sm text-slate-500 mt-1">Your Polymarket wallet has no trade history</p>
        </div>
      )}
    </div>
  );
}
