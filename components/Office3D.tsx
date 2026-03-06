import React, { useEffect, useState, useRef, useMemo } from 'react'
import type { Agent, AgentStatus } from '../types/openclaw'

const STATUS_COLORS: Record<AgentStatus, string> = {
  working: '#3ade68',
  thinking: '#5a9af5',
  idle: '#8888aa',
  error: '#ff4455',
  offline: '#444466',
}

const SPRITE_PALETTES = [
  { hair: '#3a2a1a', shirt: '#e44a4a', skin: '#deb887' },
  { hair: '#1a1a3a', shirt: '#4a8ae4', skin: '#f0c8a0' },
  { hair: '#8a4a1a', shirt: '#4ae44a', skin: '#deb887' },
  { hair: '#ffd700', shirt: '#e44ae4', skin: '#f0c8a0' },
  { hair: '#e44a1a', shirt: '#4ae4e4', skin: '#deb887' },
  { hair: '#1a1a1a', shirt: '#e4e44a', skin: '#c4a070' },
  { hair: '#8a1a4a', shirt: '#ff8844', skin: '#f0c8a0' },
  { hair: '#4a4a6a', shirt: '#44ff88', skin: '#deb887' },
]

// Each workstation = desk center position. Sprite sits behind desk.
const WORKSTATIONS = [
  { x: 100, y: 220 },
  { x: 250, y: 220 },
  { x: 400, y: 220 },
  { x: 550, y: 220 },
  { x: 100, y: 370 },
  { x: 250, y: 370 },
  { x: 400, y: 370 },
  { x: 550, y: 370 },
]

const MEETING_SPOTS = [
  { x: 330, y: 155 },
  { x: 175, y: 295 },
  { x: 475, y: 295 },
]

interface SpritePos {
  x: number; y: number
  targetX: number; targetY: number
  facing: 'left' | 'right'
  meetingWith: string | null
}

function PixelSprite({ colors, status, facing, name, seated }: {
  colors: typeof SPRITE_PALETTES[0]; status: AgentStatus; facing: 'left' | 'right'; name: string; seated: boolean
}) {
  const statusColor = STATUS_COLORS[status]
  const isOffline = status === 'offline'
  return (
    <div className={`pixel-sprite ${facing} ${seated ? 'seated' : 'standing'}`} style={{ opacity: isOffline ? 0.3 : 1 }}>
      <div className="sprite-status-bubble" style={{ background: statusColor }}>
        {status === 'working' && <span className="sprite-status-icon">...</span>}
        {status === 'thinking' && <span className="sprite-status-icon">?</span>}
        {status === 'error' && <span className="sprite-status-icon">!</span>}
      </div>
      <div className="sprite-head">
        <div className="sprite-hair" style={{ background: colors.hair }} />
        {seated ? (
          /* Seated: facing screen, show back of head (hair only) */
          <div className="sprite-face" style={{ background: colors.hair, borderRadius: '0 0 3px 3px' }} />
        ) : (
          /* Standing: facing us, show face with eyes */
          <div className="sprite-face" style={{ background: colors.skin }}>
            <div className="sprite-eye sprite-eye-l" />
            <div className="sprite-eye sprite-eye-r" />
          </div>
        )}
      </div>
      <div className="sprite-body" style={{ background: colors.shirt }}>
        <div className="sprite-arm sprite-arm-l" style={{ background: colors.skin }} />
        <div className="sprite-arm sprite-arm-r" style={{ background: colors.skin }} />
      </div>
      {seated ? (
        /* Seated: legs bent forward */
        <div className="sprite-legs-seated">
          <div className="sprite-leg-seated" style={{ background: '#2a2a4a' }} />
          <div className="sprite-leg-seated" style={{ background: '#2a2a4a' }} />
        </div>
      ) : (
        /* Standing: normal legs */
        <div className="sprite-legs">
          <div className="sprite-leg" style={{ background: '#2a2a4a' }} />
          <div className="sprite-leg" style={{ background: '#2a2a4a' }} />
        </div>
      )}
      <div className="sprite-name">{name}</div>
    </div>
  )
}

// Workstation: desk + monitor + chair as one unit
function Workstation({ x, y, monitorOn }: { x: number; y: number; monitorOn: boolean }) {
  return (
    <div className="pixel-workstation" style={{ left: x - 50, top: y }}>
      {/* Monitor on desk */}
      <div className="ws-monitor">
        <div className="ws-monitor-frame">
          <div className="ws-monitor-screen" style={{
            background: monitorOn ? '#3ade68' : '#1a1a2a',
            boxShadow: monitorOn ? '0 0 6px #3ade68' : 'none',
          }} />
        </div>
        <div className="ws-monitor-stand" />
      </div>
      {/* Desk surface */}
      <div className="ws-desk">
        {/* Keyboard */}
        <div className="ws-keyboard" />
        {/* Coffee mug */}
        <div className="ws-mug" />
      </div>
      {/* Desk legs */}
      <div className="ws-desk-leg ws-desk-leg-l" />
      <div className="ws-desk-leg ws-desk-leg-r" />
      {/* Chair */}
      <div className="ws-chair">
        <div className="ws-chair-back" />
        <div className="ws-chair-seat" />
        <div className="ws-chair-leg" />
      </div>
    </div>
  )
}

export function Office3D({ agents }: { agents: Agent[] }) {
  const displayAgents = agents.slice(0, 8)
  const [positions, setPositions] = useState<Map<string, SpritePos>>(new Map())
  const prevAgentsRef = useRef<Agent[]>([])

  useEffect(() => {
    setPositions(prev => {
      const next = new Map(prev)
      displayAgents.forEach((agent, i) => {
        const ws = WORKSTATIONS[i] || WORKSTATIONS[0]
        // Sprite sits behind desk (above it visually = lower y)
        const seatX = ws.x
        const seatY = ws.y - 20
        const existing = prev.get(agent.id)
        const prevAgent = prevAgentsRef.current.find(a => a.id === agent.id)
        const statusChanged = prevAgent && prevAgent.status !== agent.status

        if (!existing) {
          next.set(agent.id, {
            x: seatX, y: seatY, targetX: seatX, targetY: seatY,
            facing: 'right', meetingWith: null,
          })
        } else if (statusChanged && agent.status === 'working' && agent.currentTask) {
          const partnerIdx = displayAgents.findIndex(
            (a, j) => j !== i && a.status === 'working' && a.currentTask
          )
          if (partnerIdx >= 0 && Math.random() > 0.4) {
            const spot = MEETING_SPOTS[Math.floor(Math.random() * MEETING_SPOTS.length)]
            const offset = i < partnerIdx ? -25 : 25
            next.set(agent.id, {
              ...existing,
              targetX: spot.x + offset, targetY: spot.y,
              facing: offset < 0 ? 'right' : 'left',
              meetingWith: displayAgents[partnerIdx].id,
            })
          }
        } else if (statusChanged && (agent.status === 'idle' || agent.status === 'offline')) {
          next.set(agent.id, {
            ...existing,
            targetX: seatX, targetY: seatY,
            facing: 'right', meetingWith: null,
          })
        }
      })
      prevAgentsRef.current = [...displayAgents]
      return next
    })
  }, [displayAgents.map(a => `${a.id}:${a.status}`).join(',')])

  useEffect(() => {
    const interval = setInterval(() => {
      setPositions(prev => {
        const next = new Map(prev)
        let changed = false
        for (const [id, pos] of next) {
          const dx = pos.targetX - pos.x
          const dy = pos.targetY - pos.y
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            changed = true
            next.set(id, {
              ...pos,
              x: pos.x + dx * 0.08,
              y: pos.y + dy * 0.08,
              facing: dx > 0 ? 'right' : dx < 0 ? 'left' : pos.facing,
            })
          }
        }
        return changed ? next : prev
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const chatPairs = useMemo(() => {
    const pairs: Array<{ from: string; to: string }> = []
    const seen = new Set<string>()
    for (const [id, pos] of positions) {
      if (pos.meetingWith && !seen.has(id) && !seen.has(pos.meetingWith)) {
        pairs.push({ from: id, to: pos.meetingWith })
        seen.add(id)
        seen.add(pos.meetingWith)
      }
    }
    return pairs
  }, [positions])

  if (displayAgents.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>
        No agents connected - office is empty
      </div>
    )
  }

  return (
    <div className="pixel-office">
      {/* Wall background */}
      <div className="office-wall">
        <div className="wall-stripe wall-stripe-1" />
        <div className="wall-stripe wall-stripe-2" />
        <div className="wall-stripe wall-stripe-3" />
      </div>

      {/* Floor */}
      <div className="office-floor-tiles" />

      {/* Wall decorations */}
      <div className="pixel-window" style={{ left: 40, top: 40 }}>
        <div className="window-frame"><div className="window-glass"><div className="window-glare" /></div></div>
      </div>
      <div className="pixel-window" style={{ left: 260, top: 40 }}>
        <div className="window-frame"><div className="window-glass"><div className="window-glare" /></div></div>
      </div>
      <div className="pixel-window" style={{ left: 480, top: 40 }}>
        <div className="window-frame"><div className="window-glass"><div className="window-glare" /></div></div>
      </div>

      {/* Wall shelf / picture */}
      <div className="wall-picture" style={{ left: 160, top: 55 }}>
        <div className="wall-picture-frame">
          <div className="wall-picture-art" />
        </div>
      </div>
      <div className="wall-picture" style={{ left: 390, top: 55 }}>
        <div className="wall-picture-frame">
          <div className="wall-picture-art wall-picture-art-2" />
        </div>
      </div>

      {/* Plants */}
      <div className="pixel-plant" style={{ left: 20, top: 155 }}>
        <div className="plant-leaves" /><div className="plant-leaves plant-leaves-2" /><div className="plant-pot" />
      </div>
      <div className="pixel-plant" style={{ left: 650, top: 155 }}>
        <div className="plant-leaves" /><div className="plant-leaves plant-leaves-2" /><div className="plant-pot" />
      </div>
      <div className="pixel-plant" style={{ left: 20, top: 310 }}>
        <div className="plant-leaves" /><div className="plant-leaves plant-leaves-2" /><div className="plant-pot" />
      </div>
      <div className="pixel-plant" style={{ left: 650, top: 310 }}>
        <div className="plant-leaves" /><div className="plant-leaves plant-leaves-2" /><div className="plant-pot" />
      </div>

      {/* Water cooler */}
      <div className="pixel-cooler" style={{ left: 330, top: 130 }}>
        <div className="cooler-bottle" /><div className="cooler-base" />
      </div>

      {/* Workstations (desk + monitor + chair) */}
      {WORKSTATIONS.slice(0, displayAgents.length).map((ws, i) => (
        <Workstation
          key={i}
          x={ws.x}
          y={ws.y}
          monitorOn={displayAgents[i]?.status === 'working' || displayAgents[i]?.status === 'thinking'}
        />
      ))}

      {/* Agent sprites */}
      {displayAgents.map((agent, i) => {
        const pos = positions.get(agent.id)
        if (!pos) return null
        const isMoving = Math.abs(pos.targetX - pos.x) > 2 || Math.abs(pos.targetY - pos.y) > 2
        const isSeated = !isMoving && !pos.meetingWith
        // Seated: sprite sits on chair (chair is at ws.y+46, sprite ~32px tall)
        // Standing: sprite stands above ground level
        const topOffset = isSeated ? 18 : -40
        return (
          <div
            key={agent.id}
            className={`sprite-container ${isMoving ? 'walking' : ''}`}
            style={{ left: pos.x - 14, top: pos.y + topOffset, zIndex: Math.floor(pos.y) + 1 }}
          >
            <PixelSprite
              colors={SPRITE_PALETTES[i % SPRITE_PALETTES.length]}
              status={agent.status}
              facing={pos.facing}
              name={agent.name.split(/(?=[A-Z])/).join(' ')}
              seated={isSeated}
            />
          </div>
        )
      })}

      {/* Chat bubbles */}
      {chatPairs.map(({ from, to }) => {
        const posA = positions.get(from)
        const posB = positions.get(to)
        if (!posA || !posB) return null
        const midX = (posA.x + posB.x) / 2
        const midY = Math.min(posA.y, posB.y) - 50
        return (
          <div key={`chat-${from}-${to}`} className="chat-bubble" style={{ left: midX, top: midY }}>
            <span className="chat-dots"><span>.</span><span>.</span><span>.</span></span>
          </div>
        )
      })}
    </div>
  )
}
