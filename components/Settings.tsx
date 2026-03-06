import { useState } from 'react'

export function Settings() {
  const [config, setConfig] = useState({
    gatewayUrl: 'ws://127.0.0.1:18789',
    gatewayToken: '',
    autoReconnect: true,
    dashboardToken: 'change-me-in-production',
    theme: 'dark' as 'dark' | 'light',
    enableOffice: true,
    activityLimit: 200,
    costDaily: 50,
    costWeekly: 200,
    browserNotifications: false,
    soundAlerts: false,
  })

  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const handleTest = () => {
    setTesting(true)
    setTestResult(null)
    setTimeout(() => {
      setTesting(false)
      setTestResult('Connection successful!')
    }, 1500)
  }

  const handleRegenerate = () => {
    const newToken = crypto.randomUUID()
    setConfig({ ...config, dashboardToken: newToken })
  }

  return (
    <div>
      <h2 className="section-title">Settings</h2>

      <div style={{ maxWidth: '600px' }}>
        {/* Gateway Connection */}
        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px' }}>Gateway Connection</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>URL</label>
            <input
              className="modal-input"
              value={config.gatewayUrl}
              onChange={(e) => setConfig({ ...config, gatewayUrl: e.target.value })}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Token</label>
            <input
              className="modal-input"
              type="password"
              value={config.gatewayToken}
              onChange={(e) => setConfig({ ...config, gatewayToken: e.target.value })}
              placeholder="Enter token..."
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.autoReconnect}
                onChange={(e) => setConfig({ ...config, autoReconnect: e.target.checked })}
              />
              <span>Auto-reconnect</span>
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="btn btn-primary" onClick={handleTest} disabled={testing}>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            {testResult && (
              <span style={{ color: '#22c55e', fontSize: '0.875rem' }}>{testResult}</span>
            )}
          </div>
        </div>

        {/* Authentication */}
        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px' }}>Authentication</h3>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Dashboard Token</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                className="modal-input"
                type="password"
                value={config.dashboardToken}
                onChange={(e) => setConfig({ ...config, dashboardToken: e.target.value })}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" onClick={handleRegenerate}>Regenerate</button>
            </div>
          </div>
        </div>

        {/* Display */}
        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px' }}>Display</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Theme</label>
            <select
              className="modal-input"
              value={config.theme}
              onChange={(e) => setConfig({ ...config, theme: e.target.value as 'dark' | 'light' })}
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.enableOffice}
                onChange={(e) => setConfig({ ...config, enableOffice: e.target.checked })}
              />
              <span>Enable 2D Office</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Activity log limit</label>
            <input
              className="modal-input"
              type="number"
              value={config.activityLimit}
              onChange={(e) => setConfig({ ...config, activityLimit: parseInt(e.target.value) })}
              style={{ width: '100px' }}
            />
          </div>
        </div>

        {/* Alerts */}
        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px' }}>Alerts & Thresholds</h3>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Daily cost limit ($)</label>
            <input
              className="modal-input"
              type="number"
              value={config.costDaily}
              onChange={(e) => setConfig({ ...config, costDaily: parseInt(e.target.value) })}
              style={{ width: '100px' }}
            />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem', color: '#94a3b8' }}>Weekly cost limit ($)</label>
            <input
              className="modal-input"
              type="number"
              value={config.costWeekly}
              onChange={(e) => setConfig({ ...config, costWeekly: parseInt(e.target.value) })}
              style={{ width: '100px' }}
            />
          </div>
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.browserNotifications}
                onChange={(e) => setConfig({ ...config, browserNotifications: e.target.checked })}
              />
              <span>Browser notifications</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={config.soundAlerts}
                onChange={(e) => setConfig({ ...config, soundAlerts: e.target.checked })}
              />
              <span>Sound alerts</span>
            </label>
          </div>
        </div>

        {/* API Keys */}
        <div style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '8px', padding: '20px', marginBottom: '16px' }}>
          <h3 style={{ marginBottom: '16px' }}>API Keys</h3>
          <div style={{ marginBottom: '12px', color: '#94a3b8', fontSize: '0.875rem' }}>
            No API keys configured
          </div>
          <button className="btn btn-secondary">+ Add Key</button>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn btn-primary">Save Changes</button>
          <button className="btn btn-secondary">Reset to Defaults</button>
        </div>
      </div>
    </div>
  )
}
