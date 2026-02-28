/**
 * Cancel ALL open orders on Polymarket
 */
import { ClobClient } from '@polymarket/clob-client';
import { ethers } from 'ethers';

const CLOB_API = 'https://clob.polymarket.com';
const CHAIN_ID = 137;

const pk = '0x7eb24f67779a00768c848f47e277e042e1859972825d56557208c3c69baca585';
const creds = {
  key: 'd3147643-ee67-1132-eff3-db539cdc7f0d',
  secret: 'oJFOlcCEbPGqFGgDlBhXXcdAukfYohm_iTPjbBcYXLs=',
  passphrase: '61d5387264d590c50cb620231a8299f8e2d051abe3247aaecccecf6cf08bf1cd',
};
const funder = '0x36BC6aAc04B92548cE78a990d2A83eB64B92D8cd';

// Set proxy for geo-bypass
process.env.HTTPS_PROXY = 'http://axlizrdy-AE-BR-IN-JP-KR-SA-1:x90dt34e5bs7@p.webshare.io:10000';
process.env.HTTP_PROXY = 'http://axlizrdy-AE-BR-IN-JP-KR-SA-1:x90dt34e5bs7@p.webshare.io:10000';

class NoEnsProvider extends ethers.providers.StaticJsonRpcProvider {
  async resolveName(name) {
    if (ethers.utils.isAddress(name)) return name;
    return name;
  }
}

const provider = new NoEnsProvider('https://polygon-bor-rpc.publicnode.com', { name: 'polygon', chainId: 137 });
const wallet = new ethers.Wallet(pk, provider);

const client = new ClobClient(CLOB_API, CHAIN_ID, wallet, creds, 1, funder);

async function cancelAll() {
  console.log('=== CANCELLING ALL OPEN ORDERS ===');
  console.log();

  // Step 1: Get all open orders
  console.log('Fetching open orders...');
  const openOrders = await client.getOpenOrders();
  console.log(`Found ${openOrders.length} open orders`);

  if (openOrders.length === 0) {
    console.log('No open orders to cancel. All clear!');
    return;
  }

  // Step 2: Cancel each order
  for (const order of openOrders) {
    console.log(`  Cancelling order ${order.id} (${order.side} ${order.original_size} @ ${order.price})...`);
    try {
      const result = await client.cancelOrder({ orderID: order.id });
      console.log(`    -> Cancelled: ${JSON.stringify(result)}`);
    } catch (err) {
      console.log(`    -> Error: ${err.message}`);
    }
  }

  // Step 3: Try cancelAll as well
  console.log();
  console.log('Running cancelAll() for safety...');
  try {
    const result = await client.cancelAll();
    console.log(`cancelAll result: ${JSON.stringify(result)}`);
  } catch (err) {
    console.log(`cancelAll error: ${err.message}`);
  }

  // Step 4: Verify
  console.log();
  console.log('Verifying no orders remain...');
  const remaining = await client.getOpenOrders();
  console.log(`Remaining open orders: ${remaining.length}`);
  
  if (remaining.length === 0) {
    console.log('ALL ORDERS CANCELLED SUCCESSFULLY');
  } else {
    console.log('WARNING: Some orders may still be open');
    for (const o of remaining) {
      console.log(`  Still open: ${o.id}`);
    }
  }
}

cancelAll().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
