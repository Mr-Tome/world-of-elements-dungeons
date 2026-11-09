// Card definitions, rarity scale, drop rolls and pixel-art card icons.

export const RARITIES = [
  { id: 'common', name: 'Common', color: '#a3aab2', mult: 1.0, weight: 60 },
  { id: 'uncommon', name: 'Uncommon', color: '#4cc85a', mult: 1.2, weight: 26 },
  { id: 'rare', name: 'Rare', color: '#3d8bff', mult: 1.45, weight: 10 },
  { id: 'unique', name: 'Unique', color: '#b455ff', mult: 1.75, weight: 3.4 },
  { id: 'mythical', name: 'Mythical', color: '#ffb81f', mult: 2.2, weight: 0.6 },
];
export const RARITY_INDEX = Object.fromEntries(RARITIES.map((r, i) => [r.id, i]));
export const rarityOf = (id) => RARITIES[RARITY_INDEX[id]];

export const CARD_TYPES = [
  { id: 'hero', name: 'Hero' },
  { id: 'melee', name: 'Melee' },
  { id: 'ranged', name: 'Ranged' },
  { id: 'armor', name: 'Armor' },
  { id: 'skin', name: 'Skin' },
  { id: 'pet', name: 'Pet' },
];

export const ELEMENTS = {
  none: { name: 'Neutral', color: '#c9ced6', a: '#c0c6cc', b: '#ffffff', c: '#8a5a30' },
  fire: { name: 'Fire', color: '#ff6a2a', a: '#ff6a1a', b: '#ffd23f', c: '#7a2a10' },
  water: { name: 'Water', color: '#33b5ff', a: '#2fa8ff', b: '#c8f2ff', c: '#1a5a8a' },
  jungle: { name: 'Jungle', color: '#4fd23a', a: '#4fc03a', b: '#d2ff9a', c: '#6b4a2a' },
  sky: { name: 'Sky', color: '#ffd84a', a: '#ffe066', b: '#ffffff', c: '#7fb2ff' },
};
// Each element is extra strong (+50% damage) against enemies of one realm
export const STRONG_VS = { water: 'fire', fire: 'jungle', jungle: 'sky', sky: 'water' };

// ---------------------------------------------------------------- definitions
export const CARD_DEFS = {
  // Heroes: each gives a special ability
  wanderer: { type: 'hero', name: 'Wanderer', element: 'none', icon: 'hero', ability: 'dash', cd: 5, hp: 0, speed: 0,
    desc: 'Dash: zoom forward and slash enemies in your path.' },
  emberKnight: { type: 'hero', name: 'Ember Knight', element: 'fire', icon: 'hero', ability: 'flameBurst', cd: 9, hp: 4, speed: 0,
    desc: 'Flame Burst: a ring of fire burns everything around you.' },
  tideCaller: { type: 'hero', name: 'Tide Caller', element: 'water', icon: 'hero', ability: 'healingWave', cd: 14, hp: 2, speed: 0,
    desc: 'Healing Wave: heals you and your partner and pushes enemies away.' },
  vineWarden: { type: 'hero', name: 'Vine Warden', element: 'jungle', icon: 'hero', ability: 'rootSnare', cd: 12, hp: 3, speed: 0,
    desc: 'Root Snare: roots nearby enemies in place and poisons them.' },
  skyRanger: { type: 'hero', name: 'Sky Ranger', element: 'sky', icon: 'hero', ability: 'galeLeap', cd: 6, hp: 0, speed: 0.6,
    desc: 'Gale Leap: launch high into the air and glide forward.' },
  shadowRogue: { type: 'hero', name: 'Shadow Rogue', element: 'none', icon: 'hero', ability: 'vanish', cd: 15, hp: 0, speed: 0.4,
    desc: 'Vanish: turn invisible; your next melee hit does triple damage.' },

  // Melee weapons
  woodSword: { type: 'melee', name: 'Wooden Sword', element: 'none', icon: 'sword', dmg: 4, cd: 0.45, reach: 2.7, desc: 'A trusty starter sword.' },
  twinDaggers: { type: 'melee', name: 'Twin Daggers', element: 'none', icon: 'sword', dmg: 2.4, cd: 0.22, reach: 2.3, desc: 'Super fast stabs.' },
  flameBlade: { type: 'melee', name: 'Flame Blade', element: 'fire', icon: 'sword', dmg: 5, cd: 0.5, reach: 2.8, effect: 'burn', desc: 'Sets enemies on fire.' },
  coralTrident: { type: 'melee', name: 'Coral Trident', element: 'water', icon: 'trident', dmg: 4.5, cd: 0.6, reach: 3.8, effect: 'slow', desc: 'Long reach. Slows enemies.' },
  thornAxe: { type: 'melee', name: 'Thorn Axe', element: 'jungle', icon: 'axe', dmg: 7, cd: 0.8, reach: 2.7, effect: 'poison', desc: 'Heavy chops that poison.' },
  stormHammer: { type: 'melee', name: 'Storm Hammer', element: 'sky', icon: 'hammer', dmg: 9, cd: 1.0, reach: 2.9, effect: 'knockback', desc: 'Smashes enemies far away.' },

  // Ranged weapons
  shortBow: { type: 'ranged', name: 'Short Bow', element: 'none', icon: 'bow', dmg: 3, cd: 0.7, speed: 32, count: 1, desc: 'A simple bow.' },
  emberCrossbow: { type: 'ranged', name: 'Ember Crossbow', element: 'fire', icon: 'bow', dmg: 5.5, cd: 1.0, speed: 40, count: 1, effect: 'burn', desc: 'Flaming bolts that burn.' },
  bubbleBlaster: { type: 'ranged', name: 'Bubble Blaster', element: 'water', icon: 'blaster', dmg: 2, cd: 0.3, speed: 22, count: 1, effect: 'slow', desc: 'Rapid bubbles that slow.' },
  seedSling: { type: 'ranged', name: 'Seed Sling', element: 'jungle', icon: 'bow', dmg: 2.2, cd: 0.8, speed: 28, count: 3, effect: 'poison', desc: 'Fires 3 poison seeds at once.' },
  lightningStaff: { type: 'ranged', name: 'Lightning Staff', element: 'sky', icon: 'staff', dmg: 4, cd: 0.9, speed: 48, count: 1, effect: 'shock', desc: 'Lightning jumps to nearby enemies.' },

  // Armor
  leatherTunic: { type: 'armor', name: 'Leather Tunic', element: 'none', icon: 'armor', hp: 4, reduce: 0.05, desc: 'Basic protection.' },
  knightPlate: { type: 'armor', name: 'Knight Plate', element: 'none', icon: 'armor', hp: 12, reduce: 0.22, special: 'heavy', desc: 'Very tough, but a bit slow.' },
  magmaPlate: { type: 'armor', name: 'Magma Plate', element: 'fire', icon: 'armor', hp: 8, reduce: 0.15, special: 'lavaproof', desc: 'Walk through lava unharmed.' },
  scaleMail: { type: 'armor', name: 'Scale Mail', element: 'water', icon: 'armor', hp: 6, reduce: 0.1, special: 'swim', desc: 'Swim twice as fast.' },
  leafGuard: { type: 'armor', name: 'Leaf Guard', element: 'jungle', icon: 'armor', hp: 5, reduce: 0.08, special: 'regen', desc: 'Slowly heals you over time.' },
  cloudRobe: { type: 'armor', name: 'Cloud Robe', element: 'sky', icon: 'armor', hp: 3, reduce: 0.06, special: 'feather', desc: 'Float down gently and move faster.' },

  // Skins (looks only)
  explorer: { type: 'skin', name: 'Explorer', element: 'none', icon: 'face', colors: { skin: '#e8b88a', hair: '#5a3a1a', shirt: '#2e8fd8', pants: '#2b3a8a', accent: '#ffcc33' }, desc: 'Ready for adventure.' },
  lavaLord: { type: 'skin', name: 'Lava Lord', element: 'fire', icon: 'face', colors: { skin: '#3a2a2a', hair: '#ff5a10', shirt: '#b0280f', pants: '#2a1010', accent: '#ffb020' }, desc: 'Hot hot hot.' },
  deepDiver: { type: 'skin', name: 'Deep Diver', element: 'water', icon: 'face', colors: { skin: '#f0c8a0', hair: '#1a3a6a', shirt: '#1fb0c0', pants: '#104a6a', accent: '#ffe066' }, desc: 'Made for the deep blue.' },
  jungleScout: { type: 'skin', name: 'Jungle Scout', element: 'jungle', icon: 'face', colors: { skin: '#b07a50', hair: '#2a1a0a', shirt: '#4a8a2a', pants: '#5a4020', accent: '#d0ff60' }, desc: 'Blends into the leaves.' },
  cloudWalker: { type: 'skin', name: 'Cloud Walker', element: 'sky', icon: 'face', colors: { skin: '#ffe0c8', hair: '#ffffff', shirt: '#cfe8ff', pants: '#7fb2ff', accent: '#ffd84a' }, desc: 'Light as a feather.' },
  shadowNinja: { type: 'skin', name: 'Shadow Ninja', element: 'none', icon: 'face', colors: { skin: '#d8a880', hair: '#111111', shirt: '#222230', pants: '#111118', accent: '#c02040' }, desc: 'Silent and sneaky.' },
  goldenHero: { type: 'skin', name: 'Golden Hero', element: 'none', icon: 'face', colors: { skin: '#f0c890', hair: '#ffcc22', shirt: '#ffd23f', pants: '#c89a10', accent: '#ffffff' }, desc: 'Shiny from head to toe.' },

  // Pets: follow you and help
  pebblePup: { type: 'pet', name: 'Pebble Pup', element: 'none', icon: 'pet', kind: 'bite', dmg: 1.5, cd: 1.2, fly: false, color: '#9a9a9a', desc: 'A loyal rocky puppy that bites enemies.' },
  fireFox: { type: 'pet', name: 'Fire Fox', element: 'fire', icon: 'pet', kind: 'bite', dmg: 2, cd: 1.1, fly: false, effect: 'burn', color: '#ff7a20', desc: 'Bites and burns enemies.' },
  bubbleTurtle: { type: 'pet', name: 'Bubble Turtle', element: 'water', icon: 'pet', kind: 'heal', heal: 2, cd: 6, fly: false, color: '#3ac0a0', desc: 'Heals you every few seconds.' },
  jungleParrot: { type: 'pet', name: 'Jungle Parrot', element: 'jungle', icon: 'pet', kind: 'shoot', dmg: 1.6, cd: 1.0, fly: true, color: '#30d040', desc: 'Flies around shooting seeds.' },
  cloudBunny: { type: 'pet', name: 'Cloud Bunny', element: 'sky', icon: 'pet', kind: 'boost', boost: 0.15, cd: 0, fly: false, color: '#f4f8ff', desc: 'Makes you run faster.' },
  babyDragon: { type: 'pet', name: 'Baby Dragon', element: 'fire', icon: 'pet', kind: 'shoot', dmg: 4, cd: 1.6, fly: true, effect: 'burn', color: '#b03aff', desc: 'Breathes fireballs at enemies!' },
};

export const STARTER_LOADOUT = {
  hero: { def: 'wanderer', rarity: 'common' },
  melee: { def: 'woodSword', rarity: 'common' },
  ranged: { def: 'shortBow', rarity: 'common' },
  armor: { def: 'leatherTunic', rarity: 'common' },
  skin: { def: 'explorer', rarity: 'common' },
  pet: { def: 'pebblePup', rarity: 'common' },
};
export const STARTER_LOADOUT_P2 = { ...STARTER_LOADOUT, skin: { def: 'shadowNinja', rarity: 'common' } };

export const cardKey = (c) => `${c.def}|${c.rarity}`;
export const parseKey = (k) => { const [def, rarity] = k.split('|'); return { def, rarity }; };

// Stats of a card after applying its rarity multiplier
export function cardStats(card) {
  const d = CARD_DEFS[card.def];
  const m = rarityOf(card.rarity).mult;
  const r = RARITY_INDEX[card.rarity];
  switch (d.type) {
    case 'hero': return { ability: d.ability, cd: d.cd * (1 - r * 0.07), power: m, hp: Math.round(d.hp * m), speed: d.speed };
    case 'melee': return { dmg: +(d.dmg * m).toFixed(1), cd: d.cd, reach: d.reach, effect: d.effect, element: d.element };
    case 'ranged': return { dmg: +(d.dmg * m).toFixed(1), cd: d.cd, speed: d.speed, count: d.count, effect: d.effect, element: d.element };
    case 'armor': return { hp: Math.round(d.hp * m), reduce: Math.min(0.5, +(d.reduce * m).toFixed(2)), special: d.special };
    case 'skin': return { colors: d.colors };
    case 'pet': return { kind: d.kind, dmg: +((d.dmg || 0) * m).toFixed(1), heal: +((d.heal || 0) * m).toFixed(1), cd: d.cd, boost: (d.boost || 0) * m, fly: d.fly, effect: d.effect, color: d.color };
  }
  return {};
}

// Human-readable stat lines for the backpack
export function statLines(card) {
  const d = CARD_DEFS[card.def];
  const s = cardStats(card);
  const lines = [];
  switch (d.type) {
    case 'hero':
      lines.push(['Ability cooldown', `${s.cd.toFixed(1)}s`], ['Power', `x${s.power.toFixed(2)}`]);
      if (s.hp) lines.push(['Bonus health', `+${s.hp}`]);
      if (s.speed) lines.push(['Bonus speed', `+${s.speed}`]);
      break;
    case 'melee':
      lines.push(['Damage', s.dmg], ['Swing time', `${s.cd}s`], ['Reach', s.reach]);
      if (s.effect) lines.push(['Effect', cap(s.effect)]);
      break;
    case 'ranged':
      lines.push(['Damage', s.count > 1 ? `${s.dmg} x${s.count}` : s.dmg], ['Reload', `${s.cd}s`]);
      if (s.effect) lines.push(['Effect', cap(s.effect)]);
      break;
    case 'armor':
      lines.push(['Bonus health', `+${s.hp}`], ['Damage blocked', `${Math.round(s.reduce * 100)}%`]);
      break;
    case 'skin':
      lines.push(['Style', 'Cosmetic']);
      break;
    case 'pet':
      if (s.kind === 'heal') lines.push(['Heals', `${s.heal} every ${s.cd}s`]);
      else if (s.kind === 'boost') lines.push(['Speed boost', `+${Math.round(s.boost * 100)}%`]);
      else lines.push(['Damage', s.dmg], ['Attack time', `${s.cd}s`]);
      if (s.effect) lines.push(['Effect', cap(s.effect)]);
      lines.push(['Moves by', s.fly ? 'Flying' : 'Walking']);
      break;
  }
  if (d.element !== 'none' && (d.type === 'melee' || d.type === 'ranged')) {
    lines.push(['Strong in', `${cap(STRONG_VS[d.element])} Realm`]);
  }
  return lines;
}
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------------------------------------------------------------- drops
// level = how many times this realm has been beaten (+1). minRarity forces at least that tier.
export function rollRarity(rng, level = 1, minRarity = 0) {
  const luck = Math.min(level - 1, 6) * 0.25;
  const weights = RARITIES.map((r, i) => (i < minRarity ? 0 : r.weight * (1 + luck * i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let x = rng() * total;
  for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x <= 0) return RARITIES[i].id; }
  return RARITIES[minRarity].id;
}

export function rollCard(rng, realmElement, level = 1, minRarity = 0) {
  const all = Object.keys(CARD_DEFS);
  let pool = all;
  if (rng() < 0.45) {
    const match = all.filter((k) => CARD_DEFS[k].element === realmElement);
    if (match.length) pool = match;
  }
  const def = pool[Math.floor(rng() * pool.length)];
  return { def, rarity: rollRarity(rng, level, minRarity) };
}

// ---------------------------------------------------------------- pixel icons
const ICONS = {
  sword: [
    '..........dd', '.........dbd', '........dbad', '.......dbad.', '......dbad..', '.....dbad...',
    '..d.dbad....', '..dddad.....', '...dcd......', '..dcdd......', '.dcd.dd.....', '.dd.........'],
  axe: [
    '............', '......dddd..', '.....dabbad.', '....dabaaaad', '.....daaaadd', '....dcdaad..',
    '...dcd.dd...', '..dcd.......', '.dcd........', 'dcd.........', 'dd..........', '............'],
  trident: [
    '..d..d..d...', '..a..a..a...', '..a..a..a...', '..aaaaaaa...', '.....b......', '.....c......',
    '.....c......', '.....c......', '.....c......', '.....c......', '.....c......', '.....d......'],
  hammer: [
    '..dddddddd..', '..daaaaaad..', '..dabbbbad..', '..daaaaaad..', '..dddccddd..', '.....cc.....',
    '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....', '.....dd.....', '............'],
  bow: [
    '....ddd.....', '...dc..e....', '..dc....e...', '.dc......e..', '.dc.......e.', '.dc..aaaabbd',
    '.dc.......e.', '.dc......e..', '..dc....e...', '...dc..e....', '....ddd.....', '............'],
  staff: [
    '.....bb.....', '....baab....', '...baaaab...', '....baab....', '.....bb.....', '.....dd.....',
    '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....', '.....cc.....', '.....dd.....'],
  blaster: [
    '............', '.......bb...', '......baab..', '.dddddd.bb..', 'dccccccd....', 'dcaaaaacd...',
    'dccccccd....', '.ddcd.dd....', '...cd.......', '...cd.......', '...dd.......', '............'],
  armor: [
    '..dd....dd..', '.daad..daad.', 'daaaaddaaaad', 'daabaaaabaad', '.dabaaaabad.', '..daaaaaad..',
    '..daaccaad..', '..daaccaad..', '..daaaaaad..', '..daaaaaad..', '...dddddd...', '............'],
  face: [
    '..dddddddd..', '.dccccccccd.', '.dceeeeeecd.', '.deeeeeeeed.', '.debbeebbed.', '.deeeeeeeed.',
    '.deeeaaeeed.', '.deeeeeeeed.', '..dddddddd..', '...daaaad...', '..daaaaaad..', '.daaaaaaaad.'],
  hero: [
    '......bb....', '.....bbb....', '...dddddd...', '..daaaaaad..', '.daaaaaaaad.', '.daddddddad.',
    '.dad.ee.dad.', '.dad.ee.dad.', '.daa.ee.aad.', '..daaaaaad..', '...dddddd...', '............'],
  pet: [
    '.dd......dd.', 'dad......dad', 'dacd....dcad', 'daaddddddaad', 'daaaaaaaaaad', 'daabaaaabaad',
    'daadaaaadaad', 'daaaaccaaaad', '.daaaddaaad.', '..daaaaaad..', '...dddddd...', '............'],
};

function iconPalette(card) {
  const d = CARD_DEFS[card.def];
  const el = ELEMENTS[d.element];
  const pal = { a: el.a, b: el.b, c: el.c, d: '#1a1420', e: '#e8b88a' };
  if (d.type === 'skin') Object.assign(pal, { a: d.colors.shirt, b: '#1a1420', c: d.colors.hair, e: d.colors.skin });
  if (d.type === 'pet') Object.assign(pal, { a: d.color, b: '#ffffff', c: '#ff8aa0' });
  if (d.type === 'melee' || d.type === 'ranged') { pal.e = el.b; if (d.element === 'none') pal.a = '#d8dde3'; }
  if (d.type === 'hero') pal.e = '#ffffff';
  if (card.def === 'woodSword') Object.assign(pal, { a: '#b88a50', b: '#e0b878', c: '#6b4a2a' });
  if (card.def === 'knightPlate') Object.assign(pal, { a: '#9aa4b0', b: '#e6ecf2' });
  if (card.def === 'shadowRogue') Object.assign(pal, { a: '#3a3a4a', b: '#c02040' });
  return pal;
}

const iconCache = new Map();
// Returns a data URL for the card's pixel-art icon
export function cardIcon(card) {
  const key = cardKey(card);
  if (iconCache.has(key)) return iconCache.get(key);
  const d = CARD_DEFS[card.def];
  const grid = ICONS[d.icon] || ICONS.sword;
  const pal = iconPalette(card);
  const c = document.createElement('canvas');
  c.width = 12; c.height = 12;
  const ctx = c.getContext('2d');
  grid.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = pal[ch] || '#ff00ff';
    ctx.fillRect(x, y, 1, 1);
  }));
  const url = c.toDataURL();
  iconCache.set(key, url);
  return url;
}
