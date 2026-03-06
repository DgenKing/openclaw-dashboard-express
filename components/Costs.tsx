import { useState } from 'react'
import { useContext } from 'react'
import { StateContext } from '../client'

type Period = 'daily' | 'weekly' | 'monthly'

export function Costs() {
  const state = useContext(StateContext)
  const [period, setPeriod] = useState<Period>('daily')

  const stats = state.costs || {
    totalSpend: 0,
    totalTokensIn: 0,
    totalTokensOut: 0,
    activeModels: [],
    dailySpend: [],
    agentBreakdown: [],
  }

  const dailyLimit = 50
  const spendPct = Math.min((stats.totalSpend / dailyLimit) * 100, 100)

  return (
    <div>
      <h2 className="section-title">Costs & Token Usage</h2>

      <div style={{ marginBottom: '16px' }}>
        <button
          className={`btn ${period === 'daily' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('daily')}
          style={{ marginRight: '8px' }}
        >
          Daily
        </button>
        <button
          className={`btn ${period === 'weekly' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('weekly')}
          style={{ marginRight: '8px' }}
        >
          Weekly
        </button>
        <button
          className={`btn ${period === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setPeriod('monthly')}
        >
          Monthly
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-label">Total Spend</div>
          <div className="stat-card-value purple">${stats.totalSpend.toFixed(2)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Input Tokens</div>
          <div className="stat-card-value blue">{stats.totalTokensIn.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Output Tokens</div>
          <div className="stat-card-value yellow">{stats.totalTokensOut.toLocaleString()}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Active Models</div>
          <div className="stat-card-value green">{stats.activeModels.length}</div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Daily Spend</h3>
        <div className="cost-chart" style={{ height: '200px' }}>
          <div className="chart-container" style={{ height: '160px' }}>
            {stats.dailySpend.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', width: '100%' }}>No cost data yet</div>
            ) : (
              stats.dailySpend.slice(-14).map((day, i) => (
                <div
                  key={i}
                  className="chart-bar"
                  style={{
                    height: `${Math.max(5, (day.input + day.output) / Math.max(...stats.dailySpend.map(d => d.input + d.output)) * 100)}%`,
                    background: '#3b82f6',
                  }}
                  title={`${day.date}: $${(day.input + day.output).toFixed(2)}`}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Threshold Indicator</h3>
        <div style={{ background: '#1e293b', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span>Daily Limit</span>
            <span>${stats.totalSpend.toFixed(2)} / ${dailyLimit}</span>
          </div>
          <div style={{ height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${spendPct}%`,
                background: spendPct > 80 ? '#ef4444' : '#22c55e',
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ marginBottom: '12px' }}>Agent Breakdown</h3>
        <table className="agent-table">
          <thead>
            <tr>
              <th>Agent</th>
              <th>Tokens In</th>
              <th>Tokens Out</th>
              <th>Cost</th>
            </tr>
          </thead>
          <tbody>
            {stats.agentBreakdown.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                  No data yet
                </td>
              </tr>
            ) : (
              stats.agentBreakdown.map((agent) => (
                <tr key={agent.agentId}>
                  <td>{agent.name}</td>
                  <td>{agent.tokensIn.toLocaleString()}</td>
                  <td>{agent.tokensOut.toLocaleString()}</td>
                  <td>${agent.cost.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
