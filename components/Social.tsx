import { useState, useEffect } from 'react'
import type { SocialPost, Platform, SocialStatus } from '../types/social'

export function Social() {
  const [posts, setPosts] = useState<SocialPost[]>([])
  const [filterPlatform, setFilterPlatform] = useState<Platform | ''>('')
  const [filterStatus, setFilterStatus] = useState<SocialStatus | ''>('')

  useEffect(() => {
    setPosts([
      {
        id: '1',
        agentId: 'agent-2',
        agentName: 'SocialManager',
        platform: 'twitter',
        content: 'Excited to announce our new AI-powered features! 🚀',
        status: 'approved',
        createdAt: Date.now() - 7200000,
        editHistory: [],
      },
      {
        id: '2',
        agentId: 'agent-2',
        agentName: 'SocialManager',
        platform: 'linkedin',
        content: 'Check out our latest case study on automation efficiency.',
        status: 'draft',
        createdAt: Date.now() - 3600000,
        editHistory: [],
      },
      {
        id: '3',
        agentId: 'agent-2',
        agentName: 'SocialManager',
        platform: 'twitter',
        content: 'Join us for a live demo this Thursday!',
        status: 'scheduled',
        scheduledFor: Date.now() + 86400000,
        createdAt: Date.now() - 1800000,
        editHistory: [],
      },
    ])
  }, [])

  const filtered = posts.filter((p) => {
    if (filterPlatform && p.platform !== filterPlatform) return false
    if (filterStatus && p.status !== filterStatus) return false
    return true
  })

  const columns: SocialStatus[] = ['draft', 'approved', 'scheduled', 'published']

  const formatDate = (ts: number) => {
    const diff = ts - Date.now()
    if (diff < 0) return 'Now'
    const hours = Math.floor(diff / 3600000)
    if (hours < 24) return `in ${hours}h`
    return `in ${Math.floor(hours / 24)}d`
  }

  const getPlatformColor = (p: Platform) => {
    switch (p) {
      case 'twitter': return '#1da1f2'
      case 'linkedin': return '#0077b5'
      case 'facebook': return '#1877f2'
      case 'instagram': return '#e4405f'
      default: return '#6b7280'
    }
  }

  const getStatusColor = (s: SocialStatus) => {
    switch (s) {
      case 'draft': return '#6b7280'
      case 'approved': return '#3b82f6'
      case 'scheduled': return '#eab308'
      case 'published': return '#22c55e'
      case 'rejected': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const getCharLimit = (p: Platform) => {
    switch (p) {
      case 'twitter': return 280
      case 'linkedin': return 3000
      default: return 5000
    }
  }

  return (
    <div>
      <h2 className="section-title">Social Media Queue</h2>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <select
          className="modal-input"
          style={{ width: '150px', marginBottom: 0 }}
          value={filterPlatform}
          onChange={(e) => setFilterPlatform(e.target.value as Platform | '')}
        >
          <option value="">All Platforms</option>
          <option value="twitter">Twitter</option>
          <option value="linkedin">LinkedIn</option>
          <option value="facebook">Facebook</option>
          <option value="instagram">Instagram</option>
        </select>
        <select
          className="modal-input"
          style={{ width: '150px', marginBottom: 0 }}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as SocialStatus | '')}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="scheduled">Scheduled</option>
          <option value="published">Published</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {columns.map((col) => (
          <div key={col} className={`task-column ${col}`}>
            <div className="task-column-header">
              {col.charAt(0).toUpperCase() + col.slice(1)} ({filtered.filter(p => p.status === col).length})
            </div>
            {filtered.filter(p => p.status === col).map((post) => (
              <div key={post.id} className="task-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    background: getPlatformColor(post.platform) + '33',
                    color: getPlatformColor(post.platform),
                  }}>
                    {post.platform}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.7rem',
                    background: getStatusColor(post.status) + '33',
                    color: getStatusColor(post.status),
                  }}>
                    {post.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.875rem', marginBottom: '8px' }}>{post.content}</div>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '8px' }}>
                  By: {post.agentName} • {col === 'scheduled' && post.scheduledFor ? formatDate(post.scheduledFor) : new Date(post.createdAt).toLocaleTimeString()}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginBottom: '8px' }}>
                  {post.content.length}/{getCharLimit(post.platform)}
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Edit</button>
                  {col === 'draft' && (
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Approve</button>
                  )}
                  {col === 'approved' && (
                    <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.7rem' }}>Schedule</button>
                  )}
                  {col === 'draft' && (
                    <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.7rem', color: '#ef4444' }}>Reject</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
