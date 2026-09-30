import React, { useEffect, useState } from 'react'
import { Screen } from './Menus.jsx'
import CharacterPose from './CharacterPose.jsx'
import { CHARACTERS } from '../game/constants.js'
import { SHOP_SKINS, RARITY_PRICE, RARITY_META } from '../game/skinsCatalog.js'
import { buySkin, isOwned, loadOwnedSkins } from '../lib/skins.js'
import { sfx } from '../game/sfx.js'

export default function ShopScreen({ session, progression, onProgressionRefresh, onBack }) {
  const uid = session?.user?.id
  const [owned, setOwned] = useState([])
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!uid) return
    loadOwnedSkins(uid).then(setOwned)
  }, [uid])

  const coins = progression?.progression?.coins || 0

  const doBuy = async (row) => {
    if (!uid) return
    setBusy(`${row.characterId}:${row.skinId}`); setErr('')
    const res = await buySkin(uid, row.characterId, row.skinId, coins)
    setBusy(null)
    if (!res.ok) { setErr(res.error || 'Purchase failed'); return }
    setOwned(res.owned || [])
    sfx.match?.() || sfx.click?.()
    onProgressionRefresh && await onProgressionRefresh()
  }

  const shown = filter === 'all'
    ? SHOP_SKINS
    : SHOP_SKINS.filter(s => s.characterId === filter)

  if (!uid) {
    return <Screen title="COSMETICS SHOP" onBack={onBack}>
      <div className="text-slate-300 text-center py-10">Sign in to buy skins.</div>
    </Screen>
  }

  return (
    <Screen title="COSMETICS SHOP" subtitle="Spend coins on extra character skins. Owned forever." onBack={onBack}>
      <div className="text-center text-lg mb-4">
        <span className="text-amber-300 font-black">🪙 {coins.toLocaleString()}</span>
        <span className="text-slate-400 text-sm ml-3">coins</span>
      </div>

      {err && <div className="text-red-400 text-center mb-3">{err}</div>}

      {/* Filter row */}
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <FilterBtn active={filter === 'all'} onClick={() => setFilter('all')}>All</FilterBtn>
        {CHARACTERS.map(c => (
          <FilterBtn key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            <span className="w-2 h-2 rounded-full inline-block mr-1" style={{ background: c.color }} />
            {c.name}
          </FilterBtn>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 max-w-5xl mx-auto">
        {shown.map(row => {
          const char = CHARACTERS.find(c => c.id === row.characterId)
          const bought = isOwned(owned, row.characterId, row.skinId)
          const price = RARITY_PRICE[row.rarity] || 400
          const rar = RARITY_META[row.rarity]
          const canAfford = coins >= price
          const previewChar = { ...char, color: row.color, accent: row.accent }
          return (
            <div key={`${row.characterId}:${row.skinId}`}
              className="rounded-2xl border-2 bg-slate-900/70 p-3 flex flex-col items-center relative shadow-lg"
              style={{ borderColor: rar?.color || '#475569' }}>
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: rar?.color || '#94a3b8' }}>{rar?.name || 'Common'}</div>
              <div className="w-full flex items-end justify-center rounded pose-hover"
                style={{ background: `radial-gradient(circle at 50% 30%, ${row.color}44, transparent 70%)`, height: 110 }}>
                <CharacterPose character={previewChar} size={78} />
              </div>
              <div className="text-lg font-black mt-2 leading-none">{row.name}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider">{char?.name || row.characterId}</div>

              {bought ? (
                <div className="mt-3 w-full px-3 py-2 rounded-lg bg-emerald-900/50 border border-emerald-400/60 text-emerald-200 text-sm text-center">
                  ✓ Owned
                </div>
              ) : (
                <button
                  onClick={() => doBuy(row)}
                  disabled={busy === `${row.characterId}:${row.skinId}` || !canAfford}
                  className={`mt-3 w-full px-3 py-2 rounded-lg font-bold text-white text-sm ${canAfford ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-700 opacity-60 cursor-not-allowed'}`}
                >
                  {busy === `${row.characterId}:${row.skinId}` ? 'Buying…' : `🪙 ${price.toLocaleString()}`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </Screen>
  )
}

function FilterBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center ${active ? 'bg-amber-500/20 border-amber-400 text-amber-100' : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'}`}>
      {children}
    </button>
  )
}
