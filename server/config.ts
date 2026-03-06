import * as readline from 'readline'

let token = process.env.OPENCLAW_TOKEN || ''

// Prompt for token if not set
async function promptForToken() {
  if (token) return token

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise<string>((resolve) => {
    rl.question('\n🔑 Enter your OpenClaw auth token (press Enter to skip): ', (answer) => {
      rl.close()
      token = answer.trim()
      resolve(token)
    })
  })
}

// Run prompt before server starts
await promptForToken()

export const CONFIG = {
  PORT: 3000,
  OPENCLAW_WS: 'ws://127.0.0.1:18789',
  OPENCLAW_TOKEN: token,
  DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN || 'change-me-in-production',
  MAX_ACTIVITY_LOG: 500,
  WS_RECONNECT_BASE_MS: 1000,
  WS_RECONNECT_MAX_MS: 30000,
} as const
