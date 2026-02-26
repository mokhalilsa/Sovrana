import {
  Agent, AgentRiskLimits, Signal, Order, Fill, Position,
  PnlSnapshot, AuditLog, Market, DashboardStats
} from '@/types';

export const mockAgents: Agent[] = [
  {
    id: 'agt-001', name: 'Alpha Sentinel', description: 'Primary momentum-based trading agent targeting high-volume political markets.',
    mode: 'trading_enabled', status: 'running', is_enabled: true, is_simulate: false,
    manual_approve: false, kill_switch: false, wallet_profile_id: 'wp-0x1a2b',
    created_at: '2026-01-15T08:00:00Z', updated_at: '2026-02-26T09:30:00Z',
  },
  {
    id: 'agt-002', name: 'Beta Scanner', description: 'Contrarian signal scanner for undervalued prediction markets.',
    mode: 'trading_enabled', status: 'running', is_enabled: true, is_simulate: false,
    manual_approve: true, kill_switch: false, wallet_profile_id: 'wp-0x3c4d',
    created_at: '2026-01-20T10:00:00Z', updated_at: '2026-02-26T09:15:00Z',
  },
  {
    id: 'agt-003', name: 'Gamma Hedger', description: 'Hedging agent for portfolio risk management across correlated markets.',
    mode: 'read_only', status: 'idle', is_enabled: true, is_simulate: true,
    manual_approve: true, kill_switch: false,
    created_at: '2026-02-01T14:00:00Z', updated_at: '2026-02-25T16:00:00Z',
  },
  {
    id: 'agt-004', name: 'Delta Arbitrage', description: 'Cross-market arbitrage agent exploiting price discrepancies.',
    mode: 'trading_enabled', status: 'errored', is_enabled: false, is_simulate: false,
    manual_approve: false, kill_switch: true, wallet_profile_id: 'wp-0x5e6f',
    created_at: '2026-02-10T09:00:00Z', updated_at: '2026-02-26T08:45:00Z',
  },
  {
    id: 'agt-005', name: 'Epsilon Trend', description: 'Long-term trend following agent for macro event markets.',
    mode: 'trading_enabled', status: 'stopped', is_enabled: false, is_simulate: false,
    manual_approve: false, kill_switch: false, wallet_profile_id: 'wp-0x7g8h',
    created_at: '2026-02-05T11:00:00Z', updated_at: '2026-02-24T20:00:00Z',
  },
  {
    id: 'agt-006', name: 'Zeta Scalper', description: 'High-frequency scalping agent for short-term price movements.',
    mode: 'trading_enabled', status: 'running', is_enabled: true, is_simulate: false,
    manual_approve: false, kill_switch: false, wallet_profile_id: 'wp-0x9i0j',
    created_at: '2026-02-12T07:00:00Z', updated_at: '2026-02-26T09:45:00Z',
  },
];

export const mockRiskLimits: AgentRiskLimits[] = [
  { id: 'rl-001', agent_id: 'agt-001', max_order_size_usdc: 500, max_exposure_usdc: 5000, daily_loss_cap_usdc: 1000, slippage_cap_pct: 2.5, cooldown_seconds: 30, max_open_orders: 10 },
  { id: 'rl-002', agent_id: 'agt-002', max_order_size_usdc: 300, max_exposure_usdc: 3000, daily_loss_cap_usdc: 600, slippage_cap_pct: 1.5, cooldown_seconds: 60, max_open_orders: 5 },
  { id: 'rl-003', agent_id: 'agt-003', max_order_size_usdc: 200, max_exposure_usdc: 2000, daily_loss_cap_usdc: 400, slippage_cap_pct: 3.0, cooldown_seconds: 120, max_open_orders: 3 },
  { id: 'rl-004', agent_id: 'agt-004', max_order_size_usdc: 1000, max_exposure_usdc: 10000, daily_loss_cap_usdc: 2000, slippage_cap_pct: 1.0, cooldown_seconds: 15, max_open_orders: 20 },
  { id: 'rl-005', agent_id: 'agt-005', max_order_size_usdc: 750, max_exposure_usdc: 7500, daily_loss_cap_usdc: 1500, slippage_cap_pct: 2.0, cooldown_seconds: 45, max_open_orders: 8 },
  { id: 'rl-006', agent_id: 'agt-006', max_order_size_usdc: 150, max_exposure_usdc: 1500, daily_loss_cap_usdc: 300, slippage_cap_pct: 0.5, cooldown_seconds: 5, max_open_orders: 25 },
];

export const mockSignals: Signal[] = [
  { id: 'sig-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-trump-2028', token_id: 'tok-yes-trump', side: 'buy', price: 0.62, size_usdc: 250, confidence: 0.87, status: 'executed', created_at: '2026-02-26T09:00:00Z' },
  { id: 'sig-002', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-fed-rate', token_id: 'tok-yes-fed', side: 'buy', price: 0.45, size_usdc: 180, confidence: 0.72, status: 'approved', created_at: '2026-02-26T09:15:00Z' },
  { id: 'sig-003', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-btc-100k', token_id: 'tok-no-btc', side: 'sell', price: 0.38, size_usdc: 120, confidence: 0.65, status: 'pending', created_at: '2026-02-26T09:20:00Z' },
  { id: 'sig-004', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-ai-regulation', token_id: 'tok-yes-ai', side: 'buy', price: 0.71, size_usdc: 300, confidence: 0.91, status: 'executed', created_at: '2026-02-26T08:45:00Z' },
  { id: 'sig-005', agent_id: 'agt-004', agent_name: 'Delta Arbitrage', condition_id: 'cond-recession', token_id: 'tok-yes-recess', side: 'buy', price: 0.29, size_usdc: 500, confidence: 0.58, status: 'rejected', rejection_reason: 'Kill switch activated', created_at: '2026-02-26T08:30:00Z' },
  { id: 'sig-006', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-eth-merge', token_id: 'tok-yes-eth', side: 'buy', price: 0.55, size_usdc: 100, confidence: 0.78, status: 'executed', created_at: '2026-02-26T09:25:00Z' },
  { id: 'sig-007', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-trump-2028', token_id: 'tok-no-trump', side: 'sell', price: 0.38, size_usdc: 80, confidence: 0.69, status: 'expired', created_at: '2026-02-26T07:00:00Z' },
  { id: 'sig-008', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-ukraine-peace', token_id: 'tok-yes-ukraine', side: 'buy', price: 0.41, size_usdc: 200, confidence: 0.83, status: 'pending', created_at: '2026-02-26T09:30:00Z' },
];

export const mockOrders: Order[] = [
  { id: 'ord-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', signal_id: 'sig-001', polymarket_order_id: 'pm-0x1234', condition_id: 'cond-trump-2028', token_id: 'tok-yes-trump', side: 'buy', order_type: 'limit', price: 0.62, size_usdc: 250, status: 'filled', placed_at: '2026-02-26T09:01:00Z', created_at: '2026-02-26T09:00:30Z' },
  { id: 'ord-002', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', signal_id: 'sig-002', condition_id: 'cond-fed-rate', token_id: 'tok-yes-fed', side: 'buy', order_type: 'limit', price: 0.45, size_usdc: 180, status: 'placed', placed_at: '2026-02-26T09:16:00Z', created_at: '2026-02-26T09:15:30Z' },
  { id: 'ord-003', agent_id: 'agt-002', agent_name: 'Beta Scanner', signal_id: 'sig-004', polymarket_order_id: 'pm-0x5678', condition_id: 'cond-ai-regulation', token_id: 'tok-yes-ai', side: 'buy', order_type: 'market', size_usdc: 300, status: 'filled', placed_at: '2026-02-26T08:46:00Z', created_at: '2026-02-26T08:45:30Z' },
  { id: 'ord-004', agent_id: 'agt-004', agent_name: 'Delta Arbitrage', signal_id: 'sig-005', condition_id: 'cond-recession', token_id: 'tok-yes-recess', side: 'buy', order_type: 'limit', price: 0.29, size_usdc: 500, status: 'blocked', block_reason: 'Agent kill switch is active', created_at: '2026-02-26T08:30:30Z' },
  { id: 'ord-005', agent_id: 'agt-006', agent_name: 'Zeta Scalper', signal_id: 'sig-006', polymarket_order_id: 'pm-0x9abc', condition_id: 'cond-eth-merge', token_id: 'tok-yes-eth', side: 'buy', order_type: 'limit', price: 0.55, size_usdc: 100, status: 'partial', placed_at: '2026-02-26T09:26:00Z', created_at: '2026-02-26T09:25:30Z' },
  { id: 'ord-006', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-btc-100k', token_id: 'tok-yes-btc', side: 'buy', order_type: 'limit', price: 0.52, size_usdc: 150, status: 'pending', created_at: '2026-02-26T09:28:00Z' },
  { id: 'ord-007', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-ukraine-peace', token_id: 'tok-yes-ukraine', side: 'buy', order_type: 'limit', price: 0.41, size_usdc: 200, status: 'cancelled', created_at: '2026-02-26T08:00:00Z' },
];

export const mockFills: Fill[] = [
  { id: 'fill-001', order_id: 'ord-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-trump-2028', token_id: 'tok-yes-trump', side: 'buy', fill_price: 0.62, fill_size_usdc: 250, fee_usdc: 0.50, filled_at: '2026-02-26T09:01:15Z' },
  { id: 'fill-002', order_id: 'ord-003', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-ai-regulation', token_id: 'tok-yes-ai', side: 'buy', fill_price: 0.715, fill_size_usdc: 300, fee_usdc: 0.60, filled_at: '2026-02-26T08:46:10Z' },
  { id: 'fill-003', order_id: 'ord-005', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-eth-merge', token_id: 'tok-yes-eth', side: 'buy', fill_price: 0.551, fill_size_usdc: 60, fee_usdc: 0.12, filled_at: '2026-02-26T09:26:05Z' },
  { id: 'fill-004', order_id: 'ord-005', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-eth-merge', token_id: 'tok-yes-eth', side: 'buy', fill_price: 0.553, fill_size_usdc: 25, fee_usdc: 0.05, filled_at: '2026-02-26T09:27:30Z' },
  { id: 'fill-005', order_id: 'ord-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-trump-2028', token_id: 'tok-yes-trump', side: 'buy', fill_price: 0.618, fill_size_usdc: 125, fee_usdc: 0.25, filled_at: '2026-02-25T14:30:00Z' },
  { id: 'fill-006', order_id: 'ord-003', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-fed-rate', token_id: 'tok-yes-fed', side: 'buy', fill_price: 0.44, fill_size_usdc: 200, fee_usdc: 0.40, filled_at: '2026-02-25T11:15:00Z' },
];

export const mockPositions: Position[] = [
  { id: 'pos-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-trump-2028', token_id: 'tok-yes-trump', side: 'buy', size_usdc: 375, avg_entry_price: 0.619, current_price: 0.64, unrealized_pnl: 12.68, realized_pnl: 0, is_open: true, opened_at: '2026-02-25T14:30:00Z' },
  { id: 'pos-002', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-ai-regulation', token_id: 'tok-yes-ai', side: 'buy', size_usdc: 300, avg_entry_price: 0.715, current_price: 0.73, unrealized_pnl: 6.29, realized_pnl: 0, is_open: true, opened_at: '2026-02-26T08:46:10Z' },
  { id: 'pos-003', agent_id: 'agt-006', agent_name: 'Zeta Scalper', condition_id: 'cond-eth-merge', token_id: 'tok-yes-eth', side: 'buy', size_usdc: 85, avg_entry_price: 0.5518, current_price: 0.56, unrealized_pnl: 1.26, realized_pnl: 0, is_open: true, opened_at: '2026-02-26T09:26:05Z' },
  { id: 'pos-004', agent_id: 'agt-002', agent_name: 'Beta Scanner', condition_id: 'cond-fed-rate', token_id: 'tok-yes-fed', side: 'buy', size_usdc: 200, avg_entry_price: 0.44, current_price: 0.46, unrealized_pnl: 9.09, realized_pnl: 15.50, is_open: true, opened_at: '2026-02-25T11:15:00Z' },
  { id: 'pos-005', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', condition_id: 'cond-ukraine-peace', token_id: 'tok-yes-ukraine', side: 'buy', size_usdc: 150, avg_entry_price: 0.39, current_price: 0.42, unrealized_pnl: 11.54, realized_pnl: 22.30, is_open: false, opened_at: '2026-02-20T10:00:00Z' },
];

export const mockPnlSnapshots: PnlSnapshot[] = [
  { id: 'pnl-001', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-20', realized_pnl: 45.20, unrealized_pnl: 12.00, total_pnl: 57.20, total_volume: 1200, trade_count: 8 },
  { id: 'pnl-002', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-21', realized_pnl: 52.80, unrealized_pnl: 18.50, total_pnl: 71.30, total_volume: 1450, trade_count: 11 },
  { id: 'pnl-003', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-22', realized_pnl: 48.10, unrealized_pnl: -5.20, total_pnl: 42.90, total_volume: 980, trade_count: 6 },
  { id: 'pnl-004', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-23', realized_pnl: 61.40, unrealized_pnl: 22.30, total_pnl: 83.70, total_volume: 1680, trade_count: 14 },
  { id: 'pnl-005', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-24', realized_pnl: 55.90, unrealized_pnl: 15.80, total_pnl: 71.70, total_volume: 1320, trade_count: 9 },
  { id: 'pnl-006', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-25', realized_pnl: 68.30, unrealized_pnl: 24.50, total_pnl: 92.80, total_volume: 1890, trade_count: 16 },
  { id: 'pnl-007', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', snapshot_date: '2026-02-26', realized_pnl: 72.10, unrealized_pnl: 12.68, total_pnl: 84.78, total_volume: 1550, trade_count: 12 },
  { id: 'pnl-008', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-20', realized_pnl: 22.50, unrealized_pnl: 8.00, total_pnl: 30.50, total_volume: 800, trade_count: 5 },
  { id: 'pnl-009', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-21', realized_pnl: 31.20, unrealized_pnl: 12.40, total_pnl: 43.60, total_volume: 950, trade_count: 7 },
  { id: 'pnl-010', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-22', realized_pnl: 28.80, unrealized_pnl: -2.10, total_pnl: 26.70, total_volume: 720, trade_count: 4 },
  { id: 'pnl-011', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-23', realized_pnl: 35.60, unrealized_pnl: 14.90, total_pnl: 50.50, total_volume: 1100, trade_count: 9 },
  { id: 'pnl-012', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-24', realized_pnl: 40.10, unrealized_pnl: 9.30, total_pnl: 49.40, total_volume: 1050, trade_count: 8 },
  { id: 'pnl-013', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-25', realized_pnl: 45.80, unrealized_pnl: 18.20, total_pnl: 64.00, total_volume: 1280, trade_count: 11 },
  { id: 'pnl-014', agent_id: 'agt-002', agent_name: 'Beta Scanner', snapshot_date: '2026-02-26', realized_pnl: 15.50, unrealized_pnl: 15.38, total_pnl: 30.88, total_volume: 500, trade_count: 3 },
  { id: 'pnl-015', agent_id: 'agt-006', agent_name: 'Zeta Scalper', snapshot_date: '2026-02-24', realized_pnl: 8.20, unrealized_pnl: 3.10, total_pnl: 11.30, total_volume: 450, trade_count: 12 },
  { id: 'pnl-016', agent_id: 'agt-006', agent_name: 'Zeta Scalper', snapshot_date: '2026-02-25', realized_pnl: 12.50, unrealized_pnl: 5.80, total_pnl: 18.30, total_volume: 620, trade_count: 18 },
  { id: 'pnl-017', agent_id: 'agt-006', agent_name: 'Zeta Scalper', snapshot_date: '2026-02-26', realized_pnl: 0, unrealized_pnl: 1.26, total_pnl: 1.26, total_volume: 85, trade_count: 2 },
];

export const mockAuditLogs: AuditLog[] = [
  { id: 'log-001', event_type: 'agent.started', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', message: 'Agent started successfully', severity: 'info', created_at: '2026-02-26T08:00:00Z' },
  { id: 'log-002', event_type: 'signal.created', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', entity_type: 'signal', entity_id: 'sig-001', message: 'New BUY signal generated for cond-trump-2028 at $0.62', severity: 'info', created_at: '2026-02-26T09:00:00Z' },
  { id: 'log-003', event_type: 'order.placed', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', entity_type: 'order', entity_id: 'ord-001', message: 'Limit order placed: BUY 250 USDC at $0.62', severity: 'info', created_at: '2026-02-26T09:01:00Z' },
  { id: 'log-004', event_type: 'order.filled', agent_id: 'agt-001', agent_name: 'Alpha Sentinel', entity_type: 'order', entity_id: 'ord-001', message: 'Order fully filled at $0.62', severity: 'info', created_at: '2026-02-26T09:01:15Z' },
  { id: 'log-005', event_type: 'signal.rejected', agent_id: 'agt-004', agent_name: 'Delta Arbitrage', entity_type: 'signal', entity_id: 'sig-005', message: 'Signal rejected: Kill switch activated', severity: 'warning', created_at: '2026-02-26T08:30:00Z' },
  { id: 'log-006', event_type: 'order.blocked', agent_id: 'agt-004', agent_name: 'Delta Arbitrage', entity_type: 'order', entity_id: 'ord-004', message: 'Order blocked: Agent kill switch is active', severity: 'error', created_at: '2026-02-26T08:30:30Z' },
  { id: 'log-007', event_type: 'agent.error', agent_id: 'agt-004', agent_name: 'Delta Arbitrage', message: 'Agent encountered an error: API rate limit exceeded', severity: 'error', created_at: '2026-02-26T08:45:00Z' },
  { id: 'log-008', event_type: 'agent.started', agent_id: 'agt-006', agent_name: 'Zeta Scalper', message: 'Agent started successfully', severity: 'info', created_at: '2026-02-26T07:30:00Z' },
  { id: 'log-009', event_type: 'risk.breach', agent_id: 'agt-006', agent_name: 'Zeta Scalper', message: 'Approaching daily loss cap: 85% utilized', severity: 'warning', created_at: '2026-02-26T09:20:00Z' },
  { id: 'log-010', event_type: 'system.health', message: 'System health check passed. All services operational.', severity: 'info', created_at: '2026-02-26T09:00:00Z' },
  { id: 'log-011', event_type: 'agent.mode_changed', agent_id: 'agt-003', agent_name: 'Gamma Hedger', message: 'Agent mode changed from trading_enabled to read_only', severity: 'warning', created_at: '2026-02-25T16:00:00Z' },
  { id: 'log-012', event_type: 'signal.expired', agent_id: 'agt-006', agent_name: 'Zeta Scalper', entity_type: 'signal', entity_id: 'sig-007', message: 'Signal expired: TTL exceeded', severity: 'info', created_at: '2026-02-26T09:00:00Z' },
];

export const mockMarkets: Market[] = [
  { condition_id: 'cond-trump-2028', question: 'Will Trump win the 2028 Presidential Election?', category: 'Politics', yes_price: 0.64, no_price: 0.36, volume_24h: 2450000, active: true },
  { condition_id: 'cond-fed-rate', question: 'Will the Fed cut rates by June 2026?', category: 'Economics', yes_price: 0.46, no_price: 0.54, volume_24h: 1820000, active: true },
  { condition_id: 'cond-btc-100k', question: 'Will Bitcoin reach $100K by end of 2026?', category: 'Crypto', yes_price: 0.58, no_price: 0.42, volume_24h: 3100000, active: true },
  { condition_id: 'cond-ai-regulation', question: 'Will the US pass major AI regulation in 2026?', category: 'Technology', yes_price: 0.73, no_price: 0.27, volume_24h: 980000, active: true },
  { condition_id: 'cond-recession', question: 'Will the US enter a recession in 2026?', category: 'Economics', yes_price: 0.31, no_price: 0.69, volume_24h: 1560000, active: true },
  { condition_id: 'cond-eth-merge', question: 'Will Ethereum surpass $5000 by Q3 2026?', category: 'Crypto', yes_price: 0.56, no_price: 0.44, volume_24h: 2200000, active: true },
  { condition_id: 'cond-ukraine-peace', question: 'Will there be a Ukraine peace deal by end of 2026?', category: 'Geopolitics', yes_price: 0.42, no_price: 0.58, volume_24h: 1350000, active: true },
  { condition_id: 'cond-spacex-mars', question: 'Will SpaceX launch a crewed Mars mission by 2028?', category: 'Science', yes_price: 0.15, no_price: 0.85, volume_24h: 450000, active: true },
  { condition_id: 'cond-climate-15', question: 'Will global temperatures exceed 1.5C threshold in 2026?', category: 'Climate', yes_price: 0.68, no_price: 0.32, volume_24h: 720000, active: false },
];

export const mockDashboardStats: DashboardStats = {
  total_agents: 6,
  active_agents: 3,
  total_pnl: 116.92,
  total_volume: 8475,
  open_positions: 4,
  pending_signals: 2,
  total_orders_today: 7,
  total_fills_today: 4,
};
