'use client';

import { ArrowUpDown, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLiveTrades } from '@/lib/hooks/usePolymarket';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Trades</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time trade history from your Polymarket wallet</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            {isLive ? (
              <>
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                </div>
                <Wifi className="w-3 h-3 text-green-400" />
                <span className="text-green-400">Live</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500">Offline</span>
              </>
            )}
          </div>
          <button
            onClick={refetch}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="badge bg-gray-700 text-gray-300">{trades.length} Trades</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-800 bg-red-900/20">
          <p className="text-sm text-red-400">API Error: {error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && trades.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-400">Fetching trade history...</span>
        </div>
      )}

      {/* Trades Table */}
      {trades.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3748]">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Time</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Market</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Side</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Outcome</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Price</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Size</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Fee (bps)</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, idx) => (
                <tr key={trade.id || idx} className="border-b border-[#2d3748]/50 hover:bg-[#1a1d29]">
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    {trade.match_time ? new Date(trade.match_time).toLocaleString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white text-sm">{trade.title || trade.market_slug || trade.market}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${trade.side === 'BUY' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-300">{trade.outcome || '-'}</td>
                  <td className="px-4 py-3 text-right text-white font-medium">${parseFloat(trade.price || '0').toFixed(4)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{parseFloat(trade.size || '0').toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{trade.fee_rate_bps || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="badge bg-blue-900/50 text-blue-300">{trade.status || 'MATCHED'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && trades.length === 0 && (
        <div className="text-center py-20">
          <ArrowUpDown className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No trades found</p>
          <p className="text-sm text-gray-600 mt-1">Your Polymarket wallet has no trade history</p>
        </div>
      )}
    </div>
  );
}
