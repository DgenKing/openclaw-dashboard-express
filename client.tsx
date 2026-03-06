import React, { useState, useEffect, useReducer, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import type { Agent, TaskEntry, ActivityEntry, DashboardStats } from './types/openclaw'
import type { ServerEvent } from './types/ws'

// State
interface State {
  agents: Agent[]
  tasks: TaskEntry[]
  activity: ActivityEntry[]
  stats: DashboardStats
  connected: boolean
}

const initialState: State = {
  agents: [],
  tasks: [],
  activity: [],
  stats: {
    totalAgents: 0,
    activeAgents: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    tasksCompleted24h: 0,
  },
  connected: false,
}

type Action =
  | { type: 'SNAPSHOT'; agents: Agent[]; tasks: TaskEntry[] }
  | { type: 'AGENT_UPDATE'; agent: Agent }
  | { type: 'TASK_UPDATE'; task: TaskEntry }
  | { type: 'ACTIVITY'; entry: ActivityEntry }
  | { type: 'STATS'; stats: DashboardStats }
  | { type: 'CONNECTED' }
  | { type: 'DISCONNECTED' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SNAPSHOT':
      return { ...state, agents: action.agents, tasks: action.tasks }
    case 'AGENT_UPDATE': {
      const exists = state.agents.find((a) => a.id === action.agent.id)
      const agents = exists
        ? state.agents.map((a) => (a.id === action.agent.id ? action.agent : a))
        : [...state.agents, action.agent]
      return { ...state, agents }
    }
    case 'TASK_UPDATE': {
      const exists = state.tasks.find((t) => t.id === action.task.id)
      const tasks = exists
        ? state.tasks.map((t) => (t.id === action.task.id ? action.task : t))
        : [...state.tasks, action.task]
      return { ...state, tasks }
    }
    case 'ACTIVITY':
      return { ...state, activity: [action.entry, ...state.activity].slice(0, 200) }
    case 'STATS':
      return { ...state, stats: action.stats }
    case 'CONNECTED':
      return { ...state, connected: true }
    case 'DISCONNECTED':
      return { ...state, connected: false }
    default:
      return state
  }
}

const StateContext = createContext<State>(initialState)
const DispatchContext = createContext<React.Dispatch<Action>>(() => {})

// WebSocket hook
function useWebSocket() {
  const dispatch = useContext(DispatchContext)
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws?token=change-me-in-production`

    const socket = new WebSocket(wsUrl)
    setWs(socket)

    socket.onopen = () => {
      dispatch({ type: 'CONNECTED' })
      console.log('[WS] Connected')
    }

    socket.onmessage = (event) => {
      try {
        const msg: ServerEvent = JSON.parse(event.data)
        switch (msg.type) {
          case 'snapshot':
            dispatch({ type: 'SNAPSHOT', agents: msg.agents, tasks: msg.tasks })
            break
          case 'agent:update':
            dispatch({ type: 'AGENT_UPDATE', agent: msg.agent })
            break
          case 'task:update':
            dispatch({ type: 'TASK_UPDATE', task: msg.task })
            break
          case 'activity':
            dispatch({ type: 'ACTIVITY', entry: msg.entry })
            break
          case 'stats':
            dispatch({ type: 'STATS', stats: msg.stats })
            break
        }
      } catch (e) {
        console.error('[WS] Parse error:', e)
      }
    }

    socket.onclose = () => {
      dispatch({ type: 'DISCONNECTED' })
      console.log('[WS] Disconnected')
    }

    socket.onerror = (e) => {
      console.error('[WS] Error:', e)
    }

    return () => socket.close()
  }, [dispatch])

  return ws
}

// Components
function Sidebar({ active, onNavigate }: { active: string; onNavigate: (v: string) => void }) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'agents', label: 'Agents', icon: '🤖' },
    { id: 'tasks', label: 'Tasks', icon: '📋' },
    { id: 'activity', label: 'Activity', icon: '📜' },
    { id: 'office', label: '2D Office', icon: '🏢' },
  ]

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1>Mission Control</h1>
      </div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
    </div>
  )
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className="connection-status">
      <span className={`connection-dot ${connected ? '' : 'disconnected'}`} />
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}

function Overview() {
  const state = useContext(StateContext)

  return (
    <div>
      <h2 className="section-title">Overview</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Agents</div>
          <div className="stat-card-value blue">{state.stats.totalAgents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Active Agents</div>
          <div className="stat-card-value green">{state.stats.activeAgents}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Tokens In (24h)</div>
          <div className="stat-card-value purple">{state.stats.totalTokensIn.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Tokens Out (24h)</div>
          <div className="stat-card-value yellow">{state.stats.totalTokensOut.toLocaleString()}</div>
        </div>
      </div>

      <h3 className="section-title">Cost Distribution</h3>
      <CostTracker />
    </div>
  )
}

function CostTracker() {
  const state = useContext(StateContext)
  const total = state.stats.totalTokensIn + state.stats.totalTokensOut

  // Simple SVG chart
  const inPct = total > 0 ? (state.stats.totalTokensIn / total) * 100 : 50
  const outPct = total > 0 ? (state.stats.totalTokensOut / total) * 100 : 50

  return (
    <div className="cost-chart">
      <div style={{ display: 'flex', gap: '24px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem' }}>Input: {state.stats.totalTokensIn.toLocaleString()}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', background: '#eab308', borderRadius: '2px' }} />
          <span style={{ fontSize: '0.875rem' }}>Output: {state.stats.totalTokensOut.toLocaleString()}</span>
        </div>
      </div>
      <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <div style={{ height: `${inPct}%`, flex: 1, background: '#3b82f6', borderRadius: '4px 4px 0 0', minHeight: '4px' }} />
        <div style={{ height: `${outPct}%`, flex: 1, background: '#eab308', borderRadius: '4px 4px 0 0', minHeight: '4px' }} />
      </div>
    </div>
  )
}

function AgentList() {
  const state = useContext(StateContext)

  return (
    <div>
      <h2 className="section-title">Agents</h2>
      <table className="agent-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Current Task</th>
            <th>Last Active</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {state.agents.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                No agents connected
              </td>
            </tr>
          ) : (
            state.agents.map((agent) => (
              <tr key={agent.id}>
                <td>{agent.name}</td>
                <td>
                  <span className={`status-badge ${agent.status}`}>
                    <span className="status-dot" />
                    {agent.status}
                  </span>
                </td>
                <td>{agent.currentTask || '-'}</td>
                <td>{new Date(agent.lastActive).toLocaleString()}</td>
                <td>{(agent.tokenUsage.input + agent.tokenUsage.output).toLocaleString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function TaskBoard() {
  const state = useContext(StateContext)
  const columns: Array<{ status: TaskEntry['status']; label: string }> = [
    { status: 'pending', label: 'Pending' },
    { status: 'running', label: 'Running' },
    { status: 'completed', label: 'Completed' },
    { status: 'failed', label: 'Failed' },
  ]

  return (
    <div>
      <h2 className="section-title">Task Board</h2>
      <div className="task-board">
        {columns.map((col) => {
          const tasks = state.tasks.filter((t) => t.status === col.status)
          return (
            <div key={col.status} className={`task-column ${col.status}`}>
              <div className="task-column-header">
                {col.label} ({tasks.length})
              </div>
              {tasks.map((task) => (
                <div key={task.id} className="task-card">
                  <div className="task-card-title">{task.title}</div>
                  <div className="task-card-agent">
                    Agent: {state.agents.find((a) => a.id === task.agentId)?.name || task.agentId}
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ActivityFeed() {
  const state = useContext(StateContext)

  return (
    <div>
      <h2 className="section-title">Activity Feed</h2>
      <div className="activity-feed">
        {state.activity.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No activity yet</div>
        ) : (
          state.activity.map((entry) => (
            <div key={entry.id} className="activity-item">
              <span className="activity-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className="activity-message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

import { Office3D } from './components/Office3D'

function Office() {
  const state = useContext(StateContext)

  return (
    <div>
      <h2 className="section-title">Office</h2>
      <Office3D agents={state.agents} />
    </div>
  )
}

function Dashboard() {
  const [active, setActive] = useState('overview')

  useWebSocket()

  return (
    <>
      <Sidebar active={active} onNavigate={setActive} />
      <ConnectionStatus connected={useContext(StateContext).connected} />
      <main className="main-content">
        {active === 'overview' && <Overview />}
        {active === 'agents' && <AgentList />}
        {active === 'tasks' && <TaskBoard />}
        {active === 'activity' && <ActivityFeed />}
        {active === 'office' && <Office />}
      </main>
    </>
  )
}

function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <Dashboard />
      </DispatchContext.Provider>
    </StateContext.Provider>
  )
}

// Mount
const root = createRoot(document.getElementById('root')!)
root.render(<App />)
