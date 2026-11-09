// Block types and the procedurally painted pixel texture atlas.
import * as THREE from '../vendor/three.module.min.js';
import { mulberry32 } from './noise.js';

export const B = {
  AIR: 0, STONE: 1, DIRT: 2, GRASS: 3, SAND: 4, WATER: 5, LAVA: 6, BASALT: 7,
  CINDER: 8, OBSIDIAN: 9, MAGMA: 10, LOG: 11, LEAVES: 12, CORAL_PINK: 13,
  CORAL_BLUE: 14, PRISMARINE: 15, CLOUD: 16, SKYSTONE: 17, SKYGRASS: 18,
  CRYSTAL: 19, BRICK: 20, GOLD: 21, MOSSY: 22, ASH: 23, JGRASS: 24, BEDROCK: 25,
};

// Tile indices in the atlas
const T = {
  stone: 0, dirt: 1, grassTop: 2, grassSide: 3, sand: 4, water: 5, lava: 6, basalt: 7,
  cinderTop: 8, cinderSide: 9, obsidian: 10, magma: 11, logSide: 12, logTop: 13, leaves: 14,
  coralPink: 15, coralBlue: 16, prismarine: 17, cloud: 18, skystone: 19, skygrassTop: 20,
  skygrassSide: 21, crystal: 22, brick: 23, gold: 24, mossy: 25, ash: 26, jgrassTop: 27,
  jgrassSide: 28, bedrock: 29,
};
const TILE = 16;
const COLS = 8;
const ROWS = 4;

// solid: blocks movement. opaque: hides neighbouring faces. liquid: swim/damage. glow: always fully lit.
export const BLOCKS = [];
function def(id, name, tiles, opts = {}) {
  const t = Array.isArray(tiles) ? tiles : [tiles, tiles, tiles];
  BLOCKS[id] = {
    id, name, tiles: t,
    solid: opts.solid ?? true,
    opaque: opts.opaque ?? true,
    liquid: opts.liquid ?? false,
    glow: opts.glow ?? false,
    damage: opts.damage ?? 0,
  };
}
def(B.AIR, 'air', 0, { solid: false, opaque: false });
def(B.STONE, 'stone', T.stone);
def(B.DIRT, 'dirt', T.dirt);
def(B.GRASS, 'grass', [T.grassTop, T.grassSide, T.dirt]);
def(B.SAND, 'sand', T.sand);
def(B.WATER, 'water', T.water, { solid: false, opaque: false, liquid: true });
def(B.LAVA, 'lava', T.lava, { solid: false, opaque: true, liquid: true, glow: true, damage: 4 });
def(B.BASALT, 'basalt', T.basalt);
def(B.CINDER, 'cinder', [T.cinderTop, T.cinderSide, T.basalt]);
def(B.OBSIDIAN, 'obsidian', T.obsidian);
def(B.MAGMA, 'magma', T.magma, { glow: true });
def(B.LOG, 'log', [T.logTop, T.logSide, T.logTop]);
def(B.LEAVES, 'leaves', T.leaves);
def(B.CORAL_PINK, 'pink coral', T.coralPink);
def(B.CORAL_BLUE, 'blue coral', T.coralBlue);
def(B.PRISMARINE, 'prismarine', T.prismarine);
def(B.CLOUD, 'cloud', T.cloud);
def(B.SKYSTONE, 'skystone', T.skystone);
def(B.SKYGRASS, 'skygrass', [T.skygrassTop, T.skygrassSide, T.skystone]);
def(B.CRYSTAL, 'crystal', T.crystal, { glow: true });
def(B.BRICK, 'ancient brick', T.brick);
def(B.GOLD, 'gold', T.gold, { glow: true });
def(B.MOSSY, 'mossy stone', T.mossy);
def(B.ASH, 'ash', [T.ash, T.cinderSide, T.basalt]);
def(B.JGRASS, 'jungle grass', [T.jgrassTop, T.jgrassSide, T.dirt]);
def(B.BEDROCK, 'bedrock', T.bedrock);

export const SOLID = new Uint8Array(256);
export const OPAQUE = new Uint8Array(256);
export const LIQUID = new Uint8Array(256);
for (const b of BLOCKS) {
  if (!b) continue;
  SOLID[b.id] = b.solid ? 1 : 0;
  OPAQUE[b.id] = b.opaque ? 1 : 0;
  LIQUID[b.id] = b.liquid ? 1 : 0;
}

// UV rectangle of a tile: [u0, v0, u1, v1] (small inset prevents bleeding)
export function tileUV(tile) {
  const cx = tile % COLS, cy = Math.floor(tile / COLS);
  const e = 0.02 / TILE;
  const u0 = cx / COLS + e, u1 = (cx + 1) / COLS - e;
  const v1 = 1 - cy / ROWS - e, v0 = 1 - (cy + 1) / ROWS + e;
  return [u0, v0, u1, v1];
}

// ---------------- texture painting ----------------
function clamp255(v) { return Math.max(0, Math.min(255, Math.round(v))); }
function rgb(c, k = 0) { return `rgb(${clamp255(c[0] + k * 255)},${clamp255(c[1] + k * 255)},${clamp255(c[2] + k * 255)})`; }

function paintAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * TILE;
  canvas.height = ROWS * TILE;
  const ctx = canvas.getContext('2d');
  const rng = mulberry32(1234);
  const px = (ox, oy, x, y, c, k = 0) => { ctx.fillStyle = rgb(c, k); ctx.fillRect(ox + x, oy + y, 1, 1); };
  const noise = (ox, oy, c, v) => {
    for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) px(ox, oy, x, y, c, (rng() - 0.5) * v);
  };
  const specks = (ox, oy, c, n, v = 0) => {
    for (let i = 0; i < n; i++) px(ox, oy, Math.floor(rng() * TILE), Math.floor(rng() * TILE), c, (rng() - 0.5) * v);
  };
  const topStrip = (ox, oy, c, depth) => {
    for (let x = 0; x < TILE; x++) {
      const d = depth + Math.floor(rng() * 3);
      for (let y = 0; y < d; y++) px(ox, oy, x, y, c, (rng() - 0.5) * 0.15);
    }
  };
  const P = {
    [T.stone]: (o, p) => { noise(o, p, [125, 125, 128], 0.14); specks(o, p, [95, 95, 98], 18); },
    [T.dirt]: (o, p) => { noise(o, p, [134, 96, 67], 0.16); specks(o, p, [105, 75, 50], 14); },
    [T.grassTop]: (o, p) => { noise(o, p, [96, 162, 56], 0.18); specks(o, p, [120, 190, 70], 12); },
    [T.grassSide]: (o, p) => { noise(o, p, [134, 96, 67], 0.16); topStrip(o, p, [96, 162, 56], 3); },
    [T.sand]: (o, p) => { noise(o, p, [222, 208, 160], 0.08); specks(o, p, [200, 185, 140], 10); },
    [T.water]: (o, p) => {
      noise(o, p, [52, 112, 205], 0.06);
      for (let i = 0; i < 6; i++) { const y = Math.floor(rng() * TILE), x = Math.floor(rng() * 10); for (let k = 0; k < 5; k++) px(o, p, x + k, y, [120, 180, 240]); }
    },
    [T.lava]: (o, p) => {
      noise(o, p, [225, 85, 15], 0.1);
      for (let i = 0; i < 9; i++) { const x = Math.floor(rng() * 14), y = Math.floor(rng() * 14); ctx.fillStyle = rgb([255, 200, 40]); ctx.fillRect(o + x, p + y, 2 + Math.floor(rng() * 2), 2); }
    },
    [T.basalt]: (o, p) => {
      noise(o, p, [58, 54, 62], 0.08);
      for (let x = 0; x < TILE; x += 4) for (let y = 0; y < TILE; y++) px(o, p, x, y, [40, 37, 44]);
    },
    [T.cinderTop]: (o, p) => { noise(o, p, [105, 32, 30], 0.14); specks(o, p, [230, 110, 40], 3); },
    [T.cinderSide]: (o, p) => { noise(o, p, [80, 30, 30], 0.12); specks(o, p, [60, 22, 22], 20); },
    [T.obsidian]: (o, p) => { noise(o, p, [28, 18, 42], 0.06); specks(o, p, [90, 50, 140], 10); },
    [T.magma]: (o, p) => {
      noise(o, p, [70, 22, 12], 0.08);
      for (let i = 0; i < 4; i++) { let x = Math.floor(rng() * TILE), y = Math.floor(rng() * TILE); for (let k = 0; k < 10; k++) { px(o, p, x & 15, y & 15, [255, 120, 20], rng() * 0.2); x += rng() < 0.5 ? 1 : 0; y += rng() < 0.5 ? 1 : -1; } }
    },
    [T.logSide]: (o, p) => {
      for (let x = 0; x < TILE; x++) { const k = (x % 4 === 0) ? -0.12 : (rng() - 0.5) * 0.06; for (let y = 0; y < TILE; y++) px(o, p, x, y, [104, 78, 46], k + (rng() - 0.5) * 0.05); }
    },
    [T.logTop]: (o, p) => {
      for (let y = 0; y < TILE; y++) for (let x = 0; x < TILE; x++) { const d = Math.hypot(x - 7.5, y - 7.5); px(o, p, x, y, Math.floor(d) % 3 === 0 ? [120, 92, 55] : [160, 128, 80], (rng() - 0.5) * 0.05); }
    },
    [T.leaves]: (o, p) => { noise(o, p, [48, 122, 38], 0.22); specks(o, p, [25, 70, 20], 30); },
    [T.coralPink]: (o, p) => { noise(o, p, [232, 110, 152], 0.12); specks(o, p, [255, 170, 200], 16); },
    [T.coralBlue]: (o, p) => { noise(o, p, [70, 170, 225], 0.12); specks(o, p, [150, 220, 255], 16); },
    [T.prismarine]: (o, p) => {
      noise(o, p, [90, 160, 150], 0.12);
      for (let i = 0; i < TILE; i++) { px(o, p, i, 0, [60, 120, 115]); px(o, p, 0, i, [60, 120, 115]); px(o, p, i, 8, [60, 120, 115]); px(o, p, 8, i, [60, 120, 115]); }
    },
    [T.cloud]: (o, p) => { noise(o, p, [244, 247, 255], 0.04); specks(o, p, [220, 230, 245], 12); },
    [T.skystone]: (o, p) => { noise(o, p, [172, 182, 204], 0.1); specks(o, p, [140, 150, 180], 14); },
    [T.skygrassTop]: (o, p) => { noise(o, p, [140, 222, 182], 0.12); specks(o, p, [255, 240, 150], 5); },
    [T.skygrassSide]: (o, p) => { noise(o, p, [172, 182, 204], 0.1); topStrip(o, p, [140, 222, 182], 3); },
    [T.crystal]: (o, p) => {
      noise(o, p, [170, 95, 235], 0.12);
      for (let i = 0; i < 5; i++) { const x = Math.floor(rng() * 12); for (let y = 0; y < TILE; y++) if ((x + y) % 7 < 2) px(o, p, (x + y) & 15, y, [235, 200, 255]); }
    },
    [T.brick]: (o, p) => {
      noise(o, p, [152, 140, 118], 0.08);
      for (let y = 0; y < TILE; y += 4) for (let x = 0; x < TILE; x++) px(o, p, x, y, [100, 92, 76]);
      for (let y = 0; y < TILE; y++) { const off = (Math.floor(y / 4) % 2) * 4; px(o, p, (off) & 15, y, [100, 92, 76]); px(o, p, (off + 8) & 15, y, [100, 92, 76]); }
    },
    [T.gold]: (o, p) => { noise(o, p, [240, 196, 60], 0.08); specks(o, p, [255, 245, 180], 14); },
    [T.mossy]: (o, p) => { noise(o, p, [118, 122, 118], 0.14); for (let i = 0; i < 40; i++) px(o, p, Math.floor(rng() * TILE), Math.floor(rng() * TILE), [70, 130, 50], (rng() - 0.5) * 0.2); },
    [T.ash]: (o, p) => { noise(o, p, [150, 144, 140], 0.1); specks(o, p, [200, 90, 50], 4); },
    [T.jgrassTop]: (o, p) => { noise(o, p, [58, 140, 40], 0.2); specks(o, p, [90, 175, 55], 14); },
    [T.jgrassSide]: (o, p) => { noise(o, p, [120, 86, 58], 0.16); topStrip(o, p, [58, 140, 40], 4); },
    [T.bedrock]: (o, p) => { noise(o, p, [60, 60, 60], 0.3); },
  };
  for (const [tile, painter] of Object.entries(P)) {
    const t = Number(tile);
    painter((t % COLS) * TILE, Math.floor(t / COLS) * TILE);
  }
  return canvas;
}

let atlasTexture = null;
export function getAtlas() {
  if (atlasTexture) return atlasTexture;
  const tex = new THREE.CanvasTexture(paintAtlas());
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  atlasTexture = tex;
  return tex;
}
