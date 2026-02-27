'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Briefcase, Loader2, RefreshCw, Wifi, WifiOff, ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { formatUSD } from '@/lib/utils';

export default function PositionsPage() {
  const { addToast } = useToast();
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showClosed, setShowClosed] = useState(false);

  const fetchPositions = useCallback(async () => {
    try {
      const res = await fetch(`/api/portfolio/positions?closed=${showClosed}`);
      if (res.ok) {
        const data = await res.json();
        if (data.positions) {
          setPositions(data.positions);
          setConnected(true);
        }
      }
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [showClosed]);

  useEffect(() => {
    setLoading(true);
    fetchPositions();
    const interval = setInterval(fetchPositions, 30000);
    return () => clearInterval(interval);
  }, [fetchPositions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPositions();
    setRefreshing(false);
    addToast('success', 'Positions Refreshed', 'Position data updated from Polymarket.');
  };

  const totalSize = positions.reduce((sum, p) => sum + parseFloat(p.size || p.currentValue || '0'), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Positions</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> LIVE</> : <><WifiOff className="w-3 h-3 mr-1" /> OFFLINE</>}
            </span>
          </div>
          <p className="text-sm text-slate-500">Your real Polymarket positions</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Positions</p>
          <p className="text-2xl font-extrabold text-slate-800">{positions.length}</p>
          <p className="text-xs text-slate-400 mt-1">{showClosed ? 'Closed' : 'Open'} positions</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Portfolio Value</p>
          <p className="text-2xl font-extrabold text-slate-800">{formatUSD(totalSize)}</p>
          <p className="text-xs text-slate-400 mt-1">Estimated value</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">View</p>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => setShowClosed(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${!showClosed ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Open
            </button>
            <button
              onClick={() => setShowClosed(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${showClosed ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Closed
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Loading positions from Polymarket...</span>
        </div>
      )}

      {/* Positions Table */}
      {!loading && positions.length > 0 && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Market</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Outcome</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Size</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Avg Price</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Current Value</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">PnL</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos, idx) => {
                  const title = pos.title || pos.market || pos.conditionId || `Position ${idx + 1}`;
                  const outcome = pos.outcome || pos.outcomeIndex || 'N/A';
                  const size = parseFloat(pos.size || pos.shares || '0');
                  const avgPrice = parseFloat(pos.avgPrice || pos.averagePrice || '0');
                  const curValue = parseFloat(pos.currentValue || pos.value || '0');
                  const pnl = parseFloat(pos.pnl || pos.realizedPnl || '0');
                  const conditionId = pos.conditionId || pos.market || '';

                  return (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="text-sm text-slate-700 font-medium max-w-[250px] truncate">{title}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{conditionId.slice(0, 12)}...</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">{outcome}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right font-mono">{size.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 text-right font-mono">${avgPrice.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right">{formatUSD(curValue)}</td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={`text-sm font-bold font-mono ${pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {pnl >= 0 ? '+' : ''}{formatUSD(pnl)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {conditionId && (
                          <a
                            href={`https://polymarket.com/event/${conditionId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-xs flex items-center gap-1"
                          >
                            View <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && positions.length === 0 && (
        <div className="card p-16 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-600 mb-2">No {showClosed ? 'Closed' : 'Open'} Positions</h3>
          <p className="text-sm text-slate-400">
            {showClosed
              ? 'No closed positions found for this wallet.'
              : 'You have no open positions on Polymarket right now.'}
          </p>
        </div>
      )}
    </div>
  );
}
