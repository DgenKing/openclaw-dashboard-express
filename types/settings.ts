export type Theme = 'dark' | 'light'

export interface DashboardConfig {
  gateway: {
    url: string
    token: string
    autoReconnect: boolean
    reconnectInterval: number
  }
  auth: {
    dashboardToken: string
    sessionTimeout: number
  }
  display: {
    theme: Theme
    enableOffice: boolean
    activityLimit: number
    refreshRate: number
  }
  alerts: {
    costDailyThreshold: number
    costWeeklyThreshold: number
    enableBrowserNotifications: boolean
    enableSoundAlerts: boolean
  }
  apiKeys: Array<{
    name: string
    maskedValue: string
    service: string
  }>
}

export const DEFAULT_CONFIG: DashboardConfig = {
  gateway: {
    url: 'ws://127.0.0.1:18789',
    token: '',
    autoReconnect: true,
    reconnectInterval: 1000,
  },
  auth: {
    dashboardToken: 'change-me-in-production',
    sessionTimeout: 3600000,
  },
  display: {
    theme: 'dark',
    enableOffice: true,
    activityLimit: 200,
    refreshRate: 30000,
  },
  alerts: {
    costDailyThreshold: 50,
    costWeeklyThreshold: 200,
    enableBrowserNotifications: false,
    enableSoundAlerts: false,
  },
  apiKeys: [],
}
