// Cosmetics shop — client side.
// Skins are grafted onto CHARACTERS.skins at runtime so every existing lookup
// path (character card swatches, engine makePlayer's `base.skins[i]`, etc.)
// picks them up without any refactor.
import { supabase } from './supabase.js'
import { CHARACTERS } from '../game/constants.js'
import { SHOP_SKINS, findShopSkin, RARITY_PRICE } from '../game/skinsCatalog.js'

// Snapshot the built-in skins list per character so we can reset when the
// user signs out or switches accounts.
const DEFAULT_SKINS = new Map(CHARACTERS.map(c => [c.id, (c.skins || []).slice()]))

function resetToDefaults() {
  for (const c of CHARACTERS) {
    const base = DEFAULT_SKINS.get(c.id)
    if (base) c.skins = base.slice()
  }
}

function applySkins(ownedRows) {
  resetToDefaults()
  for (const row of ownedRows) {
    const c = CHARACTERS.find(ch => ch.id === row.character_id)
    if (!c) continue
    const skin = findShopSkin(row.character_id, row.skin_id)
    if (!skin) continue
    // Skip if already added (e.g. name collision with a default)
    if (c.skins.some(s => s.name === skin.name)) continue
    c.skins = [...c.skins, { name: skin.name, color: skin.color, accent: skin.accent, shopSkinId: skin.skinId, rarity: skin.rarity }]
  }
}

export async function loadOwnedSkins(userId) {
  if (!userId) { resetToDefaults(); return [] }
  const { data } = await supabase
    .from('owned_skins')
    .select('character_id, skin_id')
    .eq('user_id', userId)
  const rows = data || []
  applySkins(rows)
  return rows
}

export function clearOwnedSkins() {
  resetToDefaults()
}

export function isOwned(ownedRows, characterId, skinId) {
  return (ownedRows || []).some(r => r.character_id === characterId && r.skin_id === skinId)
}

// Buy a shop skin. Deducts coins from progression, records ownership,
// and re-applies skins so the new one shows up immediately.
// Returns { ok, error, newCoins, newlyApplied }.
export async function buySkin(userId, characterId, skinId, currentCoins) {
  if (!userId) return { ok: false, error: 'not signed in' }
  const skin = findShopSkin(characterId, skinId)
  if (!skin) return { ok: false, error: 'unknown skin' }
  const price = RARITY_PRICE[skin.rarity] || 400
  if (currentCoins < price) return { ok: false, error: `Need ${price} coins` }

  const newCoins = currentCoins - price
  const { error: upErr } = await supabase.from('progression')
    .update({ coins: newCoins, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
  if (upErr) return { ok: false, error: upErr.message }

  const { error: ownErr } = await supabase.from('owned_skins').insert({
    user_id: userId, character_id: characterId, skin_id: skinId, price_paid: price,
  })
  if (ownErr) return { ok: false, error: ownErr.message }

  await supabase.from('xp_events').insert({
    user_id: userId, reason: 'buy_skin',
    xp: 0, coins: -price,
    metadata: { character_id: characterId, skin_id: skinId, rarity: skin.rarity },
  })

  // Re-fetch & re-apply owned skins so the new skin appears everywhere.
  const owned = await loadOwnedSkins(userId)
  return { ok: true, newCoins, owned }
}
