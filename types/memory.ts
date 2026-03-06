export interface MemoryEntry {
  id: string
  agentId: string
  agentName: string
  category: 'conversation' | 'fact' | 'preference' | 'instruction'
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  source: string
}
