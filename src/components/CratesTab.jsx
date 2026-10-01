import React, { useEffect, useState } from 'react'
import { CRATES, openCrate } from '../lib/crates.js'
import { CHARACTERS } from '../game/constants.js'
import { RARITY_META } from '../game/skinsCatalog.js'
import CharacterPose from './CharacterPose.jsx'
import { sfx } from '../game/sfx.js'

// Grid of crate cards + reveal overlay.
export default function CratesTab({ session, profile, progression, onProgressionRefresh }) {
  const uid = session?.user?.id
  const [busy, setBusy] = useState(null)
  const [reveal, setReveal] = useState(null)
  const [err, setErr] = useState('')
  const coins = progression?.progression?.coins || 0
  const isDev = !!profile?.is_dev

  const open = async (crate) => {
    if (!uid) return
    setBusy(crate.id); setErr('')
    const res = await openCrate(uid, crate.id, coins, !!profile?.is_dev)
    setBusy(null)
    if (!res.ok) { setErr(res.error || 'Open failed'); return }
    setReveal(res)
    sfx.match?.() || sfx.click?.()
    onProgressionRefresh && await onProgressionRefresh()
  }

  return (
    <div className="max-w-5xl mx-auto">
      {err && <div className="text-red-400 text-center mb-3">{err}</div>}
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
        {CRATES.map(c => {
          const canAfford = isDev || coins >= c.price
          return (
            <div key={c.id}
              className="rounded-2xl border-2 p-5 flex flex-col items-center shadow-lg h-full"
              style={{ borderColor: c.color, background: `radial-gradient(circle at 50% 20%, ${c.color}22, transparent 70%)` }}>
              <div className="text-5xl mb-2">🎁</div>
              <div className="text-xl font-black text-white">{c.name}</div>
              <div className="text-xs text-slate-300 mt-1 text-center">{c.tag}</div>

              {/* Odds table */}
              <div className="mt-3 w-full text-[10px] uppercase tracking-widest">
                {Object.entries(c.odds).map(([rarity, p]) => {
                  const meta = RARITY_META[rarity]
                  return (
                    <div key={rarity} className={`flex justify-between ${p === 0 ? 'opacity-30' : ''}`}>
                      <span style={{ color: meta.color }}>{meta.name}</span>
                      <span className="font-mono text-slate-200">{(p * 100).toFixed(1)}%</span>
                    </div>
                  )
                })}
              </div>

              <div className="flex-grow min-h-4" />
              <button
                onClick={() => open(c)}
                disabled={busy === c.id || !canAfford}
                className={`w-full px-3 py-2 rounded-lg font-bold text-white ${canAfford ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 opacity-60 cursor-not-allowed'}`}
              >
                {busy === c.id ? 'Opening…' : `🪙 ${c.price.toLocaleString()} — Open`}
              </button>
            </div>
          )
        })}
      </div>

      {reveal && <RevealOverlay result={reveal} onClose={() => setReveal(null)} />}
    </div>
  )
}

function RevealOverlay({ result, onClose }) {
  const [stage, setStage] = useState('spin') // 'spin' | 'show'
  const meta = RARITY_META[result.rarity]
  const char = CHARACTERS.find(c => c.id === result.skin.characterId)
  const previewChar = char ? { ...char, color: result.skin.color, accent: result.skin.accent } : null

  useEffect(() => {
    const t = setTimeout(() => setStage('show'), 1200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3" onClick={() => stage === 'show' && onClose()}>
      <div className="relative w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border-4 shadow-2xl p-6 overflow-hidden"
        style={{ borderColor: meta.color, boxShadow: `0 0 40px ${meta.color}88, 0 0 100px ${meta.color}44` }}
        onClick={(e) => e.stopPropagation()}>
        {stage === 'spin' ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-3 animate-spin">🎁</div>
            <div className="text-xl font-black text-white tracking-widest">Opening…</div>
            <div className="text-slate-400 text-xs mt-1">{result.crate.name}</div>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-xs uppercase tracking-widest font-black" style={{ color: meta.color, textShadow: `0 0 10px ${meta.color}` }}>{meta.name}</div>
            {previewChar && (
              <div className="my-3 flex items-end justify-center pose-hover mx-auto"
                style={{ background: `radial-gradient(circle at 50% 30%, ${result.skin.color}55, transparent 70%)`, width: 160, height: 200, borderRadius: 16 }}>
                <CharacterPose character={previewChar} size={110} />
              </div>
            )}
            <div className="text-3xl font-black text-white">{result.skin.name}</div>
            <div className="text-sm text-slate-300 mt-1">{char?.name || result.skin.characterId} skin</div>

            {result.duplicate ? (
              <div className="mt-4 p-3 rounded-lg bg-amber-900/40 border border-amber-400/50">
                <div className="text-amber-200 font-bold text-sm">Duplicate!</div>
                <div className="text-amber-100 text-xs">Refunded <span className="font-mono font-black">🪙 {result.refund.toLocaleString()}</span> coins.</div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-lg bg-emerald-900/50 border border-emerald-400/60 text-emerald-200 font-bold">
                ✓ Skin unlocked!
              </div>
            )}

            <button
              onClick={onClose}
              className="arcade-btn mt-5 w-full"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
