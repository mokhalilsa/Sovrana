'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, DollarSign, Loader2, RefreshCw,
  Wifi, WifiOff, Download, BarChart3, Activity,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';
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
}

interface PortfolioSummary {
  totalTrades: number;
  totalVolume: number;
  buyCount: number;
  sellCount: number;
  buyVolume: number;
  sellVolume: number;
  openOrders: number;
  marketsTraded: number;
  realizedPnl: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-lg">
        <p className="text-[11px] text-slate-500 font-medium mb-2">{label}</p>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 mb-0.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm font-semibold text-slate-700">
              {entry.name}: {typeof entry.value === 'number' ? formatUSD(entry.value) : entry.value}
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function PnlPage() {
  const { addToast } = useToast();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [tradesRes, summaryRes] = await Promise.all([
        fetch('/api/portfolio/trades'),
        fetch('/api/portfolio/summary'),
      ]);
      if (tradesRes.ok) {
        const data = await tradesRes.json();
        if (data.trades) setTrades(data.trades);
      }
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        if (!data.error) setSummary(data);
      }
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    addToast('success', 'PnL Refreshed', 'PnL data updated from Polymarket.');
  };

  // Build cumulative PnL chart
  let cumPnl = 0;
  const pnlChartData = [...trades].reverse().map((t, i) => {
    const size = parseFloat(t.size || '0');
    const price = parseFloat(t.price || '0');
    const vol = size * price;
    if (t.side === 'SELL') cumPnl += vol;
    else cumPnl -= vol;
    const matchTime = parseInt(t.match_time || '0');
    const date = matchTime > 0 ? format(new Date(matchTime * 1000), 'MMM dd HH:mm') : `Trade ${i + 1}`;
    return { date, pnl: Math.round(cumPnl * 100) / 100, volume: Math.round(vol * 100) / 100, side: t.side };
  });

  // Build per-trade PnL bars
  const tradeBarData = [...trades].reverse().map((t, i) => {
    const size = parseFloat(t.size || '0');
    const price = parseFloat(t.price || '0');
    const vol = size * price;
    const pnlContrib = t.side === 'SELL' ? vol : -vol;
    const matchTime = parseInt(t.match_time || '0');
    const date = matchTime > 0 ? format(new Date(matchTime * 1000), 'MMM dd') : `T${i + 1}`;
    return { date, pnl: Math.round(pnlContrib * 100) / 100, side: t.side };
  });

  // Per-market breakdown
  const marketMap = new Map<string, { buys: number; sells: number; net: number; trades: number }>();
  trades.forEach(t => {
    const size = parseFloat(t.size || '0');
    const price = parseFloat(t.price || '0');
    const vol = size * price;
    const key = t.market?.slice(0, 16) || 'Unknown';
    const existing = marketMap.get(key) || { buys: 0, sells: 0, net: 0, trades: 0 };
    existing.trades++;
    if (t.side === 'BUY') {
      existing.buys += vol;
      existing.net -= vol;
    } else {
      existing.sells += vol;
      existing.net += vol;
    }
    marketMap.set(key, existing);
  });

  const handleExport = () => {
    const csv = [
      'Date,Side,Outcome,Size,Price,Volume,Market,Tx Hash',
      ...trades.map(t => {
        const vol = parseFloat(t.size || '0') * parseFloat(t.price || '0');
        const matchTime = parseInt(t.match_time || '0');
        const timeStr = matchTime > 0 ? new Date(matchTime * 1000).toISOString() : '';
        return `${timeStr},${t.side},${t.outcome},${t.size},${t.price},${vol.toFixed(2)},${t.market},${t.transaction_hash}`;
      }),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sovrana-pnl-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'PnL Report Exported', `${trades.length} trades exported.`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Profit & Loss</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {connected ? <><Wifi className="w-3 h-3 mr-1" /> LIVE</> : <><WifiOff className="w-3 h-3 mr-1" /> OFFLINE</>}
            </span>
          </div>
          <p className="text-sm text-slate-500">Real PnL analysis from your Polymarket trades</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button onClick={handleExport} className="btn-primary flex items-center gap-2 py-2 px-3.5">
            <Download className="w-4 h-4" /> Export Report
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Loading PnL data...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Net PnL</p>
              </div>
              <p className={`text-2xl font-extrabold ${(summary?.realizedPnl || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {(summary?.realizedPnl || 0) >= 0 ? '+' : ''}{formatUSD(summary?.realizedPnl || 0)}
              </p>
              <p className="text-xs text-slate-400 mt-1">Realized profit/loss</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Buy Volume</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{formatUSD(summary?.buyVolume || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">{summary?.buyCount || 0} buy trades</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-red-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Sell Volume</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{formatUSD(summary?.sellVolume || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">{summary?.sellCount || 0} sell trades</p>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Volume</p>
              </div>
              <p className="text-2xl font-extrabold text-slate-800">{formatUSD(summary?.totalVolume || 0)}</p>
              <p className="text-xs text-slate-400 mt-1">{summary?.totalTrades || 0} total trades across {summary?.marketsTraded || 0} markets</p>
            </div>
          </div>

          {/* Cumulative PnL Chart */}
          {pnlChartData.length > 0 && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800">Cumulative PnL</h3>
                <p className="text-xs text-slate-500 mt-1">Running profit/loss across all trades</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <AreaChart data={pnlChartData}>
                  <defs>
                    <linearGradient id="colorPnlArea" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="pnl" stroke="#10b981" fill="url(#colorPnlArea)" strokeWidth={2.5} name="Cumulative PnL" dot={{ r: 4, fill: '#10b981' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-Trade PnL Bars */}
          {tradeBarData.length > 0 && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800">Per-Trade PnL Contribution</h3>
                <p className="text-xs text-slate-500 mt-1">Green = sell (profit), Red = buy (cost)</p>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tradeBarData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="pnl"
                    name="PnL"
                    radius={[6, 6, 0, 0]}
                    fill="#3b82f6"
                    shape={(props: any) => {
                      const { x, y, width, height, payload } = props;
                      const color = payload.pnl >= 0 ? '#10b981' : '#ef4444';
                      return <rect x={x} y={y} width={width} height={height} fill={color} rx={6} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Per-Market Breakdown */}
          {marketMap.size > 0 && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800">Per-Market Breakdown</h3>
                <p className="text-xs text-slate-500 mt-1">PnL breakdown by market condition</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Market</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Trades</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Buy Volume</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Sell Volume</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Net PnL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from(marketMap.entries()).map(([market, data]) => (
                      <tr key={market} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-3 text-xs text-slate-500 font-mono">{market}...</td>
                        <td className="px-3 py-3 text-sm text-slate-800 font-bold text-right">{data.trades}</td>
                        <td className="px-3 py-3 text-sm text-emerald-600 text-right font-mono">{formatUSD(data.buys)}</td>
                        <td className="px-3 py-3 text-sm text-red-600 text-right font-mono">{formatUSD(data.sells)}</td>
                        <td className="px-3 py-3 text-right">
                          <span className={`text-sm font-bold font-mono ${data.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {data.net >= 0 ? '+' : ''}{formatUSD(data.net)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trade History Table */}
          {trades.length > 0 && (
            <div className="card p-6">
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-800">Trade History</h3>
                <p className="text-xs text-slate-500 mt-1">All executed trades from your Polymarket account</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Time</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Side</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Outcome</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Size</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Price</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Volume</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3 px-3">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((t) => {
                      const size = parseFloat(t.size || '0');
                      const price = parseFloat(t.price || '0');
                      const vol = size * price;
                      const matchTime = parseInt(t.match_time || '0');
                      const timeStr = matchTime > 0 ? format(new Date(matchTime * 1000), 'MMM dd, HH:mm:ss') : 'N/A';
                      return (
                        <tr key={t.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-3 text-xs text-slate-500 font-mono">{timeStr}</td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              t.side === 'BUY' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {t.side}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-sm text-slate-700 font-medium">{t.outcome || 'N/A'}</td>
                          <td className="px-3 py-3 text-sm text-slate-800 font-bold text-right font-mono">{size.toLocaleString()}</td>
                          <td className="px-3 py-3 text-sm text-slate-700 text-right font-mono">${price.toFixed(4)}</td>
                          <td className="px-3 py-3 text-sm text-slate-800 font-bold text-right">{formatUSD(vol)}</td>
                          <td className="px-3 py-3">
                            {t.transaction_hash && (
                              <a
                                href={`https://polygonscan.com/tx/${t.transaction_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs font-mono"
                              >
                                {t.transaction_hash.slice(0, 10)}...
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
        </>
      )}
    </div>
  );
}
