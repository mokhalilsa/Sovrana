/**
 * Polymarket API Client
 * Handles communication with Gamma API, Data API, and CLOB API
 * with proper L2 HMAC-SHA256 authentication for trading endpoints.
 */

import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

const GAMMA_API = process.env.GAMMA_API_URL || 'https://gamma-api.polymarket.com';
const DATA_API = process.env.DATA_API_URL || 'https://data-api.polymarket.com';
const CLOB_API = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

const POLY_ADDRESS = process.env.POLY_ADDRESS || '';
const POLY_API_KEY = process.env.POLY_API_KEY || '';
const POLY_SECRET = process.env.POLY_SECRET || '';
const POLY_PASSPHRASE = process.env.POLY_PASSPHRASE || '';

// ─── L2 HMAC Authentication ────────────────────────────────────────────────

function buildHmacSignature(
  secret: string,
  timestamp: string,
  method: string,
  requestPath: string,
  body: string = ''
): string {
  const message = timestamp + method.toUpperCase() + requestPath + body;
  const key = Buffer.from(secret, 'base64');
  return crypto.createHmac('sha256', key).update(message).digest('base64');
}

function getL2Headers(method: string, requestPath: string, body: string = ''): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = buildHmacSignature(POLY_SECRET, timestamp, method, requestPath, body);

  return {
    'POLY_ADDRESS': POLY_ADDRESS,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_API_KEY': POLY_API_KEY,
    'POLY_PASSPHRASE': POLY_PASSPHRASE,
  };
}

// ─── Generic Fetch Helpers ──────────────────────────────────────────────────

async function publicFetch<T>(baseUrl: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(path, baseUrl);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json' },
    next: { revalidate: 30 }, // ISR: revalidate every 30 seconds
  });
  if (!res.ok) {
    throw new Error(`API Error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function authenticatedFetch<T>(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const bodyStr = body ? JSON.stringify(body) : '';
  const l2Headers = getL2Headers(method, path, bodyStr);

  const res = await fetch(`${CLOB_API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...l2Headers,
    },
    body: method !== 'GET' && bodyStr ? bodyStr : undefined,
  });
  if (!res.ok) {
    throw new Error(`CLOB API Error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// ─── Gamma API (Public) ─────────────────────────────────────────────────────

export interface GammaMarket {
  id: string;
  condition_id: string;
  question: string;
  description: string;
  market_slug: string;
  end_date_iso: string;
  game_start_time: string | null;
  active: boolean;
  closed: boolean;
  archived: boolean;
  accepting_orders: boolean;
  minimum_order_size: number;
  minimum_tick_size: number;
  tokens: Array<{
    token_id: string;
    outcome: string;
    price: number;
    winner: boolean;
  }>;
  tags: Array<{ label: string; slug: string }>;
  volume: number;
  volume_num: number;
  liquidity: number;
  liquidity_num: number;
  competitive: number;
  spread: number;
  image: string;
  icon: string;
  neg_risk: boolean;
}

export interface GammaEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  markets: GammaMarket[];
  start_date: string;
  end_date: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  volume: number;
  volume_num: number;
  liquidity: number;
  liquidity_num: number;
  tags: Array<{ label: string; slug: string }>;
}

export async function getMarkets(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
  tag_id?: number;
}): Promise<GammaMarket[]> {
  const queryParams: Record<string, string> = {};
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.offset) queryParams.offset = params.offset.toString();
  if (params?.active !== undefined) queryParams.active = params.active.toString();
  if (params?.closed !== undefined) queryParams.closed = params.closed.toString();
  if (params?.order) queryParams.order = params.order;
  if (params?.ascending !== undefined) queryParams.ascending = params.ascending.toString();
  if (params?.tag_id) queryParams.tag_id = params.tag_id.toString();
  return publicFetch<GammaMarket[]>(GAMMA_API, '/markets', queryParams);
}

export async function getMarketById(id: string): Promise<GammaMarket> {
  return publicFetch<GammaMarket>(GAMMA_API, `/markets/${id}`);
}

export async function getMarketBySlug(slug: string): Promise<GammaMarket> {
  return publicFetch<GammaMarket>(GAMMA_API, `/markets/slug/${slug}`);
}

export async function getEvents(params?: {
  limit?: number;
  offset?: number;
  active?: boolean;
  closed?: boolean;
  order?: string;
  ascending?: boolean;
  tag_slug?: string;
}): Promise<GammaEvent[]> {
  const queryParams: Record<string, string> = {};
  if (params?.limit) queryParams.limit = params.limit.toString();
  if (params?.offset) queryParams.offset = params.offset.toString();
  if (params?.active !== undefined) queryParams.active = params.active.toString();
  if (params?.closed !== undefined) queryParams.closed = params.closed.toString();
  if (params?.order) queryParams.order = params.order;
  if (params?.ascending !== undefined) queryParams.ascending = params.ascending.toString();
  if (params?.tag_slug) queryParams.tag_slug = params.tag_slug;
  return publicFetch<GammaEvent[]>(GAMMA_API, '/events', queryParams);
}

export async function searchMarkets(query: string): Promise<GammaMarket[]> {
  return publicFetch<GammaMarket[]>(GAMMA_API, '/markets', { _q: query });
}

// ─── CLOB API (Public - Orderbook & Pricing) ───────────────────────────────

export interface OrderBook {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
}

export interface PriceHistory {
  history: Array<{ t: number; p: number }>;
}

export async function getOrderBook(tokenId: string): Promise<OrderBook> {
  return publicFetch<OrderBook>(CLOB_API, '/book', { token_id: tokenId });
}

export async function getMidpointPrice(tokenId: string): Promise<{ mid: string }> {
  return publicFetch<{ mid: string }>(CLOB_API, '/midpoint', { token_id: tokenId });
}

export async function getMarketPrice(tokenId: string): Promise<{ price: string }> {
  return publicFetch<{ price: string }>(CLOB_API, '/price', { token_id: tokenId });
}

export async function getLastTradePrice(tokenId: string): Promise<{ price: string }> {
  return publicFetch<{ price: string }>(CLOB_API, '/last-trade-price', { token_id: tokenId });
}

export async function getPricesHistory(
  tokenId: string,
  interval: string = '1d',
  fidelity: number = 60
): Promise<PriceHistory> {
  return publicFetch<PriceHistory>(CLOB_API, '/prices-history', {
    market: tokenId,
    interval,
    fidelity: fidelity.toString(),
  });
}

export async function getServerTime(): Promise<{ time: string }> {
  return publicFetch<{ time: string }>(CLOB_API, '/time');
}

// ─── Data API (Public - User Data) ─────────────────────────────────────────

export interface UserPosition {
  asset: string;
  condition_id: string;
  market_slug: string;
  title: string;
  outcome: string;
  size: number;
  avg_price: number;
  cur_price: number;
  initial_value: number;
  current_value: number;
  pnl: number;
  cashflow: number;
  realized_pnl: number;
  unrealized_pnl: number;
  closed: boolean;
}

export interface UserTrade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  title: string;
  market_slug: string;
  event_slug: string;
}

export async function getUserPositions(address?: string): Promise<UserPosition[]> {
  const addr = address || POLY_ADDRESS;
  if (!addr) throw new Error('No wallet address configured');
  return publicFetch<UserPosition[]>(DATA_API, '/positions', { user: addr });
}

export async function getUserClosedPositions(address?: string): Promise<UserPosition[]> {
  const addr = address || POLY_ADDRESS;
  if (!addr) throw new Error('No wallet address configured');
  return publicFetch<UserPosition[]>(DATA_API, '/closed-positions', { user: addr });
}

export async function getUserTrades(address?: string, limit?: number): Promise<UserTrade[]> {
  const addr = address || POLY_ADDRESS;
  if (!addr) throw new Error('No wallet address configured');
  const params: Record<string, string> = { user: addr };
  if (limit) params.limit = limit.toString();
  return publicFetch<UserTrade[]>(DATA_API, '/trades', params);
}

export async function getUserActivity(address?: string): Promise<unknown[]> {
  const addr = address || POLY_ADDRESS;
  if (!addr) throw new Error('No wallet address configured');
  return publicFetch<unknown[]>(DATA_API, '/activity', { user: addr });
}

export async function getPublicProfile(address?: string): Promise<unknown> {
  const addr = address || POLY_ADDRESS;
  if (!addr) throw new Error('No wallet address configured');
  return publicFetch<unknown>(DATA_API, `/profiles/${addr}`);
}

// ─── CLOB API (Authenticated - Trading) ─────────────────────────────────────

export interface ClobOrder {
  id: string;
  status: string;
  market: string;
  asset_id: string;
  side: string;
  original_size: string;
  size_matched: string;
  price: string;
  outcome: string;
  owner: string;
  expiration: string;
  type: string;
  created_at: string;
  associate_trades: unknown[];
}

export async function getUserOrders(params?: {
  market?: string;
  asset_id?: string;
}): Promise<ClobOrder[]> {
  let path = '/orders';
  const queryParts: string[] = [];
  if (params?.market) queryParts.push(`market=${params.market}`);
  if (params?.asset_id) queryParts.push(`asset_id=${params.asset_id}`);
  if (queryParts.length > 0) path += '?' + queryParts.join('&');
  return authenticatedFetch<ClobOrder[]>('GET', path);
}

export async function getOrderById(orderId: string): Promise<ClobOrder> {
  return authenticatedFetch<ClobOrder>('GET', `/orders/${orderId}`);
}

export async function cancelOrder(orderId: string): Promise<{ success: boolean }> {
  return authenticatedFetch<{ success: boolean }>('DELETE', `/orders/${orderId}`);
}

export async function cancelAllOrders(): Promise<{ success: boolean }> {
  return authenticatedFetch<{ success: boolean }>('DELETE', '/orders/all');
}

export async function getOpenInterest(conditionId: string): Promise<{ open_interest: string }> {
  return publicFetch<{ open_interest: string }>(DATA_API, '/open-interest', { condition_id: conditionId });
}

// ─── Utility: Check API Health ──────────────────────────────────────────────

export async function checkApiHealth(): Promise<{
  gamma: boolean;
  clob: boolean;
  data: boolean;
  timestamp: string;
}> {
  const results = { gamma: false, clob: false, data: false, timestamp: new Date().toISOString() };

  try {
    await fetch(`${GAMMA_API}/markets?limit=1`);
    results.gamma = true;
  } catch {}

  try {
    const res = await fetch(`${CLOB_API}/time`);
    results.clob = res.ok;
  } catch {}

  try {
    await fetch(`${DATA_API}/positions?user=0x0000000000000000000000000000000000000000`);
    results.data = true;
  } catch {}

  return results;
}

// ─── Export Configuration Status ────────────────────────────────────────────

export function isConfigured(): boolean {
  return !!(POLY_ADDRESS && POLY_API_KEY && POLY_SECRET && POLY_PASSPHRASE);
}

export function getConfigStatus(): {
  hasAddress: boolean;
  hasApiKey: boolean;
  hasSecret: boolean;
  hasPassphrase: boolean;
  isFullyConfigured: boolean;
} {
  return {
    hasAddress: !!POLY_ADDRESS,
    hasApiKey: !!POLY_API_KEY,
    hasSecret: !!POLY_SECRET,
    hasPassphrase: !!POLY_PASSPHRASE,
    isFullyConfigured: isConfigured(),
  };
}
