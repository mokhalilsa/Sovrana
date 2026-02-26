'use client';

import { useState } from 'react';
import { Globe, Search, TrendingUp, BarChart3, X, ExternalLink, Copy } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { mockMarkets } from '@/lib/mock-data';
import { formatCompact } from '@/lib/utils';
import { Market } from '@/types';

export default function MarketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterActive, setFilterActive] = useState<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const { addToast } = useToast();

  const categories = [...new Set(mockMarkets.map((m) => m.category).filter(Boolean))];

  const filtered = mockMarkets.filter((m) => {
    if (filterCategory !== 'all' && m.category !== filterCategory) return false;
    if (filterActive === 'active' && !m.active) return false;
    if (filterActive === 'inactive' && m.active) return false;
    if (searchQuery && !m.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleClearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterActive('all');
    addToast('info', 'Filters Cleared', 'All filters have been reset.');
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    addToast('success', 'Copied', 'Market condition ID copied to clipboard.');
  };

  const hasFilters = searchQuery || filterCategory !== 'all' || filterActive !== 'all';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Markets</h1>
          <p className="text-sm text-slate-500 mt-1">Polymarket prediction markets being tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-success">{mockMarkets.filter((m) => m.active).length} Active</span>
          <span className="badge-neutral">{mockMarkets.length} Total</span>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-dark w-full pl-11"
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
        {hasFilters && (
          <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-500 font-medium ml-auto">{filtered.length} markets</span>
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((market) => (
          <div
            key={market.condition_id}
            className="card-hover p-6 group cursor-pointer"
            onClick={() => setSelectedMarket(market)}
          >
            {/* Market Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 mr-3">
                {market.category && (
                  <span className="badge-purple text-[9px] mb-2.5 inline-block">{market.category}</span>
                )}
                <h3 className="text-sm font-bold text-slate-800 leading-relaxed group-hover:text-blue-600 transition-colors">{market.question}</h3>
              </div>
              <StatusBadge status={market.active ? 'active' : 'closed'} dot={market.active} />
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-slate-50 rounded-xl px-4 py-3.5 text-center ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">Yes</p>
                <p className="text-2xl font-extrabold text-emerald-600">{(market.yes_price * 100).toFixed(0)}<span className="text-sm font-bold text-emerald-500/60">¢</span></p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${market.yes_price * 100}%` }}
                  />
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3.5 text-center ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1.5">No</p>
                <p className="text-2xl font-extrabold text-red-600">{(market.no_price * 100).toFixed(0)}<span className="text-sm font-bold text-red-500/60">¢</span></p>
                <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500"
                    style={{ width: `${market.no_price * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Volume */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs text-slate-500 font-medium">24h Volume</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{formatCompact(market.volume_24h)}</span>
            </div>

            {/* Market ID */}
            <div className="mt-3">
              <p className="text-[10px] text-slate-400 font-mono truncate">{market.condition_id}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Market Detail Modal */}
      <Modal
        isOpen={!!selectedMarket}
        onClose={() => setSelectedMarket(null)}
        title="Market Details"
        size="lg"
      >
        {selectedMarket && (
          <div className="space-y-6">
            <div>
              {selectedMarket.category && (
                <span className="badge-purple text-[9px] mb-2.5 inline-block">{selectedMarket.category}</span>
              )}
              <h3 className="text-lg font-bold text-slate-800">{selectedMarket.question}</h3>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={selectedMarket.active ? 'active' : 'closed'} dot={selectedMarket.active} />
              </div>
            </div>

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 rounded-xl px-5 py-4 text-center ring-1 ring-emerald-200">
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Yes Price</p>
                <p className="text-4xl font-extrabold text-emerald-600">{(selectedMarket.yes_price * 100).toFixed(1)}<span className="text-lg">¢</span></p>
              </div>
              <div className="bg-red-50 rounded-xl px-5 py-4 text-center ring-1 ring-red-200">
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-2">No Price</p>
                <p className="text-4xl font-extrabold text-red-600">{(selectedMarket.no_price * 100).toFixed(1)}<span className="text-lg">¢</span></p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">24h Volume</p>
                <p className="text-lg font-bold text-slate-800">{formatCompact(selectedMarket.volume_24h)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Volume</p>
                <p className="text-lg font-bold text-slate-800">{formatCompact(selectedMarket.volume_24h)}</p>
              </div>
            </div>

            {/* Condition ID */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 ring-1 ring-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Condition ID</p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-600 font-mono flex-1 break-all">{selectedMarket.condition_id}</p>
                <button
                  onClick={() => handleCopyId(selectedMarket.condition_id)}
                  className="p-1.5 rounded-lg bg-white hover:bg-slate-100 transition-colors ring-1 ring-slate-200"
                >
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                </button>
              </div>
            </div>



            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href={`https://polymarket.com`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary flex items-center gap-2 py-2.5 px-4 flex-1 justify-center"
              >
                <ExternalLink className="w-4 h-4" /> View on Polymarket
              </a>
              <button
                onClick={() => {
                  handleCopyId(selectedMarket.condition_id);
                  setSelectedMarket(null);
                }}
                className="btn-secondary flex items-center gap-2 py-2.5 px-4"
              >
                <Copy className="w-4 h-4" /> Copy ID
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
