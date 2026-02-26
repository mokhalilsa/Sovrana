'use client';

import { useState } from 'react';
import { Globe, Search, TrendingUp, RefreshCw, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useLiveMarkets } from '@/lib/hooks/usePolymarket';
import { formatCompact } from '@/lib/utils';

interface LiveMarket {
  id: string;
  conditionId: string;
  question: string;
  description: string;
  slug: string;
  active: boolean;
  closed: boolean;
  // Gamma API returns prices as JSON strings
  outcomePrices: string; // e.g. '["0.0365", "0.9635"]'
  outcomes: string; // e.g. '["Yes", "No"]'
  tokens?: Array<{
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
  }>;
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
  // Try outcomePrices first (JSON string array)
  try {
    if (market.outcomePrices) {
      const prices = JSON.parse(market.outcomePrices);
      return {
        yesPrice: parseFloat(prices[0]) || 0,
        noPrice: parseFloat(prices[1]) || 0,
      };
    }
  } catch {}

  // Fallback to tokens array
  if (market.tokens && market.tokens.length > 0) {
    const yesToken = market.tokens.find((t) => t.outcome === 'Yes');
    const noToken = market.tokens.find((t) => t.outcome === 'No');
    return {
      yesPrice: yesToken?.price ?? 0,
      noPrice: noToken?.price ?? 0,
    };
  }

  // Fallback to bestBid
  return {
    yesPrice: market.bestBid || 0,
    noPrice: 1 - (market.bestBid || 0),
  };
}

function parseTags(market: LiveMarket): string {
  if (market.tags && market.tags.length > 0) {
    return market.tags[0].label;
  }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Markets</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time data from Polymarket API</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live status */}
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
          <span className="badge bg-gray-700 text-gray-300">
            {filtered.length} Markets
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search live markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-dark w-full pl-10 pr-4 py-2 text-sm"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="card p-4 border-red-800 bg-red-900/20">
          <p className="text-sm text-red-400">API Error: {error}</p>
          <p className="text-xs text-gray-500 mt-1">Showing cached data or mock fallback.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && markets.length === 0 && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="ml-3 text-gray-400">Fetching live market data...</span>
        </div>
      )}

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((market) => {
          const { yesPrice, noPrice } = parsePrices(market);
          const primaryTag = parseTags(market);
          const yesCents = Math.round(yesPrice * 100);
          const noCents = Math.round(noPrice * 100);

          return (
            <div key={market.id || market.conditionId} className="card p-5 hover:border-blue-600/30 transition-colors">
              {/* Market Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <span className="badge bg-blue-900/50 text-blue-300 mb-2 inline-block">{primaryTag}</span>
                  <h3 className="text-sm font-semibold text-white leading-snug">{market.question}</h3>
                </div>
                <span className={`badge ml-2 ${market.active && !market.closed ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                  {market.active && !market.closed ? 'Active' : 'Closed'}
                </span>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#0f1117] rounded-lg px-4 py-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">Yes</p>
                  <p className="text-xl font-bold text-green-400">{yesCents}¢</p>
                  <div className="w-full h-1.5 bg-[#2d3748] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${yesPrice * 100}%` }} />
                  </div>
                </div>
                <div className="bg-[#0f1117] rounded-lg px-4 py-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase mb-1">No</p>
                  <p className="text-xl font-bold text-red-400">{noCents}¢</p>
                  <div className="w-full h-1.5 bg-[#2d3748] rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${noPrice * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Spread */}
              {market.spread !== undefined && market.spread > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">Spread</span>
                  <span className="text-xs text-gray-400">{(market.spread * 100).toFixed(1)}%</span>
                </div>
              )}

              {/* Volume & Liquidity */}
              <div className="flex items-center justify-between pt-3 border-t border-[#2d3748]">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-400">Volume</span>
                </div>
                <span className="text-sm font-semibold text-white">{formatCompact(market.volumeNum || parseFloat(market.volume) || 0)}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">Liquidity</span>
                <span className="text-xs text-gray-400">{formatCompact(market.liquidityNum || parseFloat(market.liquidity) || 0)}</span>
              </div>

              {/* Market ID */}
              <div className="mt-2">
                <p className="text-[10px] text-gray-600 font-mono truncate">{market.conditionId || market.id}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No markets found</p>
          <p className="text-sm text-gray-600 mt-1">Try adjusting your search or check API connectivity</p>
        </div>
      )}
    </div>
  );
}
