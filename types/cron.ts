export interface CronJob {
  id: string
  name: string
  schedule: string
  agentId: string
  command: string
  nextRun: number
  lastRun: {
    timestamp: number
    status: 'success' | 'failed' | 'running'
    duration: number
    output?: string
  } | null
  enabled: boolean
}
