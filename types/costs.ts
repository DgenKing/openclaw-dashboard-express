export interface CostRecord {
  id: string
  agentId: string
  model: string
  tokensIn: number
  tokensOut: number
  costUSD: number
  timestamp: number
}

export interface CostBucket {
  daily: Map<string, CostRecord[]>
  agentTotals: Map<string, { in: number; out: number; cost: number }>
  modelTotals: Map<string, { in: number; out: number; cost: number }>
}

export interface CostStats {
  totalSpend: number
  totalTokensIn: number
  totalTokensOut: number
  activeModels: string[]
  dailySpend: { date: string; input: number; output: number }[]
  agentBreakdown: { agentId: string; name: string; cost: number; tokensIn: number; tokensOut: number }[]
}

export const MODEL_COSTS: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'claude-opus-4-6': { inputPer1k: 15, outputPer1k: 75 },
  'claude-sonnet-4-6': { inputPer1k: 3, outputPer1k: 15 },
  'claude-haiku-4-5-20251001': { inputPer1k: 0.8, outputPer1k: 4 },
  'gpt-4o': { inputPer1k: 5, outputPer1k: 15 },
  'gpt-4o-mini': { inputPer1k: 0.15, outputPer1k: 0.6 },
  'gpt-4-turbo': { inputPer1k: 10, outputPer1k: 30 },
  'default': { inputPer1k: 5, outputPer1k: 15 },
}
