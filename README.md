# Dashboard Express

Real-time monitoring dashboard for OpenClaw agent orchestration. Built with Bun, React 19, and TypeScript.

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-org/dashboard-express.git
cd dashboard-express
bun install

# Start the dashboard
bun run dev
```

Dashboard runs at **http://localhost:3000**

## Without OpenClaw (Testing)

Use the built-in mock gateway to test the dashboard without OpenClaw:

```bash
# Terminal 1: Start mock OpenClaw (simulates 8 agents)
bun mock-gateway.ts

# Terminal 2: Start dashboard
bun run dev
```

The mock gateway simulates live agent activity with status changes every 3-8 seconds.

## With OpenClaw

If OpenClaw is running on `ws://127.0.0.1:18789`, the dashboard will connect automatically.

## Features

- Overview, Agents, Tasks, Activity
- 2D Office visualization
- Costs & Token tracking
- Cron job scheduling
- Agent memory browser
- Docs viewer
- Social media queue
- Lead pipeline
- Settings

## Requirements

- [Bun](https://bun.sh) runtime

## License

MIT
