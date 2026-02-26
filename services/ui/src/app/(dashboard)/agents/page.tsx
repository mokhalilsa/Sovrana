'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/layout/TopBar'
import { agentsApi, killSwitchApi } from '@/lib/api'
import type { Agent } from '@/types'
import { Plus, Edit, Power, Play, Square, Trash2 } from 'lucide-react'

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

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function load() {
    try {
      const data = await agentsApi.list()
      setAgents(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function handleStart(id: string) {
    setActionLoading(id)
    await agentsApi.start(id)
    await load()
    setActionLoading(null)
  }

  async function handleStop(id: string) {
    setActionLoading(id)
    await agentsApi.stop(id)
    await load()
    setActionLoading(null)
  }

  async function handleKill(agent: Agent) {
    const newState = !agent.kill_switch
    if (newState && !confirm(`Enable kill switch for ${agent.name}?`)) return
    setActionLoading(agent.id)
    await killSwitchApi.agentEnable(agent.id)
    await load()
    setActionLoading(null)
  }

  async function handleDelete(agent: Agent) {
    if (!confirm(`Delete agent ${agent.name}? This cannot be undone.`)) return
    setActionLoading(agent.id)
    await agentsApi.delete(agent.id)
    await load()
    setActionLoading(null)
  }

  return (
    <div>
      <TopBar title="Agents" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-white text-xl font-semibold">Agent Management</h2>
            <p className="text-gray-400 text-sm mt-1">
              Create and manage autonomous trading agents
            </p>
          </div>
          <Link href="/agents/new" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Agent
          </Link>
        </div>

        {loading ? (
          <div className="card text-center text-gray-500 py-12">Loading agents...</div>
        ) : agents.length === 0 ? (
          <div className="card text-center py-16">
            <p className="text-gray-500 mb-4">No agents configured yet</p>
            <Link href="/agents/new" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Your First Agent
            </Link>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="border-b border-[#2d3748]">
                <tr>
                  {['Name', 'Mode', 'Status', 'Simulate', 'Kill Switch', 'Actions'].map((h) => (
                    <th key={h} className="table-header text-left px-6 py-4">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => (
                  <tr
                    key={agent.id}
                    className="border-b border-[#2d3748]/50 hover:bg-white/2 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/agents/${agent.id}`}
                        className="text-white font-medium hover:text-blue-400 transition-colors"
                      >
                        {agent.name}
                      </Link>
                      {agent.description && (
                        <p className="text-gray-500 text-xs mt-0.5">{agent.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={
                          agent.mode === 'trading_enabled'
                            ? 'badge-warning'
                            : 'badge-neutral'
                        }
                      >
                        {agent.mode === 'trading_enabled' ? 'Trading' : 'Read Only'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={agent.status} />
                    </td>
                    <td className="px-6 py-4">
                      {agent.is_simulate ? (
                        <span className="badge-info">Simulate</span>
                      ) : (
                        <span className="badge-warning">Live</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {agent.kill_switch ? (
                        <span className="badge-danger">Active</span>
                      ) : (
                        <span className="badge-neutral">Off</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/agents/${agent.id}`}
                          className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        {agent.status === 'running' ? (
                          <button
                            onClick={() => handleStop(agent.id)}
                            disabled={actionLoading === agent.id}
                            className="p-1.5 text-gray-400 hover:text-yellow-400 transition-colors"
                            title="Stop"
                          >
                            <Square className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStart(agent.id)}
                            disabled={actionLoading === agent.id}
                            className="p-1.5 text-gray-400 hover:text-green-400 transition-colors"
                            title="Start"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => handleKill(agent)}
                          disabled={actionLoading === agent.id}
                          className={`p-1.5 transition-colors ${
                            agent.kill_switch
                              ? 'text-red-400 hover:text-red-300'
                              : 'text-gray-400 hover:text-red-400'
                          }`}
                          title={agent.kill_switch ? 'Disable Kill Switch' : 'Enable Kill Switch'}
                        >
                          <Power className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(agent)}
                          disabled={actionLoading === agent.id}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
