import React, { useState, useEffect, useReducer, createContext, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import {
  LayoutDashboard, Bot, ListTodo, FileText, Building2, Coins, Clock, Brain, File, Share2, Target, Settings,
  Cpu,
  Users, UserCheck, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Zap, Activity, Wifi, WifiOff,
  Inbox, Search,
  TrendingUp,
  Circle, CircleDot,
  AlertTriangle, Loader, Loader2,
} from 'lucide-react'
import type { Agent, TaskEntry, ActivityEntry, DashboardStats } from './types/openclaw'
import type { ServerEvent } from './types/ws'
import type { CostStats } from './types/costs'

// State
interface State {
  agents: Agent[]
  tasks: TaskEntry[]
  activity: ActivityEntry[]
  stats: DashboardStats
  costs: CostStats | null
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
  costs: null,
  connected: false,
}

type Action =
  | { type: 'SNAPSHOT'; agents: Agent[]; tasks: TaskEntry[] }
  | { type: 'AGENT_UPDATE'; agent: Agent }
  | { type: 'TASK_UPDATE'; task: TaskEntry }
  | { type: 'ACTIVITY'; entry: ActivityEntry }
  | { type: 'STATS'; stats: DashboardStats }
  | { type: 'COSTS'; costs: CostStats }
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
    case 'COSTS':
      return { ...state, costs: action.costs }
    case 'CONNECTED':
      return { ...state, connected: true }
    case 'DISCONNECTED':
      return { ...state, connected: false }
    default:
      return state
  }
}

export const StateContext = createContext<State>(initialState)
const DispatchContext = createContext<React.Dispatch<Action>>(() => {})

// WebSocket hook
function useWebSocket() {
  const dispatch = useContext(DispatchContext)

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const wsUrl = `${protocol}//${window.location.host}/ws?token=change-me-in-production`

    const socket = new WebSocket(wsUrl)

    socket.onopen = () => {
      dispatch({ type: 'CONNECTED' })
      console.log('[WS] Connected')
    }

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
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
          case 'costs:update':
            dispatch({ type: 'COSTS', costs: msg.stats })
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

    return () => socket.close()
  }, [dispatch])
}

// --- Shared UI primitives ---

function PageHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="page-header fade-in">
      <div className="page-header-icon">
        <Icon size={20} />
      </div>
      <h2 className="page-header-title">{title}</h2>
    </div>
  )
}

function SuspenseFallback() {
  return (
    <div className="suspense-fallback">
      <Loader2 size={28} className="spin" />
      <span>Loading...</span>
    </div>
  )
}

// --- Components ---

function Sidebar({ active, onNavigate }: { active: string; onNavigate: (v: string) => void }) {
  const coreItems = [
    { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
    { id: 'agents', label: 'Agents', Icon: Bot },
    { id: 'tasks', label: 'Tasks', Icon: ListTodo },
    { id: 'activity', label: 'Activity', Icon: FileText },
    { id: 'office', label: '2D Office', Icon: Building2 },
  ]

  const tier1Items = [
    { id: 'costs', label: 'Costs', Icon: Coins },
    { id: 'crons', label: 'Crons', Icon: Clock },
    { id: 'memory', label: 'Memory', Icon: Brain },
    { id: 'docs', label: 'Docs', Icon: File },
  ]

  const tier2Items = [
    { id: 'social', label: 'Social', Icon: Share2 },
    { id: 'leads', label: 'Leads', Icon: Target },
    { id: 'settings', label: 'Settings', Icon: Settings },
  ]

  function NavGroup({ items }: { items: typeof coreItems }) {
    return (
      <>
        {items.map((item) => (
          <div
            key={item.id}
            className={`nav-item ${active === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <item.Icon className="nav-icon" size={18} />
            <span>{item.label}</span>
          </div>
        ))}
      </>
    )
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <Cpu size={18} className="sidebar-header-icon" />
        <h1>Dashboard Express</h1>
      </div>
      <nav className="sidebar-nav">
        <NavGroup items={coreItems} />
        <div className="nav-divider" />
        <NavGroup items={tier1Items} />
        <div className="nav-divider" />
        <NavGroup items={tier2Items} />
      </nav>
    </div>
  )
}

function ConnectionStatus({ connected }: { connected: boolean }) {
  return (
    <div className={`connection-status ${connected ? 'connected' : 'disconnected'}`}>
      {connected
        ? <Wifi size={14} className="connection-icon" />
        : <WifiOff size={14} className="connection-icon" />
      }
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  )
}

// --- Overview ---

function StatCard({
  label,
  value,
  colorClass,
  Icon,
}: {
  label: string
  value: string | number
  colorClass: string
  Icon: React.ElementType
}) {
  return (
    <div className="stat-card">
      <div className={`stat-card-icon-bg ${colorClass}`}>
        <Icon size={16} />
      </div>
      <div className="stat-card-label">{label}</div>
      <div className={`stat-card-value ${colorClass}`}>{value}</div>
    </div>
  )
}

function Overview() {
  const state = useContext(StateContext)

  return (
    <div className="fade-in">
      <PageHeader icon={LayoutDashboard} title="Overview" />
      <div className="stats-grid">
        <StatCard
          label="Total Agents"
          value={state.stats.totalAgents}
          colorClass="blue"
          Icon={Users}
        />
        <StatCard
          label="Active Agents"
          value={state.stats.activeAgents}
          colorClass="green"
          Icon={UserCheck}
        />
        <StatCard
          label="Tokens In (24h)"
          value={state.stats.totalTokensIn.toLocaleString()}
          colorClass="purple"
          Icon={ArrowDownToLine}
        />
        <StatCard
          label="Tokens Out (24h)"
          value={state.stats.totalTokensOut.toLocaleString()}
          colorClass="yellow"
          Icon={ArrowUpFromLine}
        />
        <StatCard
          label="Tasks Completed (24h)"
          value={state.stats.tasksCompleted24h}
          colorClass="teal"
          Icon={CheckCircle2}
        />
      </div>

      <div className="section-subheader">
        <TrendingUp size={16} />
        <h3 className="section-subtitle">Cost Distribution</h3>
      </div>
      <CostTracker />
    </div>
  )
}

function CostTracker() {
  const state = useContext(StateContext)
  const total = state.stats.totalTokensIn + state.stats.totalTokensOut
  const inPct = total > 0 ? (state.stats.totalTokensIn / total) * 100 : 50
  const outPct = total > 0 ? (state.stats.totalTokensOut / total) * 100 : 50

  return (
    <div className="cost-chart">
      <div className="cost-chart-legend">
        <div className="cost-legend-item">
          <span className="cost-legend-dot blue" />
          <span className="cost-legend-label">Input: {state.stats.totalTokensIn.toLocaleString()}</span>
        </div>
        <div className="cost-legend-item">
          <span className="cost-legend-dot yellow" />
          <span className="cost-legend-label">Output: {state.stats.totalTokensOut.toLocaleString()}</span>
        </div>
      </div>
      <div className="cost-chart-bars">
        <div className="cost-bar blue" style={{ height: `${inPct}%` }} />
        <div className="cost-bar yellow" style={{ height: `${outPct}%` }} />
      </div>
    </div>
  )
}

// --- Agent List ---

function AgentList() {
  const state = useContext(StateContext)
  const [query, setQuery] = useState('')

  const filtered = state.agents.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fade-in">
      <PageHeader icon={Bot} title="Agents" />

      <div className="table-toolbar">
        <div className="search-bar">
          <Search size={15} className="search-icon" />
          <input
            className="search-input"
            type="text"
            placeholder="Filter agents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

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
          {filtered.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="empty-state">
                  <Bot size={36} className="empty-state-icon" />
                  <div className="empty-state-title">No agents connected</div>
                  <div className="empty-state-sub">Agents will appear here once they connect via WebSocket.</div>
                </div>
              </td>
            </tr>
          ) : (
            filtered.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <div className="agent-name-cell">
                    <Bot size={14} className="agent-row-icon" />
                    <span>{agent.name}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${agent.status}`}>
                    <CircleDot size={11} className="status-dot-icon" />
                    {agent.status}
                  </span>
                </td>
                <td>{agent.currentTask || <span className="muted">—</span>}</td>
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

// --- Task Board ---

const COLUMN_META: Record<
  TaskEntry['status'],
  { label: string; Icon: React.ElementType; colorClass: string }
> = {
  pending: { label: 'Pending', Icon: Clock, colorClass: 'yellow' },
  running: { label: 'Running', Icon: Loader, colorClass: 'blue' },
  completed: { label: 'Completed', Icon: CheckCircle2, colorClass: 'green' },
  failed: { label: 'Failed', Icon: AlertTriangle, colorClass: 'red' },
}

function TaskBoard() {
  const state = useContext(StateContext)
  const columns: Array<{ status: TaskEntry['status'] }> = [
    { status: 'pending' },
    { status: 'running' },
    { status: 'completed' },
    { status: 'failed' },
  ]

  return (
    <div className="fade-in">
      <PageHeader icon={ListTodo} title="Task Board" />
      <div className="task-board">
        {columns.map((col) => {
          const tasks = state.tasks.filter((t) => t.status === col.status)
          const meta = COLUMN_META[col.status]
          return (
            <div key={col.status} className={`task-column ${col.status}`}>
              <div className="task-column-header">
                <meta.Icon size={14} className={`task-col-icon ${meta.colorClass}`} />
                <span>{meta.label}</span>
                <span className="task-column-count">{tasks.length}</span>
              </div>
              {tasks.length === 0 ? (
                <div className="task-column-empty">
                  <Circle size={18} className="task-column-empty-icon" />
                  <span>Nothing here</span>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="task-card">
                    <div className="task-card-header">
                      <meta.Icon size={12} className={`task-card-icon ${meta.colorClass}`} />
                      <div className="task-card-title">{task.title}</div>
                    </div>
                    <div className="task-card-agent">
                      {state.agents.find((a) => a.id === task.agentId)?.name || task.agentId}
                    </div>
                  </div>
                ))
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --- Activity Feed ---

function ActivityFeed() {
  const state = useContext(StateContext)

  return (
    <div className="fade-in">
      <PageHeader icon={Activity} title="Activity Feed" />
      <div className="activity-feed">
        {state.activity.length === 0 ? (
          <div className="empty-state">
            <Inbox size={36} className="empty-state-icon" />
            <div className="empty-state-title">No activity yet</div>
            <div className="empty-state-sub">Events will stream here in real time.</div>
          </div>
        ) : (
          state.activity.map((entry) => (
            <div key={entry.id} className="activity-item">
              <Activity size={13} className="activity-item-icon" />
              <span className="activity-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
              <span className="activity-message">{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// --- Lazy-loaded pages ---
const Office3D = React.lazy(() => import('./components/Office3D').then(m => ({ default: m.Office3D })))
const Costs = React.lazy(() => import('./components/Costs').then(m => ({ default: m.Costs })))
const Crons = React.lazy(() => import('./components/Crons').then(m => ({ default: m.Crons })))
const Memory = React.lazy(() => import('./components/Memory').then(m => ({ default: m.Memory })))
const Docs = React.lazy(() => import('./components/Docs').then(m => ({ default: m.Docs })))
const Social = React.lazy(() => import('./components/Social').then(m => ({ default: m.Social })))
const Leads = React.lazy(() => import('./components/Leads').then(m => ({ default: m.Leads })))
const SettingsPage = React.lazy(() => import('./components/Settings').then(m => ({ default: m.Settings })))

function Office() {
  const state = useContext(StateContext)
  return (
    <div className="fade-in">
      <PageHeader icon={Building2} title="Office" />
      <React.Suspense fallback={<SuspenseFallback />}>
        <Office3D agents={state.agents} />
      </React.Suspense>
    </div>
  )
}

// --- Dashboard shell ---

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
        {active === 'costs' && <React.Suspense fallback={<SuspenseFallback />}><Costs /></React.Suspense>}
        {active === 'crons' && <React.Suspense fallback={<SuspenseFallback />}><Crons /></React.Suspense>}
        {active === 'memory' && <React.Suspense fallback={<SuspenseFallback />}><Memory /></React.Suspense>}
        {active === 'docs' && <React.Suspense fallback={<SuspenseFallback />}><Docs /></React.Suspense>}
        {active === 'social' && <React.Suspense fallback={<SuspenseFallback />}><Social /></React.Suspense>}
        {active === 'leads' && <React.Suspense fallback={<SuspenseFallback />}><Leads /></React.Suspense>}
        {active === 'settings' && <React.Suspense fallback={<SuspenseFallback />}><SettingsPage /></React.Suspense>}
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
