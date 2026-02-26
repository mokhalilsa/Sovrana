/**
 * API client for all three backend services.
 * All calls go through Next.js API routes to keep service URLs server-side.
 */

import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ------------------------------------------------------------------
// Agents
// ------------------------------------------------------------------

export const agentsApi = {
  list: () => api.get('/agents').then((r) => r.data),
  get: (id: string) => api.get(`/agents/${id}`).then((r) => r.data),
  create: (data: Record<string, unknown>) => api.post('/agents', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/agents/${id}`, data).then((r) => r.data),
  delete: (id: string) => api.delete(`/agents/${id}`).then((r) => r.data),
  start: (id: string) => api.post(`/agents/${id}/start`).then((r) => r.data),
  stop: (id: string) => api.post(`/agents/${id}/stop`).then((r) => r.data),
  setKillSwitch: (id: string, enabled: boolean) =>
    api.post(`/agents/${id}/kill`, { enabled }).then((r) => r.data),
  getRiskLimits: (id: string) => api.get(`/agents/${id}/risk`).then((r) => r.data),
  updateRiskLimits: (id: string, data: Record<string, unknown>) =>
    api.put(`/agents/${id}/risk`, data).then((r) => r.data),
  getMarketPermissions: (id: string) => api.get(`/agents/${id}/markets`).then((r) => r.data),
  addMarketPermission: (id: string, data: Record<string, unknown>) =>
    api.post(`/agents/${id}/markets`, data).then((r) => r.data),
  removeMarketPermission: (agentId: string, permissionId: string) =>
    api.delete(`/agents/${agentId}/markets/${permissionId}`).then((r) => r.data),
  getStrategy: (id: string) => api.get(`/agents/${id}/strategy`).then((r) => r.data),
  setStrategy: (id: string, data: Record<string, unknown>) =>
    api.post(`/agents/${id}/strategy`, data).then((r) => r.data),
}

// ------------------------------------------------------------------
// Signals
// ------------------------------------------------------------------

export const signalsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/signals', { params }).then((r) => r.data),
  approve: (id: string) => api.post(`/signals/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) =>
    api.post(`/signals/${id}/reject`, { reason }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Orders and fills
// ------------------------------------------------------------------

export const ordersApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/orders', { params }).then((r) => r.data),
  cancel: (orderId: string, agentId: string, polymarketOrderId: string) =>
    api.post('/orders/cancel', { order_id: orderId, agent_id: agentId, polymarket_order_id: polymarketOrderId }).then((r) => r.data),
  manual: (data: Record<string, unknown>) =>
    api.post('/orders/manual', data).then((r) => r.data),
}

export const fillsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/fills', { params }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Positions and PnL
// ------------------------------------------------------------------

export const positionsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/positions', { params }).then((r) => r.data),
}

export const pnlApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/pnl', { params }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Audit logs
// ------------------------------------------------------------------

export const auditApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/audit', { params }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Markets
// ------------------------------------------------------------------

export const marketsApi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/markets', { params }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Strategies
// ------------------------------------------------------------------

export const strategiesApi = {
  templates: () => api.get('/strategies/templates').then((r) => r.data),
  list: () => api.get('/strategies').then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/strategies', data).then((r) => r.data),
}

// ------------------------------------------------------------------
// Kill switches
// ------------------------------------------------------------------

export const killSwitchApi = {
  globalEnable: () => api.post('/kill/global', { enabled: true }).then((r) => r.data),
  globalDisable: () => api.post('/kill/global', { enabled: false }).then((r) => r.data),
  agentEnable: (agentId: string) =>
    api.post(`/kill/agent/${agentId}`, { enabled: true }).then((r) => r.data),
  agentDisable: (agentId: string) =>
    api.post(`/kill/agent/${agentId}`, { enabled: false }).then((r) => r.data),
}

// ------------------------------------------------------------------
// Wallet profiles
// ------------------------------------------------------------------

export const walletsApi = {
  list: () => api.get('/wallets').then((r) => r.data),
  create: (data: Record<string, unknown>) =>
    api.post('/wallets', data).then((r) => r.data),
}

export default api
