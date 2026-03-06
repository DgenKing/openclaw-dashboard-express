/**
 * Mock OpenClaw Gateway Server
 *
 * Simulates the OpenClaw Gateway WebSocket at ws://127.0.0.1:18789
 * so you can develop and test the dashboard without OpenClaw installed.
 *
 * Run: bun mock-gateway.ts
 * Then in another terminal: bun server.ts
 */

import type { AgentStatus } from './types/openclaw'

// --- Mock Agent Definitions ---

interface MockAgent {
  id: string
  name: string
  status: string
  current_task: string | null
  last_active: number
  tokens_in: number
  tokens_out: number
}

const AGENT_NAMES = [
  'ResearchBot',
  'CodeWriter',
  'SocialManager',
  'DataAnalyst',
  'ContentCreator',
  'BugHunter',
  'DevOpsBot',
  'DesignReviewer',
]

const TASKS = [
  'Analyzing competitor pricing data',
  'Writing unit tests for auth module',
  'Drafting tweet thread on product launch',
  'Scraping quarterly earnings reports',
  'Generating blog post outline',
  'Reviewing PR #42 for security issues',
  'Setting up CI/CD pipeline',
  'Creating wireframes for dashboard v2',
  'Summarizing customer feedback',
  'Refactoring database queries',
  'Monitoring uptime alerts',
  'Translating docs to Spanish',
]

const STATUSES: string[] = ['working', 'thinking', 'idle', 'error', 'offline']
const STATUS_WEIGHTS = [0.35, 0.25, 0.25, 0.1, 0.05] // weighted random

function weightedRandom(items: string[], weights: number[]): string {
  const r = Math.random()
  let cumulative = 0
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i]
    if (r < cumulative) return items[i]
  }
  return items[items.length - 1]
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

// --- Create initial mock agents ---

const agents: MockAgent[] = AGENT_NAMES.map((name, i) => ({
  id: `agent-${String(i + 1).padStart(3, '0')}`,
  name,
  status: weightedRandom(STATUSES, STATUS_WEIGHTS),
  current_task: Math.random() > 0.3 ? randomItem(TASKS) : null,
  last_active: Date.now() - Math.floor(Math.random() * 300000),
  tokens_in: Math.floor(Math.random() * 50000) + 1000,
  tokens_out: Math.floor(Math.random() * 30000) + 500,
}))

// --- Mock history entries ---

const HISTORY_ACTIONS = [
  'Agent started new task',
  'Task completed successfully',
  'Agent encountered rate limit, retrying',
  'Switched to fallback model',
  'Generated 2,400 tokens',
  'API call failed, auto-recovering',
  'Agent resumed after idle timeout',
  'Task queued for processing',
  'Output validated and cached',
  'Agent escalated to human review',
]

function generateHistory() {
  const history = []
  for (let i = 0; i < 30; i++) {
    const agent = randomItem(agents)
    history.push({
      id: `hist-${crypto.randomUUID().slice(0, 8)}`,
      timestamp: Date.now() - Math.floor(Math.random() * 3600000),
      session_id: agent.id,
      action: `[${agent.name}] ${randomItem(HISTORY_ACTIONS)}`,
    })
  }
  return history.sort((a, b) => b.timestamp - a.timestamp)
}

// --- WebSocket Server ---

const clients = new Set<any>()

const server = Bun.serve({
  port: 18789,
  fetch(req, server) {
    const upgraded = server.upgrade(req)
    if (upgraded) return undefined
    return new Response('Mock OpenClaw Gateway - connect via WebSocket', { status: 200 })
  },
  websocket: {
    open(ws) {
      clients.add(ws)
      console.log(`[Mock Gateway] Client connected (${clients.size} total)`)
    },

    message(ws, message) {
      try {
        const msg = JSON.parse(message.toString())
        console.log(`[Mock Gateway] Received: ${msg.type}`)

        switch (msg.type) {
          case 'sessions_list': {
            ws.send(JSON.stringify({
              type: 'session_list',
              sessions: agents,
            }))
            console.log(`[Mock Gateway] Sent ${agents.length} agents`)
            break
          }

          case 'sessions_history': {
            ws.send(JSON.stringify({
              type: 'session_history',
              history: generateHistory(),
            }))
            console.log(`[Mock Gateway] Sent history`)
            break
          }

          case 'sessions_send': {
            const agent = agents.find(a => a.id === msg.session_id)
            if (agent) {
              console.log(`[Mock Gateway] Command to ${agent.name}: "${msg.message}"`)
              // Simulate agent picking up the task
              agent.status = 'working'
              agent.current_task = msg.message
              agent.last_active = Date.now()
              broadcastUpdate(agent)

              // Simulate completion after 5-15 seconds
              const delay = 5000 + Math.random() * 10000
              setTimeout(() => {
                agent.status = 'idle'
                agent.current_task = null
                agent.tokens_in += Math.floor(Math.random() * 2000) + 500
                agent.tokens_out += Math.floor(Math.random() * 1500) + 200
                agent.last_active = Date.now()
                broadcastUpdate(agent)
              }, delay)
            }
            break
          }
        }
      } catch (e) {
        console.error('[Mock Gateway] Parse error:', e)
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }))
      }
    },

    close(ws) {
      clients.delete(ws)
      console.log(`[Mock Gateway] Client disconnected (${clients.size} total)`)
    },
  },
})

function broadcastUpdate(agent: MockAgent) {
  const payload = JSON.stringify({
    type: 'session_update',
    session: agent,
  })
  for (const client of clients) {
    client.send(payload)
  }
}

// --- Simulate live agent activity ---

function simulateActivity() {
  const agent = randomItem(agents)
  const oldStatus = agent.status

  // Pick a new status (weighted)
  agent.status = weightedRandom(STATUSES, STATUS_WEIGHTS)

  // Update task based on status
  if (agent.status === 'working') {
    agent.current_task = randomItem(TASKS)
    agent.tokens_in += Math.floor(Math.random() * 500) + 50
    agent.tokens_out += Math.floor(Math.random() * 300) + 30
  } else if (agent.status === 'idle' || agent.status === 'offline') {
    agent.current_task = null
  }

  agent.last_active = Date.now()

  if (oldStatus !== agent.status) {
    console.log(`[Mock Gateway] ${agent.name}: ${oldStatus} -> ${agent.status}`)
    broadcastUpdate(agent)
  }
}

// Random updates every 3-8 seconds
function scheduleNextUpdate() {
  const delay = 3000 + Math.random() * 5000
  setTimeout(() => {
    simulateActivity()
    scheduleNextUpdate()
  }, delay)
}

scheduleNextUpdate()

console.log(`\n  Mock OpenClaw Gateway running at ws://127.0.0.1:18789`)
console.log(`  Simulating ${agents.length} agents with live status changes`)
console.log(`  Press Ctrl+C to stop\n`)
