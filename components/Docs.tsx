import { useState, useEffect } from 'react'
import type { GeneratedDoc, DocCategory } from '../types/docs'

export function Docs() {
  const [docs, setDocs] = useState<GeneratedDoc[]>([])
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState<DocCategory | ''>('')
  const [selectedDoc, setSelectedDoc] = useState<GeneratedDoc | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  useEffect(() => {
    setDocs([
      {
        id: '1',
        title: 'Site Audit - acme.com',
        agentId: 'agent-3',
        agentName: 'BugHunter',
        category: 'audit',
        format: 'markdown',
        content: '# Site Audit Results\n\n## Issues Found\n- Slow load time (4.2s)\n- No SSL certificate\n- 12 broken links\n\n## Recommendations\n1. Enable HTTPS\n2. Optimize images\n3. Fix broken links',
        size: 2400,
        createdAt: Date.now() - 86400000,
      },
      {
        id: '2',
        title: 'Johnson & Co - Proposal',
        agentId: 'agent-1',
        agentName: 'CodeWriter',
        category: 'proposal',
        format: 'markdown',
        content: '# Project Proposal\n\n## Scope\n- Modernize web platform\n- Implement CI/CD\n- Add analytics\n\n## Timeline: 8 weeks\n## Budget: $45,000',
        size: 1800,
        createdAt: Date.now() - 172800000,
      },
      {
        id: '3',
        title: 'Twitter Post #42',
        agentId: 'agent-2',
        agentName: 'SocialManager',
        category: 'social-draft',
        format: 'text',
        content: 'Excited to announce our new AI-powered features! 🚀\n\nCheck out the blog for details.',
        size: 320,
        createdAt: Date.now() - 43200000,
      },
    ])
  }, [])

  const filtered = docs.filter((d) => {
    if (filterCategory && d.category !== filterCategory) return false
    if (search && !d.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getCategoryIcon = (cat: DocCategory) => {
    switch (cat) {
      case 'audit': return '🔍'
      case 'proposal': return '📄'
      case 'social-draft': return '📱'
      case 'report': return '📊'
      case 'code': return '💻'
      default: return '📁'
    }
  }

  const getCategoryColor = (cat: DocCategory) => {
    switch (cat) {
      case 'audit': return '#ef4444'
      case 'proposal': return '#3b82f6'
      case 'social-draft': return '#22c55e'
      case 'report': return '#eab308'
      case 'code': return '#a855f7'
      default: return '#6b7280'
    }
  }

  return (
    <div>
      <h2 className="section-title">Generated Documents</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <input
          className="modal-input"
          style={{ flex: 1, minWidth: '200px', marginBottom: 0 }}
          placeholder="Search docs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="modal-input"
          style={{ width: '150px', marginBottom: 0 }}
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as DocCategory | '')}
        >
          <option value="">All Types</option>
          <option value="audit">Audit</option>
          <option value="proposal">Proposal</option>
          <option value="social-draft">Social Draft</option>
          <option value="report">Report</option>
          <option value="code">Code</option>
        </select>
        <button
          className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('grid')}
          style={{ marginRight: '4px' }}
        >
          Grid
        </button>
        <button
          className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setViewMode('list')}
        >
          List
        </button>
      </div>

      <div style={{ display: 'flex', gap: '16px' }}>
        <div style={{ flex: viewMode === 'grid' ? 1 : 'none', width: viewMode === 'list' ? '100%' : 'auto' }}>
          {viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
              {filtered.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    borderRadius: '8px',
                    padding: '16px',
                    cursor: 'pointer',
                    transition: 'transform 0.2s',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{getCategoryIcon(doc.category)}</div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: getCategoryColor(doc.category),
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}>
                    {doc.category}
                  </div>
                  <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.875rem' }}>{doc.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {doc.agentName} • {formatDate(doc.createdAt)} • {(doc.size / 1024).toFixed(1)} KB
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="agent-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Size</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc.id} onClick={() => setSelectedDoc(doc)} style={{ cursor: 'pointer' }}>
                    <td><span style={{ marginRight: '8px' }}>{getCategoryIcon(doc.category)}</span>{doc.category}</td>
                    <td>{doc.title}</td>
                    <td>{doc.agentName}</td>
                    <td>{formatDate(doc.createdAt)}</td>
                    <td>{(doc.size / 1024).toFixed(1)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No documents found</div>
          )}
        </div>

        {selectedDoc && (
          <div style={{
            width: '400px',
            background: '#1e293b',
            border: '1px solid #475569',
            borderRadius: '8px',
            padding: '16px',
            maxHeight: '600px',
            overflow: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3>{selectedDoc.title}</h3>
                <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                  {selectedDoc.agentName} • {formatDate(selectedDoc.createdAt)}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelectedDoc(null)}>×</button>
            </div>
            <pre style={{
              background: '#0f172a',
              padding: '12px',
              borderRadius: '4px',
              fontSize: '0.875rem',
              whiteSpace: 'pre-wrap',
              maxHeight: '400px',
              overflow: 'auto',
            }}>
              {selectedDoc.content}
            </pre>
            <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
              <button className="btn btn-primary">Download</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
