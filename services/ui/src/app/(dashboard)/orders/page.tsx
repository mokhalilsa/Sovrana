'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { ordersApi, fillsApi } from '@/lib/api'
import type { Order, Fill } from '@/types'
import { RefreshCw, XCircle } from 'lucide-react'
import { format } from 'date-fns'

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [fills, setFills] = useState<Fill[]>([])
  const [tab, setTab] = useState<'orders' | 'fills'>('orders')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

  async function load() {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { limit: 200 }
      if (statusFilter) params.status = statusFilter
      const [o, f] = await Promise.all([ordersApi.list(params), fillsApi.list({ limit: 200 })])
      setOrders(o)
      setFills(f)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter])

  async function cancelOrder(order: Order) {
    if (!order.polymarket_order_id) return
    if (!confirm(`Cancel order ${order.id}?`)) return
    await ordersApi.cancel(order.id, order.agent_id, order.polymarket_order_id)
    await load()
  }

  return (
    <div>
      <TopBar title="Orders" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Orders and Fills</h2>
            <p className="text-gray-400 text-sm mt-1">All order activity across all agents</p>
          </div>
          <button onClick={load} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="flex gap-1 mb-6 bg-[#1a1f2e] p-1 rounded-xl w-fit border border-[#2d3748]">
          {(['orders', 'fills'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'orders' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2d3748] flex gap-4">
              <select className="input py-1.5 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All Statuses</option>
                {['pending', 'placed', 'partial', 'filled', 'cancelled', 'rejected', 'blocked'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Time', 'Agent', 'Market', 'Side', 'Size USDC', 'Price', 'Status', 'Block Reason', 'Actions'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center text-gray-500 py-8">Loading...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={9} className="text-center text-gray-500 py-8">No orders found</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="border-b border-[#2d3748]/50">
                      <td className="table-cell text-xs text-gray-500 whitespace-nowrap">
                        {format(new Date(o.created_at), 'MM/dd HH:mm:ss')}
                      </td>
                      <td className="table-cell">{o.agent_name}</td>
                      <td className="table-cell font-mono text-xs">{o.condition_id.slice(0, 10)}...</td>
                      <td className="table-cell">
                        <span className={o.side === 'buy' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">{o.size_usdc.toFixed(2)}</td>
                      <td className="table-cell">{o.price?.toFixed(4) || 'mkt'}</td>
                      <td className="table-cell">
                        <span className={
                          o.status === 'filled' ? 'badge-success' :
                          o.status === 'blocked' || o.status === 'rejected' ? 'badge-danger' :
                          o.status === 'placed' ? 'badge-info' :
                          o.status === 'cancelled' ? 'badge-neutral' : 'badge-warning'
                        }>{o.status}</span>
                      </td>
                      <td className="table-cell text-xs text-gray-500 max-w-xs truncate" title={o.block_reason || ''}>
                        {o.block_reason || ''}
                      </td>
                      <td className="table-cell">
                        {['placed', 'partial'].includes(o.status) && o.polymarket_order_id && (
                          <button onClick={() => cancelOrder(o)} className="p-1.5 text-red-400 hover:text-red-300" title="Cancel">
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'fills' && (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Fill Time', 'Agent', 'Market', 'Side', 'Fill Price', 'Size USDC', 'Fee USDC'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fills.map((f) => (
                  <tr key={f.id} className="border-b border-[#2d3748]/50">
                    <td className="table-cell text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(f.filled_at), 'MM/dd HH:mm:ss')}
                    </td>
                    <td className="table-cell">{f.agent_name}</td>
                    <td className="table-cell font-mono text-xs">{f.condition_id.slice(0, 10)}...</td>
                    <td className="table-cell">
                      <span className={f.side === 'buy' ? 'text-green-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {f.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{f.fill_price.toFixed(4)}</td>
                    <td className="table-cell">{f.fill_size_usdc.toFixed(2)}</td>
                    <td className="table-cell text-gray-500">{f.fee_usdc.toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
