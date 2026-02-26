'use client';

import { useState } from 'react';
import { Globe, Filter, Search, ExternalLink, TrendingUp } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { mockMarkets } from '@/lib/mock-data';
import { formatCompact } from '@/lib/utils';

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');

  const categories = [...new Set(mockMarkets.map((m) => m.category).filter(Boolean))];

  const filtered = mockMarkets.filter((m) => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterActive === 'active' && !m.active) return false;
    if (filterActive === 'inactive' && m.active) return false;
    if (searchQuery && !m.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Markets</h1>
          <p className="text-sm text-gray-500 mt-1">Polymarket prediction markets being tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge bg-green-900 text-green-300">
            {mockMarkets.filter((m) => m.active).length} Active
          </span>
          <span className="badge bg-gray-700 text-gray-300">
            {mockMarkets.length} Total
          </span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-10 pr-4 py-2 text-sm"
          />
        </div>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="input-dark text-sm">
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select value={filterActive} onChange={(e) => setFilterActive(e.target.value)} className="input-dark text-sm">
          <option value="all">All Markets</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
        <span className="text-xs text-gray-500">{filtered.length} markets</span>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((market) => (
          <div key={market.condition_id} className="card p-5 hover:border-blue-600/30 transition-colors">
            {/* Market Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                {market.category && (
                  <span className="badge bg-blue-900/50 text-blue-300 mb-2 inline-block">{market.category}</span>
                )}
                <h3 className="text-sm font-semibold text-white leading-snug">{market.question}</h3>
              </div>
              <span className={`badge ml-2 ${market.active ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-300'}`}>
                {market.active ? 'Active' : 'Inactive'}
              </span>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#0f1117] rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">Yes</p>
                <p className="text-xl font-bold text-green-400">{(market.yes_price * 100).toFixed(0)}¢</p>
                <div className="w-full h-1.5 bg-[#2d3748] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${market.yes_price * 100}%` }}
                  />
                </div>
              </div>
              <div className="bg-[#0f1117] rounded-lg px-4 py-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">No</p>
                <p className="text-xl font-bold text-red-400">{(market.no_price * 100).toFixed(0)}¢</p>
                <div className="w-full h-1.5 bg-[#2d3748] rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${market.no_price * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-between pt-3 border-t border-[#2d3748]">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-xs text-gray-400">24h Volume</span>
              </div>
              <span className="text-sm font-semibold text-white">{formatCompact(market.volume_24h)}</span>
            </div>

            {/* Market ID */}
            <div className="mt-2">
              <p className="text-[10px] text-gray-600 font-mono truncate">{market.condition_id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
