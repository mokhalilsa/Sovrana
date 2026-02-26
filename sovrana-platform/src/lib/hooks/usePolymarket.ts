'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';

interface UsePolymarketOptions {
  endpoint: string;
  params?: Record<string, string>;
  enabled?: boolean;
  refreshInterval?: number; // ms
}

interface UsePolymarketResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  isLive: boolean;
  refetch: () => void;
}

export function usePolymarket<T>({
  endpoint,
  params,
  enabled = true,
  refreshInterval,
}: UsePolymarketOptions): UsePolymarketResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  // Stabilize params to prevent infinite re-renders
  const paramsKey = useMemo(() => JSON.stringify(params || {}), [params]);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      const stableParams = JSON.parse(paramsKey);
      const url = new URL(`/api/polymarket/${endpoint}`, window.location.origin);
      if (stableParams && Object.keys(stableParams).length > 0) {
        Object.entries(stableParams).forEach(([k, v]) => url.searchParams.set(k, v as string));
      }

      const res = await fetch(url.toString());
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      setData(json.data ?? json);
      setIsLive(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      setIsLive(false);
    } finally {
      setIsLoading(false);
    }
  }, [endpoint, paramsKey, enabled]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!refreshInterval || !enabled) return;
    const interval = setInterval(fetchData, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchData, refreshInterval, enabled]);

  return { data, isLoading, error, isLive, refetch: fetchData };
}

// ─── Specialized hooks ──────────────────────────────────────────────────────

const MARKETS_PARAMS = { limit: '100', active: 'true' };
const TRADES_PARAMS_50 = { limit: '50' };
const TRADES_PARAMS_100 = { limit: '100' };

export function useLiveMarkets(limit = 50) {
  const params = useMemo(() => ({ limit: limit.toString(), active: 'true' }), [limit]);
  return usePolymarket<unknown[]>({
    endpoint: 'markets',
    params,
    refreshInterval: 30000, // 30s
  });
}

export function useLivePositions() {
  return usePolymarket<unknown[]>({
    endpoint: 'positions',
    refreshInterval: 15000, // 15s
  });
}

export function useLiveTrades(limit = 50) {
  const params = useMemo(() => ({ limit: limit.toString() }), [limit]);
  return usePolymarket<unknown[]>({
    endpoint: 'trades',
    params,
    refreshInterval: 15000,
  });
}

export function useLiveOrders() {
  return usePolymarket<unknown[]>({
    endpoint: 'orders',
    refreshInterval: 10000, // 10s
  });
}

export function useApiHealth() {
  return usePolymarket<{
    status: string;
    apis: { gamma: boolean; clob: boolean; data: boolean };
    config: { isFullyConfigured: boolean };
  }>({
    endpoint: 'health',
    refreshInterval: 60000, // 1min
  });
}
