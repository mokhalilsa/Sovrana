'use client';

import { useApiHealth } from '@/lib/hooks/usePolymarket';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export default function LiveIndicator() {
  const { data, isLoading, error } = useApiHealth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Connecting...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <WifiOff className="w-3 h-3" />
        <span>Offline</span>
      </div>
    );
  }

  const isOperational = data.status === 'operational';
  const apiCount = [data.apis.gamma, data.apis.clob, data.apis.data].filter(Boolean).length;

  return (
    <div className="flex items-center gap-1.5 text-xs">
      <div className="relative">
        <div className={`w-2 h-2 rounded-full ${isOperational ? 'bg-green-400' : 'bg-yellow-400'}`} />
        {isOperational && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
        )}
      </div>
      <Wifi className={`w-3 h-3 ${isOperational ? 'text-green-400' : 'text-yellow-400'}`} />
      <span className={isOperational ? 'text-green-400' : 'text-yellow-400'}>
        {isOperational ? 'Live' : 'Degraded'} ({apiCount}/3 APIs)
      </span>
    </div>
  );
}
