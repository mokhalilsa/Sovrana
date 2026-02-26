'use client';

import { useState } from 'react';
import { ScrollText, Filter, AlertCircle, AlertTriangle, Info, XCircle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import { mockAuditLogs } from '@/lib/mock-data';
import { format, parseISO } from 'date-fns';

const severityIcons: Record<string, React.ReactNode> = {
  info: <Info className="w-4 h-4 text-blue-400" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
  error: <XCircle className="w-4 h-4 text-red-400" />,
  critical: <AlertCircle className="w-4 h-4 text-red-500" />,
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">System events, agent actions, and operational logs</p>
        </div>
        <div className="flex items-center gap-2">
          {errorCount > 0 && (
            <span className="badge bg-red-900 text-red-300">
              {errorCount} Errors
            </span>
          )}
          {warningCount > 0 && (
            <span className="badge bg-yellow-900 text-yellow-300">
              {warningCount} Warnings
            </span>
          )}
          <span className="badge bg-gray-700 text-gray-300">
            {mockAuditLogs.length} Total
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Filters:</span>
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
        <span className="text-xs text-gray-500">{filtered.length} events</span>
      </div>

      {/* Log Table */}
      <DataTable
        columns={[
          {
            key: 'severity', header: '',
            render: (l) => <div className="flex justify-center">{severityIcons[l.severity] || severityIcons.info}</div>,
          },
          {
            key: 'time', header: 'Time',
            render: (l) => <span className="text-xs text-gray-400 font-mono">{format(parseISO(l.created_at), 'MMM dd, HH:mm:ss')}</span>,
          },
          {
            key: 'event', header: 'Event Type',
            render: (l) => (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#0f1117] text-gray-300">
                {l.event_type}
              </span>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (l) => l.agent_name ? (
              <span className="text-sm text-gray-200">{l.agent_name}</span>
            ) : (
              <span className="text-xs text-gray-600">System</span>
            ),
          },
          {
            key: 'message', header: 'Message',
            render: (l) => <p className="text-sm text-gray-300 max-w-md">{l.message}</p>,
          },
          {
            key: 'sev_badge', header: 'Severity',
            render: (l) => <StatusBadge status={l.severity} />,
          },
          {
            key: 'entity', header: 'Entity',
            render: (l) => l.entity_type ? (
              <div>
                <span className="text-xs text-gray-500">{l.entity_type}</span>
                {l.entity_id && <p className="text-[10px] text-gray-600 font-mono">{l.entity_id}</p>}
              </div>
            ) : <span className="text-xs text-gray-600">-</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />
    </div>
  );
}
