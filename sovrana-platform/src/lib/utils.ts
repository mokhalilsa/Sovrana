import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatPrice(value: number): string {
  return `$${value.toFixed(3)}`;
}

export function truncateId(id: string, len = 8): string {
  return id.length > len ? `${id.slice(0, len)}...` : id;
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    running: 'bg-green-900 text-green-300',
    idle: 'bg-blue-900 text-blue-300',
    errored: 'bg-red-900 text-red-300',
    stopped: 'bg-yellow-900 text-yellow-300',
    killed: 'bg-red-900 text-red-300',
    pending: 'bg-yellow-900 text-yellow-300',
    approved: 'bg-blue-900 text-blue-300',
    rejected: 'bg-red-900 text-red-300',
    executed: 'bg-green-900 text-green-300',
    expired: 'bg-gray-700 text-gray-300',
    placed: 'bg-blue-900 text-blue-300',
    partial: 'bg-yellow-900 text-yellow-300',
    filled: 'bg-green-900 text-green-300',
    cancelled: 'bg-gray-700 text-gray-300',
    blocked: 'bg-red-900 text-red-300',
    buy: 'bg-green-900 text-green-300',
    sell: 'bg-red-900 text-red-300',
    trading_enabled: 'bg-green-900 text-green-300',
    read_only: 'bg-blue-900 text-blue-300',
    info: 'bg-blue-900 text-blue-300',
    warning: 'bg-yellow-900 text-yellow-300',
    error: 'bg-red-900 text-red-300',
    critical: 'bg-red-900 text-red-300',
  };
  return map[status] || 'bg-gray-700 text-gray-300';
}

export function getPnlColor(value: number): string {
  if (value > 0) return 'text-green-400';
  if (value < 0) return 'text-red-400';
  return 'text-gray-400';
}
