import { useState, useEffect } from 'react'
import { useContext } from 'react'
import { StateContext } from '../client'
import type { MemoryEntry } from '../types/memory'

export function Memory() {
  const state = useContext(StateContext)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [search, setSearch] = useState('')
  const [filterAgent, setFilterAgent] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    // Mock data
    setMemories([
      {
        id: '1',
        agentId: 'agent-1',
        agentName: 'CodeWriter',
        category: 'preference',
        content: 'Client prefers Next.js over Nuxt. Always suggest React-based stack.',
        tags: ['client-pref', 'tech-stack'],
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
        source: 'onboarding',
      },
      {
        id: '2',
        agentId: 'agent-2',
        agentName: 'SocialManager',
        category: 'preference',
        content: 'Post frequency: 3x/week on Twitter, 1x/week on LinkedIn. Tone: casual.',
        tags: ['social', 'schedule'],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
        source: 'config',
      },
      {
        id: '3',
        agentId: 'agent-1',
        agentName: 'CodeWriter',
        category: 'fact',
        content: 'Main API endpoint is https://api.example.com/v2',
        tags: ['api', 'endpoint'],
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 172800000,
        source: 'discovery',
      },
    ])
  }, [])

  const filtered = memories.filter((m) => {
    if (filterAgent && m.agentId !== filterAgent) return false
    if (filterCategory && m.category !== filterCategory) return false
    if (search && !m.content.toLowerCase().includes(search.toLowerCase()) && !m.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false
    return true
  })

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts
    const hours = Math.floor(diff / 3600000)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'fact': return '#3b82f6'
      case 'preference': return '#22c55e'
      case 'instruction': return '#eab308'
      case 'conversation': return '#a855f7'
      default: return '#6b7280'
    }
  }

  const handleSave = (id: string) => {
    setMemories(memories.map(m => m.id === id ? { ...m, content: editContent, updatedAt: Date.now() } : m))
    setEditingId(null)
  }

  return (
    <div>
      <h2 className="section-title">Agent Memory Browser</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="modal-input"
          style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}
          placeholder="Search memories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="modal-input"
          style={{ width: '150px', marginBottom: 0 }}
          value={filterAgent}
          onChange={(e) => setFilterAgent(e.target.value)}
        >
          <option value="">All Agents</option>
          {state.agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <select
          className="modal-input"
          style={{ width: '150px', marginBottom: 0 }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="fact">Fact</option>
          <option value="preference">Preference</option>
          <option value="instruction">Instruction</option>
          <option value="conversation">Conversation</option>
        </select>
      </div>

      <div style={{ marginBottom: '16px', color: '#94a3b8' }}>
        {filtered.length} entries
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.map((memory) => (
          <div key={memory.id} style={{
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: '600' }}>{memory.agentName}</span>
                <span style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  background: getCategoryColor(memory.category) + '33',
                  color: getCategoryColor(memory.category),
                }}>
                  {memory.category}
                </span>
                <span style={{ marginLeft: '8px', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {formatTime(memory.updatedAt)}
                </span>
              </div>
              <div>
                <button className="btn btn-secondary" style={{ marginRight: '8px', padding: '4px 8px', fontSize: '0.75rem' }} onClick={() => { setEditingId(memory.id); setEditContent(memory.content) }}>Edit</button>
                <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Delete</button>
              </div>
            </div>

            {editingId === memory.id ? (
              <div>
                <textarea
                  className="modal-input"
                  style={{ minHeight: '80px', marginBottom: '8px' }}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                />
                <button className="btn btn-primary" style={{ marginRight: '8px' }} onClick={() => handleSave(memory.id)}>Save</button>
                <button className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            ) : (
              <div style={{ color: '#e2e8f0', marginBottom: '8px' }}>{memory.content}</div>
            )}

            <div style={{ display: 'flex', gap: '4px' }}>
              {memory.tags.map((tag) => (
                <span key={tag} style={{
                  padding: '2px 6px',
                  background: '#334155',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  color: '#94a3b8',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No memories found</div>
      )}
    </div>
  )
}
