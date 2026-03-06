# Dashboard Express

A real-time monitoring dashboard for OpenClaw agent orchestration. Built with Bun, React 19, and TypeScript - zero framework overhead.

![Dashboard Preview](https://via.placeholder.com/800x400?text=Dashboard+Express)

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Features](#features)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [WebSocket Protocol](#websocket-protocol)
- [Developing with Mock Data](#developing-with-mock-data)
- [Troubleshooting](#troubleshooting)

---

## Overview

Dashboard Express is a browser-based dashboard that connects to the OpenClaw Gateway (running at `ws://127.0.0.1:18789`) to provide:

- **Real-time agent monitoring** - See all connected agents, their status, and current tasks
- **Task board** - Kanban-style view of pending, running, completed, and failed tasks
- **Activity feed** - Live scrolling log of all system events
- **Cost tracking** - Token usage visualization with daily/weekly/monthly views
- **Cron jobs** - Schedule and manage recurring tasks
- **Memory browser** - Browse and edit agent memories
- **Docs viewer** - Browse AI-generated documents
- **Social queue** - Manage social media content pipeline
- **Lead pipeline** - CRM-style lead tracking
- **Settings** - Full dashboard configuration
- **2D Office View** - Pixel-art visualization of agents at workstations

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Bun** | 1.0+ | Required runtime |
| **OpenClaw Gateway** | Running on `ws://127.0.0.1:18789` | Optional for development |

### Installing Bun

```bash
# macOS/Linux
curl -fsSL https://bun.sh/install | bash

# Windows (PowerShell)
iwr https://bun.sh/install.ps1 -UseBasicParsing | iex
```

---

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-org/openclaw-dashboard-express.git
cd openclaw-dashboard-express
bun install
```

### 2. Start the Dashboard

```bash
bun run server.ts
```

The dashboard will be available at **http://localhost:3000**

### 3. Connect to OpenClaw

Ensure the OpenClaw Gateway is running at `ws://127.0.0.1:18789`. The dashboard will automatically connect and begin displaying agent data.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React)                         │
│  Overview | Agents | Tasks | Activity | 2D Office          │
│  Costs | Crons | Memory | Docs | Social | Leads | Settings  │
│                      ▲                                      │
│                  WebSocket                                  │
│                      │                                      │
└──────────────────────┼──────────────────────────────────────┘
                       │
              Bun Server (:3000)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   gateway.ts    broadcast.ts    routes.ts
        │              │              │
   costs.ts       cron.ts       memories.ts
   docs.ts        social.ts     leads.ts
   vitals.ts      alerts.ts     settings.ts
        │                              │
        ▼                              ▼
  OpenClaw Gateway            REST API
  (ws://127.0.0.1:18789)      (/api/*)
```

### Server Modules

| Module | Purpose |
|--------|---------|
| `gateway.ts` | OpenClaw Gateway WebSocket client |
| `broadcast.ts` | WebSocket pub/sub fan-out |
| `costs.ts` | Token cost tracking with pricing |
| `cron.ts` | Scheduled job management |
| `memories.ts` | Agent memory storage/search |
| `docs.ts` | Generated documents storage |
| `social.ts` | Social media queue |
| `leads.ts` | Lead pipeline management |
| `vitals.ts` | System health monitoring |
| `alerts.ts` | Notification system |
| `settings.ts` | Configuration persistence |

---

## Features

### Overview Page

- **Total Agents** - Count of all connected agents
- **Active Agents** - Agents currently working or thinking
- **Tokens In/Out** - 24-hour token usage totals
- **Cost Chart** - Visual distribution of input vs output tokens

### Agent List

| Column | Description |
|--------|-------------|
| Name | Agent identifier |
| Status | working / thinking / idle / error / offline |
| Current Task | Active task description |
| Last Active | Timestamp of last activity |
| Tokens | Total tokens used |

### Task Board

Kanban-style columns:

- **Pending** - Tasks queued but not started
- **Running** - Tasks currently executing
- **Completed** - Successfully finished tasks
- **Failed** - Tasks that encountered errors

### Activity Feed

Live-scrolling log showing agent connections, status changes, task updates, and system events.

### 2D Office

Pixel-art visualization with animated agent sprites, workstations, status indicators, and meeting detection.

### Costs & Token Tracker

- Daily/Weekly/Monthly toggle
- Per-agent cost breakdown
- Model-level tracking
- Threshold alerts (configurable)
- SVG bar charts

### Cron Jobs

- Schedule recurring tasks with cron expressions
- Enable/disable jobs
- Manual trigger
- Last run status tracking

### Memory Browser

- Search agent memories
- Filter by agent or category (fact/preference/instruction/conversation)
- Edit/delete memories
- Tag management

### Docs Viewer

- Grid/List view toggle
- Filter by category (audit, proposal, social-draft, report, code)
- Preview panel
- Download capability

### Social Media Queue

- Draft → Approved → Scheduled → Published workflow
- Platform filtering (Twitter, LinkedIn, Facebook, Instagram)
- Character counters
- Edit history

### Lead Pipeline

- Kanban board: Scanned → Contacted → Proposal → Won/Lost
- Lead scoring
- Outreach history
- Value tracking
- Scan/rescan triggers

### Settings

- Gateway connection configuration
- Dashboard token management
- Theme selection (dark/light)
- Cost threshold configuration
- API key management

---

## Configuration

Configuration is in `server/config.ts`:

```typescript
export const CONFIG = {
  PORT: 3000,
  OPENCLAW_WS: 'ws://127.0.0.1:18789',
  OPENCLAW_TOKEN: '',
  DASHBOARD_TOKEN: 'change-me-in-production',
  MAX_ACTIVITY_LOG: 500,
  WS_RECONNECT_BASE_MS: 1000,
  WS_RECONNECT_MAX_MS: 30000,
} as const
```

### Authentication

The dashboard uses token-based authentication:

- **REST API**: `Authorization: Bearer <token>` header
- **WebSocket**: `?token=<token>` query parameter
- **Default token**: `change-me-in-production`

**Production Note**: Change the `DASHBOARD_TOKEN` before deploying.

---

## API Endpoints

All endpoints require authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | All connected agents |
| GET | `/api/tasks` | Tasks with optional status filter |
| GET | `/api/stats` | Aggregate statistics |
| GET | `/api/activity` | Recent activity log |
| GET | `/api/snapshot` | Full state snapshot |
| GET | `/api/costs` | Cost data with period filter |
| GET | `/api/costs/agents/:id` | Per-agent costs |
| GET | `/api/crons` | Scheduled jobs |
| GET | `/api/memories` | Agent memories |
| GET | `/api/docs` | Generated documents |
| GET | `/api/social` | Social posts |
| GET | `/api/leads` | Lead pipeline |

---

## WebSocket Protocol

### Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws?token=change-me-in-production')
```

### Server → Client Events

```typescript
// Core events
{ type: 'snapshot', agents, tasks }
{ type: 'agent:update', agent }
{ type: 'task:update', task }
{ type: 'activity', entry }
{ type: 'stats', stats }

// Feature events
{ type: 'costs:update', stats }
{ type: 'cron:update', job }
{ type: 'cron:list', jobs }
{ type: 'memory:list', entries }
{ type: 'memory:updated', entry }
{ type: 'docs:new', doc }
{ type: 'social:new', post }
{ type: 'social:update', post }
{ type: 'leads:new', lead }
{ type: 'leads:update', lead }
{ type: 'vitals:update', vitals }
{ type: 'alert:new', alert }
```

### Client → Server Commands

```typescript
{ type: 'send_task', agentId, message }
{ type: 'ping' }
{ type: 'cron_trigger', cronId }
{ type: 'memory_update', id, content }
{ type: 'memory_delete', id }
```

---

## Developing with Mock Data

Run a mock Gateway server:

```bash
bun run mock-gateway.ts
```

The dashboard will connect and display simulated agent data.

---

## Troubleshooting

### "WebSocket connection failed"
- Start the OpenClaw Gateway, or run the mock gateway

### "Unauthorized" errors
- Check token matches `DASHBOARD_TOKEN` in config

### Port already in use
- Kill process: `lsof -ti:3000 | xargs kill`

---

## Project Structure

```
dashboard-express/
├── server.ts              # Main entry point
├── client.tsx             # React app
├── index.html            # HTML shell
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── server/
│   ├── config.ts         # Configuration
│   ├── gateway.ts        # OpenClaw client
│   ├── broadcast.ts      # WebSocket fan-out
│   ├── auth.ts          # Token validation
│   ├── routes.ts        # REST handlers
│   ├── costs.ts         # Cost tracking
│   ├── cron.ts          # Job scheduler
│   ├── memories.ts      # Memory storage
│   ├── docs.ts          # Document storage
│   ├── social.ts        # Social queue
│   ├── leads.ts         # Lead pipeline
│   ├── vitals.ts        # Health monitoring
│   ├── alerts.ts       # Notifications
│   └── settings.ts      # Config persistence
├── components/
│   ├── Office3D.tsx     # 2D pixel office
│   ├── Costs.tsx        # Cost tracker
│   ├── Crons.tsx        # Cron manager
│   ├── Memory.tsx       # Memory browser
│   ├── Docs.tsx         # Docs viewer
│   ├── Social.tsx       # Social queue
│   ├── Leads.tsx        # Lead pipeline
│   └── Settings.tsx     # Settings page
├── styles/
│   └── dashboard.css    # All styles
└── types/
    ├── openclaw.ts      # Agent/Task types
    ├── ws.ts           # WebSocket types
    ├── costs.ts         # Cost types
    ├── cron.ts          # Cron types
    ├── memory.ts        # Memory types
    ├── docs.ts          # Doc types
    ├── social.ts        # Social types
    ├── leads.ts         # Lead types
    ├── vitals.ts        # Vitals types
    ├── alerts.ts        # Alert types
    └── settings.ts      # Config types
```

---

## License

MIT License

---

## Credits

Built with:
- [Bun](https://bun.sh) - Fast JavaScript runtime
- [React](https://react.dev) - UI framework
- [Lucide](https://lucide.dev) - Icons
