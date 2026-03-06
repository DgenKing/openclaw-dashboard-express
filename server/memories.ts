import type { MemoryEntry } from '../types/memory'
import { broadcast } from './broadcast'

const state = {
  memories: new Map<string, MemoryEntry>(),
}

export function addMemory(memory: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = crypto.randomUUID()
  const entry: MemoryEntry = {
    ...memory,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  state.memories.set(id, entry)
  broadcast({ type: 'memory:list', entries: getMemories() })
  return entry
}

export function updateMemory(id: string, updates: Partial<Pick<MemoryEntry, 'content' | 'tags' | 'category'>>) {
  const memory = state.memories.get(id)
  if (!memory) return null

  Object.assign(memory, updates, { updatedAt: Date.now() })
  broadcast({ type: 'memory:updated', entry: memory })
  return memory
}

export function deleteMemory(id: string) {
  state.memories.delete(id)
  broadcast({ type: 'memory:deleted', id })
}

export function getMemories(filters?: {
  agentId?: string
  category?: string
  query?: string
  limit?: number
  offset?: number
}): { entries: MemoryEntry[]; total: number } {
  let entries = Array.from(state.memories.values())

  if (filters?.agentId) {
    entries = entries.filter((m) => m.agentId === filters.agentId)
  }
  if (filters?.category) {
    entries = entries.filter((m) => m.category === filters.category)
  }
  if (filters?.query) {
    const q = filters.query.toLowerCase()
    entries = entries.filter((m) =>
      m.content.toLowerCase().includes(q) ||
      m.tags.some((t) => t.toLowerCase().includes(q))
    )
  }

  const total = entries.length
  const offset = filters?.offset || 0
  const limit = filters?.limit || 50

  entries = entries
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(offset, offset + limit)

  return { entries, total }
}

export function getMemory(id: string): MemoryEntry | undefined {
  return state.memories.get(id)
}

// Initialize with some mock data for demo
export function initMockMemories() {
  const mockMemories: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      agentId: 'agent-1',
      agentName: 'CodeWriter',
      category: 'preference',
      content: 'Client prefers Next.js over Nuxt. Always suggest React-based stack.',
      tags: ['client-pref', 'tech-stack'],
      source: 'onboarding',
    },
    {
      agentId: 'agent-2',
      agentName: 'SocialManager',
      category: 'preference',
      content: 'Post frequency: 3x/week on Twitter, 1x/week on LinkedIn. Tone: casual.',
      tags: ['social', 'schedule'],
      source: 'config',
    },
    {
      agentId: 'agent-1',
      agentName: 'CodeWriter',
      category: 'fact',
      content: 'Main API endpoint is https://api.example.com/v2',
      tags: ['api', 'endpoint'],
      source: 'discovery',
    },
  ]

  mockMemories.forEach((m) => addMemory(m))
}
