# OpenClaw Mission Control Dashboard - Architecture Design

## Pure Bun + TypeScript | Zero Framework Overhead

---

## Stack

- **Runtime**: Bun (latest) - single process, native TS transpilation
- **Server**: `Bun.serve()` - HTTP + WebSocket in one call
- **Frontend**: React 19 + TSX (Bun-bundled, no Webpack/Vite)
- **3D**: React Three Fiber + Drei (low-poly agent visualization)
- **Styling**: Vanilla CSS modules (no Tailwind build step)
- **State**: In-memory server-side, React useState/useReducer client-side

---

## Project Structure

```
mission-control/
├── server.ts                  # Single entry point - Bun.serve()
├── index.html                 # Shell HTML, loads bundled client
├── client.tsx                 # React root - app bootstrap
├── types/
│   ├── openclaw.ts            # OpenClaw Gateway types (sessions, agents, tasks)
│   └── ws.ts                  # WebSocket message protocol types
├── server/
│   ├── gateway.ts             # OpenClaw Gateway WS client (upstream connection)
│   ├── broadcast.ts           # Fan-out to dashboard frontend clients
│   ├── auth.ts                # Simple token auth middleware
│   └── routes.ts              # REST API route handlers
├── components/
│   ├── App.tsx                # Root layout - sidebar + content area
│   ├── Sidebar.tsx            # Navigation: Overview | Agents | Tasks | 3D Office
│   ├── Overview.tsx           # Stats cards: active agents, token spend, uptime
│   ├── AgentList.tsx          # Table: name, status, current task, last active
│   ├── TaskBoard.tsx          # Kanban: pending | running | completed | failed
│   ├── ActivityFeed.tsx       # Live scrolling log from WS events
│   ├── CostTracker.tsx        # Token usage chart (pure SVG)
│   ├── Office3D.tsx           # React Three Fiber scene container
│   └── AgentDesk.tsx          # Individual 3D agent workstation
├── styles/
│   └── dashboard.css          # All styles, CSS custom properties for theming
├── bunfig.toml                # Bun config (if needed)
├── tsconfig.json
└── package.json
```

---

## Architecture Layers

### Layer 1: OpenClaw Gateway Client (`server/gateway.ts`)

Persistent WebSocket connection to `ws://127.0.0.1:18789`.

```
OpenClaw Gateway (ws://127.0.0.1:18789)
        │
        ▼
   gateway.ts  ──► In-memory state store
        │              (agents map, task queue, activity log)
        │
        ▼
   broadcast.ts ──► All connected dashboard clients
```

**Responsibilities:**
- Connect + auto-reconnect (exponential backoff, max 30s)
- Auth handshake (token from hardcoded config)
- Call `sessions_list` on connect, then subscribe to live updates
- Call `sessions_history` for initial activity feed population
- Normalize Gateway events into typed internal events
- Update in-memory state on every event

**Key types:**
```ts
type AgentStatus = 'working' | 'thinking' | 'idle' | 'error' | 'offline'

interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentTask: string | null
  lastActive: number // unix ms
  tokenUsage: { input: number; output: number }
}

interface TaskEntry {
  id: string
  agentId: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt: number | null
}
```

### Layer 2: Bun Server (`server.ts`)

Single `Bun.serve()` call handling everything:

```ts
Bun.serve({
  port: 3000,
  fetch(req, server) {
    // 1. WS upgrade: /ws path
    // 2. API routes: /api/*
    // 3. Static: index.html, bundled JS, CSS
  },
  websocket: {
    open(ws)    { /* subscribe to "dashboard" topic */ },
    message(ws) { /* handle client commands (send task, etc.) */ },
    close(ws)   { /* cleanup */ },
  }
})
```

**REST endpoints (for initial data load + fallback):**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | Current agents + statuses from memory |
| GET | `/api/tasks` | Task list with filters |
| GET | `/api/stats` | Aggregate stats (counts, token totals) |
| GET | `/api/activity` | Recent activity log (last 200 entries) |
| POST | `/api/agents/:id/send` | Proxy `sessions_send` to Gateway |

**WebSocket protocol (dashboard ↔ browser):**

```ts
// Server → Client
type ServerEvent =
  | { type: 'agent:update'; agent: Agent }
  | { type: 'task:update'; task: TaskEntry }
  | { type: 'activity'; entry: ActivityEntry }
  | { type: 'stats'; stats: DashboardStats }
  | { type: 'snapshot'; agents: Agent[]; tasks: TaskEntry[] }

// Client → Server
type ClientCommand =
  | { type: 'send_task'; agentId: string; message: string }
  | { type: 'ping' }
```

**Bun pub/sub for fan-out:**
- All dashboard clients subscribe to `"dashboard"` topic
- Gateway events broadcast via `server.publish("dashboard", JSON.stringify(event))`
- No per-client loops, Bun handles fan-out natively

### Layer 3: Frontend (`client.tsx` + components)

**Data flow:**
```
WebSocket ──► useWebSocket() hook ──► global state (useReducer)
                                          │
              ┌───────────┬───────────┬───┴────────┐
              ▼           ▼           ▼            ▼
          Overview    AgentList    TaskBoard    Office3D
```

**Key patterns:**
- `useWebSocket()` custom hook: connect, reconnect, parse events, dispatch to reducer
- Initial data via REST `/api/snapshot` on mount, then WS for live updates
- Components subscribe to slices of state via context selectors
- No external state lib - useReducer + Context is sufficient for this scale

### Layer 4: 3D Office (`Office3D.tsx` + `AgentDesk.tsx`)

```
Canvas (React Three Fiber)
  └── OrbitControls (Drei)
  └── ambientLight + directionalLight
  └── Floor plane (grid)
  └── AgentDesk[] (one per agent, positioned in grid layout)
        ├── Box mesh (desk)
        ├── Sphere mesh (avatar head)
        ├── Status light (pointLight, color by status)
        ├── Text label (Drei <Text>)
        └── Pulse animation (useFrame, scale oscillation when working)
```

**Status color mapping:**
| Status | Color | Animation |
|--------|-------|-----------|
| working | #22c55e (green) | Pulse scale |
| thinking | #3b82f6 (blue) | Slow rotate |
| idle | #6b7280 (gray) | Static |
| error | #ef4444 (red) | Flash |
| offline | #1f2937 (dark) | Dim opacity |

**Performance constraints:**
- Max 20 agent desks rendered
- All geometry: boxes + spheres only (no loaded models)
- `useFrame` with delta capping at 30fps for 3D scene
- Lazy-load the 3D tab (React.lazy + Suspense)

---

## In-Memory State Store (`server/gateway.ts`)

```ts
const state = {
  agents: new Map<string, Agent>(),
  tasks: new Map<string, TaskEntry>(),
  activity: [] as ActivityEntry[],  // ring buffer, max 500
  stats: {
    totalAgents: 0,
    activeAgents: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    tasksCompleted24h: 0,
  }
}
```

No database. All state reconstructed from Gateway on server start. Activity log is ephemeral (last 500 entries).

---

## Auth (`server/auth.ts`)

Simple token check:
```
1. Config: DASHBOARD_TOKEN hardcoded in auth.ts
2. REST: Authorization: Bearer <token> header
3. WS: Token sent as first message after connect, or query param ?token=
4. Cookie: Set httpOnly cookie after first auth for subsequent requests
```

No user accounts. Single shared token. Local-only by default.

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────┐
│                    Browser (React)                    │
│  Overview | Agents | Tasks | Activity | 3D Office    │
│         ▲                          │                  │
│     WS events               WS commands              │
│         │                          ▼                  │
└─────────┼──────────────────────────┼─────────────────┘
          │          HTTPS/WS        │
┌─────────┼──────────────────────────┼─────────────────┐
│         │      Bun Server (:3000)  │                  │
│    broadcast.ts              routes.ts                │
│         ▲                          │                  │
│    state updates            sessions_send             │
│         │                          ▼                  │
│              gateway.ts (WS client)                   │
│                      │                                │
└──────────────────────┼────────────────────────────────┘
                       │
              ws://127.0.0.1:18789
                       │
┌──────────────────────┼────────────────────────────────┐
│              OpenClaw Gateway                          │
│   sessions_list | sessions_history | sessions_send    │
│                   Agent Pool                          │
└───────────────────────────────────────────────────────┘
```

---

## Build Order (MVP Phases)

### Phase 1: Server Shell + Auth
- `server.ts` with Bun.serve(), static file serving, token auth
- `index.html` + `client.tsx` rendering "Hello Mission Control"
- Confirm Bun bundles and serves TSX correctly

### Phase 2: Gateway Connection
- `gateway.ts` connecting to OpenClaw WS
- `sessions_list` polling, in-memory agent state
- REST `/api/agents` returning live data

### Phase 3: Dashboard Frontend
- Sidebar navigation with route switching
- Overview stats cards
- AgentList table with status badges
- ActivityFeed scrolling log

### Phase 4: Real-Time WebSocket Bridge
- Browser WS connection to `/ws`
- Bun pub/sub broadcasting Gateway events
- Live updates flowing to all components
- Reconnection handling both sides

### Phase 5: Task Board + Commands
- TaskBoard kanban view
- `sessions_send` proxy for commanding agents
- Task status tracking

### Phase 6: 3D Office
- React Three Fiber scene
- AgentDesk components with status animations
- Lazy loaded, performance capped

### Phase 7: Polish
- CostTracker SVG chart
- Error boundaries
- CSS theming (dark mode default)
- Connection status indicator

---

## Key Bun-Specific Patterns

**Serve bundled TSX as JS:**
```ts
// In fetch handler
if (url.pathname === '/client.js') {
  const result = await Bun.build({
    entrypoints: ['./client.tsx'],
    external: ['react', 'react-dom', 'three'],
  })
  return new Response(result.outputs[0], {
    headers: { 'Content-Type': 'application/javascript' }
  })
}
```

**WS pub/sub (zero-copy fan-out):**
```ts
websocket: {
  open(ws) { ws.subscribe('dashboard') },
  // From gateway event handler:
  // server.publish('dashboard', payload)
}
```

**No node_modules bloat:**
- Bun resolves and caches deps internally
- Only 4 runtime deps: react, react-dom, three, @react-three/fiber
- Dev deps: @types/react, @types/react-dom

---

## Config (hardcoded, no dotenv)

```ts
// server/config.ts
export const CONFIG = {
  PORT: 3000,
  OPENCLAW_WS: 'ws://127.0.0.1:18789',
  OPENCLAW_TOKEN: '', // fill when auth enabled
  DASHBOARD_TOKEN: 'change-me-in-production',
  MAX_ACTIVITY_LOG: 500,
  WS_RECONNECT_BASE_MS: 1000,
  WS_RECONNECT_MAX_MS: 30000,
} as const
```
