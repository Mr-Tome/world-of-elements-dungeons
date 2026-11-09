// Voxel world storage, chunk meshing (with ambient occlusion) and chunk streaming.
import * as THREE from '../vendor/three.module.min.js';
import { B, BLOCKS, SOLID, OPAQUE, LIQUID, tileUV, getAtlas } from './blocks.js';

export const CHUNK = 16;

export class World {
  constructor(sx, sy, sz) {
    this.sx = sx; this.sy = sy; this.sz = sz;
    this.data = new Uint8Array(sx * sy * sz);
    this.tops = new Int16Array(sx * sz); // highest non-air y per column
  }
  inBounds(x, y, z) {
    return x >= 0 && z >= 0 && y >= 0 && x < this.sx && z < this.sz && y < this.sy;
  }
  get(x, y, z) {
    if (x < 0 || z < 0 || y < 0 || x >= this.sx || z >= this.sz || y >= this.sy) return B.AIR;
    return this.data[(y * this.sz + z) * this.sx + x];
  }
  set(x, y, z, b) {
    if (x < 0 || z < 0 || y < 0 || x >= this.sx || z >= this.sz || y >= this.sy) return;
    this.data[(y * this.sz + z) * this.sx + x] = b;
  }
  // Physics: outside the map edge is an invisible wall, below the map is open void.
  isSolid(x, y, z) {
    x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
    if (x < 0 || z < 0 || x >= this.sx || z >= this.sz) return true;
    if (y < 0 || y >= this.sy) return false;
    return SOLID[this.data[(y * this.sz + z) * this.sx + x]] === 1;
  }
  blockAt(x, y, z) {
    return this.get(Math.floor(x), Math.floor(y), Math.floor(z));
  }
  // Height of the first walkable surface at or below y (returns -Infinity over the void)
  groundBelow(x, y, z) {
    const xi = Math.floor(x), zi = Math.floor(z);
    if (xi < 0 || zi < 0 || xi >= this.sx || zi >= this.sz) return -Infinity;
    for (let yy = Math.min(Math.floor(y), this.sy - 1); yy >= 0; yy--) {
      if (SOLID[this.data[(yy * this.sz + zi) * this.sx + xi]]) return yy + 1;
    }
    return -Infinity;
  }
  // Highest solid surface in the column (for spawning)
  surface(x, z) {
    return this.groundBelow(x, this.sy - 1, z);
  }
  computeTops() {
    for (let z = 0; z < this.sz; z++) {
      for (let x = 0; x < this.sx; x++) {
        let top = -1;
        for (let y = this.sy - 1; y >= 0; y--) {
          if (this.data[(y * this.sz + z) * this.sx + x] !== B.AIR) { top = y; break; }
        }
        this.tops[z * this.sx + x] = top;
      }
    }
  }
}

// Each face: normal, and its 4 corners ordered bottom-left, bottom-right, top-right, top-left
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], shade: 0.8, side: 1 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], shade: 0.8, side: 1 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0, side: 0 },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.55, side: 2 },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], shade: 0.9, side: 1 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], shade: 0.7, side: 1 },
];
const AO_CURVE = [0.42, 0.62, 0.8, 1.0];
const UV_CACHE = [];
function uvFor(tile) {
  if (!UV_CACHE[tile]) UV_CACHE[tile] = tileUV(tile);
  return UV_CACHE[tile];
}

class GeoBuilder {
  constructor() { this.pos = []; this.uv = []; this.col = []; this.idx = []; this.count = 0; }
  quad(verts, uvRect, shades, flip) {
    const [u0, v0, u1, v1] = uvRect;
    const uvs = [u0, v0, u1, v0, u1, v1, u0, v1];
    for (let i = 0; i < 4; i++) {
      this.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      this.uv.push(uvs[i * 2], uvs[i * 2 + 1]);
      const s = shades[i];
      this.col.push(s, s, s);
    }
    const c = this.count;
    if (flip) this.idx.push(c + 1, c + 2, c + 3, c + 1, c + 3, c);
    else this.idx.push(c, c + 1, c + 2, c, c + 2, c + 3);
    this.count += 4;
  }
  build() {
    if (this.count === 0) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

function buildChunk(world, cx, cz) {
  const solid = new GeoBuilder();
  const water = new GeoBuilder();
  const x0 = cx * CHUNK, z0 = cz * CHUNK;
  const x1 = Math.min(x0 + CHUNK, world.sx), z1 = Math.min(z0 + CHUNK, world.sz);
  let maxY = 0;
  for (let z = z0; z < z1; z++) for (let x = x0; x < x1; x++) maxY = Math.max(maxY, world.tops[z * world.sx + x]);
  const op = (x, y, z) => OPAQUE[world.get(x, y, z)];
  const verts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const shades = [0, 0, 0, 0];
  const aos = [0, 0, 0, 0];

  for (let y = 0; y <= maxY; y++) {
    for (let z = z0; z < z1; z++) {
      for (let x = x0; x < x1; x++) {
        const id = world.get(x, y, z);
        if (id === B.AIR) continue;
        const blk = BLOCKS[id];
        if (id === B.WATER) {
          for (const f of FACES) {
            const nb = world.get(x + f.n[0], y + f.n[1], z + f.n[2]);
            if (nb !== B.AIR) continue;
            for (let i = 0; i < 4; i++) {
              const c = f.v[i];
              let vy = y + c[1];
              if (c[1] === 1 && world.get(x, y + 1, z) === B.AIR) vy -= 0.12;
              verts[i][0] = x + c[0]; verts[i][1] = vy; verts[i][2] = z + c[2];
              shades[i] = f.shade;
            }
            water.quad(verts, uvFor(blk.tiles[f.side]), shades, false);
          }
          continue;
        }
        for (const f of FACES) {
          const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
          if (OPAQUE[world.get(nx, ny, nz)]) continue;
          if (ny < 0) continue;
          for (let i = 0; i < 4; i++) {
            const c = f.v[i];
            verts[i][0] = x + c[0]; verts[i][1] = y + c[1]; verts[i][2] = z + c[2];
            if (blk.glow) { aos[i] = 3; shades[i] = 1; continue; }
            // ambient occlusion: look at the 3 blocks touching this corner on the outside of the face
            let s1x = nx, s1y = ny, s1z = nz, s2x = nx, s2y = ny, s2z = nz;
            let first = true;
            for (let a = 0; a < 3; a++) {
              if (f.n[a] !== 0) continue;
              const d = c[a] === 1 ? 1 : -1;
              if (first) { if (a === 0) s1x += d; else if (a === 1) s1y += d; else s1z += d; first = false; }
              else { if (a === 0) s2x += d; else if (a === 1) s2y += d; else s2z += d; }
            }
            const side1 = op(s1x, s1y, s1z), side2 = op(s2x, s2y, s2z);
            const corner = op(s1x + s2x - nx, s1y + s2y - ny, s1z + s2z - nz);
            const ao = side1 && side2 ? 0 : 3 - (side1 + side2 + corner);
            aos[i] = ao;
            shades[i] = AO_CURVE[ao] * f.shade;
          }
          const flip = aos[0] + aos[2] < aos[1] + aos[3];
          solid.quad(verts, uvFor(blk.tiles[f.side]), shades, flip);
        }
      }
    }
  }
  return { solid: solid.build(), water: water.build() };
}

export class ChunkManager {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.ncx = Math.ceil(world.sx / CHUNK);
    this.ncz = Math.ceil(world.sz / CHUNK);
    const atlas = getAtlas();
    this.solidMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true });
    this.waterMat = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide });
    this.chunks = [];
    for (let cz = 0; cz < this.ncz; cz++) {
      for (let cx = 0; cx < this.ncx; cx++) {
        this.chunks.push({ cx, cz, solid: null, water: null, built: false, x: cx * CHUNK + CHUNK / 2, z: cz * CHUNK + CHUNK / 2 });
      }
    }
  }
  build(ch) {
    const g = buildChunk(this.world, ch.cx, ch.cz);
    if (ch.solid) { this.scene.remove(ch.solid); ch.solid.geometry.dispose(); ch.solid = null; }
    if (ch.water) { this.scene.remove(ch.water); ch.water.geometry.dispose(); ch.water = null; }
    if (g.solid) { ch.solid = new THREE.Mesh(g.solid, this.solidMat); ch.solid.matrixAutoUpdate = false; this.scene.add(ch.solid); }
    if (g.water) { ch.water = new THREE.Mesh(g.water, this.waterMat); ch.water.matrixAutoUpdate = false; ch.water.renderOrder = 1; this.scene.add(ch.water); }
    ch.built = true;
  }
  // Build every unbuilt chunk within radius of the given points (synchronous)
  buildAround(points, radius) {
    for (const ch of this.chunks) {
      if (ch.built) continue;
      if (points.some((p) => Math.hypot(ch.x - p.x, ch.z - p.z) < radius)) this.build(ch);
    }
  }
  // Build a few of the nearest unbuilt chunks each frame
  stream(points, radius, budget = 2) {
    const want = [];
    for (const ch of this.chunks) {
      if (ch.built) continue;
      let d = Infinity;
      for (const p of points) d = Math.min(d, Math.hypot(ch.x - p.x, ch.z - p.z));
      if (d < radius) want.push([d, ch]);
    }
    want.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < Math.min(budget, want.length); i++) this.build(want[i][1]);
  }
  setVisibleFrom(pos, radius) {
    for (const ch of this.chunks) {
      const vis = Math.hypot(ch.x - pos.x, ch.z - pos.z) < radius;
      if (ch.solid) ch.solid.visible = vis;
      if (ch.water) ch.water.visible = vis;
    }
  }
  dispose() {
    for (const ch of this.chunks) {
      if (ch.solid) { this.scene.remove(ch.solid); ch.solid.geometry.dispose(); }
      if (ch.water) { this.scene.remove(ch.water); ch.water.geometry.dispose(); }
    }
    this.solidMat.dispose();
    this.waterMat.dispose();
  }
}
