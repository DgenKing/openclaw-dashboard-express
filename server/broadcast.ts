import type { ServerEvent } from '../types/ws'

// Bun server will call this to broadcast to all subscribed clients
let server: any = null

export function setServer(s: any) {
  server = s
}

export function broadcast(event: ServerEvent) {
  if (!server) return
  const payload = JSON.stringify(event)
  server.publish('dashboard', payload)
}
