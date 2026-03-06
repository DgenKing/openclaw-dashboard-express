# Dashboard Express

Real-time monitoring dashboard for OpenClaw agent orchestration. Built with Bun, React 19, and TypeScript.

## Installation

```bash
# Clone the repo
git clone https://github.com/your-org/dashboard-express.git
cd dashboard-express

# Install dependencies
bun install

# Start the server
bun run dev
```

Dashboard runs at **http://localhost:3000**

## Requirements

- [Bun](https://bun.sh) runtime
- OpenClaw Gateway running on `ws://127.0.0.1:18789` (optional for dev)

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

## Integration with OpenClaw

Run on port 3000 alongside OpenClaw (port 18789):

```bash
bun run dev
```

Access at: http://localhost:3000

## License

MIT
