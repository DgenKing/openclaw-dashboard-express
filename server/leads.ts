import type { Lead, LeadStage, OutreachEvent } from '../types/leads'
import { broadcast } from './broadcast'
import { sendToAgent } from './gateway'

const state = {
  leads: new Map<string, Lead>(),
}

export function addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = crypto.randomUUID()
  const entry: Lead = {
    ...lead,
    id,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  state.leads.set(id, entry)
  broadcast({ type: 'leads:new', lead: entry })
  return entry
}

export function updateLead(id: string, updates: Partial<Lead>) {
  const lead = state.leads.get(id)
  if (!lead) return null

  Object.assign(lead, updates, { updatedAt: Date.now() })
  broadcast({ type: 'leads:update', lead })
  return lead
}

export function moveStage(id: string, stage: LeadStage) {
  return updateLead(id, { stage })
}

export function addOutreachEvent(id: string, event: Omit<OutreachEvent, 'date'>) {
  const lead = state.leads.get(id)
  if (!lead) return null

  lead.outreachHistory.push({ ...event, date: Date.now() })
  lead.updatedAt = Date.now()
  broadcast({ type: 'leads:update', lead })
  return lead
}

export function rescanLead(id: string) {
  const lead = state.leads.get(id)
  if (!lead) return

  sendToAgent(lead.agentId, `rescan ${lead.siteUrl}`)
  broadcast({
    type: 'alert:info',
    severity: 'info',
    title: 'Rescan Started',
    message: `Rescanning ${lead.siteUrl}`,
    source: 'leads',
  })
}

export function deleteLead(id: string) {
  state.leads.delete(id)
  broadcast({ type: 'leads:deleted', id })
}

export function getLeads(stage?: LeadStage): Lead[] {
  let leads = Array.from(state.leads.values())

  if (stage) {
    leads = leads.filter((l) => l.stage === stage)
  }

  return leads.sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getLead(id: string): Lead | undefined {
  return state.leads.get(id)
}

export function getLeadStats() {
  const leads = Array.from(state.leads.values())
  const stages: Record<LeadStage, number> = {
    scanned: 0,
    contacted: 0,
    proposal_sent: 0,
    converted: 0,
    lost: 0,
  }

  leads.forEach((l) => stages[l.stage]++)

  const converted = leads.filter((l) => l.stage === 'converted').length
  const conversionRate = leads.length > 0 ? (converted / leads.length) * 100 : 0

  return { ...stages, conversionRate }
}

// Initialize mock data
export function initMockLeads() {
  const mockLeads: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
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
    },
    {
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
    },
    {
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
    },
  ]

  mockLeads.forEach((lead, i) => {
    setTimeout(() => addLead(lead), i * 100)
  })
}
