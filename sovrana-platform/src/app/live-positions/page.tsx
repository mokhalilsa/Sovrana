'use client';

import { Wallet, RefreshCw, Loader2, TrendingUp, TrendingDown, DollarSign, Briefcase } from 'lucide-react';
import { useLivePositions } from '@/lib/hooks/usePolymarket';
import StatsCard from '@/components/StatsCard';
import StatusBadge from '@/components/StatusBadge';

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Live Positions</h1>
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
          <p className="text-sm text-slate-500">Real-time positions from your Polymarket wallet</p>
        </div>
        <button onClick={refetch} className="btn-primary flex items-center gap-2 text-xs">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatsCard title="Open Positions" value={positions.length.toString()} icon={Briefcase} color="blue" />
        <StatsCard title="Total Value" value={`$${totalValue.toFixed(2)}`} icon={DollarSign} color="purple" />
        <StatsCard title="Initial Investment" value={`$${totalInitial.toFixed(2)}`} icon={Wallet} color="cyan" />
        <StatsCard title="Total PnL" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(2)}`} icon={TrendingUp} color={totalPnl >= 0 ? 'green' : 'red'} />
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400 font-medium">API Error: {error}</p>
          <p className="text-xs text-slate-600 mt-1">Ensure your wallet address is configured in .env.local</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && positions.length === 0 && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-400 font-medium">Fetching positions...</span>
        </div>
      )}

      {/* Positions Table */}
      {positions.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800/60">
                <th className="text-left px-5 py-4 table-header">Market</th>
                <th className="text-left px-5 py-4 table-header">Outcome</th>
                <th className="text-right px-5 py-4 table-header">Size</th>
                <th className="text-right px-5 py-4 table-header">Avg Price</th>
                <th className="text-right px-5 py-4 table-header">Current</th>
                <th className="text-right px-5 py-4 table-header">Value</th>
                <th className="text-right px-5 py-4 table-header">PnL</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos, idx) => (
                <tr key={idx} className="table-row animate-slide-up" style={{ animationDelay: `${idx * 20}ms` }}>
                  <td className="px-5 py-4">
                    <p className="text-white font-semibold text-sm">{pos.title || pos.market_slug}</p>
                    <p className="text-[10px] text-slate-700 font-mono">{pos.condition_id?.slice(0, 16)}...</p>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={pos.outcome === 'Yes' ? 'buy' : 'sell'} />
                  </td>
                  <td className="px-5 py-4 text-right font-mono text-slate-300 font-semibold">{pos.size?.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-300">${pos.avg_price?.toFixed(4)}</td>
                  <td className="px-5 py-4 text-right font-mono text-slate-300">${pos.cur_price?.toFixed(4)}</td>
                  <td className="px-5 py-4 text-right font-mono text-white font-bold">${pos.current_value?.toFixed(2)}</td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {(pos.pnl || 0) >= 0 ? (
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                      )}
                      <span className={`font-mono font-bold ${(pos.pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
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

      {/* Empty */}
      {!isLoading && !error && positions.length === 0 && (
        <div className="text-center py-24">
          <Wallet className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">No open positions found</p>
          <p className="text-sm text-slate-600 mt-1">Your Polymarket wallet has no active positions</p>
        </div>
      )}
    </div>
  );
}
