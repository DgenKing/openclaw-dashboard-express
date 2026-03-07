const token = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.OPENCLAW_TOKEN || ''

if (!token) {
  console.log('\n⚠️  No gateway token set. Run with: OPENCLAW_GATEWAY_TOKEN=your-token bun run dev')
  console.log('   Connecting without authentication...\n')
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
