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

// The funder address is the Polymarket proxy wallet for this user
// We saw from getOpenOrders that the existing order has maker_address: 0x36BC6aAc04B92548cE78a990d2A83eB64B92D8cd
const FUNDER = '0x36BC6aAc04B92548cE78a990d2A83eB64B92D8cd';

const client = new ClobClient(
  'https://clob.polymarket.com',
  137,
  wallet,
  creds,
  1,       // signatureType: EOA
  FUNDER,  // funder address (proxy wallet)
);

// Get multiple markets to find both negRisk and non-negRisk
const resp = await fetch('https://gamma-api.polymarket.com/markets?limit=5&active=true&closed=false');
const markets = await resp.json();

for (const m of markets) {
  const tokenIds = JSON.parse(m.clobTokenIds || '[]');
  if (tokenIds.length === 0) continue;
  
  console.log(`\nMarket: ${m.question}`);
  console.log(`  negRisk: ${m.negRisk}`);
  console.log(`  Token: ${tokenIds[0].substring(0, 30)}...`);
  
  try {
    const order = await client.createAndPostOrder({
      tokenID: tokenIds[0],
      price: 0.01,
      size: 1,
      side: 'BUY',
    }, {
      tickSize: '0.01',
      negRisk: m.negRisk === true || m.negRisk === 'true',
    });
    
    if (order.error) {
      console.log(`  ERROR: ${order.error}`);
    } else {
      console.log(`  SUCCESS! Order ID: ${order.orderID || order.id || JSON.stringify(order).substring(0, 200)}`);
    }
    break; // Stop after first attempt
  } catch(e) {
    console.error(`  Exception: ${e.message}`);
  }
}
