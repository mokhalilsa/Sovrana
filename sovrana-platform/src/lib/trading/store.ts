/**
 * Agent State Store
 * In-memory store for agent state, signals, trades, and activity.
 * Persisted across API calls within the same serverless instance.
 * For production, this would use a database (Vercel KV, Postgres, etc.)
 */

import { AgentConfig, AgentSignal, AgentTrade, AgentState, DEFAULT_AGENTS } from './engine';

// ─── Global State (persisted in serverless memory) ─────────────────────────

// Use globalThis to persist across hot reloads in development
const globalStore = globalThis as unknown as {
  __sovrana_store?: AgentState;
};

function getInitialState(): AgentState {
  return {
    agents: [...DEFAULT_AGENTS],
    signals: [],
    trades: [],
    lastRun: null,
    totalSignals: 0,
    totalTrades: 0,
    totalVolume: 0,
    engineStatus: 'running',
  };
}

export function getStore(): AgentState {
  if (!globalStore.__sovrana_store) {
    globalStore.__sovrana_store = getInitialState();
  }
  return globalStore.__sovrana_store;
}

export function updateStore(updates: Partial<AgentState>): AgentState {
  const store = getStore();
  Object.assign(store, updates);
  return store;
}

// ─── Agent Management ──────────────────────────────────────────────────────

export function getAgents(): AgentConfig[] {
  return getStore().agents;
}

export function getAgent(id: string): AgentConfig | undefined {
  return getStore().agents.find(a => a.id === id);
}

export function updateAgent(id: string, updates: Partial<AgentConfig>): AgentConfig | null {
  const store = getStore();
  const idx = store.agents.findIndex(a => a.id === id);
  if (idx === -1) return null;
  store.agents[idx] = { ...store.agents[idx], ...updates };
  return store.agents[idx];
}

export function addAgent(agent: AgentConfig): void {
  getStore().agents.push(agent);
}

// ─── Signal Management ─────────────────────────────────────────────────────

export function addSignal(signal: AgentSignal): void {
  const store = getStore();
  store.signals.unshift(signal); // newest first
  store.totalSignals++;
  // Keep last 200 signals
  if (store.signals.length > 200) {
    store.signals = store.signals.slice(0, 200);
  }
}

export function getSignals(limit: number = 50, agentId?: string): AgentSignal[] {
  const store = getStore();
  let signals = store.signals;
  if (agentId) {
    signals = signals.filter(s => s.agentId === agentId);
  }
  return signals.slice(0, limit);
}

export function updateSignal(id: string, updates: Partial<AgentSignal>): void {
  const store = getStore();
  const idx = store.signals.findIndex(s => s.id === id);
  if (idx !== -1) {
    store.signals[idx] = { ...store.signals[idx], ...updates };
  }
}

// ─── Trade Management ──────────────────────────────────────────────────────

export function addTrade(trade: AgentTrade): void {
  const store = getStore();
  store.trades.unshift(trade); // newest first
  store.totalTrades++;
  store.totalVolume += trade.sizeUSDC;
  // Keep last 200 trades
  if (store.trades.length > 200) {
    store.trades = store.trades.slice(0, 200);
  }
}

export function getTrades(limit: number = 50, agentId?: string): AgentTrade[] {
  const store = getStore();
  let trades = store.trades;
  if (agentId) {
    trades = trades.filter(t => t.agentId === agentId);
  }
  return trades.slice(0, limit);
}

export function updateTrade(id: string, updates: Partial<AgentTrade>): void {
  const store = getStore();
  const idx = store.trades.findIndex(t => t.id === id);
  if (idx !== -1) {
    store.trades[idx] = { ...store.trades[idx], ...updates };
  }
}

// ─── Activity Feed ─────────────────────────────────────────────────────────

export interface ActivityEntry {
  id: string;
  type: 'signal' | 'trade' | 'agent_start' | 'agent_stop' | 'engine_run' | 'error' | 'order_placed' | 'order_filled';
  agentId?: string;
  agentName?: string;
  message: string;
  details?: string;
  timestamp: string;
  severity: 'info' | 'success' | 'warning' | 'error';
}

const globalActivity = globalThis as unknown as {
  __sovrana_activity?: ActivityEntry[];
};

export function getActivityLog(): ActivityEntry[] {
  if (!globalActivity.__sovrana_activity) {
    globalActivity.__sovrana_activity = [];
  }
  return globalActivity.__sovrana_activity;
}

export function addActivity(entry: Omit<ActivityEntry, 'id' | 'timestamp'>): void {
  const log = getActivityLog();
  log.unshift({
    ...entry,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  // Keep last 500 entries
  if (log.length > 500) {
    globalActivity.__sovrana_activity = log.slice(0, 500);
  }
}

// ─── Statistics ────────────────────────────────────────────────────────────

export function getEngineStats() {
  const store = getStore();
  const enabledAgents = store.agents.filter(a => a.enabled);
  const recentSignals = store.signals.filter(s => {
    const age = Date.now() - new Date(s.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000; // last 24h
  });
  const recentTrades = store.trades.filter(t => {
    const age = Date.now() - new Date(t.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000;
  });

  return {
    totalAgents: store.agents.length,
    enabledAgents: enabledAgents.length,
    totalSignals: store.totalSignals,
    totalTrades: store.totalTrades,
    totalVolume: Math.round(store.totalVolume * 100) / 100,
    signals24h: recentSignals.length,
    trades24h: recentTrades.length,
    lastRun: store.lastRun,
    engineStatus: store.engineStatus,
    signalsByStatus: {
      generated: store.signals.filter(s => s.status === 'generated').length,
      executing: store.signals.filter(s => s.status === 'executing').length,
      executed: store.signals.filter(s => s.status === 'executed').length,
      failed: store.signals.filter(s => s.status === 'failed').length,
    },
  };
}
