'use client';

import { useState } from 'react';
import { ScrollText, Filter, AlertCircle, AlertTriangle, Info, XCircle, Shield, X, Download } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import { useToast } from '@/components/Toast';
import { mockAuditLogs } from '@/lib/mock-data';
import { format, parseISO } from 'date-fns';
import { AuditLog } from '@/types';

const severityIcons: Record<string, React.ReactNode> = {
  info: <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center"><Info className="w-3.5 h-3.5 text-blue-600" /></div>,
  warning: <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center"><AlertTriangle className="w-3.5 h-3.5 text-amber-600" /></div>,
  error: <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-3.5 h-3.5 text-red-600" /></div>,
  critical: <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center"><AlertCircle className="w-3.5 h-3.5 text-red-500" /></div>,
};

export default function AuditLogPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterAgent, setFilterAgent] = useState<string>('all');
  const [filterEventType, setFilterEventType] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const { addToast } = useToast();

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

  const handleClearFilters = () => {
    setFilterSeverity('all');
    setFilterAgent('all');
    setFilterEventType('all');
    addToast('info', 'Filters Cleared', 'All filters have been reset.');
  };

  const handleExport = () => {
    const csv = [
      'Time,Severity,Event Type,Agent,Message,Entity Type,Entity ID',
      ...filtered.map(l => `${l.created_at},${l.severity},${l.event_type},${l.agent_name || 'System'},${l.message.replace(/,/g, ';')},${l.entity_type || ''},${l.entity_id || ''}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Export Complete', `${filtered.length} log entries exported to CSV.`);
  };

  const hasFilters = filterSeverity !== 'all' || filterAgent !== 'all' || filterEventType !== 'all';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Audit Log</h1>
            <div className="p-2 rounded-xl bg-slate-100">
              <Shield className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <p className="text-sm text-slate-500">System events, agent actions, and operational logs</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 py-2 px-3.5">
            <Download className="w-4 h-4" /> Export
          </button>
          <div className="flex items-center gap-2">
            {errorCount > 0 && <span className="badge-danger">{errorCount} Errors</span>}
            {warningCount > 0 && <span className="badge-warning">{warningCount} Warnings</span>}
            <span className="badge-neutral">{mockAuditLogs.length} Total</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-slate-500">
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
        {hasFilters && (
          <button onClick={handleClearFilters} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
        <span className="text-xs text-slate-500 font-medium ml-auto">{filtered.length} events</span>
      </div>

      {/* Log Table */}
      <DataTable
        columns={[
          {
            key: 'severity', header: '',
            render: (l) => (
              <div className="cursor-pointer" onClick={() => setSelectedLog(l)}>
                {severityIcons[l.severity] || severityIcons.info}
              </div>
            ),
          },
          {
            key: 'time', header: 'Time',
            render: (l) => <span className="text-xs text-slate-400 font-mono cursor-pointer hover:text-blue-600" onClick={() => setSelectedLog(l)}>{format(parseISO(l.created_at), 'MMM dd, HH:mm:ss')}</span>,
          },
          {
            key: 'event', header: 'Event Type',
            render: (l) => (
              <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-50 text-slate-500 ring-1 ring-slate-200 font-semibold cursor-pointer hover:bg-blue-50 hover:text-blue-600 hover:ring-blue-200 transition-colors" onClick={() => setSelectedLog(l)}>
                {l.event_type}
              </span>
            ),
          },
          {
            key: 'agent', header: 'Agent',
            render: (l) => l.agent_name ? (
              <span className="text-sm font-semibold text-slate-700">{l.agent_name}</span>
            ) : (
              <span className="text-xs text-slate-500 font-medium">System</span>
            ),
          },
          {
            key: 'message', header: 'Message',
            render: (l) => <p className="text-sm text-slate-500 max-w-md leading-relaxed cursor-pointer hover:text-slate-700" onClick={() => setSelectedLog(l)}>{l.message}</p>,
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
                {l.entity_id && <p className="text-[10px] text-slate-400 font-mono">{l.entity_id}</p>}
              </div>
            ) : <span className="text-xs text-slate-400">—</span>,
          },
        ]}
        data={filtered}
        pageSize={10}
      />

      {/* Log Detail Modal */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Entry Details"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {severityIcons[selectedLog.severity]}
              <div>
                <p className="text-sm font-bold text-slate-800">{selectedLog.event_type}</p>
                <p className="text-xs text-slate-500">{format(parseISO(selectedLog.created_at), 'MMMM dd, yyyy HH:mm:ss')}</p>
              </div>
              <div className="ml-auto">
                <StatusBadge status={selectedLog.severity} />
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Message</p>
              <p className="text-sm text-slate-700 leading-relaxed">{selectedLog.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Agent</p>
                <p className="text-sm font-semibold text-slate-700">{selectedLog.agent_name || 'System'}</p>
                {selectedLog.agent_id && <p className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedLog.agent_id}</p>}
              </div>
              <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Severity</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{selectedLog.severity}</p>
              </div>
            </div>

            {(selectedLog.entity_type || selectedLog.entity_id) && (
              <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Related Entity</p>
                <p className="text-sm text-slate-700">{selectedLog.entity_type}: <span className="font-mono text-xs">{selectedLog.entity_id}</span></p>
              </div>
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Metadata</p>
                <pre className="text-xs text-slate-600 font-mono whitespace-pre-wrap">{JSON.stringify(selectedLog.metadata, null, 2)}</pre>
              </div>
            )}

            <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Log ID</p>
              <p className="text-xs text-slate-600 font-mono">{selectedLog.id}</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
