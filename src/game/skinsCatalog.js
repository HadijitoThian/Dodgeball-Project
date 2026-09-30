// Shop skins catalog. Each entry adds an extra skin option on top of the
// three built-in skins for a character. Prices are in coins.
// Rarity: common (400), rare (800), epic (1600), legendary (3000).

export const SHOP_SKINS = [
  // BLAZE
  { characterId: 'blaze',   skinId: 'cyber',    name: 'Cyber',    color: '#0ea5e9', accent: '#f0abfc', rarity: 'common' },
  { characterId: 'blaze',   skinId: 'inferno',  name: 'Inferno',  color: '#450a0a', accent: '#facc15', rarity: 'rare' },
  { characterId: 'blaze',   skinId: 'gold',     name: 'Solar',    color: '#eab308', accent: '#fef2f2', rarity: 'epic' },
  // TANK
  { characterId: 'tank',    skinId: 'camo',     name: 'Camo',     color: '#4d7c0f', accent: '#a3e635', rarity: 'common' },
  { characterId: 'tank',    skinId: 'gold',     name: 'Golden',   color: '#d97706', accent: '#fef9c3', rarity: 'rare' },
  { characterId: 'tank',    skinId: 'neon',     name: 'Neon',     color: '#6b21a8', accent: '#e0f2fe', rarity: 'epic' },
  // NOVA
  { characterId: 'nova',    skinId: 'nebula',   name: 'Nebula',   color: '#1e1b4b', accent: '#c4b5fd', rarity: 'common' },
  { characterId: 'nova',    skinId: 'retro',    name: 'Retro',    color: '#db2777', accent: '#fef3c7', rarity: 'rare' },
  { characterId: 'nova',    skinId: 'aurora',   name: 'Aurora',   color: '#0d9488', accent: '#f0abfc', rarity: 'epic' },
  // GHOST
  { characterId: 'ghost',   skinId: 'shadow',   name: 'Shadow',   color: '#020617', accent: '#94a3b8', rarity: 'common' },
  { characterId: 'ghost',   skinId: 'ember',    name: 'Ember',    color: '#ea580c', accent: '#fed7aa', rarity: 'rare' },
  { characterId: 'ghost',   skinId: 'rainbow',  name: 'Prism',    color: '#a855f7', accent: '#fde047', rarity: 'epic' },
  // CRUSHER
  { characterId: 'crusher', skinId: 'toxic',    name: 'Toxic',    color: '#65a30d', accent: '#f0abfc', rarity: 'common' },
  { characterId: 'crusher', skinId: 'cobalt',   name: 'Cobalt',   color: '#1d4ed8', accent: '#fbbf24', rarity: 'rare' },
  { characterId: 'crusher', skinId: 'volcanic', name: 'Volcanic', color: '#7f1d1d', accent: '#f97316', rarity: 'epic' },
  // STRIKER
  { characterId: 'striker', skinId: 'royal',    name: 'Royal',    color: '#7e22ce', accent: '#fde047', rarity: 'common' },
  { characterId: 'striker', skinId: 'crimson',  name: 'Crimson',  color: '#b91c1c', accent: '#fef2f2', rarity: 'rare' },
  { characterId: 'striker', skinId: 'aqua',     name: 'Aqua',     color: '#0891b2', accent: '#fef9c3', rarity: 'epic' },
  // VOLT
  { characterId: 'volt',    skinId: 'ember',    name: 'Ember',    color: '#ea580c', accent: '#fed7aa', rarity: 'common' },
  { characterId: 'volt',    skinId: 'void',     name: 'Void',     color: '#0b0f1a', accent: '#a78bfa', rarity: 'rare' },
  { characterId: 'volt',    skinId: 'mint',     name: 'Mint',     color: '#059669', accent: '#a7f3d0', rarity: 'epic' },
  // RUBY
  { characterId: 'ruby',    skinId: 'slate',    name: 'Slate',    color: '#475569', accent: '#fce7f3', rarity: 'common' },
  { characterId: 'ruby',    skinId: 'gold',     name: 'Gilded',   color: '#ca8a04', accent: '#fef2f2', rarity: 'rare' },
  { characterId: 'ruby',    skinId: 'void',     name: 'Onyx',     color: '#020617', accent: '#f472b6', rarity: 'epic' },
  // BASTION
  { characterId: 'bastion', skinId: 'emerald',  name: 'Emerald',  color: '#065f46', accent: '#a7f3d0', rarity: 'common' },
  { characterId: 'bastion', skinId: 'crimson',  name: 'Crimson',  color: '#7f1d1d', accent: '#fecaca', rarity: 'rare' },
  { characterId: 'bastion', skinId: 'solar',    name: 'Solar',    color: '#f59e0b', accent: '#0f172a', rarity: 'epic' },

  // === LEGENDARY (crate-only) ===
  { characterId: 'blaze',   skinId: 'phoenix',       name: 'Phoenix',       color: '#dc2626', accent: '#fef3c7', rarity: 'legendary' },
  { characterId: 'tank',    skinId: 'titan',         name: 'Titan',         color: '#1e293b', accent: '#22d3ee', rarity: 'legendary' },
  { characterId: 'nova',    skinId: 'oracle',        name: 'Oracle',        color: '#4c1d95', accent: '#fde047', rarity: 'legendary' },
  { characterId: 'ghost',   skinId: 'wraith',        name: 'Wraith',        color: '#312e81', accent: '#22d3ee', rarity: 'legendary' },
  { characterId: 'crusher', skinId: 'obsidian',      name: 'Obsidian',      color: '#0f172a', accent: '#f97316', rarity: 'legendary' },
  { characterId: 'striker', skinId: 'thunderstrike', name: 'Thunderstrike', color: '#facc15', accent: '#7c3aed', rarity: 'legendary' },
  { characterId: 'volt',    skinId: 'plasma',        name: 'Plasma',        color: '#a855f7', accent: '#67e8f9', rarity: 'legendary' },
  { characterId: 'ruby',    skinId: 'seraph',        name: 'Seraph',        color: '#fce7f3', accent: '#ec4899', rarity: 'legendary' },
  { characterId: 'bastion', skinId: 'aegis',         name: 'Aegis',         color: '#0e7490', accent: '#fef3c7', rarity: 'legendary' },

  // === MYTHICAL (crate-only, ultra rare) ===
  { characterId: 'blaze',   skinId: 'cosmic',    name: 'Cosmic Blaze',    color: '#7c3aed', accent: '#facc15', rarity: 'mythical' },
  { characterId: 'tank',    skinId: 'colossus',  name: 'Colossus',        color: '#78716c', accent: '#dc2626', rarity: 'mythical' },
  { characterId: 'nova',    skinId: 'astral',    name: 'Astral Nova',     color: '#020617', accent: '#f0abfc', rarity: 'mythical' },
  { characterId: 'ghost',   skinId: 'reaper',    name: 'The Reaper',      color: '#000000', accent: '#a855f7', rarity: 'mythical' },
  { characterId: 'crusher', skinId: 'earth',     name: 'Earthshaker',     color: '#78350f', accent: '#facc15', rarity: 'mythical' },
  { characterId: 'striker', skinId: 'blitz',     name: 'Blitz Omega',     color: '#0f172a', accent: '#f472b6', rarity: 'mythical' },
  { characterId: 'volt',    skinId: 'quantum',   name: 'Quantum',         color: '#000000', accent: '#22d3ee', rarity: 'mythical' },
  { characterId: 'ruby',    skinId: 'divine',    name: 'Divine Ruby',     color: '#f472b6', accent: '#fef9c3', rarity: 'mythical' },
  { characterId: 'bastion', skinId: 'juggernaut',name: 'Juggernaut',      color: '#1c1917', accent: '#fbbf24', rarity: 'mythical' },
]

export const RARITY_PRICE = {
  common:    400,
  rare:      800,
  epic:      1600,
  legendary: 3000,
  mythical:  6000,
}
export const RARITY_META = {
  common:    { name: 'Common',    color: '#94a3b8' },
  rare:      { name: 'Rare',      color: '#38bdf8' },
  epic:      { name: 'Epic',      color: '#c084fc' },
  legendary: { name: 'Legendary', color: '#fbbf24' },
  mythical:  { name: 'Mythical',  color: '#f472b6' },
}

// Legendary and mythical skins are crate-only — hide them from the
// direct-buy shop grid.
export const CRATE_ONLY_RARITIES = new Set(['legendary', 'mythical'])

export function shopSkinsFor(characterId) {
  return SHOP_SKINS.filter(s => s.characterId === characterId)
}
export function findShopSkin(characterId, skinId) {
  return SHOP_SKINS.find(s => s.characterId === characterId && s.skinId === skinId) || null
}
