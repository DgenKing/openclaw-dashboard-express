let token = process.env.OPENCLAW_TOKEN || ''

// Prompt for token only if stdin is a TTY (interactive mode)
async function promptForToken(): Promise<string> {
  if (token) return token
  if (!process.stdin.isTTY) {
    console.log('\n⚠️  No token set. Set OPENCLAW_TOKEN env var: export OPENCLAW_TOKEN=your-token')
    return ''
  }

  try {
    const readline = await import('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return await new Promise<string>((resolve) => {
      rl.question('\n🔑 Enter your OpenClaw auth token (press Enter to skip): ', (answer) => {
        rl.close()
        token = answer.trim()
        resolve(token)
      })
    })
  } catch {
    console.log('\n⚠️  Could not read from stdin. Set OPENCLAW_TOKEN env var: export OPENCLAW_TOKEN=your-token')
    return ''
  }
}

// Run prompt before server starts (only in interactive mode)
try {
  if (process.stdin.isTTY) {
    await promptForToken()
  }
} catch {
  console.log('⚠️  Stdin not available. Set OPENCLAW_TOKEN env var: export OPENCLAW_TOKEN=your-token')
}

export const CONFIG = {
  PORT: 3000,
  OPENCLAW_WS: 'ws://127.0.0.1:18789',
  OPENCLAW_TOKEN: token,
  DASHBOARD_TOKEN: process.env.DASHBOARD_TOKEN || 'change-me-in-production',
  MAX_ACTIVITY_LOG: 500,
  WS_RECONNECT_BASE_MS: 1000,
  WS_RECONNECT_MAX_MS: 30000,
} as const
