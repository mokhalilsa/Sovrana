'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Bot, Zap, AlertTriangle, Pause, Shield, Search, Power, PowerOff, Eye, X,
  Play, RefreshCw, Loader2, Activity, TrendingUp, Clock, ArrowUpRight,
  ArrowDownRight, CheckCircle, XCircle, Radio, Wifi, Target, DollarSign,
} from 'lucide-react';
import { useToast } from '@/components/Toast';
import ConfirmDialog from '@/components/ConfirmDialog';
import { formatUSD } from '@/lib/utils';
import { format } from 'date-fns';

// ─── Types ─────────────────────────────────────────────────────────────────

interface AgentData {
  id: string;
  name: string;
  description: string;
  strategy: string;
  enabled: boolean;
  mode: string;
  maxOrderUSDC: number;
  maxExposureUSDC: number;
  dailyLossCapUSDC: number;
  minConfidence: number;
  signalCount: number;
  tradeCount: number;
  lastSignal: string | null;
  lastTrade: string | null;
}

interface SignalData {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  market: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  sizeUSDC: number;
  confidence: number;
  reasoning: string;
  status: string;
  orderId?: string;
  errorMessage?: string;
}

interface TradeData {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  market: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  sizeUSDC: number;
  orderId: string;
  status: string;
}

interface ActivityData {
  id: string;
  type: string;
  agentId?: string;
  agentName?: string;
  message: string;
  details?: string;
  timestamp: string;
  severity: string;
}

interface EngineStats {
  totalAgents: number;
  enabledAgents: number;
  totalSignals: number;
  totalTrades: number;
  totalVolume: number;
  signals24h: number;
  trades24h: number;
  lastRun: string | null;
  engineStatus: string;
}

interface AgentState {
  agents: AgentData[];
  signals: SignalData[];
  trades: TradeData[];
  activity: ActivityData[];
  stats: EngineStats;
  executorConfigured: boolean;
}

// ─── Strategy Icons & Colors ───────────────────────────────────────────────

const strategyConfig: Record<string, { icon: typeof Zap; color: string; bg: string }> = {
  momentum: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50' },
  contrarian: { icon: Target, color: 'text-purple-600', bg: 'bg-purple-50' },
  scalper: { icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  value: { icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  arbitrage: { icon: ArrowUpRight, color: 'text-blue-600', bg: 'bg-blue-50' },
};

const severityColors: Record<string, string> = {
  info: 'text-blue-600 bg-blue-50 border-blue-200',
  success: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  warning: 'text-amber-600 bg-amber-50 border-amber-200',
  error: 'text-red-600 bg-red-50 border-red-200',
};

// ─── Component ─────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const { addToast } = useToast();
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'agents' | 'signals' | 'trades' | 'activity'>('agents');

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    agentId: string;
    agentName: string;
    action: 'enable' | 'disable' | 'kill';
  }>({ isOpen: false, agentId: '', agentName: '', action: 'enable' });

  // ─── Data Fetching ─────────────────────────────────────────────────────

  const fetchState = useCallback(async () => {
    try {
      const res = await fetch('/api/agents/state');
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (err) {
      console.error('Failed to fetch agent state:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
    const interval = setInterval(fetchState, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchState]);

  // ─── Run Agents ────────────────────────────────────────────────────────

  const handleRunAgents = async () => {
    setRunning(true);
    addToast('info', 'Engine Starting', 'Scanning markets and running agents...');

    try {
      const res = await fetch('/api/agents/run', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        addToast('success', 'Engine Run Complete',
          `${data.result.signalsGenerated} signals generated, ${data.result.tradesExecuted} trades executed`
        );
      } else {
        addToast('error', 'Engine Error', data.error || 'Unknown error');
      }

      // Refresh state
      await fetchState();
    } catch (err: any) {
      addToast('error', 'Network Error', err.message);
    } finally {
      setRunning(false);
    }
  };

  // ─── Agent Control ─────────────────────────────────────────────────────

  const handleAgentControl = async (agentId: string, action: string) => {
    try {
      const res = await fetch('/api/agents/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('success', 'Agent Updated', `${action} completed successfully`);
        await fetchState();
      }
    } catch (err: any) {
      addToast('error', 'Error', err.message);
    }
  };

  const confirmAction = () => {
    const { agentId, action } = confirmDialog;
    handleAgentControl(agentId, action);
  };

  // ─── Render ────────────────────────────────────────────────────────────

  const agents = state?.agents || [];
  const signals = state?.signals || [];
  const trades = state?.trades || [];
  const activity = state?.activity || [];
  const stats = state?.stats;

  const filteredAgents = agents.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.includes(search)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">AI Agents</h1>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              stats?.engineStatus === 'running'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <Radio className="w-3 h-3 mr-1 animate-pulse" />
              {stats?.engineStatus === 'running' ? 'ENGINE LIVE' : 'ENGINE STOPPED'}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Autonomous trading agents scanning markets and executing live trades
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunAgents}
            disabled={running}
            className="btn-primary flex items-center gap-2"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Running...</>
            ) : (
              <><Play className="w-4 h-4" />Run Agents Now</>
            )}
          </button>
          <button onClick={fetchState} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Engine Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Agents</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{stats.enabledAgents}/{stats.totalAgents}</p>
            <p className="text-[10px] text-slate-500">enabled</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Signals (24h)</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{stats.signals24h}</p>
            <p className="text-[10px] text-slate-500">{stats.totalSignals} total</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Trades (24h)</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{stats.trades24h}</p>
            <p className="text-[10px] text-slate-500">{stats.totalTrades} total</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Volume</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatUSD(stats.totalVolume)}</p>
            <p className="text-[10px] text-slate-500">all time</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Executor</p>
            <p className={`text-xl font-bold mt-1 ${state?.executorConfigured ? 'text-emerald-600' : 'text-red-600'}`}>
              {state?.executorConfigured ? 'Ready' : 'N/A'}
            </p>
            <p className="text-[10px] text-slate-500">{state?.executorConfigured ? 'keys configured' : 'no keys'}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Last Run</p>
            <p className="text-sm font-bold text-slate-800 mt-1">
              {stats.lastRun ? format(new Date(stats.lastRun), 'HH:mm:ss') : 'Never'}
            </p>
            <p className="text-[10px] text-slate-500">
              {stats.lastRun ? format(new Date(stats.lastRun), 'MMM dd') : 'not started'}
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200 w-fit">
        {[
          { key: 'agents', label: 'Agents', count: agents.length },
          { key: 'signals', label: 'Signals', count: signals.length },
          { key: 'trades', label: 'Trades', count: trades.length },
          { key: 'activity', label: 'Activity', count: activity.length },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="ml-3 text-slate-500">Loading agent state...</span>
        </div>
      )}

      {/* ─── Agents Tab ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'agents' && (
        <div className="space-y-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-dark w-full pl-11"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredAgents.map((agent) => {
              const config = strategyConfig[agent.strategy] || strategyConfig.momentum;
              const StrategyIcon = config.icon;

              return (
                <div key={agent.id} className="card-hover p-6 group">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg} ${config.color}`}>
                        <StrategyIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {agent.name}
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono">{agent.id}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      agent.enabled
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${agent.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {agent.enabled ? 'RUNNING' : 'STOPPED'}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-2">{agent.description}</p>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Strategy</p>
                      <p className="text-xs font-bold text-slate-600 mt-0.5 capitalize">{agent.strategy}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Mode</p>
                      <p className={`text-xs font-bold mt-0.5 ${agent.mode === 'live' ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {agent.mode === 'live' ? 'LIVE' : 'PAPER'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Max Order</p>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">{formatUSD(agent.maxOrderUSDC)}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Loss Cap</p>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">{formatUSD(agent.dailyLossCapUSDC)}</p>
                    </div>
                  </div>

                  {/* Activity Stats */}
                  <div className="flex items-center gap-4 mb-4 text-[11px]">
                    <div className="flex items-center gap-1.5 text-blue-600">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="font-semibold">{agent.signalCount} signals</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-600">
                      <DollarSign className="w-3.5 h-3.5" />
                      <span className="font-semibold">{agent.tradeCount} trades</span>
                    </div>
                    {agent.lastSignal && (
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{format(new Date(agent.lastSignal), 'HH:mm')}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        agentId: agent.id,
                        agentName: agent.name,
                        action: agent.enabled ? 'disable' : 'enable',
                      })}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        agent.enabled
                          ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200 ring-1 ring-slate-200'
                      }`}
                    >
                      {agent.enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                      {agent.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <button
                      onClick={() => setConfirmDialog({
                        isOpen: true,
                        agentId: agent.id,
                        agentName: agent.name,
                        action: 'kill',
                      })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-600 ring-1 ring-slate-200 hover:ring-red-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Kill Switch
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Signals Tab ────────────────────────────────────────────────── */}
      {!loading && activeTab === 'signals' && (
        <div className="space-y-4">
          {signals.length === 0 ? (
            <div className="card p-12 text-center">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No signals yet</p>
              <p className="text-xs text-slate-400 mt-1">Click &ldquo;Run Agents Now&rdquo; to scan markets and generate signals</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Market</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Size</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Confidence</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {signals.map((sig) => (
                      <tr key={sig.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {format(new Date(sig.timestamp), 'MMM dd HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-slate-700">{sig.agentName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600 max-w-[200px] truncate block">{sig.market}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                            sig.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {sig.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {sig.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono font-semibold text-slate-700">
                          ${sig.price.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">
                          ${sig.sizeUSDC.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-xs font-bold ${
                            sig.confidence >= 0.8 ? 'text-emerald-600' :
                            sig.confidence >= 0.6 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {(sig.confidence * 100).toFixed(0)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sig.status === 'executed' ? 'bg-emerald-50 text-emerald-700' :
                            sig.status === 'executing' ? 'bg-blue-50 text-blue-700' :
                            sig.status === 'failed' ? 'bg-red-50 text-red-700' :
                            sig.status === 'generated' ? 'bg-amber-50 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {sig.status === 'executed' && <CheckCircle className="w-3 h-3" />}
                            {sig.status === 'failed' && <XCircle className="w-3 h-3" />}
                            {sig.status === 'executing' && <Loader2 className="w-3 h-3 animate-spin" />}
                            {sig.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Trades Tab ─────────────────────────────────────────────────── */}
      {!loading && activeTab === 'trades' && (
        <div className="space-y-4">
          {trades.length === 0 ? (
            <div className="card p-12 text-center">
              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No trades yet</p>
              <p className="text-xs text-slate-400 mt-1">Agents will execute trades after generating signals</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Agent</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Market</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Side</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Shares</th>
                      <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Order ID</th>
                      <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trades.map((trade) => (
                      <tr key={trade.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                          {format(new Date(trade.timestamp), 'MMM dd HH:mm:ss')}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-slate-700">{trade.agentName}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600 max-w-[200px] truncate block">{trade.market}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                            trade.side === 'BUY' ? 'text-emerald-600' : 'text-red-600'
                          }`}>
                            {trade.side === 'BUY' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {trade.side}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono font-semibold text-slate-700">
                          ${trade.price.toFixed(3)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono text-slate-600">
                          {trade.size}
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-mono font-semibold text-slate-700">
                          ${trade.sizeUSDC.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono text-slate-400 max-w-[120px] truncate block">
                            {trade.orderId}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            trade.status === 'placed' || trade.status === 'filled' ? 'bg-emerald-50 text-emerald-700' :
                            trade.status === 'failed' ? 'bg-red-50 text-red-700' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {trade.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Activity Tab ───────────────────────────────────────────────── */}
      {!loading && activeTab === 'activity' && (
        <div className="space-y-3">
          {activity.length === 0 ? (
            <div className="card p-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-600">No activity yet</p>
              <p className="text-xs text-slate-400 mt-1">Activity will appear here when agents start running</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activity.map((entry) => (
                <div
                  key={entry.id}
                  className={`card p-4 border-l-4 ${severityColors[entry.severity] || severityColors.info}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {entry.agentName && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {entry.agentName}
                          </span>
                        )}
                        <span className="text-[10px] font-mono text-slate-400">
                          {format(new Date(entry.timestamp), 'HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700">{entry.message}</p>
                      {entry.details && (
                        <p className="text-[11px] text-slate-500 mt-1">{entry.details}</p>
                      )}
                    </div>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      entry.severity === 'success' ? 'bg-emerald-100 text-emerald-700' :
                      entry.severity === 'error' ? 'bg-red-100 text-red-700' :
                      entry.severity === 'warning' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {entry.type.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmAction}
        title={
          confirmDialog.action === 'kill' ? 'Activate Kill Switch' :
          confirmDialog.action === 'enable' ? 'Enable Agent' : 'Disable Agent'
        }
        message={
          confirmDialog.action === 'kill'
            ? `This will immediately halt all trading activity for "${confirmDialog.agentName}". Are you sure?`
            : confirmDialog.action === 'enable'
            ? `Enable "${confirmDialog.agentName}" to start scanning markets and executing trades?`
            : `Disable "${confirmDialog.agentName}"? It will stop generating signals and executing trades.`
        }
        confirmText={confirmDialog.action === 'kill' ? 'Activate Kill Switch' : confirmDialog.action === 'enable' ? 'Enable' : 'Disable'}
        variant={confirmDialog.action === 'kill' ? 'danger' : 'info'}
      />
    </div>
  );
}
