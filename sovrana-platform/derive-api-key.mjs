/**
 * Derive Polymarket CLOB API credentials from private key.
 * Uses L1 authentication (EIP-712 signing) to create or derive API keys.
 */

import { ethers } from 'ethers';
import { ProxyAgent, fetch as undiciFetch } from 'undici';

const PRIVATE_KEY = '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585';
const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

// Proxy through allowed region (India)
const proxyUrl = 'http://axlizrdy-AE-BR-IN-JP-KR-SA-1:x90dt34e5bs7@p.webshare.io:10000';
const dispatcher = new ProxyAgent(proxyUrl);

const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log('Wallet address:', wallet.address);

// Get server time first
const timeRes = await undiciFetch(`${CLOB_API}/time`, { dispatcher });
const serverTime = await timeRes.text();
console.log('Server time:', serverTime);

// EIP-712 domain and types for ClobAuth
const domain = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: CHAIN_ID,
};

const types = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
};

// Try nonce 0 first for derive, then create with nonce 0
const nonce = 0;
const timestamp = serverTime.trim();

const value = {
  address: wallet.address,
  timestamp: timestamp,
  nonce: nonce,
  message: 'This message attests that I control the given wallet',
};

const signature = await wallet._signTypedData(domain, types, value);
console.log('Signature generated');

const l1Headers = {
  'POLY_ADDRESS': wallet.address,
  'POLY_SIGNATURE': signature,
  'POLY_TIMESTAMP': timestamp,
  'POLY_NONCE': nonce.toString(),
};

// Try to derive existing API key first
console.log('\n--- Trying GET /auth/derive-api-key ---');
try {
  const deriveRes = await undiciFetch(`${CLOB_API}/auth/derive-api-key`, {
    method: 'GET',
    headers: l1Headers,
    dispatcher,
  });
  const deriveText = await deriveRes.text();
  console.log('Status:', deriveRes.status);
  console.log('Response:', deriveText);
  
  if (deriveRes.ok) {
    const creds = JSON.parse(deriveText);
    console.log('\n=== API CREDENTIALS DERIVED ===');
    console.log('API Key:', creds.apiKey);
    console.log('Secret:', creds.secret);
    console.log('Passphrase:', creds.passphrase);
    process.exit(0);
  }
} catch(e) {
  console.error('Derive error:', e.message);
}

// If derive fails, try to create new API key
console.log('\n--- Trying POST /auth/api-key ---');
try {
  const createRes = await undiciFetch(`${CLOB_API}/auth/api-key`, {
    method: 'POST',
    headers: {
      ...l1Headers,
      'Content-Type': 'application/json',
    },
    dispatcher,
  });
  const createText = await createRes.text();
  console.log('Status:', createRes.status);
  console.log('Response:', createText);
  
  if (createRes.ok) {
    const creds = JSON.parse(createText);
    console.log('\n=== API CREDENTIALS CREATED ===');
    console.log('API Key:', creds.apiKey);
    console.log('Secret:', creds.secret);
    console.log('Passphrase:', creds.passphrase);
  }
} catch(e) {
  console.error('Create error:', e.message);
}
