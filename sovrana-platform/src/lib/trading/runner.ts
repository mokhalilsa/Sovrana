/**
 * Agent Runner
 * Main execution loop that:
 * 1. Fetches active markets from Polymarket
 * 2. Gets orderbook data for promising markets
 * 3. Runs each enabled agent's strategy against the markets
 * 4. Generates signals and executes trades
 */

import { AgentConfig, MarketData, OrderBookData, analyzeMarket } from './engine';
import { getStore, getAgents, addSignal, addActivity, updateStore } from './store';
import { executeSignal, isExecutorConfigured } from './executor';

const GAMMA_API = 'https://gamma-api.polymarket.com';
const CLOB_API = 'https://clob.polymarket.com';

// ─── Market Data Fetching ──────────────────────────────────────────────────

async function fetchActiveMarkets(limit: number = 30): Promise<MarketData[]> {
  try {
    const res = await fetch(
      `${GAMMA_API}/markets?limit=${limit}&active=true&closed=false&order=volume24hr&ascending=false`,
      { cache: 'no-store', headers: { 'User-Agent': 'Sovrana/1.0' } }
    );
    if (!res.ok) throw new Error(`Gamma API ${res.status}`);
    const markets = await res.json();

    return markets.map((m: any) => {
      // Parse outcomes, prices, and token IDs from Gamma API format
      let outcomes: string[] = [];
      let prices: string[] = [];
      let tokenIds: string[] = [];

      try {
        outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : (m.outcomes || []);
      } catch { outcomes = []; }
      try {
        prices = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : (m.outcomePrices || []);
      } catch { prices = []; }
      try {
        tokenIds = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : (m.clobTokenIds || []);
      } catch { tokenIds = []; }

      // Build tokens array from the parallel arrays
      const tokens = outcomes.map((outcome: string, i: number) => ({
        token_id: tokenIds[i] || '',
        outcome,
        price: parseFloat(prices[i] || '0'),
        winner: false,
      }));

      return {
        conditionId: m.conditionId || '',
        questionId: m.questionID || '',
        question: m.question || '',
        slug: m.slug || '',
        tokens,
        volume24h: parseFloat(m.volume24hr || m.volumeNum || '0'),
        liquidity: parseFloat(m.liquidityNum || '0'),
        spread: parseFloat(m.spread || '0'),
        active: m.active !== false,
        negRisk: m.negRisk || false,
        endDate: m.endDateIso || m.endDate || '',
      };
    });
  } catch (error: any) {
    console.error('Failed to fetch markets:', error.message);
    return [];
  }
}

async function fetchOrderBook(tokenId: string): Promise<OrderBookData | null> {
  try {
    const res = await fetch(`${CLOB_API}/book?token_id=${tokenId}`, {
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();

    const bids = (data.bids || []).map((b: any) => ({
      price: b.price || '0',
      size: b.size || '0',
    }));
    const asks = (data.asks || []).map((a: any) => ({
      price: a.price || '0',
      size: a.size || '0',
    }));

    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : 0;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : 1;
    const spread = bestAsk - bestBid;
    const midpoint = (bestBid + bestAsk) / 2;

    return { bids, asks, spread, midpoint };
  } catch {
    return null;
  }
}

// ─── Agent Execution ───────────────────────────────────────────────────────

export interface RunResult {
  success: boolean;
  marketsScanned: number;
  signalsGenerated: number;
  tradesExecuted: number;
  tradesFailed: number;
  errors: string[];
  duration: number;
}

export async function runAgents(): Promise<RunResult> {
  const startTime = Date.now();
  const result: RunResult = {
    success: true,
    marketsScanned: 0,
    signalsGenerated: 0,
    tradesExecuted: 0,
    tradesFailed: 0,
    errors: [],
    duration: 0,
  };

  try {
    addActivity({
      type: 'engine_run',
      message: 'Agent engine starting market scan...',
      severity: 'info',
    });

    // 1. Get enabled agents
    const agents = getAgents().filter(a => a.enabled);
    if (agents.length === 0) {
      addActivity({
        type: 'engine_run',
        message: 'No enabled agents. Skipping run.',
        severity: 'warning',
      });
      result.duration = Date.now() - startTime;
      return result;
    }

    // 2. Fetch active markets
    const markets = await fetchActiveMarkets(25);
    result.marketsScanned = markets.length;

    if (markets.length === 0) {
      addActivity({
        type: 'engine_run',
        message: 'No active markets found.',
        severity: 'warning',
      });
      result.duration = Date.now() - startTime;
      return result;
    }

    addActivity({
      type: 'engine_run',
      message: `Scanning ${markets.length} markets with ${agents.length} agents...`,
      severity: 'info',
    });

    // 3. For each agent, analyze markets and generate signals
    for (const agent of agents) {
      try {
        // Shuffle markets to add variety
        const shuffled = [...markets].sort(() => Math.random() - 0.5);
        // Each agent analyzes a subset of markets
        const subset = shuffled.slice(0, Math.min(10, shuffled.length));

        for (const market of subset) {
          // Get the first token for orderbook data
          const primaryToken = market.tokens[0];
          if (!primaryToken?.token_id) continue;

          let orderbook: OrderBookData | null = null;
          try {
            orderbook = await fetchOrderBook(primaryToken.token_id);
          } catch {
            // Continue without orderbook data
          }

          // Analyze market with this agent's strategy
          const signal = analyzeMarket(agent, market, orderbook);

          if (signal) {
            addSignal(signal);
            result.signalsGenerated++;

            addActivity({
              type: 'signal',
              agentId: agent.id,
              agentName: agent.name,
              message: `Signal generated: ${signal.side} ${signal.market}`,
              details: `Price: $${signal.price} | Size: $${signal.sizeUSDC} | Confidence: ${(signal.confidence * 100).toFixed(0)}%`,
              severity: 'info',
            });

            // 4. Execute the signal if in live mode and executor is configured
            if (agent.mode === 'live' && isExecutorConfigured()) {
              try {
                const trade = await executeSignal(signal, market.negRisk);
                if (trade.status === 'placed' || trade.status === 'filled') {
                  result.tradesExecuted++;
                } else {
                  result.tradesFailed++;
                }
              } catch (execError: any) {
                result.tradesFailed++;
                result.errors.push(`${agent.name}: ${execError.message}`);
              }
            } else if (agent.mode === 'paper') {
              // Paper trading - simulate execution
              addActivity({
                type: 'trade',
                agentId: agent.id,
                agentName: agent.name,
                message: `[PAPER] Would execute: ${signal.side} ${signal.size} shares at $${signal.price}`,
                details: `Market: ${signal.market}`,
                severity: 'info',
              });
            }

            // Only generate one signal per agent per run to avoid overtrading
            break;
          }
        }
      } catch (agentError: any) {
        result.errors.push(`Agent ${agent.name}: ${agentError.message}`);
        addActivity({
          type: 'error',
          agentId: agent.id,
          agentName: agent.name,
          message: `Agent error: ${agentError.message}`,
          severity: 'error',
        });
      }

      // Small delay between agents to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Update store
    updateStore({ lastRun: new Date().toISOString() });

    addActivity({
      type: 'engine_run',
      message: `Run complete: ${result.signalsGenerated} signals, ${result.tradesExecuted} trades executed, ${result.tradesFailed} failed`,
      details: `Scanned ${result.marketsScanned} markets in ${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      severity: result.tradesFailed > 0 ? 'warning' : 'success',
    });

  } catch (error: any) {
    result.success = false;
    result.errors.push(error.message);
    addActivity({
      type: 'error',
      message: `Engine error: ${error.message}`,
      severity: 'error',
    });
  }

  result.duration = Date.now() - startTime;
  return result;
}
