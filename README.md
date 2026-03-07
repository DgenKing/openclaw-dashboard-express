# Dashboard Express

Real-time monitoring dashboard for OpenClaw agent orchestration. Built with Bun, React 19, and TypeScript. Glassmorphism dark UI with Lucide icons.

## Quick Start

```bash
git clone <your-repo-url>
cd openclaw-dashboard-express
bun install
bun run dev
```

Dashboard runs at **http://localhost:3000**

## Connecting to OpenClaw

If OpenClaw is running on `ws://127.0.0.1:18789`, the dashboard connects automatically.

To authenticate, pass your gateway token as an environment variable:

```bash
OPENCLAW_GATEWAY_TOKEN=your-token bun run dev
```

The dashboard reads `OPENCLAW_GATEWAY_TOKEN` (same env var OpenClaw uses). If not set, it connects without auth.

## Without OpenClaw (Testing)

Use the built-in mock gateway to test without OpenClaw installed:

```bash
# Terminal 1: Start mock OpenClaw (simulates 8 agents)
bun mock-gateway.ts

# Terminal 2: Start dashboard
bun run dev
```

The mock gateway simulates live agent activity with status changes every 3-8 seconds.

## Features

- **Overview** — agent stats, task board, activity feed
- **Agents** — live status, token usage, search
- **Tasks** — kanban board (queued, running, completed, failed)
- **2D Office** — pixel art visualization of agents at workstations, scales to fill container
- **Costs** — token tracking and spend monitoring
- **Cron Jobs** — scheduled task management
- **Memory** — agent memory browser
- **Docs** — generated document viewer
- **Social** — social media post queue
- **Lead Pipeline** — CRM-style lead tracking with stages
- **Settings** — gateway config, auth, alerts, thresholds

## Configuration

| Env Variable | Default | Description |
|---|---|---|
| `OPENCLAW_GATEWAY_TOKEN` | *(empty)* | Auth token for OpenClaw gateway (same as OpenClaw's env var) |
| `DASHBOARD_TOKEN` | `change-me-in-production` | Token for dashboard API/WebSocket auth |

## Requirements

- [Bun](https://bun.sh) runtime

## License

MIT
