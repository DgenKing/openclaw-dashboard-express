import type { Agent, TaskEntry, ActivityEntry, DashboardStats } from './openclaw'
import type { CostStats } from './costs'
import type { CronJob } from './cron'
import type { MemoryEntry } from './memory'
import type { GeneratedDoc } from './docs'
import type { SocialPost } from './social'
import type { Lead } from './leads'
import type { Alert } from './alerts'
import type { SystemVitals } from './vitals'

// Server → Client events
export type ServerEvent =
  | { type: 'agent:update'; agent: Agent }
  | { type: 'task:update'; task: TaskEntry }
  | { type: 'activity'; entry: ActivityEntry }
  | { type: 'stats'; stats: DashboardStats }
  | { type: 'snapshot'; agents: Agent[]; tasks: TaskEntry[] }
  | { type: 'costs:update'; stats: CostStats }
  | { type: 'cron:update'; job: CronJob }
  | { type: 'cron:list'; jobs: CronJob[] }
  | { type: 'memory:list'; entries: MemoryEntry[] }
  | { type: 'memory:updated'; entry: MemoryEntry }
  | { type: 'memory:deleted'; id: string }
  | { type: 'docs:new'; doc: GeneratedDoc }
  | { type: 'docs:deleted'; id: string }
  | { type: 'social:new'; post: SocialPost }
  | { type: 'social:update'; post: SocialPost }
  | { type: 'social:deleted'; id: string }
  | { type: 'leads:new'; lead: Lead }
  | { type: 'leads:update'; lead: Lead }
  | { type: 'leads:deleted'; id: string }
  | { type: 'vitals:update'; vitals: SystemVitals }
  | { type: 'alert:new'; alert: Alert }
  | { type: 'alert:cost'; severity: 'warning'; title: string; message: string }
  | { type: 'alert:info'; severity: string; title: string; message: string; source: string }
  | { type: 'settings:updated'; config: any }

// Client → Server commands
export type ClientCommand =
  | { type: 'send_task'; agentId: string; message: string }
  | { type: 'ping' }
  | { type: 'cron_trigger'; cronId: string }
  | { type: 'memory_update'; id: string; content: string }
  | { type: 'memory_delete'; id: string }

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
