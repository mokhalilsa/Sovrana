'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { signalsApi } from '@/lib/api'
import type { Signal } from '@/types'
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

export default function SignalsPage() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 200 }
      if (filter) params.status = filter
      setSignals(await signalsApi.list(params))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  async function approve(id: string) {
    await signalsApi.approve(id)
    await load()
  }

  async function reject(id: string) {
    const reason = prompt('Rejection reason:')
    if (!reason) return
    await signalsApi.reject(id, reason)
    await load()
  }

  return (
    <div>
      <TopBar title="Signals" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Signals Feed</h2>
            <p className="text-gray-400 text-sm mt-1">All strategy-generated trade signals</p>
          </div>
          <div className="flex gap-3">
            <select className="input py-2 text-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="executed">Executed</option>
            </select>
            <button onClick={load} className="btn-secondary flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead className="border-b border-[#2d3748]">
              <tr>
                {['Time', 'Agent', 'Market', 'Side', 'Price', 'Size USDC', 'Confidence', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="table-header text-left px-6 py-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">Loading...</td></tr>
              ) : signals.length === 0 ? (
                <tr><td colSpan={9} className="text-center text-gray-500 py-8">No signals found</td></tr>
              ) : (
                signals.map((s) => (
                  <tr key={s.id} className="border-b border-[#2d3748]/50 hover:bg-white/2">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(s.created_at), 'MM/dd HH:mm:ss')}
                    </td>
                    <td className="table-cell">{s.agent_name}</td>
                    <td className="table-cell font-mono text-xs">{s.condition_id.slice(0, 10)}...</td>
                    <td className="table-cell">
                      <span className={s.side === 'buy' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {s.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{s.price.toFixed(4)}</td>
                    <td className="table-cell">{s.size_usdc.toFixed(2)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${s.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{(s.confidence * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={
                        s.status === 'approved' || s.status === 'executed' ? 'badge-success' :
                        s.status === 'rejected' ? 'badge-danger' :
                        s.status === 'pending' ? 'badge-warning' : 'badge-neutral'
                      }>{s.status}</span>
                    </td>
                    <td className="table-cell">
                      {s.status === 'pending' && (
                        <div className="flex gap-2">
                          <button onClick={() => approve(s.id)} className="p-1.5 text-green-400 hover:text-green-300" title="Approve">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => reject(s.id)} className="p-1.5 text-red-400 hover:text-red-300" title="Reject">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
