/**
 * Polymarket Order Signer
 * Uses ethers.js v5 and the private key for L1 authentication
 * to sign orders for the CLOB API.
 */

import { ethers } from 'ethers';

const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '137');

// ─── Wallet Setup ───────────────────────────────────────────────────────────

function getWallet(): ethers.Wallet {
  if (!PRIVATE_KEY) {
    throw new Error('PRIVATE_KEY not configured in environment');
  }
  return new ethers.Wallet(PRIVATE_KEY);
}

export function getSignerAddress(): string {
  return getWallet().address;
}

// ─── EIP-712 Domain & Types for CLOB Auth ───────────────────────────────────

const CLOB_AUTH_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: CHAIN_ID,
};

const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
};

// ─── L1 Signature for API Key Creation/Derivation ───────────────────────────

export async function signL1Auth(timestamp: string, nonce: number): Promise<{
  signature: string;
  address: string;
  timestamp: string;
  nonce: number;
}> {
  const wallet = getWallet();

  const value = {
    address: wallet.address,
    timestamp,
    nonce,
    message: 'This message attests that I control the given wallet',
  };

  const signature = await wallet._signTypedData(
    CLOB_AUTH_DOMAIN,
    CLOB_AUTH_TYPES,
    value
  );

  return {
    signature,
    address: wallet.address,
    timestamp,
    nonce,
  };
}

// ─── Order Signing (CTF Exchange) ───────────────────────────────────────────

// EIP-712 types for CTF Exchange orders
const CTF_EXCHANGE_DOMAIN = {
  name: 'CTFExchange',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E', // Polymarket CTF Exchange
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

// Neg Risk CTF Exchange
const NEG_RISK_CTF_EXCHANGE_DOMAIN = {
  name: 'NegRiskCTFExchange',
  version: '1',
  chainId: CHAIN_ID,
  verifyingContract: '0xC5d563A36AE78145C45a50134d48A1215220f80a', // Polymarket Neg Risk CTF Exchange
};

export interface OrderParams {
  tokenId: string;
  price: number;
  size: number;
  side: 'BUY' | 'SELL';
  feeRateBps?: number;
  nonce?: number;
  expiration?: number;
  negRisk?: boolean;
  funderAddress?: string;
}

export interface SignedOrder {
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

export async function signOrder(params: OrderParams): Promise<SignedOrder> {
  const wallet = getWallet();
  const funder = params.funderAddress || wallet.address;

  // Calculate amounts based on side
  const sideNum = params.side === 'BUY' ? 0 : 1;
  const rawPrice = Math.round(params.price * 100);
  const rawSize = Math.round(params.size * 1e6); // USDC has 6 decimals

  let makerAmount: string;
  let takerAmount: string;

  if (params.side === 'BUY') {
    // Buying outcome tokens: maker pays USDC, taker provides outcome tokens
    makerAmount = Math.round(params.size * params.price * 1e6).toString();
    takerAmount = rawSize.toString();
  } else {
    // Selling outcome tokens: maker provides outcome tokens, taker pays USDC
    makerAmount = rawSize.toString();
    takerAmount = Math.round(params.size * params.price * 1e6).toString();
  }

  const salt = ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString();
  const expiration = params.expiration?.toString() || '0'; // 0 = no expiration
  const nonce = params.nonce?.toString() || '0';
  const feeRateBps = (params.feeRateBps || 0).toString();

  const orderData = {
    salt,
    maker: funder,
    signer: wallet.address,
    taker: '0x0000000000000000000000000000000000000000',
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration,
    nonce,
    feeRateBps,
    side: sideNum,
    signatureType: 1, // EOA
  };

  const domain = params.negRisk ? NEG_RISK_CTF_EXCHANGE_DOMAIN : CTF_EXCHANGE_DOMAIN;

  const signature = await wallet._signTypedData(domain, ORDER_TYPES, orderData);

  return {
    ...orderData,
    salt: orderData.salt.toString(),
    tokenId: orderData.tokenId.toString(),
    makerAmount: orderData.makerAmount.toString(),
    takerAmount: orderData.takerAmount.toString(),
    expiration: orderData.expiration.toString(),
    nonce: orderData.nonce.toString(),
    feeRateBps: orderData.feeRateBps.toString(),
    side: orderData.side,
    signatureType: orderData.signatureType,
    signature,
  };
}

// ─── Derive or Create API Keys ──────────────────────────────────────────────

export async function createApiKey(): Promise<{
  apiKey: string;
  secret: string;
  passphrase: string;
}> {
  const CLOB_API = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

  // Get server time
  const timeRes = await fetch(`${CLOB_API}/time`);
  const { time } = await timeRes.json();

  const nonce = 0;
  const auth = await signL1Auth(time, nonce);

  const res = await fetch(`${CLOB_API}/auth/api-key`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'POLY_ADDRESS': auth.address,
      'POLY_SIGNATURE': auth.signature,
      'POLY_TIMESTAMP': auth.timestamp,
      'POLY_NONCE': auth.nonce.toString(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to create API key: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

export async function deriveApiKey(nonce?: number): Promise<{
  apiKey: string;
  secret: string;
  passphrase: string;
}> {
  const CLOB_API = process.env.CLOB_API_URL || 'https://clob.polymarket.com';

  const timeRes = await fetch(`${CLOB_API}/time`);
  const { time } = await timeRes.json();

  const auth = await signL1Auth(time, nonce || 0);

  const res = await fetch(`${CLOB_API}/auth/derive-api-key`, {
    method: 'GET',
    headers: {
      'POLY_ADDRESS': auth.address,
      'POLY_SIGNATURE': auth.signature,
      'POLY_TIMESTAMP': auth.timestamp,
      'POLY_NONCE': auth.nonce.toString(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to derive API key: ${res.status} ${await res.text()}`);
  }

  return res.json();
}

// ─── Export Utility ─────────────────────────────────────────────────────────

export function isSignerConfigured(): boolean {
  return !!PRIVATE_KEY;
}
