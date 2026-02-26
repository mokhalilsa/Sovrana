'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bot, Zap, AlertTriangle, Pause, Shield, Search, Power, PowerOff, Eye, Plus, X, Rocket } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useToast } from '@/components/Toast';
import { mockAgents, mockRiskLimits } from '@/lib/mock-data';
import { formatUSD } from '@/lib/utils';
import { Agent } from '@/types';

const statusIcons: Record<string, typeof Zap> = {
  running: Zap,
  idle: Pause,
  errored: AlertTriangle,
  stopped: Shield,
};

const defaultNewAgent = {
  name: '',
  description: '',
  mode: 'trading_enabled' as const,
  is_simulate: false,
  manual_approve: true,
  max_order: '500',
  max_exposure: '5000',
  loss_cap: '1000',
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const { addToast } = useToast();

  // Modal states
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [newAgent, setNewAgent] = useState(defaultNewAgent);
  const [deployLoading, setDeployLoading] = useState(false);

  // Confirm dialog states
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    agentId: string;
    agentName: string;
    action: 'enable' | 'disable' | 'kill' | 'unkill';
  }>({ isOpen: false, agentId: '', agentName: '', action: 'enable' });

  const filtered = agents.filter((a) => {
    if (filter !== 'all' && a.status !== filter) return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && !a.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const statusCounts: Record<string, number> = {
    all: agents.length,
    running: agents.filter(a => a.status === 'running').length,
    idle: agents.filter(a => a.status === 'idle').length,
    errored: agents.filter(a => a.status === 'errored').length,
    stopped: agents.filter(a => a.status === 'stopped').length,
  };

  const handleToggleEnabled = (id: string, name: string, currentEnabled: boolean) => {
    setConfirmDialog({
      isOpen: true,
      agentId: id,
      agentName: name,
      action: currentEnabled ? 'disable' : 'enable',
    });
  };

  const handleToggleKillSwitch = (id: string, name: string, currentKill: boolean) => {
    setConfirmDialog({
      isOpen: true,
      agentId: id,
      agentName: name,
      action: currentKill ? 'unkill' : 'kill',
    });
  };

  const confirmAction = () => {
    const { agentId, agentName, action } = confirmDialog;
    if (action === 'enable' || action === 'disable') {
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_enabled: action === 'enable' } : a));
      addToast(
        action === 'enable' ? 'success' : 'warning',
        `Agent ${action === 'enable' ? 'Enabled' : 'Disabled'}`,
        `${agentName} has been ${action}d successfully.`
      );
    } else if (action === 'kill' || action === 'unkill') {
      setAgents(prev => prev.map(a => a.id === agentId ? {
        ...a,
        kill_switch: action === 'kill',
        status: action === 'kill' ? 'killed' as any : a.status,
      } : a));
      addToast(
        action === 'kill' ? 'error' : 'success',
        action === 'kill' ? 'Kill Switch Activated' : 'Kill Switch Deactivated',
        `${agentName} kill switch has been ${action === 'kill' ? 'activated' : 'deactivated'}.`
      );
    }
  };

  const handleDeployAgent = () => {
    if (!newAgent.name.trim()) {
      addToast('error', 'Validation Error', 'Agent name is required.');
      return;
    }
    setDeployLoading(true);
    // Simulate API call
    setTimeout(() => {
      const newId = `agt-${String(agents.length + 1).padStart(3, '0')}`;
      const agent: Agent = {
        id: newId,
        name: newAgent.name,
        description: newAgent.description,
        status: 'idle',
        mode: newAgent.mode,
        is_enabled: true,
        is_simulate: newAgent.is_simulate,
        manual_approve: newAgent.manual_approve,
        kill_switch: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setAgents(prev => [...prev, agent]);
      // Also add risk limits for the new agent
      mockRiskLimits.push({
        id: `rl-${newId}`,
        agent_id: newId,
        max_order_size_usdc: parseFloat(newAgent.max_order) || 500,
        max_exposure_usdc: parseFloat(newAgent.max_exposure) || 5000,
        daily_loss_cap_usdc: parseFloat(newAgent.loss_cap) || 1000,
        max_open_orders: 10,
        slippage_cap_pct: 2,
        cooldown_seconds: 60,
      });
      addToast('success', 'Agent Deployed', `${newAgent.name} has been deployed and is now idle.`);
      setShowDeployModal(false);
      setNewAgent(defaultNewAgent);
      setDeployLoading(false);
    }, 1500);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">AI Agents</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and monitor autonomous trading agents</p>
        </div>
        <button onClick={() => setShowDeployModal(true)} className="btn-primary flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Deploy Agent
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-dark w-full pl-11"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl p-1 border border-slate-200">
          {Object.entries(statusCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                filter === key
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white'
              }`}
            >
              {key === 'all' ? 'All' : key.charAt(0).toUpperCase() + key.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {/* No results */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">No agents found</p>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filter criteria</p>
        </div>
      )}

      {/* Agent Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((agent) => {
          const risk = mockRiskLimits.find(r => r.agent_id === agent.id);
          const StatusIcon = statusIcons[agent.status] || Zap;

          return (
            <div key={agent.id} className="card-hover p-6 group">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    agent.status === 'running' ? 'bg-emerald-50 text-emerald-600' :
                    agent.status === 'errored' ? 'bg-red-50 text-red-600' :
                    agent.status === 'idle' ? 'bg-blue-50 text-blue-600' :
                    'bg-amber-50 text-amber-600'
                  }`}>
                    <StatusIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <Link href={`/agents/${agent.id}`} className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                      {agent.name}
                    </Link>
                    <p className="text-[11px] text-slate-400 font-mono">{agent.id}</p>
                  </div>
                </div>
                <StatusBadge status={agent.status} dot />
              </div>

              {/* Description */}
              <p className="text-xs text-slate-500 mb-5 leading-relaxed line-clamp-2">{agent.description || 'No description provided.'}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Mode</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{agent.mode === 'trading_enabled' ? 'Trading' : 'Read Only'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Max Order</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{risk ? formatUSD(risk.max_order_size_usdc) : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Exposure</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{risk ? formatUSD(risk.max_exposure_usdc) : '—'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Loss Cap</p>
                  <p className="text-xs font-bold text-slate-600 mt-0.5">{risk ? formatUSD(risk.daily_loss_cap_usdc) : '—'}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                <button
                  onClick={() => handleToggleEnabled(agent.id, agent.name, agent.is_enabled)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    agent.is_enabled
                      ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 ring-1 ring-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 ring-1 ring-slate-200'
                  }`}
                >
                  {agent.is_enabled ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                  {agent.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button
                  onClick={() => handleToggleKillSwitch(agent.id, agent.name, agent.kill_switch)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    agent.kill_switch
                      ? 'bg-red-50 text-red-600 hover:bg-red-100 ring-1 ring-red-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 ring-1 ring-slate-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Kill Switch
                </button>
                <Link
                  href={`/agents/${agent.id}`}
                  className="p-2.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all ring-1 ring-slate-200 hover:ring-blue-200"
                >
                  <Eye className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deploy Agent Modal */}
      <Modal
        isOpen={showDeployModal}
        onClose={() => { setShowDeployModal(false); setNewAgent(defaultNewAgent); }}
        title="Deploy New Agent"
        subtitle="Configure and deploy a new autonomous trading agent"
        size="lg"
      >
        <div className="space-y-5">
          {/* Agent Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Agent Name *</label>
            <input
              type="text"
              value={newAgent.name}
              onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
              placeholder="e.g., Theta Momentum"
              className="input-dark w-full"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={newAgent.description}
              onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
              placeholder="Describe the agent's trading strategy..."
              rows={3}
              className="input-dark w-full resize-none"
            />
          </div>

          {/* Mode & Simulate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Trading Mode</label>
              <select
                value={newAgent.mode}
                onChange={(e) => setNewAgent({ ...newAgent, mode: e.target.value as any })}
                className="input-dark w-full"
              >
                <option value="trading_enabled">Trading Enabled</option>
                <option value="read_only">Read Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Simulation Mode</label>
              <div className="flex items-center gap-3 mt-3">
                <button
                  type="button"
                  onClick={() => setNewAgent({ ...newAgent, is_simulate: !newAgent.is_simulate })}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                    newAgent.is_simulate ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                    newAgent.is_simulate ? 'left-[22px]' : 'left-0.5'
                  }`} />
                </button>
                <span className="text-sm text-slate-600">{newAgent.is_simulate ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
          </div>

          {/* Risk Limits */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">Risk Limits</label>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Order (USDC)</label>
                <input
                  type="number"
                  value={newAgent.max_order}
                  onChange={(e) => setNewAgent({ ...newAgent, max_order: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Max Exposure (USDC)</label>
                <input
                  type="number"
                  value={newAgent.max_exposure}
                  onChange={(e) => setNewAgent({ ...newAgent, max_exposure: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Daily Loss Cap (USDC)</label>
                <input
                  type="number"
                  value={newAgent.loss_cap}
                  onChange={(e) => setNewAgent({ ...newAgent, loss_cap: e.target.value })}
                  className="input-dark w-full"
                />
              </div>
            </div>
          </div>

          {/* Manual Approve Toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-700">Manual Approval Required</p>
              <p className="text-xs text-slate-500 mt-0.5">Signals require manual approval before execution</p>
            </div>
            <button
              type="button"
              onClick={() => setNewAgent({ ...newAgent, manual_approve: !newAgent.manual_approve })}
              className={`relative w-11 h-6 rounded-full transition-all duration-200 ${
                newAgent.manual_approve ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all duration-200 ${
                newAgent.manual_approve ? 'left-[22px]' : 'left-0.5'
              }`} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => { setShowDeployModal(false); setNewAgent(defaultNewAgent); }}
              className="flex-1 btn-secondary py-3"
            >
              Cancel
            </button>
            <button
              onClick={handleDeployAgent}
              disabled={deployLoading || !newAgent.name.trim()}
              className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deployLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Deploy Agent
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmAction}
        title={
          confirmDialog.action === 'enable' ? 'Enable Agent' :
          confirmDialog.action === 'disable' ? 'Disable Agent' :
          confirmDialog.action === 'kill' ? 'Activate Kill Switch' :
          'Deactivate Kill Switch'
        }
        message={
          confirmDialog.action === 'enable'
            ? `Are you sure you want to enable ${confirmDialog.agentName}? The agent will begin processing signals and executing trades.`
            : confirmDialog.action === 'disable'
            ? `Are you sure you want to disable ${confirmDialog.agentName}? The agent will stop processing new signals.`
            : confirmDialog.action === 'kill'
            ? `WARNING: Activating the kill switch for ${confirmDialog.agentName} will immediately halt all trading activity and cancel pending orders. This action is critical.`
            : `Are you sure you want to deactivate the kill switch for ${confirmDialog.agentName}? The agent will resume normal operations.`
        }
        confirmText={
          confirmDialog.action === 'kill' ? 'Activate Kill Switch' :
          confirmDialog.action === 'unkill' ? 'Deactivate' :
          confirmDialog.action === 'enable' ? 'Enable' : 'Disable'
        }
        variant={
          confirmDialog.action === 'kill' ? 'danger' :
          confirmDialog.action === 'disable' ? 'warning' :
          'success'
        }
      />
    </div>
  );
}
