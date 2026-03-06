import type { Agent, TaskEntry, ActivityEntry, DashboardStats } from './openclaw'

// Server → Client events
export type ServerEvent =
  | { type: 'agent:update'; agent: Agent }
  | { type: 'task:update'; task: TaskEntry }
  | { type: 'activity'; entry: ActivityEntry }
  | { type: 'stats'; stats: DashboardStats }
  | { type: 'snapshot'; agents: Agent[]; tasks: TaskEntry[] }

// Client → Server commands
export type ClientCommand =
  | { type: 'send_task'; agentId: string; message: string }
  | { type: 'ping' }

// Gateway → Server messages (from OpenClaw Gateway)
export type GatewayMessage =
  | { type: 'session_list'; sessions: GatewaySession[] }
  | { type: 'session_history'; history: GatewayHistoryEntry[] }
  | { type: 'session_update'; session: GatewaySession }
  | { type: 'error'; message: string }

export interface GatewaySession {
  id: string
  name: string
  status: string
  current_task: string | null
  last_active: number
  tokens_in: number
  tokens_out: number
}

export interface GatewayHistoryEntry {
  id: string
  timestamp: number
  action: string
  session_id: string
  details?: string
}
