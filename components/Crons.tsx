import { useState } from 'react'
import { useContext, useEffect } from 'react'
import { StateContext } from '../client'
import type { CronJob } from '../types/cron'

export function Crons() {
  const state = useContext(StateContext)
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [newJob, setNewJob] = useState({ name: '', schedule: '0 9 * * *', agentId: '', command: '' })

  useEffect(() => {
    // Load initial jobs (would come from WS in real impl)
    setJobs([
      {
        id: '1',
        name: 'Daily Social Post',
        schedule: '0 9 * * *',
        agentId: 'agent-2',
        command: 'post social',
        nextRun: Date.now() + 3 * 60 * 60 * 1000,
        lastRun: { timestamp: Date.now() - 21 * 60 * 60 * 1000, status: 'success', duration: 1200 },
        enabled: true,
      },
      {
        id: '2',
        name: 'Weekly Site Scan',
        schedule: '0 6 * * 1',
        agentId: 'agent-3',
        command: 'scan all',
        nextRun: Date.now() + 2 * 24 * 60 * 60 * 1000,
        lastRun: { timestamp: Date.now() - 5 * 24 * 60 * 60 * 1000, status: 'failed', duration: 0, output: 'Timeout' },
        enabled: true,
      },
    ])
  }, [])

  const formatNextRun = (timestamp: number) => {
    const diff = timestamp - Date.now()
    if (diff < 0) return 'Overdue'
    const hours = Math.floor(diff / (60 * 60 * 1000))
    const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000))
    if (hours > 24) return `in ${Math.floor(hours / 24)}d ${hours % 24}h`
    return `in ${hours}h ${mins}m`
  }

  const formatLastRun = (job: CronJob) => {
    if (!job.lastRun) return 'Never'
    const ago = Date.now() - job.lastRun.timestamp
    const mins = Math.floor(ago / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#22c55e'
      case 'failed': return '#ef4444'
      case 'running': return '#eab308'
      default: return '#6b7280'
    }
  }

  return (
    <div>
      <h2 className="section-title">Scheduled Jobs</h2>

      <div style={{ marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Scheduled Job</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {jobs.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No scheduled jobs</div>
        ) : (
          jobs.map((job) => (
            <div key={job.id} style={{
              background: '#1e293b',
              border: '1px solid #475569',
              borderRadius: '8px',
              padding: '16px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: job.enabled ? '#22c55e' : '#6b7280',
                }} />
                <span style={{ fontWeight: '600' }}>{job.name}</span>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>|</span>
                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Agent: {job.agentId}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.875rem', color: '#94a3b8' }}>
                <div>Schedule: {job.schedule}</div>
                <div>Next run: {formatNextRun(job.nextRun)}</div>
                <div>
                  Last run: <span style={{ color: getStatusColor(job.lastRun?.status || '') }}>{formatLastRun(job)}</span>
                  {job.lastRun?.status === 'success' && ` (${job.lastRun.duration}ms)`}
                  {job.lastRun?.status === 'failed' && ' [!]'}
                </div>
                <div>
                  <button className="btn btn-secondary" style={{ marginRight: '8px', padding: '4px 8px', fontSize: '0.75rem' }}>Trigger Now</button>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Edit</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">Add Scheduled Job</h3>
            <input
              className="modal-input"
              placeholder="Job name"
              value={newJob.name}
              onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
            />
            <input
              className="modal-input"
              placeholder="Cron expression (e.g., 0 9 * * *)"
              value={newJob.schedule}
              onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
            />
            <select
              className="modal-input"
              value={newJob.agentId}
              onChange={(e) => setNewJob({ ...newJob, agentId: e.target.value })}
            >
              <option value="">Select agent...</option>
              {state.agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <input
              className="modal-input"
              placeholder="Command to send"
              value={newJob.command}
              onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
            />
            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setShowAdd(false)}>Add Job</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
