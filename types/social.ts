export type Platform = 'twitter' | 'linkedin' | 'facebook' | 'instagram'
export type SocialStatus = 'draft' | 'approved' | 'scheduled' | 'published' | 'rejected'

export interface SocialPost {
  id: string
  agentId: string
  agentName: string
  platform: Platform
  content: string
  mediaUrl?: string
  status: SocialStatus
  scheduledFor?: number
  publishedAt?: number
  engagement?: {
    likes: number
    shares: number
    comments: number
    impressions: number
  }
  createdAt: number
  editHistory: Array<{ content: string; editedAt: number }>
}
