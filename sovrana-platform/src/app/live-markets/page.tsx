'use client';

import { useState } from 'react';
import { Globe, Search, TrendingUp, RefreshCw, Wifi, WifiOff, Loader2, BarChart3 } from 'lucide-react';
import { useLiveMarkets } from '@/lib/hooks/usePolymarket';
import StatusBadge from '@/components/StatusBadge';
import { formatCompact } from '@/lib/utils';

interface LiveMarket {
  id: string;
  conditionId: string;
  question: string;
  description: string;
  slug: string;
  active: boolean;
  closed: boolean;
  outcomePrices: string;
  outcomes: string;
  tokens?: Array<{ token_id: string; outcome: string; price: number; winner: boolean }>;
  tags?: Array<{ label: string; slug: string }>;
  volume: string;
  volumeNum: number;
  liquidity: string;
  liquidityNum: number;
  image: string;
  bestBid: number;
  bestAsk: number;
  spread: number;
}

function parsePrices(market: LiveMarket): { yesPrice: number; noPrice: number } {
  try {
    if (market.outcomePrices) {
      const prices = JSON.parse(market.outcomePrices);
      return { yesPrice: parseFloat(prices[0]) || 0, noPrice: parseFloat(prices[1]) || 0 };
    }
  } catch {}
  if (market.tokens && market.tokens.length > 0) {
    const yesToken = market.tokens.find((t) => t.outcome === 'Yes');
    const noToken = market.tokens.find((t) => t.outcome === 'No');
    return { yesPrice: yesToken?.price ?? 0, noPrice: noToken?.price ?? 0 };
  }
  return { yesPrice: market.bestBid || 0, noPrice: 1 - (market.bestBid || 0) };
}

function parseTags(market: LiveMarket): string {
  if (market.tags && market.tags.length > 0) return market.tags[0].label;
  return 'General';
}

export default function LiveMarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data, isLoading, error, isLive, refetch } = useLiveMarkets(100);
  const markets = (data as LiveMarket[] | null) || [];

  const filtered = markets.filter((m) => {
    if (searchQuery && !m.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Live Markets</h1>
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
          <p className="text-sm text-slate-500">Real-time data from Polymarket API</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refetch}
            className="btn-primary flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="badge-neutral">{filtered.length} Markets</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
        <input
          type="text"
          placeholder="Search live markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-dark w-full pl-11"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400 font-medium">API Error: {error}</p>
          <p className="text-xs text-slate-600 mt-1">Showing cached data or mock fallback.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && markets.length === 0 && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-slate-400 font-medium">Fetching live market data...</span>
        </div>
      )}

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((market) => {
          const { yesPrice, noPrice } = parsePrices(market);
          const primaryTag = parseTags(market);
          const yesCents = Math.round(yesPrice * 100);
          const noCents = Math.round(noPrice * 100);

          return (
            <div key={market.id || market.conditionId} className="card-hover p-6 group">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 mr-3">
                  <span className="badge-purple text-[9px] mb-2.5 inline-block">{primaryTag}</span>
                  <h3 className="text-sm font-bold text-white leading-relaxed group-hover:text-blue-400 transition-colors">{market.question}</h3>
                </div>
                <StatusBadge status={market.active && !market.closed ? 'active' : 'closed'} dot={market.active && !market.closed} />
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-slate-900/50 rounded-xl px-4 py-3.5 text-center ring-1 ring-slate-800/40">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5">Yes</p>
                  <p className="text-2xl font-extrabold text-emerald-400">{yesCents}<span className="text-sm font-bold text-emerald-500/60">¢</span></p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${yesPrice * 100}%` }} />
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-xl px-4 py-3.5 text-center ring-1 ring-slate-800/40">
                  <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mb-1.5">No</p>
                  <p className="text-2xl font-extrabold text-red-400">{noCents}<span className="text-sm font-bold text-red-500/60">¢</span></p>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2.5 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500" style={{ width: `${noPrice * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Spread */}
              {market.spread !== undefined && market.spread > 0 && (
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs text-slate-600 font-medium">Spread</span>
                  <span className="text-xs text-slate-400 font-mono font-semibold">{(market.spread * 100).toFixed(1)}%</span>
                </div>
              )}

              {/* Volume & Liquidity */}
              <div className="pt-4 border-t border-slate-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-xs text-slate-500 font-medium">Volume</span>
                  </div>
                  <span className="text-sm font-bold text-white">{formatCompact(market.volumeNum || parseFloat(market.volume) || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-medium ml-5">Liquidity</span>
                  <span className="text-xs text-slate-400 font-semibold">{formatCompact(market.liquidityNum || parseFloat(market.liquidity) || 0)}</span>
                </div>
              </div>

              {/* ID */}
              <div className="mt-3">
                <p className="text-[10px] text-slate-700 font-mono truncate">{market.conditionId || market.id}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-24">
          <Globe className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-400 font-semibold">No markets found</p>
          <p className="text-sm text-slate-600 mt-1">Try adjusting your search or check API connectivity</p>
        </div>
      )}
    </div>
  );
}
