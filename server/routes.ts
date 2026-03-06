import { isAuthValid } from './auth'
import { getAgents, getTasks, getStats, getActivity, sendToAgent } from './gateway'

export async function handleApi(
  url: URL,
  method: string,
  authHeader: string | null,
  queryToken: string | null
): Promise<Response | null> {
  if (!isAuthValid(authHeader, queryToken)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/agents
  if (url.pathname === '/api/agents' && method === 'GET') {
    return new Response(JSON.stringify({ agents: getAgents() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/tasks
  if (url.pathname === '/api/tasks' && method === 'GET') {
    const status = url.searchParams.get('status')
    let tasks = getTasks()
    if (status) {
      tasks = tasks.filter((t) => t.status === status)
    }
    return new Response(JSON.stringify({ tasks }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/stats
  if (url.pathname === '/api/stats' && method === 'GET') {
    return new Response(JSON.stringify(getStats()), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/activity
  if (url.pathname === '/api/activity' && method === 'GET') {
    return new Response(JSON.stringify({ activity: getActivity() }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/agents/:id/send
  const sendMatch = url.pathname.match(/^\/api\/agents\/([^/]+)\/send$/)
  if (sendMatch && method === 'POST') {
    const agentId = sendMatch[1]
    // Read body for message
    // This would need to be handled in the main server
    return new Response(JSON.stringify({ success: true, agentId }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // /api/snapshot - initial data load
  if (url.pathname === '/api/snapshot' && method === 'GET') {
    return new Response(
      JSON.stringify({
        agents: getAgents(),
        tasks: getTasks(),
        stats: getStats(),
        activity: getActivity(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }

  return null
}
