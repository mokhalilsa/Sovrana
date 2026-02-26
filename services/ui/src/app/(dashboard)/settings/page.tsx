'use client'

import { useState } from 'react'
import TopBar from '@/components/layout/TopBar'
import { killSwitchApi, walletsApi, ordersApi } from '@/lib/api'
import { AlertTriangle, Plus, Wallet, Send } from 'lucide-react'

export default function SettingsPage() {
  const [killing, setKilling] = useState(false)
  const [globalKillActive, setGlobalKillActive] = useState(false)

  const [walletForm, setWalletForm] = useState({
    name: '',
    evm_address: '',
    secret_ref: '',
    secret_backend: 'env',
  })
  const [walletSaving, setWalletSaving] = useState(false)
  const [walletMsg, setWalletMsg] = useState('')

  const [manualOrder, setManualOrder] = useState({
    agent_id: '',
    condition_id: '',
    token_id: '',
    side: 'buy',
    price: '',
    size_usdc: '',
  })
  const [orderMsg, setOrderMsg] = useState('')

  async function toggleGlobalKill() {
    setKilling(true)
    try {
      if (globalKillActive) {
        await killSwitchApi.globalDisable()
        setGlobalKillActive(false)
      } else {
        if (!confirm('Activate GLOBAL KILL SWITCH? All trading halts immediately.')) return
        await killSwitchApi.globalEnable()
        setGlobalKillActive(true)
      }
    } finally {
      setKilling(false)
    }
  }

  async function saveWallet(e: React.FormEvent) {
    e.preventDefault()
    setWalletSaving(true)
    setWalletMsg('')
    try {
      await walletsApi.create(walletForm)
      setWalletMsg('Wallet profile created successfully')
      setWalletForm({ name: '', evm_address: '', secret_ref: '', secret_backend: 'env' })
    } catch (err) {
      setWalletMsg('Failed to create wallet profile')
    } finally {
      setWalletSaving(false)
    }
  }

  async function placeManualOrder(e: React.FormEvent) {
    e.preventDefault()
    setOrderMsg('')
    try {
      if (!confirm('Place this manual order? This is a real trade action.')) return
      await ordersApi.manual({
        ...manualOrder,
        price: parseFloat(manualOrder.price),
        size_usdc: parseFloat(manualOrder.size_usdc),
      })
      setOrderMsg('Manual order submitted to execution service')
    } catch (err) {
      setOrderMsg('Failed to submit manual order')
    }
  }

  return (
    <div>
      <TopBar title="Settings" />
      <div className="p-6 space-y-8 max-w-3xl">
        <div>
          <h2 className="text-white text-xl font-semibold mb-2">Platform Settings</h2>
          <p className="text-gray-400 text-sm">Global controls and configuration</p>
        </div>

        {/* Global kill switch */}
        <div className="card border-red-900/50">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-900/30 rounded-xl">
              <AlertTriangle className="w-6 h-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold">Global Kill Switch</h3>
              <p className="text-gray-400 text-sm mt-1">
                Immediately halts ALL trading activity across ALL agents. Use in emergencies only.
              </p>
              <button
                onClick={toggleGlobalKill}
                disabled={killing}
                className={`mt-4 flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  globalKillActive
                    ? 'bg-green-700 text-white hover:bg-green-600'
                    : 'bg-red-700 text-white hover:bg-red-600'
                }`}
              >
                {globalKillActive ? 'Resume All Trading' : 'ACTIVATE GLOBAL KILL SWITCH'}
              </button>
              {globalKillActive && (
                <p className="text-red-400 text-sm mt-2 font-medium">
                  GLOBAL KILL SWITCH IS ACTIVE. No orders will execute.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Wallet profiles */}
        <div className="card space-y-4">
          <div className="flex items-center gap-3">
            <Wallet className="w-5 h-5 text-blue-400" />
            <h3 className="text-white font-semibold">Add Wallet Profile</h3>
          </div>
          <p className="text-gray-500 text-sm">
            Wallet profiles reference private keys stored in environment variables or Vault.
            Never enter private keys directly here.
          </p>

          {walletMsg && (
            <div className={`p-3 rounded-lg text-sm ${walletMsg.includes('success') ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
              {walletMsg}
            </div>
          )}

          <form onSubmit={saveWallet} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Profile Name</label>
                <input className="input" value={walletForm.name} onChange={(e) => setWalletForm({ ...walletForm, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">EVM Address</label>
                <input className="input font-mono" placeholder="0x..." value={walletForm.evm_address} onChange={(e) => setWalletForm({ ...walletForm, evm_address: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Secret Backend</label>
                <select className="input" value={walletForm.secret_backend} onChange={(e) => setWalletForm({ ...walletForm, secret_backend: e.target.value })}>
                  <option value="env">Environment Variable</option>
                  <option value="vault">HashiCorp Vault</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  {walletForm.secret_backend === 'env' ? 'Env Var Name' : 'Vault Path'}
                </label>
                <input
                  className="input font-mono"
                  placeholder={walletForm.secret_backend === 'env' ? 'AGENT_BOT_PRIVATE_KEY' : 'secret/data/agent/bot'}
                  value={walletForm.secret_ref}
                  onChange={(e) => setWalletForm({ ...walletForm, secret_ref: e.target.value })}
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary flex items-center gap-2" disabled={walletSaving}>
              <Plus className="w-4 h-4" />
              {walletSaving ? 'Saving...' : 'Add Wallet Profile'}
            </button>
          </form>
        </div>

        {/* Manual order */}
        <div className="card space-y-4 border-yellow-900/30">
          <div className="flex items-center gap-3">
            <Send className="w-5 h-5 text-yellow-400" />
            <h3 className="text-white font-semibold">Manual Order</h3>
          </div>
          <p className="text-yellow-600 text-sm">
            Admin only. Manual orders bypass signal generation but still go through the risk engine.
          </p>

          {orderMsg && (
            <div className="p-3 bg-blue-900/50 border border-blue-700 rounded-lg text-blue-300 text-sm">
              {orderMsg}
            </div>
          )}

          <form onSubmit={placeManualOrder} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Agent ID</label>
                <input className="input font-mono text-sm" value={manualOrder.agent_id} onChange={(e) => setManualOrder({ ...manualOrder, agent_id: e.target.value })} required placeholder="UUID" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Side</label>
                <select className="input" value={manualOrder.side} onChange={(e) => setManualOrder({ ...manualOrder, side: e.target.value })}>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Condition ID</label>
                <input className="input font-mono text-sm" value={manualOrder.condition_id} onChange={(e) => setManualOrder({ ...manualOrder, condition_id: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Token ID</label>
                <input className="input font-mono text-sm" value={manualOrder.token_id} onChange={(e) => setManualOrder({ ...manualOrder, token_id: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Price (0 to 1)</label>
                <input className="input" type="number" step="0.001" min="0" max="1" value={manualOrder.price} onChange={(e) => setManualOrder({ ...manualOrder, price: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Size (USDC)</label>
                <input className="input" type="number" step="0.01" min="0" value={manualOrder.size_usdc} onChange={(e) => setManualOrder({ ...manualOrder, size_usdc: e.target.value })} required />
              </div>
            </div>
            <button type="submit" className="btn-danger flex items-center gap-2">
              <Send className="w-4 h-4" />
              Place Manual Order
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
