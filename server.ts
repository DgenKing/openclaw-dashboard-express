import { CONFIG } from './server/config'
import { handleApi } from './server/routes'
import { connect, sendToAgent } from './server/gateway'
import { setServer } from './server/broadcast'
import { isAuthValid } from './server/auth'

// Read index.html from disk
const indexHTML = await Bun.file('./index.html').text()

const STATIC = new Map<string, string>([
  ['/', indexHTML],
  ['/index.html', indexHTML],
])

// Build React app on demand
let clientBundle: ArrayBuffer | null = null

async function buildClient(): Promise<ArrayBuffer> {
  if (clientBundle) return clientBundle!

  const result = await Bun.build({
    entrypoints: ['./client.tsx'],
    minify: false,
    define: {
      'process.env.NODE_ENV': '"development"',
    },
  })

  if (!result.outputs[0]) {
    throw new Error('Build failed')
  }

  clientBundle = await result.outputs[0].arrayBuffer()
  return clientBundle
}

const server = Bun.serve({
  port: CONFIG.PORT,
  fetch(req, server) {
    const url = new URL(req.url)
    const authHeader = req.headers.get('Authorization')
    const queryToken = url.searchParams.get('token')

    // WebSocket upgrade
    if (url.pathname === '/ws') {
      if (!isAuthValid(authHeader, queryToken)) {
        return new Response('Unauthorized', { status: 401 })
      }

      const success = server.upgrade(req, {
        data: { token: queryToken || authHeader?.replace(/^Bearer\s+/i, '') },
      })

      if (success) return undefined
      return new Response('WebSocket upgrade failed', { status: 400 })
    }

    // API routes
    if (url.pathname.startsWith('/api/')) {
      return handleApi(url, req.method, authHeader, queryToken)
    }

    // Static files
    if (url.pathname === '/client.js') {
      return buildClient().then((bundle) => {
        return new Response(bundle, {
          headers: { 'Content-Type': 'application/javascript' },
        })
      })
    }

    // Styles
    if (url.pathname === '/styles/dashboard.css') {
      return Bun.file('./styles/dashboard.css').text().then((css) => {
        return new Response(css, {
          headers: { 'Content-Type': 'text/css' },
        })
      })
    }

    const staticContent = STATIC.get(url.pathname)
    if (staticContent) {
      return new Response(staticContent, {
        headers: { 'Content-Type': 'text/html' },
      })
    }

    // Default to index.html for SPA
    return new Response(indexHTML, {
      headers: { 'Content-Type': 'text/html' },
    })
  },

  websocket: {
    async open(ws) {
      ws.subscribe('dashboard')
      console.log(`[WS] Client connected`)
      // Send initial snapshot
      setTimeout(async () => {
        const { getAgents, getTasks } = await import('./server/gateway')
        const agents = getAgents()
        const tasks = getTasks()
        ws.send(JSON.stringify({ type: 'snapshot', agents, tasks }))
      }, 100)
    },

    message(ws, message) {
      try {
        const cmd = JSON.parse(message.toString())

        if (cmd.type === 'send_task' && cmd.agentId && cmd.message) {
          sendToAgent(cmd.agentId, cmd.message)
        }

        if (cmd.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }))
        }
      } catch (e) {
        console.error('[WS] Failed to parse client message:', e)
      }
    },

    close(ws) {
      ws.unsubscribe('dashboard')
      console.log(`[WS] Client disconnected`)
    },
  },
})

setServer(server)

// Connect to OpenClaw Gateway
connect()

console.log(`🚀 Mission Control running at http://localhost:${CONFIG.PORT}`)
