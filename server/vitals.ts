import type { SystemVitals } from '../types/vitals'
import * as os from 'os'
import { broadcast } from './broadcast'

let serverStartTime = Date.now()
let gatewayStartTime = Date.now()
let gatewayErrors = 0

export function recordGatewayConnect() {
  gatewayStartTime = Date.now()
  gatewayErrors = 0
}

export function recordGatewayError() {
  gatewayErrors++
}

export function getVitals(): SystemVitals {
  const totalMem = os.totalmem()
  const freeMem = os.freemem()
  const usedMem = totalMem - freeMem

  // Get CPU load (simple approximation)
  const cpus = os.cpus()
  let totalIdle = 0
  let totalTick = 0
  cpus.forEach((cpu) => {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times]
    }
    totalIdle += cpu.times.idle
  })
  const cpu = 100 - (100 * totalIdle / totalTick)

  return {
    cpu: Math.round(cpu),
    memoryUsed: usedMem,
    memoryTotal: totalMem,
    diskUsed: 0, // Would need fs.stat for real value
    diskTotal: 0,
    gatewayUptime: Date.now() - gatewayStartTime,
    gatewayErrors,
    serverUptime: Date.now() - serverStartTime,
    wsClients: 0, // Would need server reference
  }
}

let vitalsInterval: any = null

export function startVitalsBroadcast() {
  if (vitalsInterval) return

  // Initial broadcast
  broadcast({ type: 'vitals:update', vitals: getVitals() })

  // Poll every 10 seconds
  vitalsInterval = setInterval(() => {
    broadcast({ type: 'vitals:update', vitals: getVitals() })
  }, 10000)
}

export function stopVitalsBroadcast() {
  if (vitalsInterval) {
    clearInterval(vitalsInterval)
    vitalsInterval = null
  }
}
