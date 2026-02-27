/**
 * Order Executor
 * Uses the official @polymarket/clob-client for order signing and submission.
 * Routes through Webshare proxy via HTTPS_PROXY env var to bypass geo-restrictions.
 * 
 * Proven working: Order placed and confirmed on Polymarket mainnet.
 */

import { ClobClient, Side } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import { AgentSignal, AgentTrade } from './engine';
import { addTrade, addActivity, updateSignal } from './store';

// ─── Configuration ─────────────────────────────────────────────────────────

const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137;
const PROXY_HOST = 'p.webshare.io';
const MIN_ORDER_SIZE = 5; // Polymarket minimum order size

function getProxyUrl(): string | null {
  const directProxy = process.env.PROXY_URL || '';
  if (directProxy) return directProxy;

  const apiKey = process.env.WEBSHARE_API_KEY || '';
  if (!apiKey) return null;

  const username = process.env.WEBSHARE_PROXY_USER || 'axlizrdy-AE-BR-IN-JP-KR-SA-1';
  const password = process.env.WEBSHARE_PROXY_PASS || 'x90dt34e5bs7';
  const port = process.env.WEBSHARE_PROXY_PORT || '10000';
  return `http://${username}:${password}@${PROXY_HOST}:${port}`;
}

function getPrivateKey(): string {
  return process.env.PRIVATE_KEY || process.env.POLYMARKET_PRIVATE_KEY || '';
}

function getApiCredentials() {
  return {
    key: process.env.POLY_API_KEY || '',
    secret: process.env.POLY_SECRET || '',
    passphrase: process.env.POLY_PASSPHRASE || '',
  };
}

function getFunderAddress(): string {
  // The funder is the Polymarket proxy wallet that holds the funds
  return process.env.POLY_FUNDER_ADDRESS || process.env.POLY_ADDRESS || '';
}

// ─── CLOB Client Singleton ───────────────────────────────────────────────

let _clobClient: ClobClient | null = null;

function getClobClient(): ClobClient | null {
  if (_clobClient) return _clobClient;

  const pk = getPrivateKey();
  if (!pk) return null;

  const creds = getApiCredentials();
  if (!creds.key || !creds.secret || !creds.passphrase) return null;

  // Use plain wallet without provider - _signTypedData and getAddress() work
  // without a provider. Adding a provider causes ENS resolution errors on Polygon.
  const wallet = new ethers.Wallet(pk);
  const funder = getFunderAddress();

  // Set HTTPS_PROXY env var for axios (used by the CLOB client internally)
  const proxyUrl = getProxyUrl();
  if (proxyUrl) {
    process.env.HTTPS_PROXY = proxyUrl;
    process.env.HTTP_PROXY = proxyUrl;
  }

  _clobClient = new ClobClient(
    CLOB_API,
    CHAIN_ID,
    wallet,
    creds,
    1,      // signatureType: EOA
    funder || undefined,
  );

  return _clobClient;
}

// ─── Execute Signal ────────────────────────────────────────────────────────

export async function executeSignal(signal: AgentSignal, negRisk: boolean = false): Promise<AgentTrade> {
  const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  updateSignal(signal.id, { status: 'executing' });

  const proxyUrl = getProxyUrl();
  const proxyLabel = proxyUrl ? 'IN proxy' : 'direct';

  addActivity({
    type: 'order_placed',
    agentId: signal.agentId,
    agentName: signal.agentName,
    message: `Executing ${signal.side} order: ${signal.size} shares of "${signal.market}" at $${signal.price}`,
    details: `Signal: ${signal.id} | Confidence: ${(signal.confidence * 100).toFixed(0)}% | Size: $${signal.sizeUSDC} | Via: ${proxyLabel}`,
    severity: 'info',
  });

  try {
    const client = getClobClient();
    if (!client) {
      throw new Error('CLOB client not configured - check PRIVATE_KEY and API credentials');
    }

    // Ensure minimum order size
    const orderSize = Math.max(signal.size, MIN_ORDER_SIZE);

    // Round price to valid tick size
    const tickSize = '0.01';
    const roundedPrice = Math.round(signal.price * 100) / 100;
    const clampedPrice = Math.max(0.01, Math.min(0.99, roundedPrice));

    addActivity({
      type: 'engine_run',
      agentId: signal.agentId,
      agentName: signal.agentName,
      message: `Submitting order via ${proxyLabel}: ${signal.side} ${orderSize} @ $${clampedPrice}`,
      details: `Token: ${signal.tokenId.substring(0, 20)}... | negRisk: ${negRisk}`,
      severity: 'info',
    });

    // Use the official CLOB client to create, sign, and post the order
    const sideEnum = signal.side === 'BUY' ? Side.BUY : Side.SELL;
    const result = await client.createAndPostOrder(
      {
        tokenID: signal.tokenId,
        price: clampedPrice,
        size: orderSize,
        side: sideEnum,
      },
      {
        tickSize,
        negRisk,
      }
    );

    if (result.success && result.orderID) {
      const trade: AgentTrade = {
        id: tradeId,
        agentId: signal.agentId,
        agentName: signal.agentName,
        signalId: signal.id,
        timestamp: now,
        market: signal.market,
        tokenId: signal.tokenId,
        side: signal.side,
        price: clampedPrice,
        size: orderSize,
        sizeUSDC: Math.round(orderSize * clampedPrice * 100) / 100,
        orderId: result.orderID,
        status: 'placed',
      };

      addTrade(trade);
      updateSignal(signal.id, { status: 'executed', orderId: result.orderID });

      addActivity({
        type: 'order_filled',
        agentId: signal.agentId,
        agentName: signal.agentName,
        message: `ORDER LIVE: ${signal.side} ${orderSize} shares at $${clampedPrice}`,
        details: `Order ID: ${result.orderID} | Market: ${signal.market} | Status: ${result.status || 'live'}`,
        severity: 'success',
      });

      return trade;
    } else {
      // Order was rejected by the CLOB API
      const errorMsg = result.error || result.errorMsg || 'Order rejected';

      const trade: AgentTrade = {
        id: tradeId,
        agentId: signal.agentId,
        agentName: signal.agentName,
        signalId: signal.id,
        timestamp: now,
        market: signal.market,
        tokenId: signal.tokenId,
        side: signal.side,
        price: clampedPrice,
        size: orderSize,
        sizeUSDC: Math.round(orderSize * clampedPrice * 100) / 100,
        orderId: 'failed',
        status: 'failed',
      };

      addTrade(trade);
      updateSignal(signal.id, { status: 'failed', errorMessage: errorMsg });

      addActivity({
        type: 'error',
        agentId: signal.agentId,
        agentName: signal.agentName,
        message: `Order failed: ${errorMsg}`,
        details: `Signal: ${signal.id} | ${signal.side} ${orderSize} @ $${clampedPrice} | Via: ${proxyLabel}`,
        severity: 'error',
      });

      return trade;
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.error || error.message || 'Unknown error';

    const trade: AgentTrade = {
      id: tradeId,
      agentId: signal.agentId,
      agentName: signal.agentName,
      signalId: signal.id,
      timestamp: now,
      market: signal.market,
      tokenId: signal.tokenId,
      side: signal.side,
      price: signal.price,
      size: signal.size,
      sizeUSDC: signal.sizeUSDC,
      orderId: 'error',
      status: 'failed',
    };

    addTrade(trade);
    updateSignal(signal.id, { status: 'failed', errorMessage: errorMsg });

    addActivity({
      type: 'error',
      agentId: signal.agentId,
      agentName: signal.agentName,
      message: `Execution error: ${errorMsg}`,
      severity: 'error',
    });

    return trade;
  }
}

// ─── Status Checks ────────────────────────────────────────────────────────

export function isExecutorConfigured(): boolean {
  const pk = getPrivateKey();
  const creds = getApiCredentials();
  return !!(pk && creds.key && creds.secret && creds.passphrase);
}

export function isProxyConfigured(): boolean {
  return !!getProxyUrl();
}
