import { CONFIG } from './config'
import type { Agent, TaskEntry, ActivityEntry, DashboardStats, AgentStatus } from '../types/openclaw'
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
let reqIdCounter = 0
let authenticated = false

function nextId(): string {
  return `dash-${++reqIdCounter}`
}

// Send an OpenClaw protocol request frame
function sendReq(method: string, params?: any): string {
  const id = nextId()
  const frame: any = { type: 'req', id, method }
  if (params) frame.params = params
  ws?.send(JSON.stringify(frame))
  return id
}

function mapGatewayStatus(status: string): AgentStatus {
  const s = status.toLowerCase()
  if (s === 'working' || s === 'running') return 'working'
  if (s === 'thinking' || s === 'idle') return 'thinking'
  if (s === 'error' || s === 'failed') return 'error'
  if (s === 'offline' || s === 'disconnected') return 'offline'
  return 'idle'
}

function convertSessionToAgent(session: any): Agent {
  return {
    id: session.id || session.sessionId || 'unknown',
    name: session.name || session.label || session.id || 'Unknown',
    status: mapGatewayStatus(session.status || 'idle'),
    currentTask: session.current_task || session.currentTask || null,
    lastActive: session.last_active || session.lastActive || Date.now(),
    tokenUsage: {
      input: session.tokens_in || session.tokensIn || 0,
      output: session.tokens_out || session.tokensOut || 0,
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

  authenticated = false
  console.log(`[Gateway] Connecting to ${CONFIG.OPENCLAW_WS}...`)
  ws = new WebSocket(CONFIG.OPENCLAW_WS)

  ws.onopen = () => {
    console.log('[Gateway] WebSocket open, waiting for challenge...')
    reconnectAttempts = 0
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      handleMessage(msg)
    } catch (e) {
      console.error('[Gateway] Failed to parse message:', e)
    }
  }

  ws.onclose = () => {
    console.log('[Gateway] Disconnected')
    authenticated = false
    addActivity('system', 'Disconnected from OpenClaw Gateway')
    scheduleReconnect()
  }

  ws.onerror = (e) => {
    console.error('[Gateway] Error:', e)
    addActivity('system', 'Gateway connection error')
  }
}

function handleMessage(msg: any) {
  // Event frames (type: "event")
  if (msg.type === 'event') {
    handleEvent(msg)
    return
  }

  // Response frames (type: "res")
  if (msg.type === 'res') {
    handleResponse(msg)
    return
  }

  // Legacy mock gateway format fallback
  if (msg.type === 'session_list' || msg.type === 'session_history' || msg.type === 'session_update' || msg.type === 'error') {
    handleLegacyMessage(msg)
    return
  }
}

function handleEvent(msg: any) {
  const { event, payload } = msg

  switch (event) {
    case 'connect.challenge': {
      console.log('[Gateway] Received challenge, authenticating...')
      sendReq('connect', {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'gateway-client',
          version: '1.0.0',
          platform: 'linux',
          mode: 'backend',
        },
        role: 'operator',
        scopes: ['operator.read', 'operator.write'],
        auth: { token: CONFIG.OPENCLAW_TOKEN || undefined },
      })
      break
    }

    case 'health': {
      // Gateway health update
      break
    }

    case 'sessions.update':
    case 'session.update': {
      if (payload) {
        const agent = convertSessionToAgent(payload)
        const existing = state.agents.get(agent.id)
        state.agents.set(agent.id, agent)
        broadcast({ type: 'agent:update', agent })
        if (existing && existing.status !== agent.status) {
          addActivity('agent_update', `Agent "${agent.name}" is now ${agent.status}`, agent.id)
        } else if (!existing) {
          addActivity('agent_update', `New agent "${agent.name}" connected`, agent.id)
        }
        updateStats()
      }
      break
    }

    default: {
      // Log unknown events for debugging
      console.log(`[Gateway] Event: ${event}`)
      break
    }
  }
}

function handleResponse(msg: any) {
  if (!msg.ok) {
    console.error(`[Gateway] Error response (${msg.id}):`, msg.error?.message || msg.error)
    addActivity('system', `Gateway error: ${msg.error?.message || 'Unknown error'}`)
    return
  }

  const payload = msg.payload

  // hello-ok response from connect
  if (payload?.type === 'hello-ok') {
    authenticated = true
    console.log(`[Gateway] Authenticated! Protocol v${payload.protocol}, server ${payload.server?.version}`)
    addActivity('system', `Connected to OpenClaw Gateway v${payload.server?.version}`)

    // Now request sessions list
    sendReq('sessions.list')
    return
  }

  // sessions.list response
  if (payload?.sessions || Array.isArray(payload)) {
    const sessions = payload.sessions || payload
    state.agents.clear()
    for (const session of sessions) {
      const agent = convertSessionToAgent(session)
      state.agents.set(agent.id, agent)
    }
    updateStats()
    broadcastSnapshot()
    addActivity('system', `Loaded ${sessions.length} sessions`)
    return
  }
}

// Fallback for mock gateway which uses simpler message format
function handleLegacyMessage(msg: any) {
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
      if (state.activity.length > CONFIG.MAX_ACTIVITY_LOG) {
        state.activity = state.activity.slice(0, CONFIG.MAX_ACTIVITY_LOG)
      }
      break
    }

    case 'session_update': {
      const agent = convertSessionToAgent(msg.session)
      const existing = state.agents.get(agent.id)
      state.agents.set(agent.id, agent)
      broadcast({ type: 'agent:update', agent })
      if (existing && existing.status !== agent.status) {
        addActivity('agent_update', `Agent "${agent.name}" is now ${agent.status}`, agent.id)
      } else if (!existing) {
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

export function broadcastSnapshot() {
  const agents = Array.from(state.agents.values())
  const tasks = Array.from(state.tasks.values())
  broadcast({ type: 'snapshot', agents, tasks })
}

export function sendToAgent(agentId: string, message: string): boolean {
  if (!ws || ws.readyState !== WebSocket.OPEN || !authenticated) {
    console.error('[Gateway] Not connected')
    return false
  }

  sendReq('send', {
    sessionId: agentId,
    message,
  })

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
