'use client'

import { useState } from 'react'
import { AlertTriangle, Power } from 'lucide-react'
import { killSwitchApi } from '@/lib/api'

export default function TopBar({ title }: { title: string }) {
  const [globalKill, setGlobalKill] = useState(false)
  const [loading, setLoading] = useState(false)

  async function toggleGlobalKill() {
    setLoading(true)
    try {
      if (globalKill) {
        await killSwitchApi.globalDisable()
        setGlobalKill(false)
      } else {
        if (!confirm('Activate GLOBAL KILL SWITCH? All trading will halt immediately.')) return
        await killSwitchApi.globalEnable()
        setGlobalKill(true)
      }
    } catch (err) {
      console.error('Kill switch error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <header className="h-16 bg-[#1a1f2e] border-b border-[#2d3748] flex items-center justify-between px-6">
      <h2 className="text-white font-semibold text-lg">{title}</h2>

      <div className="flex items-center gap-4">
        {globalKill && (
          <div className="flex items-center gap-2 px-3 py-1 bg-red-900/50 border border-red-700 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">GLOBAL KILL ACTIVE</span>
          </div>
        )}

        <button
          onClick={toggleGlobalKill}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            globalKill
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-red-900/30 text-red-400 border border-red-700 hover:bg-red-900/50'
          }`}
        >
          <Power className="w-4 h-4" />
          {globalKill ? 'Resume Trading' : 'Kill All'}
        </button>
      </div>
    </header>
  )
}
