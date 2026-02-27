'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ArrowUpRight, ArrowDownRight, Download, Filter, Loader2,
  RefreshCw, ExternalLink, Wifi, WifiOff, X,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import { formatUSD } from '@/lib/utils';
import { format } from 'date-fns';

interface Trade {
  id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  price: string;
  status: string;
  outcome: string;
  fee_rate_bps: string;
  match_time: string;
  transaction_hash: string;
  trader_side: string;
  maker_address: string;
}

export default function FillsPage() {
  const { addToast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [sideFilter, setSideFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio/trades');
      if (res.ok) {
        const data = await res.json();
        if (data.trades) {
          setTrades(data.trades);
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
    fetchTrades();
    const interval = setInterval(fetchTrades, 30000);
    return () => clearInterval(interval);
  }, [fetchTrades]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchTrades();
    setRefreshing(false);
    addToast('success', 'Fills Refreshed', 'Trade data updated from Polymarket.');
  };

  const filtered = trades.filter(t => {
    if (sideFilter !== 'all' && t.side !== sideFilter) return false;
    return true;
  });

  const totalVolume = filtered.reduce((sum, t) => sum + parseFloat(t.size || '0') * parseFloat(t.price || '0'), 0);
  const totalFees = filtered.reduce((sum, t) => {
    const vol = parseFloat(t.size || '0') * parseFloat(t.price || '0');
    return sum + vol * parseFloat(t.fee_rate_bps || '0') / 10000;
  }, 0);
  const avgPrice = filtered.length > 0
    ? filtered.reduce((sum, t) => sum + parseFloat(t.price || '0'), 0) / filtered.length
    : 0;

  const handleExport = () => {
    const csv = [
      'ID,Side,Outcome,Size,Price,Volume,Status,Trader Side,Match Time,Tx Hash',
      ...filtered.map(t => {
        const vol = parseFloat(t.size || '0') * parseFloat(t.price || '0');
        const matchTime = parseInt(t.match_time || '0');
        const timeStr = matchTime > 0 ? new Date(matchTime * 1000).toISOString() : '';
        return `${t.id},${t.side},${t.outcome},${t.size},${t.price},${vol.toFixed(2)},${t.status},${t.trader_side},${timeStr},${t.transaction_hash}`;
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovrana-fills-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'CSV Exported', `${filtered.length} fills exported.`);
  };

  const handleClearFilters = () => {
    setSideFilter('all');
    addToast('info', 'Filters Cleared', 'All filters have been reset.');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Fills</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> LIVE</> : <><WifiOff className="w-3 h-3 mr-1" /> OFFLINE</>}
            </span>
          </div>
          <p className="text-sm text-slate-500">Real executed trades from your Polymarket wallet</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 py-2 px-3.5">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Volume</p>
          <p className="text-2xl font-extrabold text-slate-800">{formatUSD(totalVolume)}</p>
          <p className="text-xs text-slate-400 mt-1">{filtered.length} fills</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Total Fees</p>
          <p className="text-2xl font-extrabold text-slate-800">{formatUSD(totalFees)}</p>
          <p className="text-xs text-slate-400 mt-1">Across all fills</p>
        </div>
        <div className="card p-5">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Avg Fill Price</p>
          <p className="text-2xl font-extrabold text-slate-800">${avgPrice.toFixed(4)}</p>
          <p className="text-xs text-slate-400 mt-1">Weighted average</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Filter className="w-4 h-4 text-slate-400" />
        <select
          value={sideFilter}
          onChange={(e) => setSideFilter(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Sides</option>
          <option value="BUY">Buy Only</option>
          <option value="SELL">Sell Only</option>
        </select>
        {sideFilter !== 'all' && (
          <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} fills</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Loading trade history from Polymarket...</span>
        </div>
      )}

      {/* Table */}
      {!loading && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Side</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Outcome</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Role</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Size</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Price</th>
                  <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Volume</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Time</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Market</th>
                  <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider px-5 py-3">Tx</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((trade) => {
                  const size = parseFloat(trade.size || '0');
                  const price = parseFloat(trade.price || '0');
                  const volume = size * price;
                  const matchTime = parseInt(trade.match_time || '0');
                  const timeStr = matchTime > 0 ? format(new Date(matchTime * 1000), 'MMM dd, HH:mm:ss') : 'N/A';
                  return (
                    <tr key={trade.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trade.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {trade.side}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 font-medium">{trade.outcome || 'N/A'}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          trade.trader_side === 'MAKER' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {trade.trader_side}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right font-mono">{size.toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-700 text-right font-mono">${price.toFixed(4)}</td>
                      <td className="px-5 py-3.5 text-sm text-slate-800 font-bold text-right">{formatUSD(volume)}</td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{timeStr}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{trade.market?.slice(0, 10)}...</td>
                      <td className="px-5 py-3.5">
                        {trade.transaction_hash && (
                          <a
                            href={`https://polygonscan.com/tx/${trade.transaction_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 text-xs font-mono flex items-center gap-1"
                          >
                            {trade.transaction_hash.slice(0, 8)}...
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-400 text-sm">No fills found</div>
          )}
        </div>
      )}
    </div>
  );
}
