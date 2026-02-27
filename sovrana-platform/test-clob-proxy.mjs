// Patch axios defaults BEFORE importing the CLOB client
import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';

const proxyUrl = 'http://axlizrdy-AE-BR-IN-JP-KR-SA-1:x90dt34e5bs7@p.webshare.io:10000';
const proxyAgent = new HttpsProxyAgent(proxyUrl);

// Set global axios defaults to use proxy
axios.defaults.httpsAgent = proxyAgent;
axios.defaults.httpAgent = proxyAgent;
axios.defaults.proxy = false; // Must disable axios built-in proxy to use agent

console.log('Axios defaults patched with proxy agent');

// Now import the CLOB client (it will use the patched axios)
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const PRIVATE_KEY = '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585';
const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log('Wallet:', wallet.address);

const creds = {
  key: 'd3147643-ee67-1132-eff3-db539cdc7f0d',
  secret: 'oJFOlcCEbPGqFGgDlBhXXcdAukfYohm_iTPjbBcYXLs=',
  passphrase: '61d5387264d590c50cb620231a8299f8e2d051abe3247aaecccecf6cf08bf1cd',
};

const client = new ClobClient(
  'https://clob.polymarket.com',
  137,
  wallet,
  creds,
  1, // signatureType: EOA
);

// Get a market
const resp = await fetch('https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false');
const markets = await resp.json();
const m = markets[0];
console.log('Market:', m.question);
const tokenIds = JSON.parse(m.clobTokenIds || '[]');
console.log('Token ID:', tokenIds[0].substring(0, 30) + '...');

// Place a tiny order
try {
  const order = await client.createAndPostOrder({
    tokenID: tokenIds[0],
    price: 0.01,
    size: 1,
    side: 'BUY',
  }, {
    tickSize: '0.01',
    negRisk: m.negRisk || false,
  });
  console.log('ORDER RESULT:', JSON.stringify(order).substring(0, 500));
} catch(e) {
  console.error('Error:', e.message);
  if (e.response) {
    console.error('Status:', e.response.status);
    console.error('Data:', JSON.stringify(e.response.data));
  }
}
