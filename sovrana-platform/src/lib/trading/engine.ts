/**
 * Sovrana Trading Engine
 * Core autonomous agent logic: market scanning, signal generation, order execution
 */

// ─── Agent Definitions ─────────────────────────────────────────────────────

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  strategy: 'momentum' | 'value' | 'contrarian' | 'scalper' | 'arbitrage';
  enabled: boolean;
  mode: 'live' | 'paper';
  maxOrderUSDC: number;
  maxExposureUSDC: number;
  dailyLossCapUSDC: number;
  minConfidence: number;
  cooldownMs: number;
  targetMarkets: string[]; // empty = all markets
}

export interface AgentSignal {
  id: string;
  agentId: string;
  agentName: string;
  timestamp: string;
  market: string;
  marketSlug: string;
  tokenId: string;
  conditionId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  sizeUSDC: number;
  confidence: number;
  reasoning: string;
  status: 'generated' | 'approved' | 'executing' | 'executed' | 'failed' | 'rejected';
  orderId?: string;
  errorMessage?: string;
}

export interface AgentTrade {
  id: string;
  agentId: string;
  agentName: string;
  signalId: string;
  timestamp: string;
  market: string;
  tokenId: string;
  side: 'BUY' | 'SELL';
  price: number;
  size: number;
  sizeUSDC: number;
  orderId: string;
  status: 'placed' | 'filled' | 'partial' | 'cancelled' | 'failed';
  txHash?: string;
  fillPrice?: number;
  fee?: number;
}

export interface AgentState {
  agents: AgentConfig[];
  signals: AgentSignal[];
  trades: AgentTrade[];
  lastRun: string | null;
  totalSignals: number;
  totalTrades: number;
  totalVolume: number;
  engineStatus: 'running' | 'stopped' | 'error';
}

// ─── Default Agents ────────────────────────────────────────────────────────

export const DEFAULT_AGENTS: AgentConfig[] = [
  {
    id: 'agt-alpha',
    name: 'Alpha Sentinel',
    description: 'Momentum-based agent targeting high-volume political and geopolitical markets. Buys when price momentum is strong and volume confirms the trend.',
    strategy: 'momentum',
    enabled: true,
    mode: 'live',
    maxOrderUSDC: 5.00,
    maxExposureUSDC: 25.00,
    dailyLossCapUSDC: 10.00,
    minConfidence: 0.65,
    cooldownMs: 300000, // 5 min
    targetMarkets: [],
  },
  {
    id: 'agt-beta',
    name: 'Beta Scanner',
    description: 'Contrarian signal scanner that identifies undervalued outcomes where the market price diverges from estimated fair value. Buys cheap, sells expensive.',
    strategy: 'contrarian',
    enabled: true,
    mode: 'live',
    maxOrderUSDC: 3.00,
    maxExposureUSDC: 15.00,
    dailyLossCapUSDC: 8.00,
    minConfidence: 0.70,
    cooldownMs: 600000, // 10 min
    targetMarkets: [],
  },
  {
    id: 'agt-zeta',
    name: 'Zeta Scalper',
    description: 'High-frequency scalping agent that exploits bid-ask spread inefficiencies. Places limit orders near the spread to capture small but consistent profits.',
    strategy: 'scalper',
    enabled: true,
    mode: 'live',
    maxOrderUSDC: 2.00,
    maxExposureUSDC: 10.00,
    dailyLossCapUSDC: 5.00,
    minConfidence: 0.60,
    cooldownMs: 120000, // 2 min
    targetMarkets: [],
  },
];

// ─── Market Analysis ───────────────────────────────────────────────────────

export interface MarketData {
  conditionId: string;
  questionId: string;
  question: string;
  slug: string;
  tokens: { token_id: string; outcome: string; price: number; winner: boolean }[];
  volume24h: number;
  liquidity: number;
  spread: number;
  active: boolean;
  negRisk: boolean;
  endDate: string;
}

export interface OrderBookData {
  bids: { price: string; size: string }[];
  asks: { price: string; size: string }[];
  spread: number;
  midpoint: number;
}

/**
 * Analyze a market and generate a trading signal based on the agent's strategy
 */
export function analyzeMarket(
  agent: AgentConfig,
  market: MarketData,
  orderbook: OrderBookData | null,
): AgentSignal | null {
  // Skip inactive or low-liquidity markets
  if (!market.active) return null;
  if (market.volume24h < 100) return null;

  const now = new Date().toISOString();
  const signalId = `sig-${agent.id}-${Date.now()}`;

  // Find the best token to trade
  for (const token of market.tokens) {
    if (token.winner) continue; // Already resolved
    if (token.price <= 0.01 || token.price >= 0.99) continue; // Too extreme

    let signal: AgentSignal | null = null;

    switch (agent.strategy) {
      case 'momentum':
        signal = momentumStrategy(agent, market, token, orderbook, signalId, now);
        break;
      case 'contrarian':
        signal = contrarianStrategy(agent, market, token, orderbook, signalId, now);
        break;
      case 'scalper':
        signal = scalperStrategy(agent, market, token, orderbook, signalId, now);
        break;
      case 'value':
        signal = valueStrategy(agent, market, token, orderbook, signalId, now);
        break;
      default:
        break;
    }

    if (signal && signal.confidence >= agent.minConfidence) {
      return signal;
    }
  }

  return null;
}

function momentumStrategy(
  agent: AgentConfig,
  market: MarketData,
  token: { token_id: string; outcome: string; price: number },
  orderbook: OrderBookData | null,
  signalId: string,
  now: string,
): AgentSignal | null {
  // Momentum: buy when price is between 0.30-0.70 with high volume
  const price = token.price;
  if (price < 0.15 || price > 0.85) return null;

  // Higher volume = higher confidence
  const volumeScore = Math.min(market.volume24h / 50000, 1);
  // Price near 0.50 = more uncertainty = more opportunity
  const uncertaintyScore = 1 - Math.abs(price - 0.50) * 2;
  // Spread score - tighter spread = better
  const spreadScore = orderbook ? Math.max(0, 1 - orderbook.spread * 10) : 0.5;

  const confidence = (volumeScore * 0.4 + uncertaintyScore * 0.35 + spreadScore * 0.25);

  if (confidence < agent.minConfidence) return null;

  // Determine side based on price position
  const side: 'BUY' | 'SELL' = price < 0.50 ? 'BUY' : 'SELL';
  const tradePrice = side === 'BUY' ? price : price;

  // Size based on confidence and max order
  const sizeUSDC = Math.min(
    agent.maxOrderUSDC * confidence,
    agent.maxOrderUSDC,
  );
  const size = Math.floor(sizeUSDC / tradePrice);

  return {
    id: signalId,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: now,
    market: market.question,
    marketSlug: market.slug,
    tokenId: token.token_id,
    conditionId: market.conditionId,
    side,
    price: Math.round(tradePrice * 1000) / 1000,
    size,
    sizeUSDC: Math.round(sizeUSDC * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Momentum signal: ${token.outcome} at $${tradePrice.toFixed(3)} with ${(confidence * 100).toFixed(0)}% confidence. Volume 24h: $${market.volume24h.toLocaleString()}. ${side === 'BUY' ? 'Price below midpoint suggests upside potential' : 'Price above midpoint suggests profit-taking opportunity'}.`,
    status: 'generated',
  };
}

function contrarianStrategy(
  agent: AgentConfig,
  market: MarketData,
  token: { token_id: string; outcome: string; price: number },
  orderbook: OrderBookData | null,
  signalId: string,
  now: string,
): AgentSignal | null {
  const price = token.price;

  // Contrarian: look for extreme prices that might revert
  // Buy when price is very low (undervalued), sell when very high (overvalued)
  if (price > 0.15 && price < 0.85) return null; // Only trade extremes

  const isUndervalued = price < 0.15;
  const side: 'BUY' | 'SELL' = isUndervalued ? 'BUY' : 'SELL';

  // Confidence based on how extreme the price is and volume
  const extremeScore = isUndervalued ? (0.15 - price) / 0.15 : (price - 0.85) / 0.15;
  const volumeScore = Math.min(market.volume24h / 30000, 1);
  const confidence = extremeScore * 0.6 + volumeScore * 0.4;

  if (confidence < agent.minConfidence) return null;

  const sizeUSDC = Math.min(agent.maxOrderUSDC * confidence, agent.maxOrderUSDC);
  const size = Math.floor(sizeUSDC / price);

  return {
    id: signalId,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: now,
    market: market.question,
    marketSlug: market.slug,
    tokenId: token.token_id,
    conditionId: market.conditionId,
    side,
    price: Math.round(price * 1000) / 1000,
    size,
    sizeUSDC: Math.round(sizeUSDC * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Contrarian signal: ${token.outcome} at $${price.toFixed(3)} appears ${isUndervalued ? 'undervalued' : 'overvalued'}. ${isUndervalued ? 'Buying cheap outcome for potential reversion' : 'Selling expensive outcome expecting mean reversion'}. Volume: $${market.volume24h.toLocaleString()}.`,
    status: 'generated',
  };
}

function scalperStrategy(
  agent: AgentConfig,
  market: MarketData,
  token: { token_id: string; outcome: string; price: number },
  orderbook: OrderBookData | null,
  signalId: string,
  now: string,
): AgentSignal | null {
  if (!orderbook || orderbook.spread < 0.01) return null; // Need spread to scalp

  const price = token.price;
  if (price < 0.10 || price > 0.90) return null;

  // Scalper: exploit the bid-ask spread
  const spreadScore = Math.min(orderbook.spread * 20, 1); // Wider spread = more opportunity
  const volumeScore = Math.min(market.volume24h / 20000, 1);
  const liquidityScore = orderbook.bids.length > 3 && orderbook.asks.length > 3 ? 0.8 : 0.4;

  const confidence = spreadScore * 0.5 + volumeScore * 0.3 + liquidityScore * 0.2;

  if (confidence < agent.minConfidence) return null;

  // Buy at bid, plan to sell at ask
  const side: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';
  const tradePrice = side === 'BUY'
    ? orderbook.midpoint - orderbook.spread / 4
    : orderbook.midpoint + orderbook.spread / 4;

  const sizeUSDC = Math.min(agent.maxOrderUSDC * confidence, agent.maxOrderUSDC);
  const size = Math.floor(sizeUSDC / Math.max(tradePrice, 0.01));

  return {
    id: signalId,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: now,
    market: market.question,
    marketSlug: market.slug,
    tokenId: token.token_id,
    conditionId: market.conditionId,
    side,
    price: Math.round(Math.max(tradePrice, 0.01) * 1000) / 1000,
    size,
    sizeUSDC: Math.round(sizeUSDC * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Scalp signal: ${side} ${token.outcome} at $${tradePrice.toFixed(3)}. Spread: ${(orderbook.spread * 100).toFixed(1)}%. Midpoint: $${orderbook.midpoint.toFixed(3)}. Targeting spread capture.`,
    status: 'generated',
  };
}

function valueStrategy(
  agent: AgentConfig,
  market: MarketData,
  token: { token_id: string; outcome: string; price: number },
  orderbook: OrderBookData | null,
  signalId: string,
  now: string,
): AgentSignal | null {
  const price = token.price;
  if (price < 0.05 || price > 0.95) return null;

  // Value: look for mispriced markets based on volume and price
  const volumeScore = Math.min(market.volume24h / 40000, 1);
  const priceScore = price < 0.30 ? 0.8 : price > 0.70 ? 0.7 : 0.5;
  const confidence = volumeScore * 0.5 + priceScore * 0.5;

  if (confidence < agent.minConfidence) return null;

  const side: 'BUY' | 'SELL' = price < 0.40 ? 'BUY' : 'SELL';
  const sizeUSDC = Math.min(agent.maxOrderUSDC * confidence, agent.maxOrderUSDC);
  const size = Math.floor(sizeUSDC / price);

  return {
    id: signalId,
    agentId: agent.id,
    agentName: agent.name,
    timestamp: now,
    market: market.question,
    marketSlug: market.slug,
    tokenId: token.token_id,
    conditionId: market.conditionId,
    side,
    price: Math.round(price * 1000) / 1000,
    size,
    sizeUSDC: Math.round(sizeUSDC * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    reasoning: `Value signal: ${token.outcome} at $${price.toFixed(3)} with high volume ($${market.volume24h.toLocaleString()}). ${side === 'BUY' ? 'Undervalued opportunity' : 'Overvalued, taking profit'}.`,
    status: 'generated',
  };
}
