import type { SocialPost, Platform, SocialStatus } from '../types/social'
import { broadcast } from './broadcast'
import { triggerCronJob } from './cron'

const state = {
  posts: new Map<string, SocialPost>(),
}

// Optimal posting times
const OPTIMAL_TIMES: Record<Platform, number[]> = {
  twitter: [9, 12, 17],
  linkedin: [8, 10],
  facebook: [10, 14, 18],
  instagram: [11, 15, 19],
}

function getNextOptimalTime(platform: Platform): number {
  const now = new Date()
  const hours = OPTIMAL_TIMES[platform]
  for (const hour of hours) {
    const candidate = new Date(now)
    candidate.setHours(hour, 0, 0, 0)
    if (candidate > now) return candidate.getTime()
    candidate.setDate(candidate.getDate() + 1)
    return candidate.getTime()
  }
  return now.getTime() + 24 * 60 * 60 * 1000
}

export function createPost(post: Omit<SocialPost, 'id' | 'createdAt' | 'editHistory' | 'status'>) {
  const id = crypto.randomUUID()
  const entry: SocialPost = {
    ...post,
    id,
    status: 'draft',
    createdAt: Date.now(),
    editHistory: [],
  }
  state.posts.set(id, entry)
  broadcast({ type: 'social:new', post: entry })
  return entry
}

export function updatePost(id: string, updates: Partial<Pick<SocialPost, 'content' | 'status' | 'scheduledFor'>>) {
  const post = state.posts.get(id)
  if (!post) return null

  if (updates.content && updates.content !== post.content) {
    post.editHistory.push({ content: post.content, editedAt: Date.now() })
    post.content = updates.content
  }

  if (updates.status) {
    post.status = updates.status
    if (updates.status === 'published') {
      post.publishedAt = Date.now()
    }
  }

  if (updates.scheduledFor) {
    post.scheduledFor = updates.scheduledFor
    post.status = 'scheduled'
  }

  broadcast({ type: 'social:update', post })
  return post
}

export function approvePost(id: string) {
  return updatePost(id, { status: 'approved' })
}

export function rejectPost(id: string) {
  return updatePost(id, { status: 'rejected' })
}

export function schedulePost(id: string, scheduledFor: number) {
  return updatePost(id, { scheduledFor, status: 'scheduled' })
}

export function deletePost(id: string) {
  state.posts.delete(id)
  broadcast({ type: 'social:deleted', id })
}

export function getPosts(filters?: { platform?: Platform; status?: SocialStatus }): SocialPost[] {
  let posts = Array.from(state.posts.values())

  if (filters?.platform) {
    posts = posts.filter((p) => p.platform === filters.platform)
  }
  if (filters?.status) {
    posts = posts.filter((p) => p.status === filters.status)
  }

  return posts.sort((a, b) => b.createdAt - a.createdAt)
}

export function getPost(id: string): SocialPost | undefined {
  return state.posts.get(id)
}

// Initialize mock data
export function initMockSocial() {
  const mockPosts: Omit<SocialPost, 'id' | 'createdAt' | 'editHistory'>[] = [
    {
      agentId: 'agent-2',
      agentName: 'SocialManager',
      platform: 'twitter',
      content: 'Excited to announce our new AI-powered features! 🚀',
      status: 'approved',
    },
    {
      agentId: 'agent-2',
      agentName: 'SocialManager',
      platform: 'linkedin',
      content: 'Check out our latest case study on automation efficiency.',
      status: 'draft',
    },
    {
      agentId: 'agent-2',
      agentName: 'SocialManager',
      platform: 'twitter',
      content: 'Join us for a live demo this Thursday!',
      status: 'scheduled',
      scheduledFor: getNextOptimalTime('twitter'),
    },
  ]

  mockPosts.forEach((post, i) => {
    setTimeout(() => createPost(post), i * 100)
  })
}
