// Realm definitions and their terrain generators.
import { B, LIQUID, SOLID } from './blocks.js';
import { World } from './world.js';
import { Noise2D, mulberry32 } from './noise.js';

export const WORLD_SIZE = 320; // blocks across (the realms are big!)
export const WORLD_HEIGHT = 64;
export const ARENA_R = 17;

export const REALMS = {
  fire: {
    id: 'fire', name: 'Fire Realm', element: 'fire',
    desc: 'Rivers of lava, black basalt peaks and obsidian spikes.',
    sky: 0x3b1410, fog: 0x6e2614, fogNear: 20, fogFar: 78,
    hemiSky: 0xffb08a, hemiGround: 0x401010, sun: 0xffd0a0,
    beacon: 0xff5a1a, mobs: [['magmaSlime', 3], ['fireImp', 2]], boss: 'magmaw',
    color: '#ff6a2a',
  },
  water: {
    id: 'water', name: 'Water Realm', element: 'water',
    desc: 'Sunny islands, coral reefs and sunken ruins.',
    sky: 0x7cc8ff, fog: 0xa6dcff, fogNear: 25, fogFar: 90,
    hemiSky: 0xd8f0ff, hemiGround: 0x335577, sun: 0xffffff,
    beacon: 0x33d0ff, mobs: [['crab', 3], ['jelly', 2]], boss: 'kraal',
    color: '#33b5ff',
  },
  jungle: {
    id: 'jungle', name: 'Jungle Realm', element: 'jungle',
    desc: 'Giant trees, winding rivers and creeping vines.',
    sky: 0x9fd6a8, fog: 0x86b882, fogNear: 18, fogFar: 72,
    hemiSky: 0xe6ffd0, hemiGround: 0x2a4a20, sun: 0xfff2cc,
    beacon: 0x6aff3a, mobs: [['vineCrawler', 3], ['thornShooter', 2]], boss: 'thornroot',
    color: '#4fd23a',
  },
  sky: {
    id: 'sky', name: 'Sky Realm', element: 'sky',
    desc: 'Floating islands joined by cloud bridges. Don\'t fall!',
    sky: 0xbfe4ff, fog: 0xe0f2ff, fogNear: 30, fogFar: 100,
    hemiSky: 0xffffff, hemiGround: 0x8899bb, sun: 0xfffbe0,
    beacon: 0xffe94a, mobs: [['wisp', 2], ['skyHawk', 2]], boss: 'stormwing',
    color: '#ffd84a',
  },
};
export const REALM_ORDER = ['fire', 'water', 'jungle', 'sky'];

const smooth = (t) => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;

export function generateRealm(realmId, seed) {
  const world = new World(WORLD_SIZE, WORLD_HEIGHT, WORLD_SIZE);
  const rng = mulberry32(seed);
  const noise = new Noise2D(seed);
  const noise2 = new Noise2D(seed * 7 + 3);
  const S = WORLD_SIZE;
  const spawn = { x: 28.5, z: 28.5 };
  const arena = { x: S - 42.5, z: S - 42.5 };
  let info;
  if (realmId === 'sky') info = genSky(world, rng, noise, spawn, arena);
  else info = genTerrain(world, realmId, rng, noise, noise2, spawn, arena);
  world.computeTops();
  spawn.y = info.spawnFloor;
  arena.y = info.arenaFloor;
  const mobSpawns = placeMobs(world, REALMS[realmId], rng, spawn, arena);
  return { world, spawn, arena, mobSpawns };
}

// ---------------------------------------------------------------- terrain realms
function genTerrain(world, realmId, rng, noise, noise2, spawn, arena) {
  const S = world.sx;
  const H = new Float32Array(S * S);
  let sea, liquid;
  let heightFn, paintFn;

  if (realmId === 'fire') {
    sea = 17; liquid = B.LAVA;
    heightFn = (x, z) => {
      const n = noise.fbm(x / 80, z / 80, 5);
      const r = noise.ridged(x / 60 + 100, z / 60, 4);
      return 20 + n * 12 + Math.pow(r, 3) * 24;
    };
    paintFn = (x, z, h) => {
      world.set(x, 0, z, B.BEDROCK);
      for (let y = 1; y < h - 1; y++) world.set(x, y, z, y < 6 && rng() < 0.3 ? B.OBSIDIAN : B.BASALT);
      const n = noise2.value(x / 18, z / 18);
      let top = n > 0.25 ? B.ASH : B.CINDER;
      if (rng() < 0.025) top = B.MAGMA;
      world.set(x, h - 1, z, top);
    };
  } else if (realmId === 'water') {
    sea = 22; liquid = B.WATER;
    heightFn = (x, z) => 15 + noise.fbm(x / 70, z / 70, 5) * 24;
    paintFn = (x, z, h) => {
      world.set(x, 0, z, B.BEDROCK);
      for (let y = 1; y < h; y++) world.set(x, y, z, y < h - 4 ? B.STONE : B.SAND);
      if (h > sea + 2) { world.set(x, h - 2, z, B.DIRT); world.set(x, h - 1, z, B.GRASS); }
      else if (h < sea - 3 && noise2.value(x / 9, z / 9) > 0.45) world.set(x, h - 1, z, B.PRISMARINE);
    };
  } else {
    sea = 18; liquid = B.WATER;
    heightFn = (x, z) => {
      let h = 21 + noise.fbm(x / 90, z / 90, 5) * 10 + Math.pow(noise.ridged(x / 70, z / 70 + 50, 3), 2) * 14;
      const rv = Math.abs(noise2.value(x / 110, z / 110));
      if (rv < 0.07) h = lerp(sea - 3, h, smooth(rv / 0.07));
      return h;
    };
    paintFn = (x, z, h) => {
      world.set(x, 0, z, B.BEDROCK);
      for (let y = 1; y < h; y++) world.set(x, y, z, y < h - 4 ? B.STONE : B.DIRT);
      if (h > sea) world.set(x, h - 1, z, B.JGRASS);
      else world.set(x, h - 1, z, rng() < 0.5 ? B.SAND : B.DIRT);
    };
  }

  for (let z = 0; z < S; z++) for (let x = 0; x < S; x++) H[z * S + x] = heightFn(x, z);

  // Islands along the path in the water realm so you can hop between them
  if (realmId === 'water') {
    for (let i = 1; i < 6; i++) {
      const t = i / 6;
      const px = lerp(spawn.x, arena.x, t) + (rng() - 0.5) * 60;
      const pz = lerp(spawn.z, arena.z, t) + (rng() - 0.5) * 60;
      raiseIsland(H, S, px, pz, 10 + rng() * 8, sea + 3 + rng() * 4);
    }
  }

  const avgNear = (cx, cz, r) => {
    let s = 0, n = 0;
    for (let dz = -r; dz <= r; dz += 2) for (let dx = -r; dx <= r; dx += 2) {
      const x = Math.floor(cx + dx), z = Math.floor(cz + dz);
      if (x >= 0 && z >= 0 && x < S && z < S) { s += H[z * S + x]; n++; }
    }
    return s / n;
  };
  const spawnH = Math.round(Math.max(sea + 2, avgNear(spawn.x, spawn.z, 8)));
  const arenaH = Math.round(Math.min(40, Math.max(sea + 3, avgNear(arena.x, arena.z, ARENA_R))));
  blendTo(H, S, spawn.x, spawn.z, 7, 20, spawnH);
  blendTo(H, S, arena.x, arena.z, ARENA_R + 3, ARENA_R + 18, arenaH);

  for (let z = 0; z < S; z++) {
    for (let x = 0; x < S; x++) {
      const h = Math.max(3, Math.min(world.sy - 12, Math.round(H[z * S + x])));
      paintFn(x, z, h);
      for (let y = h; y < sea; y++) world.set(x, y, z, liquid);
    }
  }

  const avoid = (x, z, pad = 0) =>
    Math.hypot(x - spawn.x, z - spawn.z) < 10 + pad || Math.hypot(x - arena.x, z - arena.z) < ARENA_R + 8 + pad;

  if (realmId === 'fire') decorateFire(world, rng, avoid, sea);
  if (realmId === 'water') decorateWater(world, rng, avoid, sea);
  if (realmId === 'jungle') decorateJungle(world, rng, avoid, sea);

  const accent = { fire: B.MAGMA, water: B.PRISMARINE, jungle: B.MOSSY }[realmId];
  buildArena(world, arena.x, arena.z, arenaH, ARENA_R, accent, false);
  buildSpawnPad(world, spawn.x, spawn.z, spawnH, accent);
  return { arenaFloor: arenaH, spawnFloor: spawnH };
}

function raiseIsland(H, S, cx, cz, r, top) {
  for (let z = Math.floor(cz - r * 1.6); z <= cz + r * 1.6; z++) {
    for (let x = Math.floor(cx - r * 1.6); x <= cx + r * 1.6; x++) {
      if (x < 0 || z < 0 || x >= S || z >= S) continue;
      const d = Math.hypot(x - cx, z - cz) / r;
      if (d > 1.6) continue;
      const target = d < 1 ? top : lerp(top, H[z * S + x], smooth((d - 1) / 0.6));
      H[z * S + x] = Math.max(H[z * S + x], target);
    }
  }
}

function blendTo(H, S, cx, cz, r0, r1, target) {
  for (let z = Math.floor(cz - r1); z <= cz + r1; z++) {
    for (let x = Math.floor(cx - r1); x <= cx + r1; x++) {
      if (x < 0 || z < 0 || x >= S || z >= S) continue;
      const d = Math.hypot(x - cx, z - cz);
      if (d >= r1) continue;
      const i = z * S + x;
      H[i] = d <= r0 ? target : lerp(target, H[i], smooth((d - r0) / (r1 - r0)));
    }
  }
}

function surfaceY(world, x, z) {
  // top of the topmost non-air block (including liquids) + 1
  for (let y = world.sy - 1; y >= 0; y--) if (world.get(x, y, z) !== B.AIR) return y + 1;
  return 0;
}

function decorateFire(world, rng, avoid, sea) {
  const S = world.sx;
  // obsidian spikes
  for (let i = 0; i < 90; i++) {
    const x = 6 + Math.floor(rng() * (S - 12)), z = 6 + Math.floor(rng() * (S - 12));
    if (avoid(x, z, 3)) continue;
    const base = surfaceY(world, x, z);
    const h = 4 + Math.floor(rng() * 9);
    const r = 1 + Math.floor(rng() * 2);
    for (let y = 0; y < h; y++) {
      const rr = r * (1 - y / h) + 0.4;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dz) <= rr) world.set(x + dx, base + y, z + dz, y > h - 3 && rng() < 0.3 ? B.MAGMA : B.OBSIDIAN);
      }
    }
  }
  // glowing magma vents
  for (let i = 0; i < 120; i++) {
    const x = Math.floor(rng() * S), z = Math.floor(rng() * S);
    if (avoid(x, z)) continue;
    const y = surfaceY(world, x, z) - 1;
    if (world.get(x, y, z) === B.LAVA) continue;
    world.set(x, y, z, B.MAGMA);
    world.set(x + 1, y, z, B.MAGMA);
    world.set(x, y, z + 1, B.MAGMA);
  }
}

function decorateWater(world, rng, avoid, sea) {
  const S = world.sx;
  // coral reefs
  for (let i = 0; i < 1400; i++) {
    const x = Math.floor(rng() * S), z = Math.floor(rng() * S);
    if (avoid(x, z)) continue;
    const ground = world.groundBelow(x, sea, z);
    if (ground >= sea - 2) continue;
    const h = 1 + Math.floor(rng() * Math.min(4, sea - 2 - ground));
    const c = rng() < 0.5 ? B.CORAL_PINK : B.CORAL_BLUE;
    for (let y = 0; y < h; y++) world.set(x, ground + y, z, c);
  }
  // sunken ruins
  for (let i = 0; i < 18; i++) {
    const x = 10 + Math.floor(rng() * (S - 30)), z = 10 + Math.floor(rng() * (S - 30));
    if (avoid(x, z, 12)) continue;
    const w = 6 + Math.floor(rng() * 6), d = 6 + Math.floor(rng() * 6);
    const base = world.groundBelow(x, sea, z);
    if (base > sea) continue;
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) {
      const edge = dx === 0 || dz === 0 || dx === w - 1 || dz === d - 1;
      if (!edge) continue;
      const hh = 2 + Math.floor(rng() * 4);
      const g = world.groundBelow(x + dx, sea + 4, z + dz);
      for (let y = 0; y < hh; y++) world.set(x + dx, g + y, z + dz, B.PRISMARINE);
    }
  }
  // palm trees on land
  for (let i = 0; i < 260; i++) {
    const x = 3 + Math.floor(rng() * (S - 6)), z = 3 + Math.floor(rng() * (S - 6));
    if (avoid(x, z)) continue;
    const g = surfaceY(world, x, z);
    const top = world.get(x, g - 1, z);
    if (top !== B.GRASS && top !== B.SAND) continue;
    if (g <= sea) continue;
    const h = 4 + Math.floor(rng() * 3);
    for (let y = 0; y < h; y++) world.set(x, g + y, z, B.LOG);
    const ty = g + h;
    world.set(x, ty, z, B.LEAVES);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      for (let k = 1; k <= 3; k++) world.set(x + dx * k, ty - (k === 3 ? 1 : 0), z + dz * k, B.LEAVES);
    }
  }
}

function tree(world, x, g, z, h, r, rng) {
  for (let y = 0; y < h; y++) world.set(x, g + y, z, B.LOG);
  const cy = g + h;
  for (let dy = -2; dy <= 2; dy++) {
    const rr = r - Math.abs(dy) * 0.6;
    for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.hypot(dx, dz) <= rr && rng() > 0.08 && world.get(x + dx, cy + dy, z + dz) === B.AIR) {
        world.set(x + dx, cy + dy, z + dz, B.LEAVES);
      }
    }
  }
}

function decorateJungle(world, rng, avoid, sea) {
  const S = world.sx;
  // giant trees
  for (let gz = 12; gz < S - 12; gz += 26) for (let gx = 12; gx < S - 12; gx += 26) {
    if (rng() < 0.35) continue;
    const x = gx + Math.floor(rng() * 10), z = gz + Math.floor(rng() * 10);
    if (avoid(x, z, 6)) continue;
    const g = surfaceY(world, x, z);
    if (world.get(x, g - 1, z) !== B.JGRASS) continue;
    const h = 14 + Math.floor(rng() * 8);
    for (let y = 0; y < h; y++) for (const [dx, dz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) world.set(x + dx, g + y, z + dz, B.LOG);
    tree(world, x, g + h - 2, z, 2, 6, rng);
    tree(world, x + 1, g + h - 8, z + 1, 1, 3, rng);
  }
  // normal trees
  for (let gz = 3; gz < S - 3; gz += 6) for (let gx = 3; gx < S - 3; gx += 6) {
    if (rng() < 0.45) continue;
    const x = gx + Math.floor(rng() * 4), z = gz + Math.floor(rng() * 4);
    if (avoid(x, z)) continue;
    const g = surfaceY(world, x, z);
    if (world.get(x, g - 1, z) !== B.JGRASS) continue;
    tree(world, x, g, z, 5 + Math.floor(rng() * 5), 3, rng);
  }
  // bushes and mossy boulders
  for (let i = 0; i < 900; i++) {
    const x = 2 + Math.floor(rng() * (S - 4)), z = 2 + Math.floor(rng() * (S - 4));
    if (avoid(x, z)) continue;
    const g = surfaceY(world, x, z);
    if (world.get(x, g - 1, z) !== B.JGRASS) continue;
    const blk = rng() < 0.8 ? B.LEAVES : B.MOSSY;
    world.set(x, g, z, blk);
    if (rng() < 0.5) world.set(x + 1, g, z, blk);
    if (rng() < 0.3) world.set(x, g + 1, z, blk);
  }
}

// ---------------------------------------------------------------- sky realm
function genSky(world, rng, noise, spawn, arena) {
  const S = world.sx;
  const CELL = 40;
  const n = Math.floor(S / CELL);
  const islands = [];
  const topAt = (x, z) => Math.round(30 + noise.fbm(x / 140, z / 140, 3) * 14);
  for (let j = 0; j < n; j++) {
    islands[j] = [];
    for (let i = 0; i < n; i++) {
      let cx = i * CELL + CELL / 2 + (rng() - 0.5) * 14;
      let cz = j * CELL + CELL / 2 + (rng() - 0.5) * 14;
      let r = 7 + rng() * 7;
      if (i === 0 && j === 0) { cx = spawn.x; cz = spawn.z; r = 12; }
      if (i === n - 1 && j === n - 1) { cx = arena.x; cz = arena.z; r = ARENA_R + 6; }
      islands[j][i] = { x: cx, z: cz, r, top: topAt(cx, cz) };
    }
  }
  const flat = islands.flat();
  for (const isl of flat) carveIsland(world, isl, rng, noise);

  // cloud bridges to the right and lower neighbours
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const a = islands[j][i];
    if (i + 1 < n) cloudBridge(world, a, islands[j][i + 1]);
    if (j + 1 < n && (rng() < 0.7 || i === 0 || i === n - 1)) cloudBridge(world, a, islands[j + 1][i]);
  }

  // decorations: crystals and little trees
  for (const isl of flat) {
    if (isl === islands[n - 1][n - 1] || isl === islands[0][0]) continue;
    const count = Math.floor(isl.r / 3);
    for (let k = 0; k < count; k++) {
      const ang = rng() * Math.PI * 2, d = rng() * isl.r * 0.7;
      const x = Math.floor(isl.x + Math.cos(ang) * d), z = Math.floor(isl.z + Math.sin(ang) * d);
      const g = world.groundBelow(x, world.sy - 1, z);
      if (g < 0) continue;
      if (rng() < 0.5) { const h = 2 + Math.floor(rng() * 4); for (let y = 0; y < h; y++) world.set(x, g + y, z, B.CRYSTAL); }
      else tree(world, x, g, z, 3 + Math.floor(rng() * 3), 2, rng);
    }
  }
  // decorative floating clouds (high above)
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(rng() * S), z = Math.floor(rng() * S), y = 52 + Math.floor(rng() * 8);
    const w = 3 + Math.floor(rng() * 6), d = 2 + Math.floor(rng() * 4);
    for (let dz = 0; dz < d; dz++) for (let dx = 0; dx < w; dx++) world.set(x + dx, y, z + dz, B.CLOUD);
  }
  const arenaIsl = islands[n - 1][n - 1];
  buildArena(world, arena.x, arena.z, arenaIsl.top, ARENA_R, B.CRYSTAL, true);
  buildSpawnPad(world, spawn.x, spawn.z, islands[0][0].top, B.CRYSTAL);
  return { arenaFloor: arenaIsl.top, spawnFloor: islands[0][0].top };
}

function carveIsland(world, isl, rng, noise) {
  const R = Math.ceil(isl.r * 1.3);
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const x = Math.floor(isl.x + dx), z = Math.floor(isl.z + dz);
    let d = Math.hypot(dx, dz) / isl.r;
    d += noise.value(x / 6, z / 6) * 0.22;
    if (d >= 1) continue;
    const top = isl.top + Math.round(noise.value(x / 9 + 40, z / 9) * 1.5 * (1 - d));
    const depth = Math.round(Math.pow(1 - d, 0.7) * isl.r * 0.9) + 2;
    for (let y = top - depth; y < top; y++) world.set(x, y, z, y === top - 1 ? B.SKYGRASS : B.SKYSTONE);
  }
}

function cloudBridge(world, a, b) {
  const dist = Math.hypot(b.x - a.x, b.z - a.z);
  const ux = (b.x - a.x) / dist, uz = (b.z - a.z) / dist;
  const px = -uz, pz = ux;
  const startT = Math.max(0, a.r * 0.6), endT = dist - b.r * 0.6;
  const rampLen = Math.max(1, endT - startT);
  for (let s = 0; s <= dist; s += 0.5) {
    let y;
    if (s <= startT) y = a.top - 1;
    else if (s >= endT) y = b.top - 1;
    else y = Math.round(lerp(a.top, b.top, (s - startT) / rampLen)) - 1;
    for (let w = -1.5; w <= 1.5; w += 0.5) {
      const x = Math.floor(a.x + ux * s + px * w), z = Math.floor(a.z + uz * s + pz * w);
      if (world.get(x, y, z) === B.AIR) world.set(x, y, z, B.CLOUD);
      for (let k = 1; k <= 3; k++) if (world.get(x, y + k, z) === B.CLOUD) world.set(x, y + k, z, B.AIR);
    }
  }
}

// ---------------------------------------------------------------- structures
function buildArena(world, ax, az, floorY, R, accent, floating) {
  const r2 = R + 1;
  for (let dz = -r2; dz <= r2; dz++) for (let dx = -r2; dx <= r2; dx++) {
    const d = Math.hypot(dx, dz);
    if (d > R + 0.5) continue;
    const x = Math.floor(ax + dx), z = Math.floor(az + dz);
    const depth = floating ? 3 + Math.round((1 - d / R) * 10) : 6;
    for (let y = floorY - 1; y >= Math.max(1, floorY - depth); y--) world.set(x, y, z, B.BRICK);
    let floor = B.BRICK;
    if (Math.abs(d - R * 0.55) < 0.6 || d < 1.5) floor = B.GOLD;
    else if (Math.abs(d - R + 1) < 0.5) floor = accent;
    world.set(x, floorY - 1, z, floor);
    for (let y = floorY; y < Math.min(world.sy, floorY + 26); y++) world.set(x, y, z, B.AIR);
  }
  // pillars
  const N = 12;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const x = Math.floor(ax + Math.cos(a) * (R - 1)), z = Math.floor(az + Math.sin(a) * (R - 1));
    for (let y = 0; y < 6; y++) world.set(x, floorY + y, z, y === 5 ? accent : B.BRICK);
  }
}

function buildSpawnPad(world, sx, sz, y, accent) {
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
    const x = Math.floor(sx + dx), z = Math.floor(sz + dz);
    const edge = Math.max(Math.abs(dx), Math.abs(dz)) === 3;
    world.set(x, y - 1, z, edge ? accent : B.BRICK);
    for (let k = 0; k < 6; k++) world.set(x, y + k, z, B.AIR);
  }
  world.set(Math.floor(sx), y - 1, Math.floor(sz), B.GOLD);
}

// ---------------------------------------------------------------- mobs
function pickWeighted(list, rng) {
  const total = list.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [id, w] of list) { r -= w; if (r <= 0) return id; }
  return list[0][0];
}

function placeMobs(world, realm, rng, spawn, arena) {
  const out = [];
  const S = world.sx;
  let tries = 0;
  while (out.length < 95 && tries++ < 6000) {
    const x = 6 + rng() * (S - 12), z = 6 + rng() * (S - 12);
    if (Math.hypot(x - spawn.x, z - spawn.z) < 30) continue;
    if (Math.hypot(x - arena.x, z - arena.z) < ARENA_R + 8) continue;
    const g = world.surface(x, z);
    if (g < 1 || g > 50) continue;
    const above = world.get(Math.floor(x), g, Math.floor(z));
    const type = pickWeighted(realm.mobs, rng);
    if (LIQUID[above] && type !== 'jelly') continue;
    if (out.some((m) => Math.hypot(m.x - x, m.z - z) < 6)) continue;
    out.push({ x, z, y: g, type });
  }
  return out;
}
