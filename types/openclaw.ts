export type AgentStatus = 'working' | 'thinking' | 'idle' | 'error' | 'offline'

export interface Agent {
  id: string
  name: string
  status: AgentStatus
  currentTask: string | null
  lastActive: number
  tokenUsage: { input: number; output: number }
}

export interface TaskEntry {
  id: string
  agentId: string
  title: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  startedAt: number
  completedAt: number | null
}

export interface ActivityEntry {
  id: string
  timestamp: number
  type: 'agent_update' | 'task_update' | 'system'
  message: string
  agentId?: string
  taskId?: string
}

export interface DashboardStats {
  totalAgents: number
  activeAgents: number
  totalTokensIn: number
  totalTokensOut: number
  tasksCompleted24h: number
}
