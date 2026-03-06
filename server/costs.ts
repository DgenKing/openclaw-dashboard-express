import { MODEL_COSTS, type CostRecord, type CostStats } from '../types/costs'
import { broadcast } from './broadcast'

const COST_ALERT_DAILY_USD = 50

const state = {
  records: [] as CostRecord[],
  agentTotals: new Map<string, { in: number; out: number; cost: number }>(),
  modelTotals: new Map<string, { in: number; out: number; cost: number }>(),
  todaySpend: 0,
}

function getModelCost(model: string) {
  return MODEL_COSTS[model] || MODEL_COSTS['default']
}

function getDateKey(timestamp: number): string {
  return new Date(timestamp).toISOString().split('T')[0]
}

export function trackCost(agentId: string, model: string, tokensIn: number, tokensOut: number) {
  const pricing = getModelCost(model)
  const costUSD = (tokensIn / 1000) * pricing.inputPer1k + (tokensOut / 1000) * pricing.outputPer1k

  const record: CostRecord = {
    id: crypto.randomUUID(),
    agentId,
    model,
    tokensIn,
    tokensOut,
    costUSD,
    timestamp: Date.now(),
  }

  state.records.push(record)

  // Update agent totals
  const agentTotal = state.agentTotals.get(agentId) || { in: 0, out: 0, cost: 0 }
  state.agentTotals.set(agentId, {
    in: agentTotal.in + tokensIn,
    out: agentTotal.out + tokensOut,
    cost: agentTotal.cost + costUSD,
  })

  // Update model totals
  const modelTotal = state.modelTotals.get(model) || { in: 0, out: 0, cost: 0 }
  state.modelTotals.set(model, {
    in: modelTotal.in + tokensIn,
    out: modelTotal.out + tokensOut,
    cost: modelTotal.cost + costUSD,
  })

  // Update daily spend
  const today = getDateKey(Date.now())
  state.todaySpend += costUSD

  // Check threshold
  if (state.todaySpend >= COST_ALERT_DAILY_USD) {
    broadcast({
      type: 'alert:cost',
      severity: 'warning',
      title: 'Daily Cost Threshold Exceeded',
      message: `Daily spend ($${state.todaySpend.toFixed(2)}) exceeds $${COST_ALERT_DAILY_USD} limit`,
    })
  }

  // Broadcast cost update
  broadcast({ type: 'costs:update', stats: getStats() })
}

export function getStats(period: 'daily' | 'weekly' | 'monthly' = 'daily'): CostStats {
  const now = Date.now()
  const periods = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    monthly: 30 * 24 * 60 * 60 * 1000,
  }
  const cutoff = now - periods[period]

  const filteredRecords = state.records.filter((r) => r.timestamp > cutoff)

  // Daily spend by day/hour
  const dailyMap = new Map<string, { input: number; output: number }>()
  filteredRecords.forEach((r) => {
    const key = period === 'daily'
      ? new Date(r.timestamp).toISOString().split('T')[0] + ' ' + new Date(r.timestamp).getHours() + ':00'
      : new Date(r.timestamp).toISOString().split('T')[0]
    const existing = dailyMap.get(key) || { input: 0, output: 0 }
    dailyMap.set(key, {
      input: existing.input + r.tokensIn * (MODEL_COSTS[r.model]?.inputPer1k || MODEL_COSTS.default.inputPer1k) / 1000,
      output: existing.output + r.tokensOut * (MODEL_COSTS[r.model]?.outputPer1k || MODEL_COSTS.default.outputPer1k) / 1000,
    })
  })

  const dailySpend = Array.from(dailyMap.entries())
    .map(([date, data]) => ({ date, input: data.input, output: data.output }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // Agent breakdown
  const agentBreakdown = Array.from(state.agentTotals.entries()).map(([agentId, data]) => ({
    agentId,
    name: agentId,
    cost: data.cost,
    tokensIn: data.in,
    tokensOut: data.out,
  }))

  return {
    totalSpend: filteredRecords.reduce((sum, r) => sum + r.costUSD, 0),
    totalTokensIn: filteredRecords.reduce((sum, r) => sum + r.tokensIn, 0),
    totalTokensOut: filteredRecords.reduce((sum, r) => sum + r.tokensOut, 0),
    activeModels: Array.from(state.modelTotals.keys()),
    dailySpend,
    agentBreakdown,
  }
}

export function getAgentCosts(agentId: string) {
  return state.records.filter((r) => r.agentId === agentId)
}

export function getTodaySpend() {
  return state.todaySpend
}
