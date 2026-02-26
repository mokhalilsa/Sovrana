'use client';

import { Wallet, RefreshCw, Wifi, WifiOff, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { useLivePositions } from '@/lib/hooks/usePolymarket';

interface LivePosition {
  asset: string;
  condition_id: string;
  market_slug: string;
  title: string;
  outcome: string;
  size: number;
  avg_price: number;
  cur_price: number;
  initial_value: number;
  current_value: number;
  pnl: number;
  cashflow: number;
  realized_pnl: number;
  unrealized_pnl: number;
  closed: boolean;
}

export default function LivePositionsPage() {
  const { data, isLoading, error, isLive, refetch } = useLivePositions();
  const positions = (data as LivePosition[] | null) || [];

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl || 0), 0);
  const totalValue = positions.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalInitial = positions.reduce((sum, p) => sum + (p.initial_value || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Positions</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time positions from your Polymarket wallet</p>
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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Open Positions</p>
          <p className="text-2xl font-bold text-white mt-1">{positions.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Total Value</p>
          <p className="text-2xl font-bold text-white mt-1">${totalValue.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Initial Investment</p>
          <p className="text-2xl font-bold text-white mt-1">${totalInitial.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[10px] text-gray-500 uppercase">Total PnL</p>
          <p className={`text-2xl font-bold mt-1 ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-800 bg-red-900/20">
          <p className="text-sm text-red-400">API Error: {error}</p>
          <p className="text-xs text-gray-500 mt-1">Ensure your wallet address is configured in .env.local</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && positions.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-400">Fetching positions...</span>
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2d3748]">
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Market</th>
                <th className="text-left px-4 py-3 text-[10px] text-gray-500 uppercase">Outcome</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Size</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Avg Price</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Current Price</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">Value</th>
                <th className="text-right px-4 py-3 text-[10px] text-gray-500 uppercase">PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, idx) => (
                <tr key={idx} className="border-b border-[#2d3748]/50 hover:bg-[#1a1d29]">
                  <td className="px-4 py-3">
                    <p className="text-white font-medium text-sm">{pos.title || pos.market_slug}</p>
                    <p className="text-[10px] text-gray-600 font-mono">{pos.condition_id?.slice(0, 16)}...</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${pos.outcome === 'Yes' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {pos.outcome}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">{pos.size?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${pos.avg_price?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right text-gray-300">${pos.cur_price?.toFixed(4)}</td>
                  <td className="px-4 py-3 text-right text-white font-medium">${pos.current_value?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {(pos.pnl || 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-400" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-400" />
                      )}
                      <span className={`font-medium ${(pos.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {(pos.pnl || 0) >= 0 ? '+' : ''}${(pos.pnl || 0).toFixed(2)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && positions.length === 0 && (
        <div className="text-center py-20">
          <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No open positions found</p>
          <p className="text-sm text-gray-600 mt-1">Your Polymarket wallet has no active positions</p>
        </div>
      )}
    </div>
  );
}
