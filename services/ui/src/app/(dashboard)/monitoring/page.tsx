'use client'

import { useEffect, useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { agentsApi, signalsApi, ordersApi, pnlApi } from '@/lib/api'
import type { Agent, Signal, Order, PnlSnapshot } from '@/types'
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    running: 'badge-success',
    idle: 'badge-neutral',
    errored: 'badge-danger',
    stopped: 'badge-neutral',
    killed: 'badge-danger',
  }
  return <span className={map[status] || 'badge-neutral'}>{status}</span>
}

function ModeBadge({ mode }: { mode: string }) {
  return mode === 'trading_enabled' ? (
    <span className="badge-warning">Trading</span>
  ) : (
    <span className="badge-neutral">Read Only</span>
  )
}

export default function MonitoringPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [signals, setSignals] = useState<Signal[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [pnl, setPnl] = useState<PnlSnapshot[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    try {
      const [a, s, o, p] = await Promise.all([
        agentsApi.list(),
        signalsApi.list({ limit: 20 }),
        ordersApi.list({ limit: 20 }),
        pnlApi.list({ days: 14 }),
      ])
      setAgents(a)
      setSignals(s)
      setOrders(o)
      setPnl(p)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  const totalPnl = pnl.reduce((acc, p) => acc + p.total_pnl, 0)
  const activeAgents = agents.filter((a) => a.status === 'running').length
  const blockedOrders = orders.filter((o) => o.status === 'blocked').length
  const pendingSignals = signals.filter((s) => s.status === 'pending').length

  // Aggregate PnL by date for chart
  const pnlByDate = Object.values(
    pnl.reduce(
      (acc, p) => {
        const d = p.snapshot_date
        if (!acc[d]) acc[d] = { date: d, pnl: 0 }
        acc[d].pnl += p.total_pnl
        return acc
      },
      {} as Record<string, { date: string; pnl: number }>
    )
  ).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div>
      <TopBar title="Monitoring" />

      <div className="p-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              label: 'Active Agents',
              value: activeAgents,
              icon: Activity,
              color: 'text-blue-400',
            },
            {
              label: 'Total PnL',
              value: `${totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDC`,
              icon: totalPnl >= 0 ? TrendingUp : TrendingDown,
              color: totalPnl >= 0 ? 'text-green-400' : 'text-red-400',
            },
            {
              label: 'Pending Signals',
              value: pendingSignals,
              icon: Clock,
              color: 'text-yellow-400',
            },
            {
              label: 'Blocked Orders',
              value: blockedOrders,
              icon: AlertTriangle,
              color: 'text-red-400',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="card flex items-center gap-4">
              <div className={`p-3 bg-white/5 rounded-xl ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">{label}</p>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Agent status table */}
          <div className="col-span-1 card">
            <h3 className="text-white font-semibold mb-4">Agent Status</h3>
            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : agents.length === 0 ? (
              <p className="text-gray-500 text-sm">No agents configured</p>
            ) : (
              <div className="space-y-3">
                {agents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center justify-between py-2 border-b border-[#2d3748] last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{agent.name}</p>
                      <div className="flex gap-2 mt-1">
                        <ModeBadge mode={agent.mode} />
                        {agent.kill_switch && (
                          <span className="badge-danger">Kill Active</span>
                        )}
                      </div>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PnL chart */}
          <div className="col-span-2 card">
            <h3 className="text-white font-semibold mb-4">PnL (14 Days)</h3>
            {pnlByDate.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-gray-600">
                No PnL data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={pnlByDate}>
                  <XAxis
                    dataKey="date"
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    tickFormatter={(d) => format(new Date(d), 'MM/dd')}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a1f2e',
                      border: '1px solid #2d3748',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#9ca3af' }}
                    itemStyle={{ color: '#60a5fa' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="pnl"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Recent signals */}
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Recent Signals</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2d3748]">
                    <th className="table-header text-left pb-2">Agent</th>
                    <th className="table-header text-left pb-2">Market</th>
                    <th className="table-header text-left pb-2">Side</th>
                    <th className="table-header text-left pb-2">Conf</th>
                    <th className="table-header text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-b border-[#2d3748]/50">
                      <td className="table-cell">{s.agent_name}</td>
                      <td className="table-cell font-mono text-xs">
                        {s.condition_id.slice(0, 10)}...
                      </td>
                      <td className="table-cell">
                        <span
                          className={
                            s.side === 'buy' ? 'text-green-400' : 'text-red-400'
                          }
                        >
                          {s.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">
                        {(s.confidence * 100).toFixed(0)}%
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={s.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent orders */}
          <div className="card">
            <h3 className="text-white font-semibold mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#2d3748]">
                    <th className="table-header text-left pb-2">Agent</th>
                    <th className="table-header text-left pb-2">Side</th>
                    <th className="table-header text-left pb-2">Size</th>
                    <th className="table-header text-left pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((o) => (
                    <tr key={o.id} className="border-b border-[#2d3748]/50">
                      <td className="table-cell">{o.agent_name}</td>
                      <td className="table-cell">
                        <span
                          className={
                            o.side === 'buy' ? 'text-green-400' : 'text-red-400'
                          }
                        >
                          {o.side.toUpperCase()}
                        </span>
                      </td>
                      <td className="table-cell">{o.size_usdc.toFixed(2)} USDC</td>
                      <td className="table-cell">
                        <StatusBadge status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
