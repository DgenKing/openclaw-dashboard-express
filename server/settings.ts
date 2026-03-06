import type { DashboardConfig } from '../types/settings'
import { DEFAULT_CONFIG } from '../types/settings'
import { broadcast } from './broadcast'

let config: DashboardConfig = { ...DEFAULT_CONFIG }

const CONFIG_FILE = './data/config.json'

export async function loadConfig() {
  try {
    const file = Bun.file(CONFIG_FILE)
    if (await file.exists()) {
      const loaded = await file.json()
      config = { ...DEFAULT_CONFIG, ...loaded }
    }
  } catch (e) {
    console.log('[Settings] Using default config')
  }
  return config
}

export async function saveConfig() {
  try {
    await Bun.write(CONFIG_FILE, JSON.stringify(config, null, 2))
    broadcast({ type: 'settings:updated', config: getConfig() })
  } catch (e) {
    console.error('[Settings] Failed to save:', e)
  }
}

export function getConfig(): DashboardConfig {
  return { ...config }
}

export function updateConfig(updates: Partial<DashboardConfig>) {
  config = { ...config, ...updates }
  saveConfig()
  return config
}

export function updateGatewayConfig(updates: Partial<DashboardConfig['gateway']>) {
  config.gateway = { ...config.gateway, ...updates }
  saveConfig()
}

export function updateDisplayConfig(updates: Partial<DashboardConfig['display']>) {
  config.display = { ...config.display, ...updates }
  saveConfig()
}

export function updateAlertsConfig(updates: Partial<DashboardConfig['alerts']>) {
  config.alerts = { ...config.alerts, ...updates }
  saveConfig()
}

export function addApiKey(name: string, value: string, service: string) {
  const masked = value.slice(0, 4) + '...' + value.slice(-4)
  config.apiKeys.push({ name, maskedValue: masked, service })
  saveConfig()
}

export function removeApiKey(name: string) {
  config.apiKeys = config.apiKeys.filter((k) => k.name !== name)
  saveConfig()
}

export function regenerateToken(): string {
  const token = crypto.randomUUID()
  config.auth.dashboardToken = token
  saveConfig()
  return token
}
