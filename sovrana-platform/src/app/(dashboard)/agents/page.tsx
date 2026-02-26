'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Zap, AlertTriangle, Pause, Shield, Search, ChevronRight, Power, PowerOff, Eye } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { mockAgents, mockRiskLimits } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { Agent } from '@/types';

const statusIcons: Record<string, typeof Zap> = {
  running: Zap,
  idle: Pause,
  errored: AlertTriangle,
  stopped: Shield,
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const filtered = agents.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts: Record<string, number> = {
    all: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    idle: agents.filter(a => a.status === 'idle').length,
    errored: agents.filter(a => a.status === 'errored').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
  };

  const toggleEnabled = (id: string) => {
    setAgents(agents.map((a) => a.id === id ? { ...a, is_enabled: !a.is_enabled } : a));
  };

  const toggleKillSwitch = (id: string) => {
    setAgents(agents.map((a) => a.id === id ? { ...a, kill_switch: !a.kill_switch } : a));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">AI Agents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor autonomous trading agents</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-11"
          />
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                filter === key
                  ? 'bg-blue-600/20 text-blue-600 ring-1 ring-blue-500/30'
                  : 'text-slate-500 hover:text-slate-500 hover:bg-slate-50'
              }`}
            >
              {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((agent) => {
          const risk = mockRiskLimits.find(r => r.agent_id === agent.id);
          const StatusIcon = statusIcons[agent.status] || Zap;

          return (
            <div key={agent.id} className="card-hover p-6 group">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    agent.status === 'running' ? 'bg-emerald-50 text-emerald-600' :
                    agent.status === 'errored' ? 'bg-red-50 text-red-600' :
                    agent.status === 'idle' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <Link href={`/agents/${agent.id}`} className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {agent.name}
                    </Link>
                    <p className="text-[11px] text-slate-500 font-mono">{agent.id}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} dot />
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-2">{agent.description}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Mode</p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{agent.mode === 'trading_enabled' ? 'Trading' : 'Read Only'}</p>
                </div>
                <div className="bg-slate-50/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Max Order</p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{risk ? formatUSD(risk.max_order_size_usdc) : '—'}</p>
                </div>
                <div className="bg-slate-50/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Exposure</p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{risk ? formatUSD(risk.max_exposure_usdc) : '—'}</p>
                </div>
                <div className="bg-slate-50/40 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Loss Cap</p>
                  <p className="text-xs font-bold text-slate-500 mt-0.5">{risk ? formatUSD(risk.daily_loss_cap_usdc) : '—'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => toggleEnabled(agent.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    agent.is_enabled
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-500/20 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-100 ring-1 ring-slate-700/30'
                  }`}
                >
                  {agent.is_enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                  {agent.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => toggleKillSwitch(agent.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    agent.kill_switch
                      ? 'bg-red-50 text-red-600 hover:bg-red-500/20 ring-1 ring-red-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-100 ring-1 ring-slate-700/30'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kill Switch
                </button>
                <Link
                  href={`/agents/${agent.id}`}
                  className="p-2.5 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all ring-1 ring-slate-700/30"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
