export type DocCategory = 'audit' | 'proposal' | 'social-draft' | 'report' | 'code' | 'other'
export type DocFormat = 'markdown' | 'html' | 'text' | 'json'

export interface GeneratedDoc {
  id: string
  title: string
  agentId: string
  agentName: string
  category: DocCategory
  format: DocFormat
  content: string
  size: number
  createdAt: number
  taskId?: string
}
