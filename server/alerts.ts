import type { Alert, AlertSeverity } from '../types/alerts'
import { broadcast } from './broadcast'

const state = {
  alerts: [] as Alert[],
  unreadCount: 0,
}

const MAX_ALERTS = 100

export function addAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'read'>) {
  const entry: Alert = {
    ...alert,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    read: false,
  }

  state.alerts.unshift(entry)
  state.unreadCount++

  // Trim to max
  if (state.alerts.length > MAX_ALERTS) {
    state.alerts = state.alerts.slice(0, MAX_ALERTS)
  }

  broadcast({ type: 'alert:new', alert: entry })
  return entry
}

export function markRead(id: string) {
  const alert = state.alerts.find((a) => a.id === id)
  if (alert && !alert.read) {
    alert.read = true
    state.unreadCount = Math.max(0, state.unreadCount - 1)
    broadcast({ type: 'alert:read', id })
  }
}

export function markAllRead() {
  state.alerts.forEach((a) => (a.read = true))
  state.unreadCount = 0
  broadcast({ type: 'alerts:allRead' })
}

export function deleteAlert(id: string) {
  const index = state.alerts.findIndex((a) => a.id === id)
  if (index !== -1) {
    if (!state.alerts[index].read) {
      state.unreadCount = Math.max(0, state.unreadCount - 1)
    }
    state.alerts.splice(index, 1)
    broadcast({ type: 'alert:deleted', id })
  }
}

export function getAlerts(): Alert[] {
  return state.alerts
}

export function getUnreadCount(): number {
  return state.unreadCount
}

// Convenience alert creators
export function alertCostThreshold(exceeded: number, limit: number) {
  return addAlert({
    severity: 'warning',
    title: 'Cost Threshold Exceeded',
    message: `Daily spend ($${exceeded.toFixed(2)}) exceeds $${limit} limit`,
    source: 'costs',
    actionUrl: 'costs',
  })
}

export function alertCronFailed(jobName: string, error: string) {
  return addAlert({
    severity: 'error',
    title: 'Cron Job Failed',
    message: `Job "${jobName}" failed: ${error}`,
    source: 'cron',
    actionUrl: 'crons',
  })
}

export function alertAgentError(agentName: string, error: string) {
  return addAlert({
    severity: 'error',
    title: 'Agent Error',
    message: `${agentName}: ${error}`,
    source: 'gateway',
    actionUrl: 'agents',
  })
}

export function alertGatewayDisconnected() {
  return addAlert({
    severity: 'error',
    title: 'Gateway Disconnected',
    message: 'Lost connection to OpenClaw Gateway',
    source: 'gateway',
    actionUrl: 'overview',
  })
}
