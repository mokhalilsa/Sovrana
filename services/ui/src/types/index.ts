export type AgentMode = 'read_only' | 'trading_enabled'
export type AgentStatus = 'idle' | 'running' | 'errored' | 'stopped' | 'killed'
export type SignalSide = 'buy' | 'sell'
export type SignalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'
export type OrderStatus = 'pending' | 'placed' | 'partial' | 'filled' | 'cancelled' | 'rejected' | 'blocked'

export interface Agent {
  id: string
  name: string
  description?: string
  mode: AgentMode
  status: AgentStatus
  is_enabled: boolean
  is_simulate: boolean
  manual_approve: boolean
  kill_switch: boolean
  wallet_profile_id?: string
  created_at: string
  updated_at: string
}

export interface AgentRiskLimits {
  id: string
  agent_id: string
  max_order_size_usdc: number
  max_exposure_usdc: number
  daily_loss_cap_usdc: number
  slippage_cap_pct: number
  cooldown_seconds: number
  max_open_orders: number
}

export interface WalletProfile {
  id: string
  name: string
  evm_address: string
  is_shared: boolean
  chain_id: number
}

export interface Strategy {
  id: string
  name: string
  template_type: string
  description?: string
  config_schema: Record<string, unknown>
}

export interface Signal {
  id: string
  agent_id: string
  agent_name: string
  condition_id: string
  token_id: string
  side: SignalSide
  price: number
  size_usdc: number
  confidence: number
  status: SignalStatus
  rejection_reason?: string
  created_at: string
}

export interface Order {
  id: string
  agent_id: string
  agent_name: string
  signal_id?: string
  polymarket_order_id?: string
  condition_id: string
  token_id: string
  side: SignalSide
  order_type: string
  price?: number
  size_usdc: number
  status: OrderStatus
  block_reason?: string
  placed_at?: string
  created_at: string
}

export interface Fill {
  id: string
  order_id: string
  agent_id: string
  agent_name: string
  condition_id: string
  token_id: string
  side: SignalSide
  fill_price: number
  fill_size_usdc: number
  fee_usdc: number
  filled_at: string
}

export interface Position {
  id: string
  agent_id: string
  agent_name: string
  condition_id: string
  token_id: string
  side: SignalSide
  size_usdc: number
  avg_entry_price: number
  current_price?: number
  unrealized_pnl?: number
  realized_pnl: number
  is_open: boolean
  opened_at: string
}

export interface PnlSnapshot {
  id: string
  agent_id: string
  agent_name: string
  snapshot_date: string
  realized_pnl: number
  unrealized_pnl: number
  total_pnl: number
  total_volume: number
  trade_count: number
}

export interface AuditLog {
  id: string
  event_type: string
  agent_id?: string
  agent_name?: string
  entity_type?: string
  entity_id?: string
  message: string
  severity: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface Market {
  condition_id: string
  question: string
  category?: string
  yes_price: number
  no_price: number
  volume_24h: number
  active: boolean
}
