// Blocky 3D models for players, weapons, mobs, bosses and pets — all built from boxes.
import * as THREE from '../vendor/three.module.min.js';
import { CARD_DEFS, ELEMENTS } from './cards.js';

const geoCache = new Map();
function boxGeo(w, h, d) {
  const k = `${w},${h},${d}`;
  if (!geoCache.has(k)) geoCache.set(k, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(k);
}

// A model keeps a list of its lit materials so it can flash when hit
class Builder {
  constructor() { this.mats = []; }
  box(parent, w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
    let mat;
    if (opts.glow) mat = new THREE.MeshBasicMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
    else {
      mat = new THREE.MeshLambertMaterial({ color, transparent: !!opts.opacity, opacity: opts.opacity ?? 1 });
      this.mats.push(mat);
    }
    const m = new THREE.Mesh(boxGeo(w, h, d), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  pivot(parent, x, y, z) {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
}

export function flashModel(model, on) {
  for (const m of model.mats) m.emissive.setHex(on ? 0xaa1111 : 0x000000);
}

// ---------------------------------------------------------------- weapons
export function weaponModel(card) {
  const d = CARD_DEFS[card.def];
  const el = ELEMENTS[d.element];
  const b = new Builder();
  const g = new THREE.Group();
  const metal = d.element === 'none' ? (card.def === 'woodSword' ? 0xb88a50 : 0xd8dde3) : new THREE.Color(el.a).getHex();
  const accent = new THREE.Color(el.b).getHex();
  const handle = 0x6b4a2a;
  switch (d.icon) {
    case 'sword':
      b.box(g, 0.07, 0.18, 0.07, handle, 0, -0.09, 0);
      b.box(g, 0.24, 0.05, 0.07, 0x444444, 0, 0.02, 0);
      b.box(g, 0.08, 0.62, 0.035, metal, 0, 0.35, 0);
      if (d.element !== 'none') b.box(g, 0.03, 0.5, 0.04, accent, 0, 0.33, 0, { glow: true });
      break;
    case 'axe':
      b.box(g, 0.06, 0.7, 0.06, handle, 0, 0.2, 0);
      b.box(g, 0.28, 0.24, 0.04, metal, 0.12, 0.45, 0);
      break;
    case 'trident':
      b.box(g, 0.05, 0.9, 0.05, handle, 0, 0.2, 0);
      b.box(g, 0.26, 0.04, 0.04, metal, 0, 0.66, 0);
      for (const x of [-0.11, 0, 0.11]) b.box(g, 0.04, 0.18, 0.04, metal, x, 0.76, 0);
      break;
    case 'hammer':
      b.box(g, 0.06, 0.6, 0.06, handle, 0, 0.15, 0);
      b.box(g, 0.34, 0.2, 0.2, metal, 0, 0.5, 0);
      b.box(g, 0.36, 0.05, 0.22, accent, 0, 0.5, 0, { glow: true });
      break;
    case 'bow':
      b.box(g, 0.05, 0.7, 0.05, d.element === 'none' ? 0x8a5a30 : metal, 0, 0.15, 0);
      b.box(g, 0.05, 0.12, 0.05, 0x8a5a30, 0.05, 0.52, 0);
      b.box(g, 0.05, 0.12, 0.05, 0x8a5a30, 0.05, -0.22, 0);
      b.box(g, 0.01, 0.8, 0.01, 0xffffff, 0.09, 0.15, 0, { glow: true });
      break;
    case 'staff':
      b.box(g, 0.05, 0.9, 0.05, handle, 0, 0.2, 0);
      b.box(g, 0.14, 0.14, 0.14, accent, 0, 0.72, 0, { glow: true });
      break;
    case 'blaster':
      b.box(g, 0.1, 0.12, 0.4, metal, 0, 0.1, -0.1);
      b.box(g, 0.07, 0.18, 0.08, handle, 0, -0.02, 0.05);
      b.box(g, 0.12, 0.12, 0.12, accent, 0, 0.18, -0.12, { glow: true, opacity: 0.7 });
      break;
  }
  return { group: g, mats: b.mats };
}

// ---------------------------------------------------------------- player
export function humanoidModel(colors, opts = {}) {
  const b = new Builder();
  const root = new THREE.Group();
  const c = (s) => new THREE.Color(s).getHex();
  const legL = b.pivot(root, -0.13, 0.75, 0), legR = b.pivot(root, 0.13, 0.75, 0);
  b.box(legL, 0.25, 0.75, 0.25, c(colors.pants), 0, -0.375, 0);
  b.box(legR, 0.25, 0.75, 0.25, c(colors.pants), 0, -0.375, 0);
  const body = b.box(root, 0.52, 0.72, 0.28, c(colors.shirt), 0, 1.11, 0);
  b.box(root, 0.53, 0.08, 0.29, c(colors.accent), 0, 0.8, 0);
  const head = b.pivot(root, 0, 1.47, 0);
  b.box(head, 0.48, 0.48, 0.48, c(colors.skin), 0, 0.24, 0);
  b.box(head, 0.5, 0.14, 0.5, c(colors.hair), 0, 0.45, 0);
  b.box(head, 0.5, 0.3, 0.12, c(colors.hair), 0, 0.3, 0.2);
  b.box(head, 0.08, 0.08, 0.02, 0x1a1420, -0.11, 0.24, -0.245);
  b.box(head, 0.08, 0.08, 0.02, 0x1a1420, 0.11, 0.24, -0.245);
  const armL = b.pivot(root, -0.36, 1.42, 0), armR = b.pivot(root, 0.36, 1.42, 0);
  b.box(armL, 0.2, 0.72, 0.2, c(colors.shirt), 0, -0.32, 0);
  b.box(armR, 0.2, 0.72, 0.2, c(colors.shirt), 0, -0.32, 0);
  b.box(armL, 0.19, 0.16, 0.19, c(colors.skin), 0, -0.62, 0);
  b.box(armR, 0.19, 0.16, 0.19, c(colors.skin), 0, -0.62, 0);
  const hand = b.pivot(armR, 0, -0.66, -0.05);
  hand.rotation.x = -Math.PI / 2;
  return { group: root, mats: b.mats, parts: { legL, legR, armL, armR, head, body, hand } };
}

// First-person arm holding the weapon
export function viewArmModel(colors) {
  const b = new Builder();
  const g = new THREE.Group();
  b.box(g, 0.16, 0.16, 0.6, new THREE.Color(colors.shirt).getHex(), 0, 0, 0.15);
  b.box(g, 0.15, 0.15, 0.14, new THREE.Color(colors.skin).getHex(), 0, 0, -0.18);
  const hand = new THREE.Group();
  hand.position.set(0, 0.02, -0.22);
  g.add(hand);
  return { group: g, hand };
}

// ---------------------------------------------------------------- mobs
// Every builder returns { group, mats, anim(t, moving, dt), height, radius }
const MOBS = {
  magmaSlime(b, g) {
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 1.0, 0.9, 1.0, 0x4a1810, 0, 0.45, 0);
    b.box(body, 0.6, 0.5, 0.6, 0xff7a20, 0, 0.45, 0, { glow: true });
    b.box(body, 1.02, 0.1, 1.02, 0xff4a10, 0, 0.75, 0, { glow: true });
    b.box(body, 0.14, 0.14, 0.02, 0xffee55, -0.2, 0.62, -0.51, { glow: true });
    b.box(body, 0.14, 0.14, 0.02, 0xffee55, 0.2, 0.62, -0.51, { glow: true });
    return { height: 0.9, radius: 0.6, anim: (t, moving) => { const s = moving ? Math.abs(Math.sin(t * 7)) : Math.abs(Math.sin(t * 2)) * 0.3; body.position.y = s * 0.4; body.scale.set(1 + (1 - s) * 0.08, 1 - (1 - s) * 0.1, 1 + (1 - s) * 0.08); } };
  },
  fireImp(b, g) {
    const legL = b.pivot(g, -0.12, 0.45, 0), legR = b.pivot(g, 0.12, 0.45, 0);
    b.box(legL, 0.16, 0.45, 0.16, 0x5a1010, 0, -0.22, 0);
    b.box(legR, 0.16, 0.45, 0.16, 0x5a1010, 0, -0.22, 0);
    b.box(g, 0.44, 0.5, 0.3, 0xc0301a, 0, 0.7, 0);
    b.box(g, 0.42, 0.4, 0.4, 0xd8401a, 0, 1.15, 0);
    b.box(g, 0.08, 0.2, 0.08, 0x2a1010, -0.16, 1.42, 0);
    b.box(g, 0.08, 0.2, 0.08, 0x2a1010, 0.16, 1.42, 0);
    b.box(g, 0.08, 0.06, 0.02, 0xffee00, -0.1, 1.18, -0.21, { glow: true });
    b.box(g, 0.08, 0.06, 0.02, 0xffee00, 0.1, 1.18, -0.21, { glow: true });
    const orb = b.box(g, 0.2, 0.2, 0.2, 0xffaa22, 0.34, 0.8, -0.25, { glow: true });
    return { height: 1.5, radius: 0.45, anim: (t, moving) => { const a = moving ? Math.sin(t * 9) * 0.6 : 0; legL.rotation.x = a; legR.rotation.x = -a; orb.rotation.y = t * 4; orb.position.y = 0.8 + Math.sin(t * 5) * 0.05; } };
  },
  crab(b, g) {
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 1.1, 0.4, 0.8, 0xd8502a, 0, 0.45, 0);
    b.box(body, 0.9, 0.12, 0.6, 0xf07a40, 0, 0.7, 0);
    b.box(body, 0.06, 0.25, 0.06, 0xd8502a, -0.2, 0.75, -0.3);
    b.box(body, 0.06, 0.25, 0.06, 0xd8502a, 0.2, 0.75, -0.3);
    b.box(body, 0.1, 0.1, 0.1, 0x111111, -0.2, 0.9, -0.3);
    b.box(body, 0.1, 0.1, 0.1, 0x111111, 0.2, 0.9, -0.3);
    const clawL = b.pivot(body, -0.55, 0.5, -0.45), clawR = b.pivot(body, 0.55, 0.5, -0.45);
    b.box(clawL, 0.3, 0.25, 0.35, 0xe8603a, 0, 0, -0.1);
    b.box(clawR, 0.3, 0.25, 0.35, 0xe8603a, 0, 0, -0.1);
    const legs = [];
    for (const s of [-1, 1]) for (const z of [-0.2, 0.05, 0.3]) {
      const l = b.pivot(body, s * 0.55, 0.4, z);
      b.box(l, 0.35, 0.08, 0.08, 0xb04020, s * 0.15, -0.15, 0);
      l.rotation.z = s * 0.6;
      legs.push(l);
    }
    return { height: 0.9, radius: 0.7, anim: (t, moving) => { legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 14 + i) * 0.4 : 0; }); clawL.rotation.x = Math.sin(t * 3) * 0.2; clawR.rotation.x = Math.sin(t * 3 + 1) * 0.2; } };
  },
  jelly(b, g) {
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 0.9, 0.6, 0.9, 0xff7ad0, 0, 1.2, 0, { glow: true, opacity: 0.65 });
    b.box(body, 0.5, 0.3, 0.5, 0xffd0f0, 0, 1.2, 0, { glow: true });
    const tents = [];
    for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3], [0, 0]]) {
      const tnt = b.pivot(body, x, 0.9, z);
      b.box(tnt, 0.08, 0.7, 0.08, 0xff9ae0, 0, -0.35, 0, { glow: true, opacity: 0.6 });
      tents.push(tnt);
    }
    return { height: 1.5, radius: 0.55, flying: true, anim: (t) => { body.position.y = Math.sin(t * 2) * 0.15; tents.forEach((tn, i) => { tn.rotation.x = Math.sin(t * 3 + i) * 0.3; }); } };
  },
  vineCrawler(b, g) {
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 0.8, 0.45, 1.0, 0x2e6a1a, 0, 0.55, 0.05);
    b.box(body, 0.55, 0.4, 0.45, 0x3e8a24, 0, 0.55, -0.6);
    for (const x of [-0.14, 0.14]) b.box(body, 0.1, 0.1, 0.02, 0xff3030, x, 0.62, -0.83, { glow: true });
    const legs = [];
    for (const s of [-1, 1]) for (const z of [-0.35, -0.1, 0.15, 0.4]) {
      const l = b.pivot(body, s * 0.4, 0.55, z);
      b.box(l, 0.6, 0.08, 0.08, 0x1e4a12, s * 0.3, 0, 0);
      l.rotation.z = -s * 0.5;
      legs.push(l);
    }
    return { height: 0.9, radius: 0.7, anim: (t, moving) => { legs.forEach((l, i) => { l.rotation.y = moving ? Math.sin(t * 16 + i * 1.7) * 0.4 : 0; }); } };
  },
  thornShooter(b, g) {
    b.box(g, 0.6, 0.35, 0.6, 0x5a3a20, 0, 0.17, 0);
    const stem = b.pivot(g, 0, 0.35, 0);
    b.box(stem, 0.14, 1.0, 0.14, 0x3a9a2a, 0, 0.5, 0);
    const head = b.pivot(stem, 0, 1.05, 0);
    b.box(head, 0.6, 0.5, 0.5, 0xd0305a, 0, 0, 0);
    b.box(head, 0.36, 0.26, 0.04, 0x2a0a10, 0, -0.04, -0.26);
    for (let i = 0; i < 4; i++) { const p = b.box(head, 0.3, 0.06, 0.3, 0xff6a9a, 0, 0, 0); p.position.set(Math.cos(i * 1.57) * 0.35, 0, Math.sin(i * 1.57) * 0.35); }
    return { height: 1.7, radius: 0.5, stationary: true, anim: (t) => { stem.rotation.z = Math.sin(t * 1.5) * 0.1; head.rotation.x = Math.sin(t * 2) * 0.1; } };
  },
  wisp(b, g) {
    const body = b.pivot(g, 0, 1.2, 0);
    b.box(body, 0.45, 0.45, 0.45, 0xbfefff, 0, 0, 0, { glow: true });
    b.box(body, 0.7, 0.7, 0.7, 0x7fd0ff, 0, 0, 0, { glow: true, opacity: 0.35 });
    const orbs = [];
    for (let i = 0; i < 3; i++) orbs.push(b.box(body, 0.12, 0.12, 0.12, 0xffffff, 0, 0, 0, { glow: true }));
    return { height: 1.6, radius: 0.45, flying: true, anim: (t) => { body.rotation.y = t * 2; body.rotation.x = t; orbs.forEach((o, i) => { const a = t * 3 + i * 2.1; o.position.set(Math.cos(a) * 0.55, Math.sin(a * 1.3) * 0.3, Math.sin(a) * 0.55); }); } };
  },
  skyHawk(b, g) {
    const body = b.pivot(g, 0, 1.2, 0);
    b.box(body, 0.4, 0.35, 0.9, 0x8a6a4a, 0, 0, 0);
    b.box(body, 0.32, 0.32, 0.32, 0xf0f0f0, 0, 0.12, -0.55);
    b.box(body, 0.1, 0.1, 0.18, 0xffc020, 0, 0.08, -0.78);
    for (const x of [-0.1, 0.1]) b.box(body, 0.06, 0.06, 0.02, 0x111111, x, 0.18, -0.72);
    b.box(body, 0.3, 0.05, 0.35, 0x6a4a2a, 0, 0.05, 0.6);
    const wl = b.pivot(body, -0.2, 0.1, 0), wr = b.pivot(body, 0.2, 0.1, 0);
    b.box(wl, 0.9, 0.05, 0.5, 0x7a5a3a, -0.45, 0, 0);
    b.box(wr, 0.9, 0.05, 0.5, 0x7a5a3a, 0.45, 0, 0);
    return { height: 1.5, radius: 0.6, flying: true, anim: (t) => { const a = Math.sin(t * 10) * 0.6; wl.rotation.z = a; wr.rotation.z = -a; body.position.y = Math.sin(t * 2) * 0.1; } };
  },

  // ------------------------------------------------ bosses
  magmaw(b, g) {
    const legL = b.pivot(g, -0.7, 1.6, 0), legR = b.pivot(g, 0.7, 1.6, 0);
    b.box(legL, 0.9, 1.6, 0.9, 0x2e2a30, 0, -0.8, 0);
    b.box(legR, 0.9, 1.6, 0.9, 0x2e2a30, 0, -0.8, 0);
    const torso = b.pivot(g, 0, 1.6, 0);
    b.box(torso, 2.4, 1.8, 1.4, 0x3a3238, 0, 0.9, 0);
    b.box(torso, 1.2, 0.9, 0.05, 0xff6a10, 0, 1.0, -0.71, { glow: true });
    b.box(torso, 2.42, 0.12, 1.42, 0xff8a20, 0, 0.4, 0, { glow: true });
    const head = b.pivot(torso, 0, 1.8, 0);
    b.box(head, 1.1, 0.9, 1.0, 0x2a2428, 0, 0.45, 0);
    b.box(head, 0.3, 0.16, 0.05, 0xffee44, -0.25, 0.5, -0.51, { glow: true });
    b.box(head, 0.3, 0.16, 0.05, 0xffee44, 0.25, 0.5, -0.51, { glow: true });
    b.box(head, 0.7, 0.14, 0.05, 0xff5010, 0, 0.18, -0.51, { glow: true });
    const armL = b.pivot(torso, -1.5, 1.5, 0), armR = b.pivot(torso, 1.5, 1.5, 0);
    for (const a of [armL, armR]) {
      b.box(a, 0.8, 2.0, 0.8, 0x3a3238, 0, -1.0, 0);
      b.box(a, 1.0, 0.8, 1.0, 0x24202a, 0, -2.2, 0);
      b.box(a, 0.82, 0.1, 0.82, 0xff6a10, 0, -0.5, 0, { glow: true });
    }
    return { height: 5.3, radius: 1.8, anim: (t, moving, st) => {
      const a = moving ? Math.sin(t * 4) * 0.4 : 0;
      legL.rotation.x = a; legR.rotation.x = -a;
      const raise = st === 'windup' ? -2.4 : 0;
      armL.rotation.x = raise + -a * 0.6; armR.rotation.x = raise + a * 0.6;
      head.rotation.y = Math.sin(t * 0.8) * 0.15;
    } };
  },
  kraal(b, g) {
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 3.4, 1.4, 2.6, 0xc0402a, 0, 1.6, 0);
    b.box(body, 2.8, 0.5, 2.0, 0xe8603a, 0, 2.5, 0);
    for (const x of [-1, 0, 1]) b.box(body, 0.35, 0.7, 0.35, 0xf0e0c0, x, 3.0, 0.2);
    for (const x of [-0.6, 0.6]) {
      b.box(body, 0.15, 0.8, 0.15, 0xc0402a, x, 2.7, -1.0);
      b.box(body, 0.3, 0.3, 0.3, 0x101010, x, 3.2, -1.0);
    }
    const clawL = b.pivot(body, -2.1, 1.8, -1.2), clawR = b.pivot(body, 2.1, 1.8, -1.2);
    for (const c of [clawL, clawR]) {
      b.box(c, 0.6, 0.6, 1.4, 0xd8502a, 0, 0, -0.4);
      b.box(c, 1.1, 0.9, 0.9, 0xe8603a, 0, 0, -1.4);
      b.box(c, 0.9, 0.3, 0.8, 0xf08060, 0, -0.55, -1.5);
    }
    const legs = [];
    for (const s of [-1, 1]) for (const z of [-0.6, 0.2, 1.0]) {
      const l = b.pivot(body, s * 1.6, 1.3, z);
      b.box(l, 1.4, 0.25, 0.25, 0xa03018, s * 0.6, -0.4, 0);
      l.rotation.z = s * 0.7;
      legs.push(l);
    }
    return { height: 3.4, radius: 2.2, anim: (t, moving, st) => {
      legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 10 + i) * 0.3 : 0; });
      const open = st === 'windup' ? 0.6 : Math.sin(t * 2) * 0.15;
      clawL.rotation.y = open; clawR.rotation.y = -open;
      clawL.rotation.x = st === 'windup' ? -0.8 : 0; clawR.rotation.x = st === 'windup' ? -0.8 : 0;
    } };
  },
  thornroot(b, g) {
    const trunk = b.pivot(g, 0, 0, 0);
    for (const [x, z] of [[-0.8, -0.6], [0.8, -0.6], [-0.8, 0.6], [0.8, 0.6]]) b.box(trunk, 0.6, 1.0, 0.6, 0x4a3018, x, 0.4, z);
    b.box(trunk, 2.0, 4.0, 1.8, 0x6a4a2a, 0, 2.6, 0);
    b.box(trunk, 0.4, 0.3, 0.05, 0x9aff40, -0.45, 3.6, -0.91, { glow: true });
    b.box(trunk, 0.4, 0.3, 0.05, 0x9aff40, 0.45, 3.6, -0.91, { glow: true });
    b.box(trunk, 0.9, 0.25, 0.05, 0x1a0a05, 0, 2.9, -0.91);
    const crown = b.pivot(trunk, 0, 5.0, 0);
    b.box(crown, 4.0, 1.6, 3.6, 0x2e8a24, 0, 0.4, 0);
    b.box(crown, 2.6, 1.2, 2.4, 0x3ea82e, 0, 1.6, 0);
    b.box(crown, 0.5, 0.5, 0.5, 0xff4a8a, 1.2, 1.0, -1.5, { glow: true });
    b.box(crown, 0.5, 0.5, 0.5, 0xff4a8a, -1.4, 0.6, 1.2, { glow: true });
    const armL = b.pivot(trunk, -1.1, 3.8, 0), armR = b.pivot(trunk, 1.1, 3.8, 0);
    for (const [a, s] of [[armL, -1], [armR, 1]]) {
      b.box(a, 0.5, 2.6, 0.5, 0x5a3a1a, 0, -1.2, 0);
      b.box(a, 0.9, 0.7, 0.9, 0x3a8a2a, 0, -2.6, 0);
      a.rotation.z = s * 0.3;
    }
    return { height: 6.5, radius: 1.8, anim: (t, moving, st) => {
      crown.rotation.y = Math.sin(t * 0.6) * 0.1;
      const raise = st === 'windup' ? -2.2 : Math.sin(t * 1.5) * 0.15;
      armL.rotation.x = raise; armR.rotation.x = raise;
      trunk.rotation.z = moving ? Math.sin(t * 3) * 0.05 : 0;
    } };
  },
  stormwing(b, g) {
    const body = b.pivot(g, 0, 3, 0);
    b.box(body, 1.4, 1.2, 3.0, 0x3a5aa8, 0, 0, 0);
    b.box(body, 1.1, 1.1, 1.1, 0xf0f4ff, 0, 0.5, -1.8);
    b.box(body, 0.35, 0.35, 0.7, 0xffc020, 0, 0.3, -2.6);
    for (const x of [-0.3, 0.3]) b.box(body, 0.2, 0.2, 0.05, 0x40e0ff, x, 0.7, -2.36, { glow: true });
    for (let i = 0; i < 3; i++) b.box(body, 0.15, 0.6, 0.15, 0xffe94a, 0, 1.2 + i * 0.05, -1.6 + i * 0.35, { glow: true });
    b.box(body, 1.2, 0.15, 1.4, 0x2a4a98, 0, 0.1, 2.0);
    const wl = b.pivot(body, -0.7, 0.3, 0), wr = b.pivot(body, 0.7, 0.3, 0);
    for (const [w, s] of [[wl, -1], [wr, 1]]) {
      b.box(w, 3.2, 0.15, 1.8, 0x4a6ac0, s * 1.6, 0, 0);
      b.box(w, 1.8, 0.16, 1.0, 0xffe94a, s * 3.6, 0, 0.3, { glow: true });
    }
    return { height: 4.5, radius: 2.2, flying: true, anim: (t, moving, st) => {
      const a = Math.sin(t * (st === 'windup' ? 14 : 5)) * 0.6;
      wl.rotation.z = a; wr.rotation.z = -a;
      body.position.y = 3 + Math.sin(t * 2) * 0.3;
    } };
  },
};

export function mobModel(type, scale = 1) {
  const b = new Builder();
  const group = new THREE.Group();
  const inner = new THREE.Group();
  group.add(inner);
  const info = MOBS[type](b, inner);
  inner.scale.setScalar(scale);
  return { group, mats: b.mats, ...info, height: info.height * scale, radius: info.radius * scale };
}

// ---------------------------------------------------------------- pets
export function petModel(defId, colorHex) {
  const b = new Builder();
  const g = new THREE.Group();
  const col = new THREE.Color(colorHex).getHex();
  const dark = new THREE.Color(colorHex).multiplyScalar(0.6).getHex();
  let anim;
  if (defId === 'jungleParrot' || defId === 'babyDragon') {
    const body = b.pivot(g, 0, 0.4, 0);
    b.box(body, 0.3, 0.3, 0.5, col, 0, 0, 0);
    b.box(body, 0.26, 0.26, 0.26, col, 0, 0.15, -0.3);
    b.box(body, 0.08, 0.08, 0.14, defId === 'babyDragon' ? 0xffd040 : 0xffc020, 0, 0.12, -0.48);
    for (const x of [-0.07, 0.07]) b.box(body, 0.05, 0.05, 0.02, 0x111111, x, 0.2, -0.44);
    if (defId === 'babyDragon') { b.box(body, 0.06, 0.12, 0.06, 0xffe0a0, -0.08, 0.32, -0.25); b.box(body, 0.06, 0.12, 0.06, 0xffe0a0, 0.08, 0.32, -0.25); }
    b.box(body, 0.14, 0.05, 0.3, dark, 0, 0, 0.35);
    const wl = b.pivot(body, -0.15, 0.05, 0), wr = b.pivot(body, 0.15, 0.05, 0);
    b.box(wl, 0.45, 0.04, 0.3, dark, -0.22, 0, 0);
    b.box(wr, 0.45, 0.04, 0.3, dark, 0.22, 0, 0);
    anim = (t) => { const a = Math.sin(t * 14) * 0.7; wl.rotation.z = a; wr.rotation.z = -a; };
  } else if (defId === 'bubbleTurtle') {
    b.box(g, 0.6, 0.3, 0.7, 0x2a7a50, 0, 0.3, 0);
    b.box(g, 0.5, 0.12, 0.6, col, 0, 0.5, 0);
    const head = b.box(g, 0.22, 0.2, 0.24, 0x8ad0a0, 0, 0.3, -0.45);
    b.box(head, 0.04, 0.04, 0.02, 0x111111, -0.06, 0.04, -0.12);
    b.box(head, 0.04, 0.04, 0.02, 0x111111, 0.06, 0.04, -0.12);
    const legs = [];
    for (const [x, z] of [[-0.28, -0.25], [0.28, -0.25], [-0.28, 0.25], [0.28, 0.25]]) legs.push(b.box(g, 0.14, 0.18, 0.14, 0x8ad0a0, x, 0.1, z));
    anim = (t, moving) => { legs.forEach((l, i) => { l.position.y = 0.1 + (moving ? Math.max(0, Math.sin(t * 8 + i * 1.6)) * 0.06 : 0); }); };
  } else {
    // four-legged critters: pup, fox, bunny
    const bunny = defId === 'cloudBunny';
    const body = b.pivot(g, 0, 0, 0);
    b.box(body, 0.32, 0.3, 0.55, col, 0, 0.38, 0);
    const head = b.pivot(body, 0, 0.55, -0.32);
    b.box(head, 0.3, 0.28, 0.28, col, 0, 0, 0);
    b.box(head, 0.14, 0.1, 0.12, defId === 'fireFox' ? 0xffffff : dark, 0, -0.06, -0.18);
    b.box(head, 0.05, 0.05, 0.02, 0x111111, -0.08, 0.05, -0.145);
    b.box(head, 0.05, 0.05, 0.02, 0x111111, 0.08, 0.05, -0.145);
    const earH = bunny ? 0.3 : 0.12;
    b.box(head, 0.08, earH, 0.05, bunny ? 0xffd0e0 : dark, -0.09, 0.14 + earH / 2, 0.02);
    b.box(head, 0.08, earH, 0.05, bunny ? 0xffd0e0 : dark, 0.09, 0.14 + earH / 2, 0.02);
    const tail = b.pivot(body, 0, 0.45, 0.28);
    b.box(tail, 0.1, 0.1, bunny ? 0.12 : 0.3, defId === 'fireFox' ? 0xffffff : col, 0, 0, 0.1);
    const legs = [];
    for (const [x, z] of [[-0.1, -0.18], [0.1, -0.18], [-0.1, 0.18], [0.1, 0.18]]) {
      const l = b.pivot(body, x, 0.25, z);
      b.box(l, 0.09, 0.25, 0.09, dark, 0, -0.12, 0);
      legs.push(l);
    }
    anim = (t, moving) => {
      legs.forEach((l, i) => { l.rotation.x = moving ? Math.sin(t * 14 + (i % 2) * Math.PI) * 0.6 : 0; });
      tail.rotation.y = Math.sin(t * 8) * 0.5;
      if (bunny) body.position.y = moving ? Math.abs(Math.sin(t * 9)) * 0.2 : 0;
    };
  }
  return { group: g, mats: b.mats, anim };
}

export function setLayer(obj, layer) {
  obj.traverse((o) => o.layers.set(layer));
}
