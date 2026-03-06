export type AlertSeverity = 'info' | 'warning' | 'error'

export interface Alert {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  source: string
  timestamp: number
  read: boolean
  actionUrl?: string
}
