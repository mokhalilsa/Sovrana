'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/layout/TopBar'
import { agentsApi, walletsApi, strategiesApi } from '@/lib/api'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function NewAgentPage() {
  const router = useRouter()
  const [wallets, setWallets] = useState<{ id: string; name: string }[]>([])
  const [templates, setTemplates] = useState<{ template_type: string; description: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    name: '',
    description: '',
    mode: 'read_only',
    is_simulate: true,
    manual_approve: false,
    wallet_profile_id: '',
    template_type: '',
    strategy_config: '{\n  "confidence_threshold": 0.6,\n  "max_size_usdc": 50,\n  "time_horizon": 3600\n}',
    max_order_size_usdc: 100,
    max_exposure_usdc: 500,
    daily_loss_cap_usdc: 200,
    slippage_cap_pct: 3.0,
    cooldown_seconds: 60,
    max_open_orders: 10,
  })

  useEffect(() => {
    Promise.all([walletsApi.list(), strategiesApi.templates()])
      .then(([w, t]) => {
        setWallets(w)
        setTemplates(t)
      })
      .catch(console.error)
  }, [])

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      let strategyConfig = {}
      try {
        strategyConfig = JSON.parse(form.strategy_config)
      } catch {
        setError('Strategy config must be valid JSON')
        return
      }

      const agent = await agentsApi.create({
        name: form.name,
        description: form.description,
        mode: form.mode,
        is_simulate: form.is_simulate,
        manual_approve: form.manual_approve,
        wallet_profile_id: form.wallet_profile_id || null,
      })

      await agentsApi.updateRiskLimits(agent.id, {
        max_order_size_usdc: form.max_order_size_usdc,
        max_exposure_usdc: form.max_exposure_usdc,
        daily_loss_cap_usdc: form.daily_loss_cap_usdc,
        slippage_cap_pct: form.slippage_cap_pct,
        cooldown_seconds: form.cooldown_seconds,
        max_open_orders: form.max_open_orders,
      })

      if (form.template_type) {
        await agentsApi.setStrategy(agent.id, {
          template_type: form.template_type,
          config: strategyConfig,
        })
      }

      router.push(`/agents/${agent.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create agent')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <TopBar title="New Agent" />
      <div className="p-6 max-w-3xl">
        <Link
          href="/agents"
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Agents
        </Link>

        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="card space-y-4">
            <h3 className="text-white font-semibold">Basic Information</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Agent Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Alpha Bot"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Description</label>
              <textarea
                className="input"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                rows={2}
                placeholder="Optional description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Mode</label>
                <select
                  className="input"
                  value={form.mode}
                  onChange={(e) => set('mode', e.target.value)}
                >
                  <option value="read_only">Read Only</option>
                  <option value="trading_enabled">Trading Enabled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Wallet Profile</label>
                <select
                  className="input"
                  value={form.wallet_profile_id}
                  onChange={(e) => set('wallet_profile_id', e.target.value)}
                >
                  <option value="">None</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_simulate}
                  onChange={(e) => set('is_simulate', e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm text-gray-300">Simulate Only (no real orders)</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.manual_approve}
                  onChange={(e) => set('manual_approve', e.target.checked)}
                  className="w-4 h-4 accent-blue-500"
                />
                <span className="text-sm text-gray-300">Require Manual Approval</span>
              </label>
            </div>
          </div>

          {/* Strategy */}
          <div className="card space-y-4">
            <h3 className="text-white font-semibold">Strategy</h3>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Strategy Template</label>
              <select
                className="input"
                value={form.template_type}
                onChange={(e) => set('template_type', e.target.value)}
              >
                <option value="">Select a template</option>
                {templates.map((t) => (
                  <option key={t.template_type} value={t.template_type}>
                    {t.template_type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
              {form.template_type && templates.find((t) => t.template_type === form.template_type) && (
                <p className="text-gray-500 text-xs mt-1">
                  {templates.find((t) => t.template_type === form.template_type)?.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Strategy Config (JSON)</label>
              <textarea
                className="input font-mono text-sm"
                value={form.strategy_config}
                onChange={(e) => set('strategy_config', e.target.value)}
                rows={6}
              />
            </div>
          </div>

          {/* Risk limits */}
          <div className="card space-y-4">
            <h3 className="text-white font-semibold">Risk Limits</h3>

            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'max_order_size_usdc', label: 'Max Order Size (USDC)' },
                { key: 'max_exposure_usdc', label: 'Max Market Exposure (USDC)' },
                { key: 'daily_loss_cap_usdc', label: 'Daily Loss Cap (USDC)' },
                { key: 'slippage_cap_pct', label: 'Slippage Cap (%)' },
                { key: 'cooldown_seconds', label: 'Cooldown Between Orders (s)' },
                { key: 'max_open_orders', label: 'Max Open Orders' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm text-gray-400 mb-1">{label}</label>
                  <input
                    type="number"
                    className="input"
                    value={(form as Record<string, unknown>)[key] as number}
                    onChange={(e) => set(key, parseFloat(e.target.value))}
                    min={0}
                    step={key === 'slippage_cap_pct' ? 0.1 : 1}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Agent'}
            </button>
            <Link href="/agents" className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
