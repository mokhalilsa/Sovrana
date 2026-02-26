'use client';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const statusMap: Record<string, { cls: string; label?: string }> = {
  running: { cls: 'badge-success' },
  idle: { cls: 'badge-info' },
  errored: { cls: 'badge-danger' },
  stopped: { cls: 'badge-warning' },
  killed: { cls: 'badge-danger' },
  pending: { cls: 'badge-warning' },
  approved: { cls: 'badge-info' },
  rejected: { cls: 'badge-danger' },
  executed: { cls: 'badge-success' },
  expired: { cls: 'badge-neutral' },
  placed: { cls: 'badge-info' },
  partial: { cls: 'badge-warning' },
  filled: { cls: 'badge-success' },
  cancelled: { cls: 'badge-neutral' },
  blocked: { cls: 'badge-danger' },
  buy: { cls: 'badge-success', label: 'BUY' },
  sell: { cls: 'badge-danger', label: 'SELL' },
  trading_enabled: { cls: 'badge-success', label: 'TRADING' },
  read_only: { cls: 'badge-info', label: 'READ ONLY' },
  info: { cls: 'badge-info' },
  warning: { cls: 'badge-warning' },
  error: { cls: 'badge-danger' },
  critical: { cls: 'badge-danger' },
  active: { cls: 'badge-success' },
  closed: { cls: 'badge-neutral' },
};

const dotColorMap: Record<string, string> = {
  running: 'bg-emerald-400',
  idle: 'bg-blue-400',
  errored: 'bg-red-400',
  stopped: 'bg-amber-400',
  buy: 'bg-emerald-400',
  sell: 'bg-red-400',
  executed: 'bg-emerald-400',
  pending: 'bg-amber-400',
  filled: 'bg-emerald-400',
  active: 'bg-emerald-400',
};

export default function StatusBadge({ status, className = '', size = 'sm', dot = false }: StatusBadgeProps) {
  const config = statusMap[status] || { cls: 'badge-neutral' };
  const label = config.label || status.replace(/_/g, ' ');
  const sizeClass = size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-[11px] px-2.5 py-1';
  const dotColor = dotColorMap[status] || 'bg-slate-400';

  return (
    <span className={`${config.cls} ${sizeClass} inline-flex items-center gap-1.5 rounded-lg font-semibold tracking-wide uppercase ${className}`}>
      {dot && (
        <span className="relative flex h-1.5 w-1.5">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dotColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotColor}`} />
        </span>
      )}
      {label}
    </span>
  );
}
