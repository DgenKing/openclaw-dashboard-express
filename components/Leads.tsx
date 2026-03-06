import { useState, useEffect } from 'react'
import type { Lead, LeadStage } from '../types/leads'

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)

  useEffect(() => {
    setLeads([
      {
        id: '1',
        businessName: 'Acme Corp',
        siteUrl: 'https://acme.com',
        contactEmail: 'john@acme.com',
        contactName: 'John Smith',
        stage: 'scanned',
        detectedIssues: ['slow load', 'no SSL', 'broken links'],
        scanScore: 35,
        agentId: 'agent-3',
        agentName: 'BugHunter',
        outreachHistory: [],
        createdAt: Date.now() - 86400000,
        updatedAt: Date.now() - 86400000,
      },
      {
        id: '2',
        businessName: 'TechStart Inc',
        siteUrl: 'https://techstart.io',
        contactEmail: 'sarah@techstart.io',
        contactName: 'Sarah Lee',
        stage: 'contacted',
        detectedIssues: ['outdated CMS'],
        scanScore: 72,
        agentId: 'agent-3',
        agentName: 'BugHunter',
        outreachHistory: [
          { type: 'email', date: Date.now() - 86400000, summary: 'Initial outreach', status: 'opened' },
        ],
        createdAt: Date.now() - 172800000,
        updatedAt: Date.now() - 86400000,
      },
      {
        id: '3',
        businessName: 'Global Solutions',
        siteUrl: 'https://globalsolutions.com',
        contactEmail: 'mike@globalsolutions.com',
        contactName: 'Mike Johnson',
        stage: 'proposal_sent',
        detectedIssues: [],
        scanScore: 88,
        agentId: 'agent-1',
        agentName: 'CodeWriter',
        value: 45000,
        outreachHistory: [
          { type: 'email', date: Date.now() - 172800000, summary: 'Proposal sent', status: 'opened' },
          { type: 'message', date: Date.now() - 86400000, summary: 'Follow-up', status: 'replied' },
        ],
        createdAt: Date.now() - 604800000,
        updatedAt: Date.now() - 43200000,
      },
    ])
  }, [])

  const stages: LeadStage[] = ['scanned', 'contacted', 'proposal_sent', 'converted', 'lost']

  const stageLabels: Record<LeadStage, string> = {
    scanned: 'Scanned',
    contacted: 'Contacted',
    proposal_sent: 'Proposal',
    converted: 'Won',
    lost: 'Lost',
  }

  const getStageColor = (stage: LeadStage) => {
    switch (stage) {
      case 'scanned': return '#6b7280'
      case 'contacted': return '#3b82f6'
      case 'proposal_sent': return '#eab308'
      case 'converted': return '#22c55e'
      case 'lost': return '#ef4444'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e'
    if (score >= 60) return '#eab308'
    return '#ef4444'
  }

  const stats = {
    scanned: leads.filter(l => l.stage === 'scanned').length,
    contacted: leads.filter(l => l.stage === 'contacted').length,
    proposal: leads.filter(l => l.stage === 'proposal_sent').length,
    converted: leads.filter(l => l.stage === 'converted').length,
  }

  const conversionRate = leads.length > 0 ? (stats.converted / leads.length) * 100 : 0

  return (
    <div>
      <h2 className="section-title">Lead Pipeline</h2>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-card-label">Scanned</div>
          <div className="stat-card-value">{stats.scanned}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Contacted</div>
          <div className="stat-card-value blue">{stats.contacted}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Proposals</div>
          <div className="stat-card-value yellow">{stats.proposal}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Converted</div>
          <div className="stat-card-value green">{stats.converted}</div>
        </div>
      </div>

      <div style={{ marginBottom: '16px', color: '#94a3b8' }}>
        Conversion rate: {conversionRate.toFixed(1)}%
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {stages.slice(0, 4).map((stage) => (
          <div key={stage} className="task-column">
            <div className="task-column-header" style={{ color: getStageColor(stage) }}>
              {stageLabels[stage]} ({leads.filter(l => l.stage === stage).length})
            </div>
            {leads.filter(l => l.stage === stage).map((lead) => (
              <div
                key={lead.id}
                className="task-card"
                onClick={() => setSelectedLead(lead)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>{lead.businessName}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                  <span>Score: <span style={{ color: getScoreColor(lead.scanScore) }}>{lead.scanScore}</span></span>
                  <span>Issues: {lead.detectedIssues.length}</span>
                </div>
                {lead.value && (
                  <div style={{ fontSize: '0.75rem', color: '#22c55e', marginTop: '4px' }}>
                    ${lead.value.toLocaleString()}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Scan</button>
                  <button className="btn btn-secondary" style={{ padding: '2px 6px', fontSize: '0.65rem' }}>Contact</button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {selectedLead && (
        <div className="modal-overlay" onClick={() => setSelectedLead(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '500px', maxHeight: '80vh', overflow: 'auto' }}>
            <h3 className="modal-title">{selectedLead.businessName}</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Site: <a href={selectedLead.siteUrl} style={{ color: '#3b82f6' }}>{selectedLead.siteUrl}</a></div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Contact: {selectedLead.contactName} ({selectedLead.contactEmail})</div>
              <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Stage: <span style={{ color: getStageColor(selectedLead.stage) }}>{stageLabels[selectedLead.stage]}</span></div>
              {selectedLead.value && <div style={{ color: '#22c55e' }}>Value: ${selectedLead.value.toLocaleString()}</div>}
            </div>

            <h4 style={{ marginBottom: '8px' }}>Scan Results</h4>
            <div style={{ marginBottom: '16px' }}>
              <div>Score: <span style={{ color: getScoreColor(selectedLead.scanScore) }}>{selectedLead.scanScore}/100</span></div>
              {selectedLead.detectedIssues.length > 0 && (
                <ul style={{ margin: '8px 0', paddingLeft: '20px', color: '#94a3b8', fontSize: '0.875rem' }}>
                  {selectedLead.detectedIssues.map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>

            <h4 style={{ marginBottom: '8px' }}>Outreach History</h4>
            {selectedLead.outreachHistory.length > 0 ? (
              <div style={{ marginBottom: '16px' }}>
                {selectedLead.outreachHistory.map((event, i) => (
                  <div key={i} style={{ padding: '8px', background: '#0f172a', borderRadius: '4px', marginBottom: '4px', fontSize: '0.875rem' }}>
                    <span style={{ color: '#94a3b8' }}>{new Date(event.date).toLocaleDateString()}</span> - {event.type}: {event.summary} ({event.status})
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: '#94a3b8', marginBottom: '16px' }}>No outreach yet</div>
            )}

            <div className="modal-buttons">
              <button className="btn btn-secondary" onClick={() => setSelectedLead(null)}>Close</button>
              <button className="btn btn-primary">Generate Proposal</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
