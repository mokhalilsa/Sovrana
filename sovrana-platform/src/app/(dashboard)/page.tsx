'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Bot, TrendingUp, DollarSign, Briefcase, Activity,
  ArrowUpRight, ArrowDownRight, Zap, Clock, AlertTriangle,
  RefreshCw, ExternalLink, ChevronRight, Loader2, Wifi, WifiOff,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import StatsCard from '@/components/StatsCard';
import { useToast } from '@/components/Toast';
import { formatUSD } from '@/lib/utils';
import { format } from 'date-fns';

interface Position {
  title: string;
  slug: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentPrice: number;
  currentValue: number;
  initialValue: number;
  pnl: number;
  pnlPercent: number;
  icon: string;
  endDate: string;
  redeemable: boolean;
}

interface Trade {
  timestamp: number;
  type: string;
  side: string;
  size: number;
  usdcSize: number;
  price: number;
  transactionHash: string;
  title: string;
  outcome: string;
}

interface PortfolioSummary {
  walletAddress: string;
  totalPositions: number;
  totalValue: number;
  totalInvested: number;
  totalPnl: number;
  realizedPnl: number;
  unrealizedPnl: number;
  totalTrades: number;
  totalVolume: number;
  marketsTraded: number;
  positions: Position[];
  recentTrades: Trade[];
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

export default function DashboardPage() {
  const { addToast } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio/summary');
      if (res.ok) {
        const data = await res.json();
        if (!data.error) {
          setSummary(data);
          setConnected(true);
        } else {
          setError(data.error);
        }
      }
      setError(null);
    } catch (err: any) {
      setError(err.message);
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
    addToast('success', 'Dashboard Refreshed', 'Portfolio data updated from Polymarket.');
  };

  const positions = summary?.positions || [];
  const trades = summary?.recentTrades || [];

  // Build cumulative PnL chart from trades
  let cumPnl = 0;
  const pnlChartData = [...trades].reverse().map((t, i) => {
    if (t.side === 'SELL') cumPnl += t.usdcSize;
    else cumPnl -= t.usdcSize;
    const date = t.timestamp > 0 ? format(new Date(t.timestamp * 1000), 'MMM dd HH:mm') : `Trade ${i + 1}`;
    return { date, pnl: Math.round(cumPnl * 100) / 100 };
  });

  // Trade volume chart
  const tradeChartData = [...trades].reverse().map((t, i) => {
    const date = t.timestamp > 0 ? format(new Date(t.timestamp * 1000), 'MMM dd HH:mm') : `Trade ${i + 1}`;
    return {
      date,
      volume: t.usdcSize,
      side: t.side,
    };
  });

  // Position PnL chart
  const positionPnlData = positions.map(p => ({
    name: p.title.length > 25 ? p.title.slice(0, 25) + '...' : p.title,
    pnl: p.pnl,
    value: p.currentValue,
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Operations Dashboard</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${connected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {connected ? (
                <><Wifi className="w-3 h-3 mr-1" />LIVE</>
              ) : (
                <><WifiOff className="w-3 h-3 mr-1" />OFFLINE</>
              )}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {connected && summary?.walletAddress
              ? `Wallet: ${summary.walletAddress.slice(0, 6)}...${summary.walletAddress.slice(-4)}`
              : 'Connecting to Polymarket...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleRefresh} disabled={refreshing} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono" suppressHydrationWarning>{format(new Date(), 'MMM dd, yyyy HH:mm')}</span>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Connecting to Polymarket...</span>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="card p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-sm font-bold text-red-800">Connection Error</p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {!loading && summary && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatsCard
              title="Portfolio Value"
              value={formatUSD(summary.totalValue)}
              subtitle={`Invested: ${formatUSD(summary.totalInvested)}`}
              icon={DollarSign}
              trend={{ value: summary.totalPnl >= 0 ? 1 : -1, label: `${formatUSD(summary.totalPnl)} PnL` }}
              color="blue"
            />
            <StatsCard
              title="Active Positions"
              value={summary.totalPositions.toString()}
              subtitle={`${summary.marketsTraded} markets`}
              icon={Briefcase}
              color="purple"
            />
            <StatsCard
              title="Total PnL"
              value={`${summary.totalPnl >= 0 ? '+' : ''}${formatUSD(summary.totalPnl)}`}
              subtitle={`Unrealized: ${formatUSD(summary.unrealizedPnl)}`}
              icon={TrendingUp}
              trend={{ value: summary.totalPnl >= 0 ? 1 : -1, label: 'all positions' }}
              color={summary.totalPnl >= 0 ? 'green' : 'red'}
            />
            <StatsCard
              title="Total Trades"
              value={summary.totalTrades.toString()}
              subtitle={`Volume: ${formatUSD(summary.totalVolume)}`}
              icon={Activity}
              color="cyan"
            />
          </div>

          {/* Active Positions */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Active Positions</h3>
                <p className="text-xs text-slate-500 mt-1">Your current Polymarket holdings</p>
              </div>
              <Link href="/positions" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {positions.map((pos, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-4 hover:border-blue-200 hover:shadow-sm transition-all">
                  <div className="flex items-start gap-3">
                    {pos.icon && (
                      <img src={pos.icon} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-800 truncate">{pos.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pos.outcome === 'Yes' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {pos.outcome}
                        </span>
                        <span className="text-[10px] text-slate-400">Ends {pos.endDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Shares</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">{pos.size.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Price</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">${pos.avgPrice.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Current</p>
                      <p className="text-sm font-bold text-slate-800 font-mono">${pos.currentPrice.toFixed(3)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">PnL</p>
                      <p className={`text-sm font-bold font-mono ${pos.pnl >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {pos.pnl >= 0 ? '+' : ''}{formatUSD(pos.pnl)}
                      </p>
                      <p className={`text-[10px] font-medium ${pos.pnlPercent >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {pos.pnlPercent >= 0 ? '+' : ''}{pos.pnlPercent.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400">Value: <span className="font-bold text-slate-700">{formatUSD(pos.currentValue)}</span></span>
                    <a
                      href={`https://polymarket.com/event/${pos.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      View on Polymarket <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Position PnL Chart */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Position PnL Breakdown</h3>
              {positionPnlData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={positionPnlData} layout="vertical" barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#64748b", fontSize: 10 }} axisLine={false} tickLine={false} width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="pnl" name="PnL" radius={[0, 6, 6, 0]}>
                      {positionPnlData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No positions</div>
              )}
            </div>

            {/* Trade Volume Chart */}
            <div className="card p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Trade Volume (USDC)</h3>
              {tradeChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={tradeChartData} barSize={24}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226,232,240,0.8)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="volume" fill="url(#barGrad)" radius={[8, 8, 0, 0]} name="Volume" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm">No trades</div>
              )}
            </div>
          </div>

          {/* Recent Trades Table */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-bold text-slate-800">Recent Trades (Live)</h3>
              <Link href="/fills" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                View All ({trades.length}) <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {trades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Side</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Shares</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Price</th>
                      <th className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Volume (USDC)</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Time</th>
                      <th className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider pb-3">Tx</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.map((trade, idx) => {
                      const timeStr = trade.timestamp > 0 ? format(new Date(trade.timestamp * 1000), 'MMM dd, HH:mm:ss') : 'N/A';
                      return (
                        <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              trade.side === 'SELL' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {trade.side === 'SELL' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                              {trade.side || 'BUY'}
                            </span>
                          </td>
                          <td className="py-3 text-sm text-slate-800 font-bold text-right font-mono">{trade.size?.toLocaleString()}</td>
                          <td className="py-3 text-sm text-slate-700 text-right font-mono">${trade.price?.toFixed(4)}</td>
                          <td className="py-3 text-sm text-slate-800 font-bold text-right">{formatUSD(trade.usdcSize)}</td>
                          <td className="py-3 text-xs text-slate-500 font-mono">{timeStr}</td>
                          <td className="py-3">
                            {trade.transactionHash && (
                              <a
                                href={`https://polygonscan.com/tx/${trade.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-700 text-xs font-mono"
                              >
                                {trade.transactionHash.slice(0, 8)}...
                                <ExternalLink className="w-3 h-3 inline ml-1" />
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 text-sm">No trades found for this wallet</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
