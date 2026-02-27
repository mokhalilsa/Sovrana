import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';
import { HttpsProxyAgent } from 'https-proxy-agent';

const PRIVATE_KEY = '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585';
const wallet = new ethers.Wallet(PRIVATE_KEY);

const creds = {
  key: 'd3147643-ee67-1132-eff3-db539cdc7f0d',
  secret: 'oJFOlcCEbPGqFGgDlBhXXcdAukfYohm_iTPjbBcYXLs=',
  passphrase: '61d5387264d590c50cb620231a8299f8e2d051abe3247aaecccecf6cf08bf1cd',
};

// Set up proxy agent for axios
const proxyUrl = 'http://axlizrdy-AE-BR-IN-JP-KR-SA-1:x90dt34e5bs7@p.webshare.io:10000';
const proxyAgent = new HttpsProxyAgent(proxyUrl);

const client = new ClobClient(
  'https://clob.polymarket.com',
  137,
  wallet,
  creds,
  1, // signatureType: EOA
);

// Check if the client uses axios and inject proxy
console.log('Client keys:', Object.keys(client));

// The CLOB client uses axios internally - inject the proxy agent
if (client.http) {
  console.log('HTTP client found, injecting proxy...');
  client.http.defaults.httpsAgent = proxyAgent;
  client.http.defaults.httpAgent = proxyAgent;
  client.http.defaults.proxy = false; // Disable axios built-in proxy to use agent
}

// Get a market to test with
const resp = await fetch('https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false');
const markets = await resp.json();
const m = markets[0];
console.log('Market:', m.question);
const tokenIds = JSON.parse(m.clobTokenIds || '[]');
console.log('Token ID:', tokenIds[0].substring(0, 30) + '...');

// Try placing a tiny order through proxy
try {
  const order = await client.createAndPostOrder({
    tokenID: tokenIds[0],
    price: 0.01,  // Very low price - won't fill, just testing
    size: 1,
    side: 'BUY',
  }, {
    tickSize: '0.01',
    negRisk: m.negRisk || false,
  });
  console.log('ORDER PLACED:', JSON.stringify(order).substring(0, 500));
} catch(e) {
  console.error('Error:', e.message);
  if (e.response) {
    console.error('Status:', e.response.status);
    console.error('Data:', JSON.stringify(e.response.data));
  }
}
