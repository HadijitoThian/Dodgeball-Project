import React, { useEffect, useRef, useState } from 'react'
import { CloudflareTransport } from '../net/cfTransport.js'
import { ARENA_W, ARENA_H, CHARACTERS, MAPS } from '../game/constants.js'
import { drawGame } from './OnlineMatch.jsx'
import { EMOTES, EMOTE_HOLD_MS } from '../game/emotes.js'
import { sfx } from '../game/sfx.js'

// Read-only spectator view of an ongoing online match. Reuses the same
// transport but connects with spectate=1 so the server never assigns a slot.
// Renders the lobby summary while the room is in lobby state, and the
// live gameplay canvas while the match is in progress.
export default function SpectateMatch({ joinCode, name = 'Spectator', onExit }) {
  const [screen, setScreen] = useState('connecting') // 'connecting' | 'lobby' | 'match' | 'ended' | 'error'
  const [error, setError] = useState('')
  const [lobby, setLobby] = useState(null)
  const [snap, setSnap] = useState(null)
  const [roster, setRoster] = useState([])
  const [chat, setChat] = useState([])
  const [emoteBySlot, setEmoteBySlot] = useState({})
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const [scale, setScale] = useState(1)
  const transportRef = useRef(null)

  useEffect(() => {
    if (!joinCode) return
    const t = new CloudflareTransport({ name })
    transportRef.current = t
    t.on('connected',   () => setScreen('lobby'))
    t.on('welcome',     () => {})
    t.on('roster',      (m) => setRoster(m.players))
    t.on('lobby',       (m) => setLobby(m))
    t.on('chat',        (m) => setChat(list => [...list.slice(-50), m]))
    t.on('emote',       (m) => {
      const until = Date.now() + EMOTE_HOLD_MS
      setEmoteBySlot(prev => ({ ...prev, [m.from]: { id: m.id, until } }))
      setTimeout(() => setEmoteBySlot(prev => (prev[m.from]?.until === until ? { ...prev, [m.from]: null } : prev)), EMOTE_HOLD_MS + 20)
    })
    t.on('matchStart',  () => setScreen('match'))
    t.on('state',       (m) => setSnap(m.snap))
    t.on('matchEnd',    () => setScreen('ended'))
    t.on('error',       () => { setError('Connection error'); setScreen('error') })
    t.on('disconnected', () => setScreen('error'))
    ;(async () => {
      try { await t.join(joinCode, { spectate: true }) }
      catch (e) { setError(e.message || 'Failed to spectate'); setScreen('error') }
    })()
    return () => { try { t.disconnect() } catch {} }
  }, [joinCode, name])

  useEffect(() => {
    const fit = () => {
      const el = wrapRef.current; if (!el) return
      const rect = el.getBoundingClientRect()
      setScale(Math.min(rect.width / ARENA_W, rect.height / ARENA_H))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [screen])

  useEffect(() => {
    if (screen !== 'match') return
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    let raf = 0
    const draw = () => {
      raf = requestAnimationFrame(draw)
      drawGame(ctx, snap, null)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [screen, snap])

  const leave = () => { try { transportRef.current?.disconnect() } catch {}; sfx.click?.(); onExit && onExit() }

  if (screen === 'connecting') {
    return <Shell title="CONNECTING…" subtitle={`Joining room ${joinCode} as spectator`} onExit={leave} />
  }
  if (screen === 'error') {
    return <Shell title="OFFLINE" subtitle={error || 'The match ended or nobody is in the room.'} onExit={leave} />
  }

  if (screen === 'match') {
    return (
      <div className="w-screen h-screen flex flex-col items-center justify-start text-white p-2">
        <div className="w-full max-w-6xl flex items-center justify-between mb-2 text-sm">
          <div className="uppercase tracking-widest text-amber-300">👀 Spectating <span className="font-mono text-cyan-300">{joinCode}</span></div>
          <div className="flex items-center gap-3">
            {snap && (
              <span>Round <span className="font-mono">{snap.round}</span> · Blue <span className="font-mono">{snap.roundsLeft}</span> — <span className="font-mono">{snap.roundsRight}</span> Red</span>
            )}
            <button onClick={leave} className="px-3 py-1 rounded bg-red-800 border border-red-500 text-xs">Leave</button>
          </div>
        </div>
        <div ref={wrapRef} className="relative" style={{ width: '100%', maxWidth: '100vw', height: '80vh' }}>
          <div style={{ width: ARENA_W * scale, height: ARENA_H * scale, position: 'relative', margin: '0 auto' }}>
            <canvas
              ref={canvasRef}
              width={ARENA_W}
              height={ARENA_H}
              style={{ width: ARENA_W * scale, height: ARENA_H * scale, background: '#000' }}
              className="rounded-xl border border-slate-700"
            />
            {snap && Object.entries(emoteBySlot).map(([slot, data]) => {
              if (!data || data.until < Date.now()) return null
              const emote = EMOTES.find(e => e.id === data.id)
              if (!emote) return null
              const rosterEntry = roster.find(r => r.slotIndex === Number(slot))
              if (!rosterEntry) return null
              const p = snap.players.find(pp => pp.side === rosterEntry.side && pp.sideSlot === rosterEntry.sideSlot)
              if (!p) return null
              const x = (p.x + 28) * scale
              const y = (p.y - 20) * scale
              return (
                <div key={slot} className="absolute pointer-events-none" style={{ left: x, top: y, transform: 'translate(-50%, -100%)' }}>
                  <div className="px-3 py-2 rounded-2xl bg-slate-950/90 border border-amber-400/70 shadow-2xl flex items-center gap-2 whitespace-nowrap">
                    <span className="text-2xl leading-none">{emote.emoji}</span>
                    <span className="text-xs font-bold text-amber-200">{emote.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="text-xs text-slate-400 mt-2">Spectator view — no input. Match state comes from the players' server.</div>
      </div>
    )
  }

  // lobby / ended
  return (
    <Shell title={screen === 'ended' ? 'MATCH ENDED' : 'IN LOBBY'} subtitle={`Room ${joinCode}`} onExit={leave}>
      <div className="max-w-2xl mx-auto space-y-3 mt-4">
        <div className="text-slate-400 text-sm text-center">{lobby?.state === 'lobby' ? 'Waiting for both fighters to ready up…' : 'The match is over.'}</div>
        {lobby?.slots?.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {lobby.slots.map((s) => {
              const char = s.character ? CHARACTERS.find(c => c.id === s.character) : null
              return (
                <div key={s.slotIndex} className="p-3 rounded-xl bg-slate-900/70 border border-slate-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center" style={{ background: char?.color || '#334155', borderColor: char?.accent || '#475569' }}>
                    <div className="text-white font-black">{(s.name || '?')[0]?.toUpperCase()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{s.name || '—'}</div>
                    <div className="text-xs text-slate-400">{char?.name || 'Choosing…'} · {s.ready ? '✅ Ready' : '⏳ Not ready'}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {lobby?.mapId && (
          <div className="text-sm text-slate-300 text-center">Map: <span className="font-bold text-cyan-300">{MAPS.find(m => m.id === lobby.mapId)?.name || lobby.mapId}</span></div>
        )}
        <div className="rounded-xl bg-slate-900/60 border border-slate-700 max-h-52 overflow-y-auto p-3 text-sm">
          <div className="text-xs uppercase tracking-widest text-amber-300 mb-1">Chat</div>
          {!chat.length && <div className="text-slate-500 italic text-xs">No messages yet.</div>}
          {chat.map((m, i) => (
            <div key={i}><span className="font-bold text-fuchsia-300">{m.name}:</span> <span className="text-slate-100">{m.text}</span></div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

function Shell({ title, subtitle, children, onExit }) {
  return (
    <div className="w-screen h-screen flex flex-col items-center justify-start text-white p-4">
      <h1 className="text-4xl md:text-5xl font-black mt-6 text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-300 text-center">{title}</h1>
      {subtitle && <div className="text-slate-300 mt-2 text-center">{subtitle}</div>}
      <div className="w-full">{children}</div>
      <button onClick={onExit} className="mt-6 px-4 py-2 rounded bg-slate-800 border border-slate-600 text-sm">← Back</button>
    </div>
  )
}
