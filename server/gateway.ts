import { CONFIG } from './config'
import type { Agent, TaskEntry, ActivityEntry, DashboardStats, AgentStatus } from '../types/openclaw'
import type { GatewayMessage, GatewaySession, GatewayHistoryEntry } from '../types/ws'
import { broadcast } from './broadcast'

// In-memory state store
export const state = {
  agents: new Map<string, Agent>(),
  tasks: new Map<string, TaskEntry>(),
  activity: [] as ActivityEntry[],
  stats: {
    totalAgents: 0,
    activeAgents: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    tasksCompleted24h: 0,
  },
}

let ws: WebSocket | null = null
let reconnectTimeout: any = null
let reconnectAttempts = 0

function mapGatewayStatus(status: string): AgentStatus {
  const s = status.toLowerCase()
  if (s === 'working' || s === 'running') return 'working'
  if (s === 'thinking' || s === 'idle') return 'thinking'
  if (s === 'error' || s === 'failed') return 'error'
  if (s === 'offline' || s === 'disconnected') return 'offline'
  return 'idle'
}

function convertSessionToAgent(session: GatewaySession): Agent {
  return {
    id: session.id,
    name: session.name,
    status: mapGatewayStatus(session.status),
    currentTask: session.current_task,
    lastActive: session.last_active,
    tokenUsage: {
      input: session.tokens_in,
      output: session.tokens_out,
    },
  }
}

function updateStats() {
  let activeCount = 0
  let totalIn = 0
  let totalOut = 0

  for (const agent of state.agents.values()) {
    if (agent.status === 'working' || agent.status === 'thinking') activeCount++
    totalIn += agent.tokenUsage.input
    totalOut += agent.tokenUsage.output
  }

  state.stats = {
    totalAgents: state.agents.size,
    activeAgents: activeCount,
    totalTokensIn: totalIn,
    totalTokensOut: totalOut,
    tasksCompleted24h: Array.from(state.tasks.values()).filter(
      (t) => t.status === 'completed' && t.completedAt && t.completedAt > Date.now() - 86400000
    ).length,
  }

  broadcast({ type: 'stats', stats: state.stats })
}

function addActivity(type: ActivityEntry['type'], message: string, agentId?: string, taskId?: string) {
  const entry: ActivityEntry = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    type,
    message,
    agentId,
    taskId,
  }
  state.activity.unshift(entry)
  if (state.activity.length > CONFIG.MAX_ACTIVITY_LOG) {
    state.activity.pop()
  }
  broadcast({ type: 'activity', entry })
}

export function connect() {
  if (ws?.readyState === WebSocket.OPEN) return

  console.log(`[Gateway] Connecting to ${CONFIG.OPENCLAW_WS}...`)
  const wsUrl = CONFIG.OPENCLAW_TOKEN ? `${CONFIG.OPENCLAW_WS}?token=${CONFIG.OPENCLAW_TOKEN}` : CONFIG.OPENCLAW_WS
  ws = new WebSocket(wsUrl)

  ws.onopen = () => {
    console.log('[Gateway] Connected')
    reconnectAttempts = 0
    addActivity('system', 'Connected to OpenClaw Gateway')
    // Request initial data
    ws?.send(JSON.stringify({ type: 'sessions_list' }))
  }

  ws.onmessage = (event) => {
    try {
      const msg: GatewayMessage = JSON.parse(event.data)
      handleGatewayMessage(msg)
    } catch (e) {
      console.error('[Gateway] Failed to parse message:', e)
    }
  }

  ws.onclose = () => {
    console.log('[Gateway] Disconnected')
    addActivity('system', 'Disconnected from OpenClaw Gateway')
    scheduleReconnect()
  }

  ws.onerror = (e) => {
    console.error('[Gateway] Error:', e)
    addActivity('system', 'Gateway connection error')
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) clearTimeout(reconnectTimeout)

  const delay = Math.min(
    CONFIG.WS_RECONNECT_BASE_MS * Math.pow(2, reconnectAttempts),
    CONFIG.WS_RECONNECT_MAX_MS
  )
  reconnectAttempts++

  console.log(`[Gateway] Reconnecting in ${delay}ms...`)
  reconnectTimeout = setTimeout(connect, delay)
}

function handleGatewayMessage(msg: GatewayMessage) {
  switch (msg.type) {
    case 'session_list': {
      state.agents.clear()
      for (const session of msg.sessions) {
        const agent = convertSessionToAgent(session)
        state.agents.set(agent.id, agent)
      }
      updateStats()
      broadcastSnapshot()
      addActivity('system', `Loaded ${msg.sessions.length} sessions`)
      // Request history
      ws?.send(JSON.stringify({ type: 'sessions_history' }))
      break
    }

    case 'session_history': {
      for (const entry of msg.history) {
        state.activity.push({
          id: entry.id,
          timestamp: entry.timestamp,
          type: 'system',
          message: entry.action,
          agentId: entry.session_id,
        })
      }
      // Trim to max
      if (state.activity.length > CONFIG.MAX_ACTIVITY_LOG) {
        state.activity = state.activity.slice(0, CONFIG.MAX_ACTIVITY_LOG)
      }
      break
    }

    case 'session_update': {
      const agent = convertSessionToAgent(msg.session)
      const existing = state.agents.get(agent.id)

      if (existing) {
        const statusChanged = existing.status !== agent.status
        state.agents.set(agent.id, agent)
        broadcast({ type: 'agent:update', agent })

        if (statusChanged) {
          addActivity('agent_update', `Agent "${agent.name}" is now ${agent.status}`, agent.id)
        }
      } else {
        state.agents.set(agent.id, agent)
        broadcast({ type: 'agent:update', agent })
        addActivity('agent_update', `New agent "${agent.name}" connected`, agent.id)
      }

      updateStats()
      break
    }

    case 'error': {
      addActivity('system', `Gateway error: ${msg.message}`)
      break
    }
  }
}

export function broadcastSnapshot() {
  const agents = Array.from(state.agents.values())
  const tasks = Array.from(state.tasks.values())
  broadcast({ type: 'snapshot', agents, tasks })
}

export function sendToAgent(agentId: string, message: string): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error('[Gateway] Not connected')
    return false
  }

  ws.send(JSON.stringify({
    type: 'sessions_send',
    session_id: agentId,
    message,
  }))

  addActivity('agent_update', `Sent message to agent`, agentId)
  return true
}

export function getAgents(): Agent[] {
  return Array.from(state.agents.values())
}

export function getTasks(): TaskEntry[] {
  return Array.from(state.tasks.values())
}

export function getStats(): DashboardStats {
  return state.stats
}

export function getActivity(): ActivityEntry[] {
  return state.activity.slice(0, 200)
}
