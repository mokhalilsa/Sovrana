'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Plus, Power, PowerOff, Eye, Settings, AlertTriangle } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { mockAgents, mockRiskLimits } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { Agent } from '@/types';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterMode, setFilterMode] = useState<string>('all');

  const filteredAgents = agents.filter((a) => {
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    if (filterMode !== 'all' && a.mode !== filterMode) return false;
    return true;
  });

  const toggleEnabled = (id: string) => {
    setAgents(agents.map((a) => a.id === id ? { ...a, is_enabled: !a.is_enabled } : a));
  };

  const toggleKillSwitch = (id: string) => {
    setAgents(agents.map((a) => a.id === id ? { ...a, kill_switch: !a.kill_switch } : a));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and monitor autonomous trading agents</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="input-dark text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="idle">Idle</option>
          <option value="errored">Errored</option>
          <option value="stopped">Stopped</option>
          <option value="killed">Killed</option>
        </select>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          className="input-dark text-sm"
        >
          <option value="all">All Modes</option>
          <option value="trading_enabled">Trading Enabled</option>
          <option value="read_only">Read Only</option>
        </select>
        <span className="text-xs text-gray-500 ml-2">{filteredAgents.length} agents</span>
      </div>

      {/* Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredAgents.map((agent) => {
          const risk = mockRiskLimits.find((r) => r.agent_id === agent.id);
          return (
            <div key={agent.id} className="card p-5 hover:border-blue-600/30 transition-colors">
              {/* Card Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    agent.status === 'running' ? 'bg-green-600/10' :
                    agent.status === 'errored' ? 'bg-red-600/10' :
                    'bg-gray-600/10'
                  }`}>
                    <Bot className={`w-5 h-5 ${
                      agent.status === 'running' ? 'text-green-400' :
                      agent.status === 'errored' ? 'text-red-400' :
                      'text-gray-400'
                    }`} />
                  </div>
                  <div>
                    <Link href={`/agents/${agent.id}`} className="text-sm font-semibold text-white hover:text-blue-400 transition-colors">
                      {agent.name}
                    </Link>
                    <p className="text-xs text-gray-500">{agent.id}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} />
              </div>

              {/* Description */}
              {agent.description && (
                <p className="text-xs text-gray-400 mb-4 line-clamp-2">{agent.description}</p>
              )}

              {/* Properties */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-[#0f1117] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Mode</p>
                  <StatusBadge status={agent.mode} />
                </div>
                <div className="bg-[#0f1117] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Simulate</p>
                  <p className="text-sm text-gray-200">{agent.is_simulate ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-[#0f1117] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Manual Approve</p>
                  <p className="text-sm text-gray-200">{agent.manual_approve ? 'Yes' : 'No'}</p>
                </div>
                <div className="bg-[#0f1117] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-gray-500 uppercase">Max Exposure</p>
                  <p className="text-sm text-gray-200">{risk ? formatUSD(risk.max_exposure_usdc) : 'N/A'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-[#2d3748]">
                <button
                  onClick={() => toggleEnabled(agent.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    agent.is_enabled
                      ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {agent.is_enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                  {agent.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => toggleKillSwitch(agent.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                    agent.kill_switch
                      ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20'
                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kill Switch
                </button>
                <Link
                  href={`/agents/${agent.id}`}
                  className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#2d3748] transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
