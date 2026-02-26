'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { auditApi } from '@/lib/api'
import type { AuditLog } from '@/types'
import { RefreshCw, Filter } from 'lucide-react'
import { format } from 'date-fns'

const EVENT_COLORS: Record<string, string> = {
  signal_generated: 'text-blue-400',
  signal_approved: 'text-green-400',
  signal_rejected: 'text-yellow-400',
  order_attempt: 'text-purple-400',
  order_placed: 'text-green-400',
  order_filled: 'text-green-400',
  order_cancelled: 'text-yellow-400',
  order_blocked: 'text-red-400',
  risk_breach: 'text-red-400',
  kill_switch_triggered: 'text-red-500',
  agent_started: 'text-green-400',
  agent_stopped: 'text-yellow-400',
  error: 'text-red-400',
}

const SEVERITY_BADGE: Record<string, string> = {
  info: 'badge-info',
  warning: 'badge-warning',
  critical: 'badge-danger',
  error: 'badge-danger',
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [eventFilter, setEventFilter] = useState('')
  const [agentFilter, setAgentFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 200 }
      if (eventFilter) params.event_type = eventFilter
      if (agentFilter) params.agent_id = agentFilter
      const data = await auditApi.list(params)
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [eventFilter, agentFilter])

  const uniqueEvents = [...new Set(logs.map((l) => l.event_type))]

  return (
    <div>
      <TopBar title="Audit Log" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Audit Log</h2>
            <p className="text-gray-400 text-sm mt-1">
              Complete record of all system events and trading actions
            </p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="card mb-6 flex gap-4 items-center">
          <Filter className="w-4 h-4 text-gray-400" />
          <div>
            <label className="block text-xs text-gray-500 mb-1">Event Type</label>
            <select
              className="input py-1.5 text-sm"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
            >
              <option value="">All Events</option>
              {uniqueEvents.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#2d3748]">
              <tr>
                {['Timestamp', 'Event', 'Agent', 'Severity', 'Message', 'Entity'].map((h) => (
                  <th key={h} className="table-header text-left px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center text-gray-500 py-8">No audit logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#2d3748]/50 hover:bg-white/2">
                    <td className="table-cell text-xs font-mono text-gray-500 whitespace-nowrap">
                      {format(new Date(log.created_at), 'MM/dd HH:mm:ss')}
                    </td>
                    <td className={`table-cell text-xs font-medium ${EVENT_COLORS[log.event_type] || 'text-gray-300'}`}>
                      {log.event_type.replace(/_/g, ' ')}
                    </td>
                    <td className="table-cell text-sm">
                      {log.agent_name || <span className="text-gray-600">system</span>}
                    </td>
                    <td className="table-cell">
                      <span className={SEVERITY_BADGE[log.severity] || 'badge-neutral'}>
                        {log.severity}
                      </span>
                    </td>
                    <td className="table-cell text-sm max-w-xs truncate" title={log.message}>
                      {log.message}
                    </td>
                    <td className="table-cell text-xs font-mono text-gray-500">
                      {log.entity_type && log.entity_id
                        ? `${log.entity_type}:${log.entity_id.slice(0, 8)}`
                        : ''}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
