// A player: first-person camera, movement physics, combat, abilities and loadout.
import * as THREE from '../vendor/three.module.min.js';
import { CARD_DEFS, cardStats } from './cards.js';
import { humanoidModel, viewArmModel, weaponModel, setLayer } from './models.js';
import { Pet, Burst, isLiquidAt, isLavaAt } from './entities.js';
import { sfx } from './audio.js';

const GRAVITY = 26;
const JUMP_V = 8.6;
const HALF_W = 0.3;
const STAND_H = 1.8, DUCK_H = 1.3;
const EYE = 1.62, DUCK_EYE = 1.15;

export class Player {
  constructor(game, index, loadout, spawn, yaw) {
    this.game = game;
    this.index = index;
    this.loadout = loadout;
    this.pos = new THREE.Vector3(spawn.x + (index === 0 ? -1 : 1), spawn.y + 0.01, spawn.z);
    this.vel = new THREE.Vector3();
    this.yaw = yaw;
    this.onGround = false;
    this.ducking = false;
    this.height = STAND_H;
    this.alive = true;
    this.invuln = 0;
    this.hurtT = 0;
    this.meleeT = 0;
    this.rangedT = 0;
    this.abilityT = 0;
    this.swingT = 0;
    this.shootAnimT = 0;
    this.dashT = 0;
    this.glideT = 0;
    this.featherT = 0;
    this.invisT = 0;
    this.powerHit = false;
    this.lastHurt = 0;
    this.lavaT = 0;
    this.safeT = 0;
    this.lastSafe = this.pos.clone();
    this.walkT = 0;
    this.kills = 0;
    this.dashHit = new Set();

    this.camera = new THREE.PerspectiveCamera(72, 1, 0.08, 150);
    this.camera.rotation.order = 'YXZ';
    this.camera.layers.set(0);
    this.camera.layers.enable(1 + (1 - index)); // see the other player's body
    this.camera.layers.enable(3 + index); // see your own arm
    game.scene.add(this.camera);
    this.buildModels();
    this.hp = this.maxHp;
  }

  card(slot) { return this.loadout[slot]; }

  buildModels() {
    const g = this.game;
    if (this.body) g.scene.remove(this.body.group);
    if (this.view) this.camera.remove(this.view.group);
    if (this.pet) this.pet.remove();

    const L = this.loadout;
    this.heroStats = cardStats(L.hero);
    this.meleeStats = cardStats(L.melee);
    this.rangedStats = cardStats(L.ranged);
    this.armorStats = cardStats(L.armor);
    this.petStats = cardStats(L.pet);
    const colors = cardStats(L.skin).colors;
    this.meleeElement = CARD_DEFS[L.melee.def].element;
    this.rangedElement = CARD_DEFS[L.ranged.def].element;

    const oldMax = this.maxHp || 0;
    this.maxHp = 20 + this.heroStats.hp + this.armorStats.hp;
    if (this.hp !== undefined) this.hp = Math.min(this.maxHp, this.hp + Math.max(0, this.maxHp - oldMax));
    const sp = this.armorStats.special;
    this.baseSpeed = 4.6 + (this.heroStats.speed || 0) + (sp === 'heavy' ? -0.5 : 0) + (sp === 'feather' ? 0.5 : 0);
    if (this.petStats.kind === 'boost') this.baseSpeed *= 1 + this.petStats.boost;

    // third-person body (seen by the other player)
    this.body = humanoidModel(colors);
    const held = weaponModel(L.melee);
    held.group.scale.setScalar(0.9);
    this.body.parts.hand.add(held.group);
    setLayer(this.body.group, 1 + this.index);
    g.scene.add(this.body.group);

    // first-person arm
    this.view = viewArmModel(colors);
    this.viewMelee = weaponModel(L.melee).group;
    this.viewRanged = weaponModel(L.ranged).group;
    this.viewMelee.rotation.set(-0.5, 0, 0.25);
    this.viewRanged.rotation.set(0, 0, 0.3);
    this.view.hand.add(this.viewMelee, this.viewRanged);
    this.viewRanged.visible = false;
    this.view.group.scale.setScalar(0.6);
    this.view.group.position.set(0.34, -0.34, -0.5);
    setLayer(this.view.group, 3 + this.index);
    this.camera.add(this.view.group);

    this.pet = new Pet(g, this, L.pet, this.petStats);
  }

  setLoadout(loadout) {
    this.loadout = loadout;
    this.buildModels();
  }

  get eye() { return this.ducking ? DUCK_EYE : EYE; }
  forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }

  collides(px, py, pz, h) {
    const w = this.game.world;
    const x0 = Math.floor(px - HALF_W), x1 = Math.floor(px + HALF_W - 1e-4);
    const z0 = Math.floor(pz - HALF_W), z1 = Math.floor(pz + HALF_W - 1e-4);
    const y0 = Math.floor(py), y1 = Math.floor(py + h - 1e-4);
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (w.isSolid(x, y, z)) return true;
    }
    return false;
  }

  moveAxis(axis, amount) {
    if (amount === 0) return false;
    const p = this.pos;
    p[axis] += amount;
    if (!this.collides(p.x, p.y, p.z, this.height)) return false;
    if (axis === 'y') {
      if (amount < 0) { p.y = Math.floor(p.y) + 1; this.onGround = true; }
      else p.y = Math.floor(p.y + this.height) - this.height - 0.001;
      this.vel.y = 0;
    } else {
      if (amount > 0) p[axis] = Math.floor(p[axis] + HALF_W) - HALF_W - 0.001;
      else p[axis] = Math.floor(p[axis] - HALF_W) + 1 + HALF_W + 0.001;
    }
    return true;
  }

  update(dt, inp) {
    const g = this.game;
    const w = g.world;
    this.invuln -= dt; this.hurtT -= dt; this.meleeT -= dt; this.rangedT -= dt; this.abilityT -= dt;
    this.swingT -= dt; this.shootAnimT -= dt; this.dashT -= dt; this.glideT -= dt; this.featherT -= dt; this.invisT -= dt;
    this.lastHurt += dt;
    if (!this.alive) { this.updateVisuals(dt, false); return; }

    // regen: slowly out of combat, faster with Leaf Guard
    let regen = this.lastHurt > 6 ? 0.25 : 0;
    if (this.armorStats.special === 'regen') regen += 0.5;
    if (regen) this.heal(regen * dt);

    this.yaw += inp.turn * 2.6 * dt;

    // duck
    if (inp.duck && !this.ducking) { this.ducking = true; this.height = DUCK_H; }
    else if (!inp.duck && this.ducking && !this.collides(this.pos.x, this.pos.y, this.pos.z, STAND_H)) { this.ducking = false; this.height = STAND_H; }

    const inLiquid = isLiquidAt(w, this.pos.x, this.pos.y + 0.4, this.pos.z);
    const swimFast = this.armorStats.special === 'swim';
    let speed = this.baseSpeed;
    if (this.ducking) speed *= 0.4;
    if (inLiquid) speed *= swimFast ? 1.0 : 0.55;
    const fwd = this.forward();
    let hx = fwd.x * inp.move * speed, hz = fwd.z * inp.move * speed;
    if (this.dashT > 0) { hx = fwd.x * 22; hz = fwd.z * 22; this.dashDamage(); }
    if (this.glideT > 0) { hx += fwd.x * 7; hz += fwd.z * 7; }
    // knockback velocity decays
    this.vel.x += (hx - this.vel.x) * Math.min(1, dt * (this.onGround ? 14 : 5));
    this.vel.z += (hz - this.vel.z) * Math.min(1, dt * (this.onGround ? 14 : 5));

    // jump / swim / auto-jump
    if (inLiquid) {
      this.vel.y -= GRAVITY * 0.3 * dt;
      if (inp.jump) this.vel.y = swimFast ? 5 : 3.6;
      this.vel.y = Math.max(this.vel.y, -3);
    } else {
      this.vel.y -= GRAVITY * dt;
      const feather = this.featherT > 0 || this.armorStats.special === 'feather';
      if (feather && this.vel.y < -4) this.vel.y = -4;
    }
    if (this.onGround && !this.ducking) {
      let wantJump = inp.jump;
      if (!wantJump && g.save.settings.autoJump && inp.move > 0 && this.dashT <= 0) {
        const ax = this.pos.x + fwd.x * 0.55, az = this.pos.z + fwd.z * 0.55;
        if (w.isSolid(ax, this.pos.y + 0.5, az) && !w.isSolid(ax, this.pos.y + 1.5, az) && !w.isSolid(ax, this.pos.y + 2.5, az)) wantJump = true;
      }
      if (wantJump) { this.vel.y = JUMP_V; this.onGround = false; if (inp.jump) sfx.jump(); }
    }

    // move with collision, in small steps
    const mx = this.vel.x * dt, my = this.vel.y * dt, mz = this.vel.z * dt;
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my), Math.abs(mz)) / 0.4));
    this.onGround = false;
    for (let i = 0; i < steps; i++) {
      if (this.moveAxis('x', mx / steps)) this.vel.x = 0;
      if (this.moveAxis('z', mz / steps)) this.vel.z = 0;
      this.moveAxis('y', my / steps);
    }
    if (!this.onGround && this.vel.y <= 0 && this.collides(this.pos.x, this.pos.y - 0.05, this.pos.z, 0.05)) this.onGround = true;

    // hazards
    if (isLavaAt(w, this.pos.x, this.pos.y + 0.2, this.pos.z) && this.armorStats.special !== 'lavaproof') {
      this.lavaT -= dt;
      if (this.lavaT <= 0) { this.lavaT = 0.5; g.damagePlayer(this, 3, null, 0, true); g.particles.burst(new THREE.Vector3(this.pos.x, this.pos.y + 0.5, this.pos.z), 0xff8a20, 6, 2); }
    }
    this.safeT -= dt;
    if (this.onGround && !inLiquid && this.safeT <= 0) {
      const s = this.pos;
      if (w.isSolid(s.x - 0.3, s.y - 0.5, s.z - 0.3) && w.isSolid(s.x + 0.3, s.y - 0.5, s.z + 0.3) && w.isSolid(s.x + 0.3, s.y - 0.5, s.z - 0.3) && w.isSolid(s.x - 0.3, s.y - 0.5, s.z + 0.3)) {
        this.lastSafe.copy(s);
        this.safeT = 0.5;
      }
    }
    if (this.pos.y < -8) {
      this.pos.copy(this.lastSafe);
      this.vel.set(0, 0, 0);
      g.damagePlayer(this, 4, null, 0, true);
      g.toast(this.index, 'You fell! Back to safe ground.', '#ffffff');
    }

    // combat
    if (inp.melee && this.meleeT <= 0) this.doMelee();
    if (inp.ranged && this.rangedT <= 0) this.doRanged();
    if (inp.ability && this.abilityT <= 0) this.doAbility();
    else if (inp.ability) g.toast(this.index, 'Ability recharging...', '#aaaaaa', 0.8);

    const moving = Math.abs(inp.move) > 0 && this.onGround;
    if (moving) this.walkT += dt * speed * 1.8;
    this.updateVisuals(dt, moving);
  }

  updateVisuals(dt, moving) {
    const cam = this.camera;
    const bob = moving ? Math.sin(this.walkT) * 0.05 : 0;
    cam.position.set(this.pos.x, this.pos.y + this.eye + bob, this.pos.z);
    cam.rotation.set(-0.06, this.yaw, 0);
    if (this.game.shakeT > 0) {
      const s = this.game.shakeT * 0.3;
      cam.position.x += (Math.random() - 0.5) * s; cam.position.y += (Math.random() - 0.5) * s;
    }
    // first-person arm animation
    const v = this.view.group;
    const swing = Math.max(0, this.swingT) / 0.25;
    v.rotation.set(-swing * 1.4 + (moving ? Math.sin(this.walkT * 0.5) * 0.04 : 0), swing * 0.6, 0);
    v.position.set(0.3 - swing * 0.12, -0.3 + (moving ? Math.abs(Math.cos(this.walkT * 0.5)) * 0.02 : 0), -0.55 - swing * 0.1);
    const showRanged = this.shootAnimT > 0;
    this.viewMelee.visible = !showRanged;
    this.viewRanged.visible = showRanged;
    this.view.group.visible = this.alive;

    // third-person body
    const b = this.body;
    b.group.visible = this.alive;
    b.group.position.copy(this.pos);
    b.group.rotation.y = this.yaw;
    b.group.scale.y = this.ducking ? 0.72 : 1;
    const a = moving ? Math.sin(this.walkT) * 0.7 : 0;
    b.parts.legL.rotation.x = a; b.parts.legR.rotation.x = -a;
    b.parts.armL.rotation.x = -a * 0.8;
    b.parts.armR.rotation.x = swing > 0 ? -2.2 * swing : (showRanged ? -1.5 : a * 0.8);
    const invis = this.invisT > 0;
    b.group.traverse((o) => { if (o.material) { o.material.transparent = invis; o.material.opacity = invis ? 0.25 : 1; } });
    this.pet.update(dt);
  }

  // ------------------------------------------------ combat
  doMelee() {
    const g = this.game;
    const s = this.meleeStats;
    this.meleeT = s.cd;
    this.swingT = 0.25;
    sfx.swing();
    let dmg = s.dmg;
    if (this.powerHit) { dmg *= 3; this.powerHit = false; this.invisT = 0; }
    const fwd = this.forward();
    let hitAny = false;
    for (const m of g.mobs) {
      if (!m.alive) continue;
      const dx = m.pos.x - this.pos.x, dz = m.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > s.reach + m.radius) continue;
      const dy = m.pos.y - this.pos.y;
      if (dy > 2.2 || dy + m.height < -0.5) continue;
      const dot = dist > 0.01 ? (dx * fwd.x + dz * fwd.z) / dist : 1;
      if (dot < 0.45 && dist > m.radius + 0.5) continue;
      g.hitMob(m, dmg, this, { effect: s.effect, element: this.meleeElement, from: this.pos, kb: s.effect === 'knockback' ? 14 : 5 });
      hitAny = true;
    }
    if (hitAny) sfx.hit();
  }

  doRanged() {
    const g = this.game;
    const s = this.rangedStats;
    this.rangedT = s.cd;
    this.shootAnimT = 0.5;
    sfx.shoot();
    const from = new THREE.Vector3(this.pos.x, this.pos.y + this.eye - 0.15, this.pos.z);
    const fwd = this.forward();
    from.addScaledVector(fwd, 0.4);
    // gentle auto-aim (there is no look up/down) — pick the closest enemy in front
    let best = null, bestScore = Infinity;
    for (const m of g.mobs) {
      if (!m.alive) continue;
      const c = m.center;
      const dx = c.x - from.x, dz = c.z - from.z;
      const d = Math.hypot(dx, dz);
      if (d > 40 || d < 0.5) continue;
      const dot = (dx * fwd.x + dz * fwd.z) / d;
      if (dot < 0.94) continue;
      const score = d * (2 - dot);
      if (score < bestScore) { bestScore = score; best = c.clone(); }
    }
    const dir = best ? best.sub(from).normalize() : fwd.clone();
    const color = { fire: 0xff7a20, water: 0x7fd8ff, jungle: 0x8aff40, sky: 0xfff27a, none: 0xe8e0d0 }[this.rangedElement];
    for (let i = 0; i < s.count; i++) {
      const spread = s.count > 1 ? ((i / (s.count - 1)) - 0.5) * 0.3 : 0;
      const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), spread);
      g.spawnProjectile({ pos: from.clone(), dir: d, speed: s.speed, dmg: s.dmg, owner: 'player', player: this, color, size: 0.18, effect: s.effect, element: this.rangedElement, gravity: 2 });
    }
  }

  dashDamage() {
    const g = this.game;
    for (const m of g.mobs) {
      if (!m.alive || this.dashHit.has(m)) continue;
      if (Math.hypot(m.pos.x - this.pos.x, m.pos.z - this.pos.z) < m.radius + 1.2 && Math.abs(m.pos.y - this.pos.y) < 2) {
        this.dashHit.add(m);
        g.hitMob(m, this.meleeStats.dmg * 1.5 * this.heroStats.power, this, { from: this.pos, kb: 8 });
      }
    }
  }

  doAbility() {
    const g = this.game;
    const h = this.heroStats;
    this.abilityT = h.cd;
    sfx.ability();
    const p = this.pos;
    const center = new THREE.Vector3(p.x, p.y + 0.8, p.z);
    switch (h.ability) {
      case 'dash':
        this.dashT = 0.25;
        this.dashHit = new Set();
        g.particles.burst(center, 0xffffff, 12, 3);
        break;
      case 'flameBurst':
        g.addEffect(new Burst(g, p, 7, 0xff6a10, 0.45));
        g.particles.burst(center, 0xff8a20, 30, 6);
        for (const m of g.mobs) if (m.alive && m.pos.distanceTo(p) < 7 + m.radius) g.hitMob(m, 8 * h.power, this, { effect: 'burn', element: 'fire', from: p, kb: 8 });
        break;
      case 'healingWave':
        g.addEffect(new Burst(g, p, 8, 0x66e0ff, 0.5));
        for (const pl of g.players) {
          if (pl.alive && pl.pos.distanceTo(p) < 15) { pl.heal(8 * h.power); g.particles.burst(new THREE.Vector3(pl.pos.x, pl.pos.y + 1, pl.pos.z), 0x66ffcc, 16, 3); }
        }
        for (const m of g.mobs) if (m.alive && m.pos.distanceTo(p) < 7 + m.radius) m.takeHit(0.01, p, 14);
        break;
      case 'rootSnare':
        g.addEffect(new Burst(g, p, 9, 0x4fd23a, 0.5));
        for (const m of g.mobs) {
          if (!m.alive || m.pos.distanceTo(p) > 9 + m.radius) continue;
          m.status.root = 3 * h.power * (m.isBoss ? 0.3 : 1);
          g.hitMob(m, 2 * h.power, this, { effect: 'poison', element: 'jungle', from: null });
          g.particles.burst(m.center, 0x4fd23a, 8, 2);
        }
        break;
      case 'galeLeap':
        this.vel.y = 15;
        this.onGround = false;
        this.glideT = 1.4;
        this.featherT = 2.5;
        g.particles.burst(center, 0xffffff, 20, 4);
        break;
      case 'vanish':
        this.invisT = 4 * h.power;
        this.powerHit = true;
        g.particles.burst(center, 0x6a4aaa, 20, 3);
        break;
    }
  }

  dispose() {
    const g = this.game;
    g.scene.remove(this.body.group);
    this.camera.remove(this.view.group);
    g.scene.remove(this.camera);
    this.pet.remove();
  }
}
