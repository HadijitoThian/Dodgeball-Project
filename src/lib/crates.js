// Crate library — probability tables + open helper.
// Odds sum to 1 per crate. Rolling picks a rarity, then a random skin of
// that rarity that the user doesn't own. If every skin of that rarity is
// already owned we downgrade one tier at a time; if the very rarest slot
// is empty for the roll, the crate refunds coins equal to that rarity.
import { supabase } from './supabase.js'
import { SHOP_SKINS, RARITY_PRICE, findShopSkin } from '../game/skinsCatalog.js'
import { loadOwnedSkins } from './skins.js'

export const CRATES = [
  {
    id: 'basic', name: 'Basic Crate', price: 500,
    color: '#94a3b8', accent: '#cbd5e1',
    tag: 'Common to Rare mostly',
    odds: { common: 0.62, rare: 0.28, epic: 0.08, legendary: 0.017, mythical: 0.003 },
  },
  {
    id: 'premium', name: 'Premium Crate', price: 1500,
    color: '#c084fc', accent: '#f0abfc',
    tag: 'Better shot at Epic + up',
    odds: { common: 0.20, rare: 0.45, epic: 0.25, legendary: 0.08, mythical: 0.02 },
  },
  {
    id: 'elite', name: 'Elite Crate', price: 3500,
    color: '#f472b6', accent: '#fbbf24',
    tag: 'Rare floor — big Legendary + Mythical odds',
    odds: { common: 0.00, rare: 0.20, epic: 0.55, legendary: 0.20, mythical: 0.05 },
  },
]

const RARITY_ORDER = ['mythical', 'legendary', 'epic', 'rare', 'common']

export function findCrate(id) { return CRATES.find(c => c.id === id) || null }

// Duplicate refund: fraction of that skin's coin-price back to the player.
export function duplicateRefund(rarity) {
  return Math.round((RARITY_PRICE[rarity] || 400) * 0.30)
}

function pickRarity(odds) {
  let r = Math.random()
  for (const rarity of RARITY_ORDER) {
    const p = odds[rarity] || 0
    if (r < p) return rarity
    r -= p
  }
  return 'common'
}

function pickSkinOfRarity(rarity, ownedSet) {
  const pool = SHOP_SKINS.filter(s => s.rarity === rarity)
  const unowned = pool.filter(s => !ownedSet.has(`${s.characterId}:${s.skinId}`))
  if (unowned.length) return { skin: unowned[Math.floor(Math.random() * unowned.length)], duplicate: false }
  if (pool.length)    return { skin: pool[Math.floor(Math.random() * pool.length)], duplicate: true }
  return null
}

// Open a crate. Deducts coins, rolls a skin, awards it (or refunds coins
// if it's a duplicate), records the event, and returns the full result.
export async function openCrate(userId, crateId, currentCoins) {
  if (!userId) return { ok: false, error: 'not signed in' }
  const crate = findCrate(crateId)
  if (!crate) return { ok: false, error: 'unknown crate' }
  if (currentCoins < crate.price) return { ok: false, error: `Need ${crate.price} coins` }

  // Load current owned so we can avoid dupes and downgrade cleanly.
  const ownedRows = await loadOwnedSkins(userId)
  const ownedSet = new Set(ownedRows.map(r => `${r.character_id}:${r.skin_id}`))

  // Roll rarity, then a skin from that rarity, downgrading if empty.
  let rolledRarity = pickRarity(crate.odds)
  let result = pickSkinOfRarity(rolledRarity, ownedSet)
  if (!result) {
    const idx = RARITY_ORDER.indexOf(rolledRarity)
    for (let i = idx + 1; i < RARITY_ORDER.length; i++) {
      rolledRarity = RARITY_ORDER[i]
      result = pickSkinOfRarity(rolledRarity, ownedSet)
      if (result) break
    }
  }
  if (!result) return { ok: false, error: 'nothing to roll — you own everything!' }

  const { skin, duplicate } = result
  const refund = duplicate ? duplicateRefund(rolledRarity) : 0
  const newCoins = currentCoins - crate.price + refund

  // Deduct price + refund at once.
  const { error: upErr } = await supabase.from('progression')
    .update({ coins: newCoins, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (upErr) return { ok: false, error: upErr.message }

  // Grant the skin only if it's new.
  if (!duplicate) {
    const { error: ownErr } = await supabase.from('owned_skins').insert({
      user_id: userId, character_id: skin.characterId, skin_id: skin.skinId,
      price_paid: crate.price,
    })
    if (ownErr) return { ok: false, error: ownErr.message }
  }

  await supabase.from('xp_events').insert({
    user_id: userId, reason: 'crate_open',
    xp: 0, coins: refund - crate.price,
    metadata: { crate: crateId, character_id: skin.characterId, skin_id: skin.skinId, rarity: rolledRarity, duplicate },
  })

  const freshOwned = await loadOwnedSkins(userId)
  return {
    ok: true,
    crate,
    skin,
    rarity: rolledRarity,
    duplicate,
    refund,
    newCoins,
    owned: freshOwned,
  }
}
