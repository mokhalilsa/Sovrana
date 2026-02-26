'use client';

import { useState } from 'react';
import { ScrollText, Filter, AlertCircle, AlertTriangle, Info, XCircle, Shield } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import { mockAuditLogs } from '@/lib/mock-data';
import { format, parseISO } from 'date-fns';

const severityIcons: Record<string, React.ReactNode> = {
  info: <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center"><Info className="w-3.5 h-3.5 text-blue-400" /></div>,
  warning: <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5 text-amber-400" /></div>,
  error: <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center"><XCircle className="w-3.5 h-3.5 text-red-400" /></div>,
  critical: <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center"><AlertCircle className="w-3.5 h-3.5 text-red-500" /></div>,
};

export default function AuditLogPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');

  const agentNames = [...new Set(mockAuditLogs.map((l) => l.agent_name).filter(Boolean))];
  const eventTypes = [...new Set(mockAuditLogs.map((l) => l.event_type))];

  const filtered = mockAuditLogs.filter((l) => {
    if (filterSeverity !== 'all' && l.severity !== filterSeverity) return false;
    if (filterAgent !== 'all' && l.agent_name !== filterAgent) return false;
    if (filterEventType !== 'all' && l.event_type !== filterEventType) return false;
    return true;
  });

  const errorCount = mockAuditLogs.filter((l) => l.severity === 'error' || l.severity === 'critical').length;
  const warningCount = mockAuditLogs.filter((l) => l.severity === 'warning').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Audit Log</h1>
            <div className="p-2 rounded-xl bg-slate-800/50">
              <Shield className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-sm text-slate-500">System events, agent actions, and operational logs</p>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && <span className="badge-danger">{errorCount} Errors</span>}
          {warningCount > 0 && <span className="badge-warning">{warningCount} Warnings</span>}
          <span className="badge-neutral">{mockAuditLogs.length} Total</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-600">
          <Filter className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Filters</span>
        </div>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="input-dark text-sm">
          <option value="all">All Severities</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
          <option value="critical">Critical</option>
        </select>
        <select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="input-dark text-sm">
          <option value="all">All Agents</option>
          {agentNames.map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        <select value={filterEventType} onChange={(e) => setFilterEventType(e.target.value)} className="input-dark text-sm">
          <option value="all">All Event Types</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <span className="text-xs text-slate-600 font-medium ml-auto">{filtered.length} events</span>
      </div>

      {/* Log Table */}
      <DataTable
        columns={[
          {
            key: 'severity', header: '',
            render: (l) => severityIcons[l.severity] || severityIcons.info,
          },
          {
            key: 'time', header: 'Time',
            render: (l) => <span className="text-xs text-slate-400 font-mono">{format(parseISO(l.created_at), 'MMM dd, HH:mm:ss')}</span>,
          },
          {
            key: 'event', header: 'Event Type',
            render: (l) => (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-900/50 text-slate-300 ring-1 ring-slate-800/40 font-semibold">
                {l.event_type}
              </span>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (l) => l.agent_name ? (
              <span className="text-sm font-semibold text-slate-200">{l.agent_name}</span>
            ) : (
              <span className="text-xs text-slate-600 font-medium">System</span>
            ),
          },
          {
            key: 'message', header: 'Message',
            render: (l) => <p className="text-sm text-slate-300 max-w-md leading-relaxed">{l.message}</p>,
          },
          {
            key: 'sev_badge', header: 'Severity',
            render: (l) => <StatusBadge status={l.severity} />,
          },
          {
            key: 'entity', header: 'Entity',
            render: (l) => l.entity_type ? (
              <div>
                <span className="text-xs text-slate-500 font-medium">{l.entity_type}</span>
                {l.entity_id && <p className="text-[10px] text-slate-700 font-mono">{l.entity_id}</p>}
              </div>
            ) : <span className="text-xs text-slate-700">—</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
