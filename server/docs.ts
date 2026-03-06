import type { GeneratedDoc, DocCategory } from '../types/docs'
import { broadcast } from './broadcast'

const state = {
  docs: new Map<string, GeneratedDoc>(),
}

export function addDoc(doc: Omit<GeneratedDoc, 'id' | 'createdAt' | 'size'>) {
  const id = crypto.randomUUID()
  const entry: GeneratedDoc = {
    ...doc,
    id,
    createdAt: Date.now(),
    size: new Blob([doc.content]).size,
  }
  state.docs.set(id, entry)
  broadcast({ type: 'docs:new', doc: entry })
  return entry
}

export function getDocs(filters?: {
  category?: DocCategory
  agentId?: string
  search?: string
}): GeneratedDoc[] {
  let entries = Array.from(state.docs.values())

  if (filters?.category) {
    entries = entries.filter((d) => d.category === filters.category)
  }
  if (filters?.agentId) {
    entries = entries.filter((d) => d.agentId === filters.agentId)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    entries = entries.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.content.toLowerCase().includes(q)
    )
  }

  return entries.sort((a, b) => b.createdAt - a.createdAt)
}

export function getDoc(id: string): GeneratedDoc | undefined {
  return state.docs.get(id)
}

export function deleteDoc(id: string) {
  state.docs.delete(id)
  broadcast({ type: 'docs:deleted', id })
}

// Initialize with mock data
export function initMockDocs() {
  const mockDocs: Omit<GeneratedDoc, 'id' | 'createdAt' | 'size'>[] = [
    {
      title: 'Site Audit - acme.com',
      agentId: 'agent-3',
      agentName: 'BugHunter',
      category: 'audit',
      format: 'markdown',
      content: '# Site Audit Results\n\n## Issues Found\n- Slow load time (4.2s)\n- No SSL certificate\n- 12 broken links\n\n## Recommendations\n1. Enable HTTPS\n2. Optimize images\n3. Fix broken links',
    },
    {
      title: 'Johnson & Co - Proposal',
      agentId: 'agent-1',
      agentName: 'CodeWriter',
      category: 'proposal',
      format: 'markdown',
      content: '# Project Proposal\n\n## Scope\n- Modernize web platform\n- Implement CI/CD\n- Add analytics\n\n## Timeline: 8 weeks\n## Budget: $45,000',
    },
    {
      title: 'Twitter Post #42',
      agentId: 'agent-2',
      agentName: 'SocialManager',
      category: 'social-draft',
      format: 'text',
      content: 'Excited to announce our new AI-powered features! 🚀\n\nCheck out the blog for details.',
    },
  ]

  mockDocs.forEach((doc, i) => {
    setTimeout(() => addDoc(doc), i * 100)
  })
}
