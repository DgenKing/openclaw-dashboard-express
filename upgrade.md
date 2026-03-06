# OpenClaw Mission Control — Upgrade Design Plan

> Architecture-only. No code. Each feature describes data flow, UI layout, WebSocket events, and integration points with the existing Bun + React stack.

---

## Current Stack Reference

- **Runtime**: Bun 1.3.9 (`Bun.serve()` HTTP + WS, `Bun.build()` bundler)
- **Frontend**: React 19, useReducer + Context, CSS (no framework)
- **Transport**: WebSocket pub/sub (`dashboard` channel), REST `/api/*` fallback
- **State**: In-memory Maps on server, reducer on client
- **Gateway**: OpenClaw WS protocol (sessions_list, sessions_history, sessions_send)
- **Existing views**: Overview, Agents, Tasks, Activity Feed, 2D Office

---

## TIER 1 — High-Priority / Must-Have

### 1. Costs & Token Tracker ("LLM Fuel Gauges")

**Purpose**: Prevent surprise API bills. Surface per-agent, per-model spend with alerts.

**Data model** (server-side, in-memory):
```
CostRecord {
  id: string
  agentId: string
  model: string              // e.g. "claude-sonnet-4-20250514", "gpt-4o"
  tokensIn: number
  tokensOut: number
  costUSD: number            // computed from model pricing table
  timestamp: number          // epoch ms
}

CostBucket {
  daily: Map<string, CostRecord[]>    // key = YYYY-MM-DD
  agentTotals: Map<agentId, { in, out, cost }>
  modelTotals: Map<model, { in, out, cost }>
}
```

**Pricing table**: Hardcoded lookup `MODEL_COSTS: Record<string, { inputPer1k, outputPer1k }>`. Updated manually. Stored in `server/costs.ts`.

**Data source**: Every `session_update` from Gateway already includes token counts. The gateway client (`server/gateway.ts`) pipes each update through a `trackCost()` function that appends to `CostBucket`.

**WebSocket events**:
- New event `costs:update` — pushed to dashboard clients every 30s with rolling totals.
- Client reducer adds `COSTS_UPDATE` action.

**Alert thresholds**:
- Server config: `COST_ALERT_DAILY_USD: number` (default 50).
- When daily spend crosses threshold, broadcast `alert:cost` event.
- Client shows persistent banner at top of main content area.

**UI — new sidebar tab "Costs"**:
```
+------------------------------------------+
| Costs & Token Usage                      |
+------------------------------------------+
| [ Daily ] [ Weekly ] [ Monthly ] toggle  |
+------------------------------------------+
| Summary cards (same grid as Overview):   |
|  Total Spend | Input Tokens | Output     |
|  Tokens      | Active Models             |
+------------------------------------------+
| Bar chart — SVG, no library:             |
|  X-axis: dates (or hours for daily)      |
|  Y-axis: USD spend                       |
|  Stacked bars: input cost vs output cost |
+------------------------------------------+
| Breakdown table:                         |
|  Agent | Model | Tokens In | Out | Cost  |
|  Sortable columns, click to filter       |
+------------------------------------------+
| Threshold indicator:                     |
|  Progress bar: $X / $50 daily limit      |
|  Red when > 80%, flashing when exceeded  |
+------------------------------------------+
```

**SVG chart approach**: Pure inline SVG in a React component. No Chart.js. Bars rendered as `<rect>` elements with widths computed from data. Tooltip on hover via CSS `::after`. Keeps bundle zero-dependency.

**API endpoints**:
- `GET /api/costs?period=daily|weekly|monthly` — returns aggregated cost data.
- `GET /api/costs/agents/:id` — per-agent breakdown.

---

### 2. Cron / Scheduled Jobs View

**Purpose**: Visibility into proactive scheduled tasks (social posts, scans, reports).

**Data model**:
```
CronJob {
  id: string
  name: string               // "Daily Social Post", "Weekly Site Scan"
  schedule: string           // cron expression "0 9 * * *"
  agentId: string
  nextRun: number            // epoch ms, computed from cron expression
  lastRun: {
    timestamp: number
    status: 'success' | 'failed' | 'running'
    duration: number         // ms
    output?: string          // summary
  } | null
  enabled: boolean
}
```

**Data source**: Two options depending on Gateway support:
- **Option A (Gateway has cron info)**: New Gateway message `crons_list` request/response. Add handler in `server/gateway.ts`.
- **Option B (Local tracking)**: Dashboard registers crons in its own config. Server uses `setInterval` / `setTimeout` with cron-parsed schedules. Sends `sessions_send` to Gateway at scheduled times.

Recommend Option B for MVP — keeps dashboard self-contained.

**Cron parsing**: Minimal parser in `server/cron.ts`. Only needs to support: minute, hour, day-of-month, month, day-of-week. No library needed for basic patterns.

**WebSocket events**:
- `cron:update` — broadcast when a job starts, completes, or fails.
- `cron:list` — snapshot of all jobs on connect.

**Manual trigger**: Client sends `{ type: 'cron_trigger', cronId }` over WS. Server executes immediately by calling `sessions_send` with the job's command.

**UI — new sidebar tab "Crons"**:
```
+------------------------------------------+
| Scheduled Jobs                           |
+------------------------------------------+
| List view (not calendar for MVP):        |
+------------------------------------------+
| +--------------------------------------+ |
| | [ON/OFF] Daily Social Post           | |
| | Agent: SocialManager                 | |
| | Schedule: Every day at 09:00         | |
| | Next run: in 3h 22m                  | |
| | Last run: Success (2m ago, 1.2s)     | |
| | [ Trigger Now ]  [ Edit ]            | |
| +--------------------------------------+ |
| +--------------------------------------+ |
| | [ON/OFF] Weekly Site Scan            | |
| | Agent: BugHunter                     | |
| | Schedule: Every Monday at 06:00      | |
| | Next run: in 2d 14h                  | |
| | Last run: Failed (5d ago)  [!]       | |
| | [ Trigger Now ]  [ View Log ]        | |
| +--------------------------------------+ |
+------------------------------------------+
| [ + Add Scheduled Job ]                  |
+------------------------------------------+
```

**Status indicators**: Green dot = last success, Red dot = last failed, Yellow dot = currently running, Grey = disabled.

**"Add Job" modal**: Simple form — name, agent (dropdown from connected agents), cron expression (with human-readable preview), command/message to send.

---

### 3. Memory / Long-Term Memory Browser

**Purpose**: Browse, search, and edit agent memories. Essential for ongoing automations.

**Data model**:
```
MemoryEntry {
  id: string
  agentId: string
  agentName: string
  category: 'conversation' | 'fact' | 'preference' | 'instruction'
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  source: string             // which session/task created it
}
```

**Data source**: Gateway protocol extension.
- Request: `{ type: 'memories_list', agentId?, query?, limit, offset }`
- Response: `{ type: 'memories', entries: MemoryEntry[], total: number }`
- Mutation: `{ type: 'memory_update', id, content }` and `{ type: 'memory_delete', id }`

If Gateway doesn't support memory queries yet, the dashboard can parse agent session histories for memory-related messages and index them locally in a `Map<string, MemoryEntry>`.

**Search**: Server-side full-text search over `content` field using simple `String.includes()` or regex. No search engine needed at this scale.

**WebSocket events**:
- `memory:list` — paginated results pushed to client.
- `memory:updated` — single entry changed.

**UI — new sidebar tab "Memory"**:
```
+------------------------------------------+
| Agent Memory Browser                     |
+------------------------------------------+
| [ Search memories...          ] [Search] |
| Filter: [All Agents v] [All Types v]    |
|         [Date range: Last 7 days v]      |
+------------------------------------------+
| Results (47 entries):                    |
+------------------------------------------+
| +--------------------------------------+ |
| | CodeWriter — fact        2h ago      | |
| | "Client prefers Next.js over Nuxt.   | |
| |  Always suggest React-based stack."  | |
| | Tags: [client-pref] [tech-stack]     | |
| | [ Edit ] [ Delete ]                  | |
| +--------------------------------------+ |
| +--------------------------------------+ |
| | SocialManager — preference  1d ago   | |
| | "Post frequency: 3x/week on Twitter, | |
| |  1x/week on LinkedIn. Tone: casual." | |
| | Tags: [social] [schedule]            | |
| | [ Edit ] [ Delete ]                  | |
| +--------------------------------------+ |
+------------------------------------------+
| Pagination: < 1 2 3 ... 5 >             |
+------------------------------------------+
```

**Edit modal**: Textarea for content, tag editor (comma-separated input), category dropdown. Save sends `memory_update` via WS.

---

### 4. Docs / Generated Files Viewer

**Purpose**: Centralized browsable list of all AI-generated outputs.

**Data model**:
```
GeneratedDoc {
  id: string
  title: string
  agentId: string
  category: 'audit' | 'proposal' | 'social-draft' | 'report' | 'code' | 'other'
  format: 'markdown' | 'html' | 'text' | 'json'
  content: string
  size: number               // bytes
  createdAt: number
  taskId?: string            // linked task
}
```

**Data source**: Two approaches:
- **Intercept**: In `server/gateway.ts`, when a session response contains generated content (detected by message length > threshold or specific markers), auto-extract and store as a doc.
- **Explicit**: Agents tag outputs with a metadata wrapper. Gateway forwards tagged outputs.

Storage: In-memory `Map<string, GeneratedDoc>` with optional disk persistence to `./data/docs/` as JSON files (using `Bun.write()`).

**API endpoints**:
- `GET /api/docs?category=&agent=&search=` — list with filters.
- `GET /api/docs/:id` — single doc content.
- `GET /api/docs/:id/download` — raw file download with appropriate Content-Type.

**UI — new sidebar tab "Docs"**:
```
+------------------------------------------+
| Generated Documents                      |
+------------------------------------------+
| [ Search docs...              ] [Search] |
| Filter: [All Types v] [All Agents v]    |
+------------------------------------------+
| Grid/List toggle: [Grid] [List]          |
+------------------------------------------+
| +----------+ +----------+ +----------+   |
| | Audit    | | Proposal | | Social   |   |
| | icon     | | icon     | | Draft    |   |
| | -------- | | -------- | | icon     |   |
| | Site     | | Johnson  | | -------- |   |
| | Audit    | | & Co     | | Twitter  |   |
| | Dec 5    | | Proposal | | Post #42 |   |
| | BugHunt  | | Dec 4    | | Dec 3    |   |
| | 2.4 KB   | | CodeWr.  | | Social.  |   |
| +----------+ +----------+ +----------+   |
+------------------------------------------+
```

**Preview panel**: Click a doc card to open a right-side panel. Markdown rendered as HTML (simple regex-based renderer, no library). Plain text shown in `<pre>`. Download button at top.

---

## TIER 2 — Business-Specific / High-Value for AutoGen Digital

### 5. Social Media Queue

**Purpose**: Managed pipeline for AI-generated social content. Draft, review, approve, schedule, publish.

**Data model**:
```
SocialPost {
  id: string
  agentId: string
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram'
  content: string
  mediaUrl?: string
  status: 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected'
  scheduledFor?: number       // epoch ms
  publishedAt?: number
  engagement?: {
    likes: number
    shares: number
    comments: number
    impressions: number
  }
  createdAt: number
  editHistory: Array<{ content: string; editedAt: number }>
}
```

**Data flow**:
1. Agent generates post via Gateway session -> server intercepts social-tagged output.
2. Post created with status `draft` and broadcast to dashboard.
3. User reviews in queue UI -> edits content inline -> clicks Approve.
4. Approved posts move to `scheduled` with a timestamp.
5. Server cron (reuse cron system from feature #2) fires at scheduled time -> sends publish command to Gateway agent.
6. Agent publishes via platform API -> status updated to `published`.

**WebSocket events**:
- `social:new` — new draft arrived.
- `social:update` — status/content changed.
- Client commands: `social:approve`, `social:reject`, `social:edit`, `social:schedule`.

**UI — new sidebar tab "Social"**:
```
+------------------------------------------+
| Social Media Queue                       |
+------------------------------------------+
| Filter: [All Platforms v] [All Status v] |
+------------------------------------------+
| Kanban columns:                          |
| Drafts | Approved | Scheduled | Published|
+------------------------------------------+
| +-------------+                          |
| | [Twitter]   |                          |
| | "Excited to |                          |
| | announce... |                          |
| | "           |                          |
| | By: Social  |                          |
| | Manager     |                          |
| | 2h ago      |                          |
| |             |                          |
| | [Edit]      |                          |
| | [Approve]   |                          |
| | [Reject]    |                          |
| +-------------+                          |
+------------------------------------------+
| Post History (last 30 days):             |
|  Date | Platform | Content | Engagement  |
|  Sortable table with mock stats          |
+------------------------------------------+
```

**Edit inline**: Click Edit to expand card into textarea. Character counter shown (280 for Twitter, 3000 for LinkedIn). Save updates content and adds to `editHistory`.

**Schedule picker**: Date/time input. Defaults to next optimal posting window (hardcoded schedule: Twitter 9am/12pm/5pm, LinkedIn 8am/10am).

---

### 6. Lead Pipeline / Outreach Tracker

**Purpose**: Track the revenue flow from site scans through to client conversion.

**Data model**:
```
Lead {
  id: string
  businessName: string
  siteUrl: string
  contactEmail?: string
  contactName?: string
  stage: 'scanned' | 'contacted' | 'proposal_sent' | 'converted' | 'lost'
  detectedIssues: string[]    // ["slow load", "no SSL", "broken links"]
  scanScore: number           // 0-100
  agentId: string             // which agent found/manages this lead
  proposalDocId?: string      // links to Docs viewer
  mockupUrl?: string
  outreachHistory: Array<{
    type: 'email' | 'message' | 'call'
    date: number
    summary: string
    status: 'sent' | 'opened' | 'replied'
  }>
  createdAt: number
  updatedAt: number
  value?: number              // estimated deal value in USD
}
```

**Data source**: Agent sessions that perform site scans produce structured output. Server parses scan results into Lead records. Manual entry also supported via UI form.

**Pipeline calculation**: Server maintains stage counts and conversion rates. Broadcast via `leads:stats` event.

**UI — new sidebar tab "Leads"**:
```
+------------------------------------------+
| Lead Pipeline                            |
+------------------------------------------+
| Funnel summary:                          |
|  Scanned: 47 | Contacted: 12 |          |
|  Proposals: 5 | Converted: 2            |
|  Conversion rate: 4.2%                   |
+------------------------------------------+
| Kanban board (drag between columns):     |
+------------------------------------------+
| Scanned    | Contacted  | Proposal | Won |
+------------------------------------------+
| +--------+ |            |          |     |
| |acme.com| |            |          |     |
| |Score:35| |            |          |     |
| |Issues:3| |            |          |     |
| |[Scan]  | |            |          |     |
| |[Contact]| |           |          |     |
| +--------+ |            |          |     |
+------------------------------------------+
```

**Card actions**:
- **Re-scan**: Sends `sessions_send` to BugHunter agent with site URL.
- **Contact**: Opens compose form, sends outreach command to agent.
- **Generate Proposal**: Triggers CodeWriter/proposal agent, output stored in Docs.
- **Move Stage**: Drag-drop or button click updates stage.

**Lead detail panel**: Click card to open side panel with full scan results, outreach timeline, linked proposal doc, and notes field.

---

### 7. Settings / Configuration Page

**Purpose**: Make the dashboard operationally configurable without editing source files.

**Data model**:
```
DashboardConfig {
  gateway: {
    url: string              // ws://127.0.0.1:18789
    token: string
    autoReconnect: boolean
    reconnectInterval: number // ms
  }
  auth: {
    dashboardToken: string
    sessionTimeout: number    // ms
  }
  display: {
    theme: 'dark' | 'light'
    enableOffice: boolean     // toggle 2D office for performance
    activityLimit: number     // max activity entries to keep
    refreshRate: number       // ms, how often to poll costs
  }
  alerts: {
    costDailyThreshold: number
    costWeeklyThreshold: number
    enableBrowserNotifications: boolean
    enableSoundAlerts: boolean
  }
  apiKeys: Array<{
    name: string
    maskedValue: string      // "sk-...abc"
    service: string          // "openai", "anthropic"
  }>
}
```

**Persistence**: `Bun.write('./data/config.json', JSON.stringify(config))`. Loaded on server start with `Bun.file('./data/config.json').json()`. Falls back to defaults if file missing.

**API endpoints**:
- `GET /api/settings` — returns config (with API keys masked).
- `PUT /api/settings` — updates config, writes to disk, applies changes.
- `POST /api/settings/test-gateway` — attempts WS connection to provided URL, returns success/failure.

**UI — new sidebar tab "Settings"**:
```
+------------------------------------------+
| Settings                                 |
+==========================================+
| Gateway Connection                       |
|  URL:    [ ws://127.0.0.1:18789       ]  |
|  Token:  [ **********************     ]  |
|  Auto-reconnect: [x]                     |
|  [ Test Connection ]  Status: Connected  |
+------------------------------------------+
| Authentication                           |
|  Dashboard Token: [ ******           ]   |
|  [ Regenerate Token ]                    |
+------------------------------------------+
| Display                                  |
|  Theme:        [ Dark v ]                |
|  2D Office:    [x] Enabled               |
|  Activity log: [ 200 ] entries max       |
+------------------------------------------+
| Alerts & Thresholds                      |
|  Daily cost limit:  [ $50  ]             |
|  Weekly cost limit:  [ $200 ]            |
|  Browser notifications: [x]             |
|  Sound alerts: [ ]                       |
+------------------------------------------+
| API Keys                                 |
|  +------------------------------------+  |
|  | OpenAI    | sk-...7f2a | [Reveal]  |  |
|  | Anthropic | sk-ant...  | [Reveal]  |  |
|  +------------------------------------+  |
|  [ + Add Key ]                           |
+------------------------------------------+
| [ Save Changes ]  [ Reset to Defaults ]  |
+------------------------------------------+
```

**Security**: API keys stored in config.json on disk. Never sent to client in full — only masked versions. Reveal requires re-entering dashboard token. Keys only used server-side when proxying to Gateway.

---

## TIER 3 — Nice-to-Have / Polish

### 8. System Vitals / Health (Deeper than Overview)

**Data source**: Bun runtime APIs + `process.memoryUsage()` + `os` module for CPU/RAM. Polled every 10s on server, broadcast as `vitals:update`.

**Data model**:
```
SystemVitals {
  cpu: number                // percentage
  memoryUsed: number         // bytes
  memoryTotal: number
  diskUsed: number
  diskTotal: number
  gatewayUptime: number      // ms since last connect
  gatewayErrors: number      // count since start
  serverUptime: number
  wsClients: number          // connected dashboard clients
}
```

**UI**: Added as a collapsible section at the bottom of the Overview tab. Four gauge bars (CPU, RAM, Disk, Gateway health). Gateway restart button sends reconnect command.

---

### 9. Search / Global Search Bar

**Architecture**: Client-side command palette (Ctrl+K shortcut). Sends search query to server.

**Server endpoint**: `GET /api/search?q=term` — searches across:
- Tasks (title, description)
- Activity (message)
- Memories (content)
- Docs (title, content)
- Leads (businessName, siteUrl)

Returns unified results array with `{ type, id, title, snippet, relevance }`. Simple scoring: exact match > starts-with > contains.

**UI**: Floating modal overlay. Results grouped by type. Click result navigates to relevant tab with item highlighted.

---

### 10. Notifications / Alerts System

**Architecture**: Server maintains an alerts queue. Events that trigger alerts:
- Cost threshold exceeded
- Cron job failed
- Agent error status
- Gateway disconnection
- Lead stage change

**Data model**:
```
Alert {
  id: string
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
  source: string             // "costs", "cron", "gateway"
  timestamp: number
  read: boolean
  actionUrl?: string         // tab to navigate to
}
```

**UI**: Bell icon in top bar with unread count badge. Dropdown panel shows recent alerts. Click to navigate. Browser Notification API used if permission granted and enabled in settings.

---

### 11. Export / Reports

**API endpoints**:
- `GET /api/export/costs?format=csv|json&period=weekly`
- `GET /api/export/activity?format=csv|json&limit=1000`
- `GET /api/export/leads?format=csv|json`

Server generates CSV using simple string concatenation (no library). Sets `Content-Disposition: attachment` header.

**UI**: Export button on Costs, Activity, and Leads tabs. Format selector dropdown (CSV / JSON).

---

### 12. Mobile Responsiveness

**CSS changes only** — no component restructuring:
- Sidebar: collapses to bottom tab bar at `max-width: 768px`.
- Stats grid: 2 columns on tablet, 1 column on mobile.
- Task board: horizontal scroll on mobile.
- Tables: horizontal scroll with sticky first column.
- 2D Office: hidden on mobile (too small to be useful), replaced with agent status list.
- Settings: single column stack.

Media query breakpoints:
```
@media (max-width: 1024px)  — tablet adjustments
@media (max-width: 768px)   — mobile layout
@media (max-width: 480px)   — small phone tweaks
```

---

## Sidebar Navigation (Updated)

```
Mission Control
--------------------------
  Overview          (existing)
  Agents            (existing)
  Tasks             (existing)
  Activity          (existing)
  2D Office         (existing)
--------------------------
  Costs             (new - Tier 1)
  Crons             (new - Tier 1)
  Memory            (new - Tier 1)
  Docs              (new - Tier 1)
--------------------------
  Social            (new - Tier 2)
  Leads             (new - Tier 2)
--------------------------
  Settings          (new - Tier 2)
```

---

## Recommended Build Order

| Phase | Feature | Effort | Impact |
|-------|---------|--------|--------|
| 1 | Costs & Token Tracker | Medium | Prevents bill shocks |
| 2 | Cron / Scheduled Jobs | Medium | Ensures proactive tasks run |
| 3 | Memory Browser | Medium | Agent context visibility |
| 4 | Docs Viewer | Low | Find generated outputs |
| 5 | Social Queue | High | Core business pipeline |
| 6 | Lead Pipeline | High | Revenue flow tracking |
| 7 | Settings Page | Medium | Operational usability |
| 8 | System Vitals | Low | Deeper health monitoring |
| 9 | Global Search | Low | Quality of life |
| 10 | Notifications | Low | Proactive alerts |
| 11 | Export | Low | Reporting needs |
| 12 | Mobile | Low | Accessibility |

---

## Shared Patterns Across All Features

**State management**: Each feature adds its own slice to the existing reducer. New action types per feature (e.g., `COSTS_UPDATE`, `CRON_UPDATE`). Context stays flat — no nesting.

**WebSocket protocol**: All new events follow existing pattern: `{ type: 'feature:action', ...payload }`. Server broadcasts via `server.publish('dashboard', JSON.stringify(event))`.

**API pattern**: All REST endpoints follow `GET /api/{feature}?filters` for reads, `PUT /api/{feature}/:id` for updates. Auth via same Bearer token / query param.

**No new dependencies**: Everything built with Bun APIs, React, and inline SVG. No charting libraries, no ORM, no search engines. Keeps the bundle fast and the server lean.

**Persistence strategy**: In-memory primary, optional disk backup to `./data/{feature}.json` using `Bun.write()`. Loaded on startup. No database.
