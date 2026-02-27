/**
 * Order Executor
 * Signs orders using EIP-712 and submits them to the Polymarket CLOB API.
 * Handles both L1 (order signing) and L2 (HMAC API auth) authentication.
 */

import crypto from 'crypto';
import { ethers } from 'ethers';
import { AgentSignal, AgentTrade } from './engine';
import { addTrade, addActivity, updateSignal } from './store';

// ─── Configuration ─────────────────────────────────────────────────────────

const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

function getPrivateKey(): string {
  return process.env.PRIVATE_KEY || process.env.POLYMARKET_PRIVATE_KEY || '';
}

function getApiCredentials() {
  return {
    apiKey: process.env.POLY_API_KEY || process.env.POLYMARKET_API_KEY || '',
    secret: process.env.POLY_SECRET || process.env.POLYMARKET_API_SECRET || '',
    passphrase: process.env.POLY_PASSPHRASE || process.env.POLYMARKET_API_PASSPHRASE || '',
    address: process.env.POLY_ADDRESS || process.env.POLYMARKET_WALLET_ADDRESS || '',
  };
}

// ─── L2 HMAC Authentication ───────────────────────────────────────────────

function generateL2Headers(method: string, path: string, body: string = ''): Record<string, string> {
  const creds = getApiCredentials();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = timestamp + method.toUpperCase() + path + body;

  let secretBuf: Buffer;
  try {
    secretBuf = Buffer.from(creds.secret, 'base64url');
  } catch {
    secretBuf = Buffer.from(creds.secret, 'base64');
  }

  const signature = crypto
    .createHmac('sha256', secretBuf)
    .update(message)
    .digest('base64');

  return {
    'POLY_ADDRESS': creds.address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_NONCE': '0',
    'POLY_API_KEY': creds.apiKey,
    'POLY_PASSPHRASE': creds.passphrase,
    'Content-Type': 'application/json',
  };
}

// ─── EIP-712 Order Signing ─────────────────────────────────────────────────

const CTF_EXCHANGE_DOMAIN = {
  name: 'CTFExchange',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
};

const NEG_RISK_CTF_EXCHANGE_DOMAIN = {
  name: 'NegRiskCTFExchange',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: '0xC5d563A36AE78145C45a50134d48A1215220f80a',
};

const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
};

interface SignedOrder {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number;
  signatureType: number;
  signature: string;
}

async function signOrder(
  tokenId: string,
  price: number,
  size: number,
  side: 'BUY' | 'SELL',
  negRisk: boolean = false,
): Promise<SignedOrder> {
  const pk = getPrivateKey();
  if (!pk) throw new Error('Private key not configured');

  const wallet = new ethers.Wallet(pk);
  const sideNum = side === 'BUY' ? 0 : 1;

  let makerAmount: string;
  let takerAmount: string;

  if (side === 'BUY') {
    // Buying: maker pays USDC, receives outcome tokens
    makerAmount = Math.round(size * price * 1e6).toString();
    takerAmount = Math.round(size * 1e6).toString();
  } else {
    // Selling: maker provides outcome tokens, receives USDC
    makerAmount = Math.round(size * 1e6).toString();
    takerAmount = Math.round(size * price * 1e6).toString();
  }

  const salt = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();

  const orderData = {
    salt,
    maker: wallet.address,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId,
    makerAmount,
    takerAmount,
    expiration: '0',
    nonce: '0',
    feeRateBps: '0',
    side: sideNum,
    signatureType: 1,
  };

  const domain = negRisk ? NEG_RISK_CTF_EXCHANGE_DOMAIN : CTF_EXCHANGE_DOMAIN;
  const signature = await wallet._signTypedData(domain, ORDER_TYPES, orderData);

  return {
    ...orderData,
    signature,
  };
}

// ─── Order Submission ──────────────────────────────────────────────────────

interface OrderResponse {
  success: boolean;
  orderId?: string;
  errorMsg?: string;
  status?: string;
}

async function submitOrder(signedOrder: SignedOrder): Promise<OrderResponse> {
  const path = '/order';
  const body = JSON.stringify({
    order: signedOrder,
    owner: signedOrder.maker,
    orderType: 'GTC', // Good Till Cancelled
  });

  const headers = generateL2Headers('POST', path, body);

  try {
    const res = await fetch(`${CLOB_API}${path}`, {
      method: 'POST',
      headers,
      body,
    });

    const text = await res.text();
    let data: any;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (res.ok && data.orderID) {
      return {
        success: true,
        orderId: data.orderID,
        status: data.status || 'placed',
      };
    }

    return {
      success: false,
      errorMsg: data.error || data.message || data.raw || `HTTP ${res.status}`,
    };
  } catch (error: any) {
    return {
      success: false,
      errorMsg: error.message || 'Network error',
    };
  }
}

// ─── Execute Signal ────────────────────────────────────────────────────────

export async function executeSignal(signal: AgentSignal, negRisk: boolean = false): Promise<AgentTrade> {
  const tradeId = `trade-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const now = new Date().toISOString();

  // Update signal status
  updateSignal(signal.id, { status: 'executing' });

  addActivity({
    type: 'order_placed',
    agentId: signal.agentId,
    agentName: signal.agentName,
    message: `Executing ${signal.side} order: ${signal.size} shares of "${signal.market}" at $${signal.price}`,
    details: `Signal: ${signal.id} | Confidence: ${(signal.confidence * 100).toFixed(0)}% | Size: $${signal.sizeUSDC}`,
    severity: 'info',
  });

  try {
    // Sign the order
    const signedOrder = await signOrder(
      signal.tokenId,
      signal.price,
      signal.size,
      signal.side,
      negRisk,
    );

    // Submit to CLOB API
    const result = await submitOrder(signedOrder);

    if (result.success) {
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
        orderId: result.orderId || 'unknown',
        status: 'placed',
      };

      addTrade(trade);
      updateSignal(signal.id, { status: 'executed', orderId: result.orderId });

      addActivity({
        type: 'order_filled',
        agentId: signal.agentId,
        agentName: signal.agentName,
        message: `Order placed successfully: ${signal.side} ${signal.size} shares at $${signal.price}`,
        details: `Order ID: ${result.orderId} | Market: ${signal.market}`,
        severity: 'success',
      });

      return trade;
    } else {
      // Order failed
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
        orderId: 'failed',
        status: 'failed',
      };

      addTrade(trade);
      updateSignal(signal.id, { status: 'failed', errorMessage: result.errorMsg });

      addActivity({
        type: 'error',
        agentId: signal.agentId,
        agentName: signal.agentName,
        message: `Order failed: ${result.errorMsg}`,
        details: `Signal: ${signal.id} | ${signal.side} ${signal.size} @ $${signal.price}`,
        severity: 'error',
      });

      return trade;
    }
  } catch (error: any) {
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
    updateSignal(signal.id, { status: 'failed', errorMessage: error.message });

    addActivity({
      type: 'error',
      agentId: signal.agentId,
      agentName: signal.agentName,
      message: `Execution error: ${error.message}`,
      severity: 'error',
    });

    return trade;
  }
}

// ─── Check if executor is configured ───────────────────────────────────────

export function isExecutorConfigured(): boolean {
  const pk = getPrivateKey();
  const creds = getApiCredentials();
  return !!(pk && creds.apiKey && creds.secret && creds.passphrase);
}
