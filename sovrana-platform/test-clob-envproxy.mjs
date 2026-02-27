import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const PRIVATE_KEY = '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585';
const wallet = new ethers.Wallet(PRIVATE_KEY);
console.log('Wallet:', wallet.address);
console.log('HTTPS_PROXY:', process.env.HTTPS_PROXY ? 'set' : 'not set');

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
  1,
);

// Get a market
const resp = await fetch('https://gamma-api.polymarket.com/markets?limit=1&active=true&closed=false');
const markets = await resp.json();
const m = markets[0];
console.log('Market:', m.question);
const tokenIds = JSON.parse(m.clobTokenIds || '[]');

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
