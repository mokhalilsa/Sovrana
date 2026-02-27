/**
 * Polymarket API Client
 * Uses HMAC-SHA256 L2 authentication with derived credentials.
 * Connects to Gamma API (public), Data API (public), and CLOB API (authenticated).
 */

import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

const GAMMA_API = 'https://gamma-api.polymarket.com';
const DATA_API = 'https://data-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

function env(key: string): string {
  return process.env[key] || '';
}

// ─── L2 HMAC Authentication ────────────────────────────────────────────────

function generateL2Headers(method: string, path: string, body: string = ''): Record<string, string> {
  const apiKey = env('POLYMARKET_API_KEY');
  const secret = env('POLYMARKET_SECRET');
  const passphrase = env('POLYMARKET_PASSPHRASE');
  const address = env('POLYMARKET_ADDRESS');

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;

  // The secret is base64url encoded
  let secretBuf: Buffer;
  try {
    secretBuf = Buffer.from(secret, 'base64url');
  } catch {
    secretBuf = Buffer.from(secret, 'base64');
  }

  const signature = crypto
    .createHmac('sha256', secretBuf)
    .update(message)
    .digest('base64');

  return {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_NONCE': '0',
    'POLY_API_KEY': apiKey,
    'POLY_PASSPHRASE': passphrase,
    'Content-Type': 'application/json',
  };
}

// ─── Fetch Helpers ──────────────────────────────────────────────────────────

async function gammaFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${GAMMA_API}${path}`, {
    headers: { 'User-Agent': 'Sovrana/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Gamma API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function dataFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${DATA_API}${path}`, {
    headers: { 'User-Agent': 'Sovrana/1.0' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`Data API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function clobFetch<T>(path: string, method: string = 'GET', body?: string): Promise<T> {
  const headers = generateL2Headers(method, path, body);
  const res = await fetch(`${CLOB_API}${path}`, {
    method,
    headers,
    body: body || undefined,
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`CLOB API error ${res.status}: ${errText}`);
  }
  return res.json();
}

async function clobPublicFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${CLOB_API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`CLOB API error ${res.status}: ${await res.text()}`);
  return res.json();
}

// ─── Market Data (Public) ───────────────────────────────────────────────────

export async function getActiveMarkets(limit: number = 50) {
  return gammaFetch<any[]>(`/markets?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`);
}

export async function getMarketBySlug(slug: string) {
  return gammaFetch<any>(`/markets/slug/${slug}`);
}

export async function getMarketByCondition(conditionId: string) {
  return clobPublicFetch<any>(`/markets/${conditionId}`);
}

export async function searchMarkets(query: string) {
  return gammaFetch<any[]>(`/markets?_q=${encodeURIComponent(query)}`);
}

export async function getOrderBook(tokenId: string) {
  return clobPublicFetch<any>(`/book?token_id=${tokenId}`);
}

export async function getMidpointPrice(tokenId: string) {
  return clobPublicFetch<{ mid: string }>(`/midpoint?token_id=${tokenId}`);
}

export async function getPrice(tokenId: string, side: string = 'BUY') {
  return clobPublicFetch<{ price: string }>(`/price?token_id=${tokenId}&side=${side}`);
}

export async function getPricesHistory(tokenId: string, interval: string = '1d', fidelity: number = 60) {
  return clobPublicFetch<any>(`/prices-history?market=${tokenId}&interval=${interval}&fidelity=${fidelity}`);
}

// ─── User Portfolio Data (Authenticated via CLOB) ───────────────────────────

export async function getUserTrades() {
  return clobFetch<any[]>('/data/trades', 'GET');
}

export async function getOpenOrders() {
  return clobFetch<any[]>('/orders', 'GET');
}

// ─── User Data via Data API (Public with address) ───────────────────────────

export async function getUserPositions() {
  const addr = env('POLYMARKET_PROXY_ADDRESS') || env('POLYMARKET_ADDRESS');
  if (!addr) throw new Error('No wallet address configured');
  return dataFetch<any[]>(`/positions?user=${addr}`);
}

export async function getUserClosedPositions() {
  const addr = env('POLYMARKET_PROXY_ADDRESS') || env('POLYMARKET_ADDRESS');
  if (!addr) throw new Error('No wallet address configured');
  return dataFetch<any[]>(`/closed-positions?user=${addr}`);
}

export async function getUserActivity() {
  const addr = env('POLYMARKET_PROXY_ADDRESS') || env('POLYMARKET_ADDRESS');
  if (!addr) throw new Error('No wallet address configured');
  return dataFetch<any[]>(`/activity?user=${addr}`);
}

export async function getPublicProfile() {
  const addr = env('POLYMARKET_PROXY_ADDRESS') || env('POLYMARKET_ADDRESS');
  if (!addr) throw new Error('No wallet address configured');
  return dataFetch<any>(`/profiles/${addr}`);
}

// ─── Portfolio Summary ──────────────────────────────────────────────────────

export async function getPortfolioSummary() {
  const [trades, orders] = await Promise.all([
    getUserTrades().catch(() => []),
    getOpenOrders().catch(() => []),
  ]);

  let totalVolume = 0;
  let buyCount = 0;
  let sellCount = 0;
  let buyVolume = 0;
  let sellVolume = 0;
  const marketsTraded = new Set<string>();

  const tradeList = Array.isArray(trades) ? trades : [];

  for (const t of tradeList) {
    const size = parseFloat(t.size || '0');
    const price = parseFloat(t.price || '0');
    const vol = size * price;
    totalVolume += vol;
    marketsTraded.add(t.market || '');

    if (t.side === 'BUY') {
      buyCount++;
      buyVolume += vol;
    } else {
      sellCount++;
      sellVolume += vol;
    }
  }

  const orderList = Array.isArray(orders) ? orders : [];

  return {
    totalTrades: tradeList.length,
    totalVolume: Math.round(totalVolume * 100) / 100,
    buyCount,
    sellCount,
    buyVolume: Math.round(buyVolume * 100) / 100,
    sellVolume: Math.round(sellVolume * 100) / 100,
    openOrders: orderList.length,
    marketsTraded: marketsTraded.size,
    realizedPnl: Math.round((sellVolume - buyVolume) * 100) / 100,
  };
}

// ─── Health Check ───────────────────────────────────────────────────────────

export async function checkApiHealth() {
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

export function isConfigured(): boolean {
  return !!(env('POLYMARKET_ADDRESS') && env('POLYMARKET_API_KEY') && env('POLYMARKET_SECRET'));
}
