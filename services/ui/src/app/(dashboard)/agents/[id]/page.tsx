'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import { agentsApi, signalsApi, ordersApi, positionsApi } from '@/lib/api'
import type { Agent, AgentRiskLimits, Signal, Order, Position } from '@/types'
import { ArrowLeft, Save, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export default function AgentDetailPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [limits, setLimits] = useState<AgentRiskLimits | null>(null)
  const [signals, setSignals] = useState<Signal[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'risk' | 'markets' | 'signals' | 'orders' | 'positions'>('overview')

  const [form, setForm] = useState({
    name: '',
    description: '',
    mode: 'read_only',
    is_simulate: true,
    manual_approve: false,
  })

  const [riskForm, setRiskForm] = useState({
    max_order_size_usdc: 100,
    max_exposure_usdc: 500,
    daily_loss_cap_usdc: 200,
    slippage_cap_pct: 3.0,
    cooldown_seconds: 60,
    max_open_orders: 10,
  })

  async function load() {
    try {
      const [a, l, s, o, p] = await Promise.all([
        agentsApi.get(id),
        agentsApi.getRiskLimits(id),
        signalsApi.list({ agent_id: id, limit: 20 }),
        ordersApi.list({ agent_id: id, limit: 20 }),
        positionsApi.list({ agent_id: id }),
      ])
      setAgent(a)
      setLimits(l)
      setSignals(s)
      setOrders(o)
      setPositions(p)
      setForm({
        name: a.name,
        description: a.description || '',
        mode: a.mode,
        is_simulate: a.is_simulate,
        manual_approve: a.manual_approve,
      })
      if (l) {
        setRiskForm({
          max_order_size_usdc: l.max_order_size_usdc,
          max_exposure_usdc: l.max_exposure_usdc,
          daily_loss_cap_usdc: l.daily_loss_cap_usdc,
          slippage_cap_pct: l.slippage_cap_pct,
          cooldown_seconds: l.cooldown_seconds,
          max_open_orders: l.max_open_orders,
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function saveAgent() {
    setSaving(true)
    await agentsApi.update(id, form)
    await load()
    setSaving(false)
  }

  async function saveRisk() {
    setSaving(true)
    await agentsApi.updateRiskLimits(id, riskForm)
    await load()
    setSaving(false)
  }

  if (loading) {
    return (
      <div>
        <TopBar title="Agent" />
        <div className="p-6 text-gray-500">Loading...</div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div>
        <TopBar title="Agent" />
        <div className="p-6 text-gray-500">Agent not found</div>
      </div>
    )
  }

  const tabs = ['overview', 'risk', 'markets', 'signals', 'orders', 'positions'] as const

  return (
    <div>
      <TopBar title={agent.name} />
      <div className="p-6">
        <Link href="/agents" className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>

        <div className="flex items-center gap-4 mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">{agent.name}</h2>
            <div className="flex gap-2 mt-1">
              <span className={agent.mode === 'trading_enabled' ? 'badge-warning' : 'badge-neutral'}>
                {agent.mode === 'trading_enabled' ? 'Trading Enabled' : 'Read Only'}
              </span>
              <span className={
                agent.status === 'running' ? 'badge-success' :
                agent.status === 'errored' ? 'badge-danger' : 'badge-neutral'
              }>
                {agent.status}
              </span>
              {agent.kill_switch && <span className="badge-danger">Kill Active</span>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[#1a1f2e] p-1 rounded-xl w-fit border border-[#2d3748]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {activeTab === 'overview' && (
          <div className="card max-w-2xl space-y-4">
            <h3 className="text-white font-semibold">Agent Configuration</h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mode</label>
                <select className="input" value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                  <option value="read_only">Read Only</option>
                  <option value="trading_enabled">Trading Enabled</option>
                </select>
              </div>
            </div>
            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.is_simulate} onChange={(e) => setForm({ ...form, is_simulate: e.target.checked })} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm text-gray-300">Simulate Only</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={form.manual_approve} onChange={(e) => setForm({ ...form, manual_approve: e.target.checked })} className="w-4 h-4 accent-blue-500" />
                <span className="text-sm text-gray-300">Manual Approval</span>
              </label>
            </div>
            <button onClick={saveAgent} className="btn-primary flex items-center gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* Risk tab */}
        {activeTab === 'risk' && (
          <div className="card max-w-2xl space-y-4">
            <h3 className="text-white font-semibold">Risk Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'max_order_size_usdc', label: 'Max Order Size (USDC)' },
                { key: 'max_exposure_usdc', label: 'Max Market Exposure (USDC)' },
                { key: 'daily_loss_cap_usdc', label: 'Daily Loss Cap (USDC)' },
                { key: 'slippage_cap_pct', label: 'Slippage Cap (%)' },
                { key: 'cooldown_seconds', label: 'Cooldown (seconds)' },
                { key: 'max_open_orders', label: 'Max Open Orders' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input
                    type="number"
                    className="input"
                    value={(riskForm as Record<string, number>)[key]}
                    onChange={(e) => setRiskForm({ ...riskForm, [key]: parseFloat(e.target.value) })}
                    step={key === 'slippage_cap_pct' ? 0.1 : 1}
                  />
                </div>
              ))}
            </div>
            <button onClick={saveRisk} className="btn-primary flex items-center gap-2" disabled={saving}>
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Risk Limits'}
            </button>
          </div>
        )}

        {/* Signals tab */}
        {activeTab === 'signals' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2d3748] flex justify-between items-center">
              <h3 className="text-white font-semibold">Signals</h3>
              <button onClick={load} className="btn-secondary flex items-center gap-2 py-1.5">
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </button>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Market', 'Side', 'Price', 'Size USDC', 'Confidence', 'Status', 'Time'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-b border-[#2d3748]/50">
                    <td className="table-cell font-mono">{s.condition_id.slice(0, 12)}...</td>
                    <td className="table-cell">
                      <span className={s.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {s.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{s.price.toFixed(4)}</td>
                    <td className="table-cell">{s.size_usdc.toFixed(2)}</td>
                    <td className="table-cell">{(s.confidence * 100).toFixed(1)}%</td>
                    <td className="table-cell">
                      <span className={
                        s.status === 'approved' ? 'badge-success' :
                        s.status === 'rejected' ? 'badge-danger' :
                        s.status === 'pending' ? 'badge-warning' : 'badge-neutral'
                      }>{s.status}</span>
                    </td>
                    <td className="table-cell text-gray-500 text-xs">
                      {new Date(s.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Orders tab */}
        {activeTab === 'orders' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2d3748]">
              <h3 className="text-white font-semibold">Orders</h3>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Market', 'Side', 'Size USDC', 'Price', 'Status', 'Reason', 'Time'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-[#2d3748]/50">
                    <td className="table-cell font-mono">{o.condition_id.slice(0, 12)}...</td>
                    <td className="table-cell">
                      <span className={o.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{o.size_usdc.toFixed(2)}</td>
                    <td className="table-cell">{o.price?.toFixed(4) || 'market'}</td>
                    <td className="table-cell">
                      <span className={
                        o.status === 'filled' ? 'badge-success' :
                        o.status === 'blocked' || o.status === 'rejected' ? 'badge-danger' :
                        o.status === 'placed' ? 'badge-info' : 'badge-neutral'
                      }>{o.status}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-500">{o.block_reason || ''}</td>
                    <td className="table-cell text-gray-500 text-xs">
                      {new Date(o.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Positions tab */}
        {activeTab === 'positions' && (
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#2d3748]">
              <h3 className="text-white font-semibold">Open Positions</h3>
            </div>
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Market', 'Side', 'Size USDC', 'Entry Price', 'Current Price', 'Unrealized PnL', 'Realized PnL'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.filter((p) => p.is_open).map((p) => (
                  <tr key={p.id} className="border-b border-[#2d3748]/50">
                    <td className="table-cell font-mono">{p.condition_id.slice(0, 12)}...</td>
                    <td className="table-cell">
                      <span className={p.side === 'buy' ? 'text-green-400' : 'text-red-400'}>
                        {p.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-cell">{p.size_usdc.toFixed(2)}</td>
                    <td className="table-cell">{p.avg_entry_price.toFixed(4)}</td>
                    <td className="table-cell">{p.current_price?.toFixed(4) || 'N/A'}</td>
                    <td className={`table-cell ${(p.unrealized_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(p.unrealized_pnl || 0) >= 0 ? '+' : ''}{(p.unrealized_pnl || 0).toFixed(2)}
                    </td>
                    <td className={`table-cell ${p.realized_pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {p.realized_pnl >= 0 ? '+' : ''}{p.realized_pnl.toFixed(2)}
                    </td>
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
