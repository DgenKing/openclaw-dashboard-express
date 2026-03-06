export type LeadStage = 'scanned' | 'contacted' | 'proposal_sent' | 'converted' | 'lost'

export interface OutreachEvent {
  type: 'email' | 'message' | 'call'
  date: number
  summary: string
  status: 'sent' | 'opened' | 'replied'
}

export interface Lead {
  id: string
  businessName: string
  siteUrl: string
  contactEmail?: string
  contactName?: string
  stage: LeadStage
  detectedIssues: string[]
  scanScore: number
  agentId: string
  agentName: string
  proposalDocId?: string
  mockupUrl?: string
  outreachHistory: OutreachEvent[]
  createdAt: number
  updatedAt: number
  value?: number
}
