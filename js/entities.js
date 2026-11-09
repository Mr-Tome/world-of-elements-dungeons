// Mobs, bosses, pets, projectiles, pickups, particles and visual effects.
import * as THREE from '../vendor/three.module.min.js';
import { mobModel, petModel, flashModel } from './models.js';
import { LIQUID, B } from './blocks.js';
import { cardIcon, rarityOf, RARITY_INDEX, CARD_DEFS } from './cards.js';
import { sfx } from './audio.js';

const tmpV = new THREE.Vector3();

// ---------------------------------------------------------------- mob definitions
export const MOB_DEFS = {
  magmaSlime: { name: 'Magma Slime', element: 'fire', hp: 14, dmg: 3, speed: 2.6, aggro: 20, reach: 1.5, attackCd: 1.2 },
  fireImp: { name: 'Fire Imp', element: 'fire', hp: 10, dmg: 2, speed: 3.0, aggro: 24, reach: 1.5, attackCd: 1.2,
    ranged: { dmg: 3, speed: 15, cd: 2.4, range: 18, color: 0xff8a20, size: 0.25 } },
  crab: { name: 'Snapper Crab', element: 'water', hp: 16, dmg: 3, speed: 3.2, aggro: 20, reach: 1.8, attackCd: 1.1 },
  jelly: { name: 'Zap Jelly', element: 'water', hp: 10, dmg: 2, speed: 1.8, aggro: 22, reach: 1.6, attackCd: 1.5, hover: 1.2,
    ranged: { dmg: 2.5, speed: 12, cd: 2.6, range: 15, color: 0xff7ad0, size: 0.3 } },
  vineCrawler: { name: 'Vine Crawler', element: 'jungle', hp: 12, dmg: 3, speed: 4.6, aggro: 20, reach: 1.7, attackCd: 1.0 },
  thornShooter: { name: 'Thorn Shooter', element: 'jungle', hp: 14, dmg: 0, speed: 0, aggro: 24, reach: 0, attackCd: 9,
    ranged: { dmg: 3, speed: 20, cd: 1.8, range: 22, color: 0x6aff3a, size: 0.2 } },
  wisp: { name: 'Storm Wisp', element: 'sky', hp: 9, dmg: 2, speed: 3.0, aggro: 24, reach: 1.5, attackCd: 1.5, hover: 1.5,
    ranged: { dmg: 3, speed: 18, cd: 2.2, range: 20, color: 0x7fe0ff, size: 0.25 } },
  skyHawk: { name: 'Sky Hawk', element: 'sky', hp: 12, dmg: 3, speed: 5.5, aggro: 22, reach: 1.8, attackCd: 1.2, hover: 1.0 },
};

export const BOSS_DEFS = {
  magmaw: { name: 'Magmaw, the Inferno Golem', element: 'fire', hp: 520, dmg: 4.5, speed: 2.4, reach: 2.6, attackCd: 1.4,
    attacks: ['volley', 'slam', 'strike', 'summon'], proj: 0xff6a10, strike: 0xff4400, summon: 'magmaSlime' },
  kraal: { name: 'Kraal, the Tide Tyrant', element: 'water', hp: 480, dmg: 4.5, speed: 3.4, reach: 2.8, attackCd: 1.3,
    attacks: ['charge', 'volley', 'strike', 'summon', 'slam'], proj: 0x66ccff, strike: 0x2a9aff, summon: 'crab' },
  thornroot: { name: 'Elder Thornroot', element: 'jungle', hp: 620, dmg: 5, speed: 1.6, reach: 2.8, attackCd: 1.5,
    attacks: ['strike', 'volley', 'slam', 'summon'], proj: 0x6aff3a, strike: 0x3a9a1a, summon: 'vineCrawler' },
  stormwing: { name: 'Stormwing, Lord of Thunder', element: 'sky', hp: 450, dmg: 4.5, speed: 5, reach: 3, attackCd: 1.2, hover: 1.5,
    attacks: ['strike', 'charge', 'volley', 'gust'], proj: 0xffe94a, strike: 0xfff27a, summon: 'wisp' },
};

// ---------------------------------------------------------------- mob
export class Mob {
  constructor(game, type, x, y, z, opts = {}) {
    this.game = game;
    this.type = type;
    this.def = opts.boss ? BOSS_DEFS[type] : MOB_DEFS[type];
    const lvl = game.level;
    const hpScale = (1 + 0.35 * (lvl - 1)) * (game.players.length > 1 ? 1.5 : 1);
    this.maxHp = this.def.hp * hpScale;
    this.hp = this.maxHp;
    this.dmg = this.def.dmg * (1 + 0.25 * (lvl - 1));
    this.model = mobModel(type, opts.scale || 1);
    this.flying = !!this.model.flying;
    this.stationary = !!this.model.stationary;
    this.radius = this.model.radius;
    this.height = this.model.height;
    this.pos = this.model.group.position;
    this.pos.set(x, y, z);
    this.home = new THREE.Vector3(x, y, z);
    game.scene.add(this.model.group);
    this.alive = true;
    this.vy = 0;
    this.kb = new THREE.Vector2();
    this.status = { burn: 0, burnDps: 0, poison: 0, poisonDps: 0, slow: 0, root: 0 };
    this.attackT = Math.random();
    this.shootT = 1 + Math.random() * 2;
    this.wanderT = 0;
    this.heading = Math.random() * Math.PI * 2;
    this.wandering = false;
    this.flashT = 0;
    this.t = Math.random() * 10;
    this.isBoss = false;
    this.minion = !!opts.minion;
    this.awake = !!opts.awake;
  }

  get center() { return tmpV.set(this.pos.x, this.pos.y + this.height * 0.5, this.pos.z); }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    this.tickStatus(dt);
    if (!this.alive) return;
    const target = this.game.nearestPlayer(this.pos, this.awake ? 60 : this.def.aggro);
    let moving = false;
    let mx = 0, mz = 0;
    if (target && this.status.root <= 0) {
      this.awake = true;
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const dist = Math.hypot(dx, dz);
      this.heading = Math.atan2(-dx, -dz);
      const r = this.def.ranged;
      if (r) {
        this.shootT -= dt;
        if (dist < r.range && this.shootT <= 0) {
          this.shootT = r.cd * (0.8 + Math.random() * 0.4);
          this.shoot(target, r);
        }
      }
      const keepAway = r ? r.range * 0.5 : 0;
      if (!this.stationary) {
        if (dist > Math.max(this.def.reach + this.radius * 0.5, keepAway)) { mx = dx / dist; mz = dz / dist; moving = true; }
        else if (r && dist < keepAway * 0.6) { mx = -dx / dist; mz = -dz / dist; moving = true; }
      }
      this.attackT -= dt;
      if (this.def.reach > 0 && dist < this.def.reach + this.radius * 0.5 && Math.abs(target.pos.y - this.pos.y) < 2 + this.height && this.attackT <= 0) {
        this.attackT = this.def.attackCd;
        this.game.damagePlayer(target, this.dmg, this.pos);
      }
    } else if (!this.stationary && this.status.root <= 0) {
      this.wanderT -= dt;
      if (this.wanderT <= 0) {
        this.wanderT = 2 + Math.random() * 3;
        this.wandering = Math.random() < 0.6;
        this.heading = Math.random() * Math.PI * 2;
        // drift back toward home if wandered far
        if (Math.hypot(this.pos.x - this.home.x, this.pos.z - this.home.z) > 14) {
          this.heading = Math.atan2(-(this.home.x - this.pos.x), -(this.home.z - this.pos.z));
        }
      }
      if (this.wandering) { mx = -Math.sin(this.heading) * 0.4; mz = -Math.cos(this.heading) * 0.4; moving = true; }
    }
    const spd = this.def.speed * (this.status.slow > 0 ? 0.45 : 1);
    this.move((mx * spd + this.kb.x) * dt, (mz * spd + this.kb.y) * dt);
    this.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
    this.vertical(dt, target);
    this.model.group.rotation.y = this.heading;
    this.model.anim(this.t, moving, this.state);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) flashModel(this.model, false); }
  }

  tickStatus(dt) {
    const s = this.status;
    if (s.burn > 0) { s.burn -= dt; this.hurtRaw(s.burnDps * dt); if (Math.random() < dt * 8) this.game.particles.burst(this.center, 0xff7a20, 1, 1.5); }
    if (s.poison > 0) { s.poison -= dt; this.hurtRaw(s.poisonDps * dt); if (Math.random() < dt * 6) this.game.particles.burst(this.center, 0x7aff3a, 1, 1); }
    if (s.slow > 0) s.slow -= dt;
    if (s.root > 0) s.root -= dt;
  }

  hurtRaw(amount) {
    this.hp -= amount;
    if (this.hp <= 0 && this.alive) this.die();
  }

  move(dx, dz) {
    if (dx === 0 && dz === 0) return;
    const w = this.game.world;
    const nx = this.pos.x + dx, nz = this.pos.z + dz;
    if (nx < 1 || nz < 1 || nx > w.sx - 1 || nz > w.sz - 1) { this.wanderT = 0; return; }
    if (this.flying) {
      if (w.isSolid(nx, this.pos.y + 0.3, nz) || w.isSolid(nx, this.pos.y + this.height * 0.8, nz)) { this.wanderT = 0; return; }
      this.pos.x = nx; this.pos.z = nz;
      return;
    }
    const g = w.groundBelow(nx, this.pos.y + 1.2, nz);
    if (g > this.pos.y + 1.05 || g < this.pos.y - 3 || g === -Infinity) { this.wanderT = 0; return; }
    if (this.radius > 1 && w.isSolid(nx, this.pos.y + 1.5, nz)) { this.wanderT = 0; return; }
    this.pos.x = nx; this.pos.z = nz;
    if (g > this.pos.y) this.pos.y = g;
  }

  vertical(dt, target) {
    const w = this.game.world;
    if (this.flying) {
      let g = w.groundBelow(this.pos.x, this.pos.y + 1, this.pos.z);
      // hover over water surface too
      const top = w.tops[Math.floor(this.pos.z) * w.sx + Math.floor(this.pos.x)] + 1;
      if (top > g && top < this.pos.y + 3) g = top;
      let want = (g === -Infinity ? this.home.y : g) + (this.def.hover || 1.2);
      if (target) want = Math.max(want, target.pos.y + 0.6);
      this.pos.y += (want - this.pos.y) * Math.min(1, dt * 2);
      return;
    }
    const g = w.groundBelow(this.pos.x, this.pos.y + 0.5, this.pos.z);
    this.vy -= 25 * dt;
    this.pos.y += this.vy * dt;
    if (this.pos.y <= g) { this.pos.y = g; this.vy = 0; }
    if (this.pos.y < -12) { this.alive = false; this.remove(); }
  }

  shoot(target, r) {
    const from = this.center.clone();
    from.y += this.height * 0.15;
    const to = new THREE.Vector3(target.pos.x, target.pos.y + 1.0, target.pos.z);
    const dir = to.sub(from).normalize();
    this.game.spawnProjectile({ pos: from, dir, speed: r.speed, dmg: r.dmg * (1 + 0.25 * (this.game.level - 1)), owner: 'mob', color: r.color, size: r.size || 0.25 });
  }

  // Called by the game when hit by a player
  takeHit(dmg, fromPos, kbForce = 4) {
    this.awake = true;
    this.hp -= dmg;
    flashModel(this.model, true);
    this.flashT = 0.12;
    if (fromPos) {
      const dx = this.pos.x - fromPos.x, dz = this.pos.z - fromPos.z;
      const d = Math.hypot(dx, dz) || 1;
      const k = this.isBoss ? kbForce * 0.08 : kbForce;
      this.kb.set((dx / d) * k, (dz / d) * k);
      if (!this.flying && !this.isBoss) this.vy = Math.max(this.vy, kbForce * 0.6);
    }
    if (this.hp <= 0 && this.alive) this.die();
  }

  die() {
    this.alive = false;
    this.game.particles.burst(this.center, 0xffffff, 14, 4);
    this.game.particles.burst(this.center, this.isBoss ? 0xffd040 : 0xff5050, 10, 3);
    sfx.mobDie();
    this.remove();
    this.game.onMobKilled(this);
  }

  remove() { this.game.scene.remove(this.model.group); }
}

// ---------------------------------------------------------------- boss
export class Boss extends Mob {
  constructor(game, type, x, y, z) {
    super(game, type, x, y, z, { boss: true });
    this.isBoss = true;
    this.awake = false;
    this.state = 'dormant';
    this.stateT = 0;
    this.attackIdx = 0;
    this.nextAttackT = 3;
    this.arena = game.arena;
    this.minions = [];
    this.flying = !!this.model.flying;
    this.charge = null;
    this.maxHp *= game.players.length > 1 ? 1.0 : 1; // already scaled in Mob
  }
  get phase2() { return this.hp < this.maxHp * 0.5; }

  update(dt) {
    if (!this.alive) return;
    this.t += dt;
    this.tickStatus(dt);
    if (!this.alive) return;
    const g = this.game;
    if (this.state === 'dormant') {
      const p = g.nearestPlayer(this.arena, 26);
      this.model.anim(this.t, false, 'idle');
      if (p) { this.state = 'chase'; this.awake = true; g.onBossAwake(this); sfx.roar(); }
      return;
    }
    const target = g.nearestPlayer(this.pos, 200);
    if (!target) { this.model.anim(this.t, false, 'idle'); return; }
    const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    let moving = false;
    let mx = 0, mz = 0;

    if (this.state === 'chase') {
      this.heading = Math.atan2(-dx, -dz);
      const keep = this.flying ? 7 : this.def.reach + this.radius * 0.6;
      if (dist > keep && this.status.root <= 0) { mx = dx / dist; mz = dz / dist; moving = true; }
      else if (this.flying && dist < keep - 2) { mx = -dx / dist; mz = -dz / dist; moving = true; }
      this.attackT -= dt;
      if (dist < this.def.reach + this.radius && Math.abs(target.pos.y - this.pos.y) < this.height && this.attackT <= 0) {
        this.attackT = this.def.attackCd;
        g.damagePlayer(target, this.dmg, this.pos);
      }
      this.nextAttackT -= dt;
      if (this.nextAttackT <= 0) {
        const list = this.def.attacks;
        this.current = list[this.attackIdx % list.length];
        if (Math.random() < 0.3) this.current = list[Math.floor(Math.random() * list.length)];
        this.attackIdx++;
        this.state = 'windup';
        this.stateT = 0.8;
        if (this.current === 'strike') this.prepareStrike();
      }
    } else if (this.state === 'windup') {
      this.heading = Math.atan2(-dx, -dz);
      this.stateT -= dt;
      if (this.stateT <= 0) { this.execute(target); this.nextAttackT = this.phase2 ? 2.2 : 3.4; }
    } else if (this.state === 'charging') {
      const c = this.charge;
      c.t -= dt;
      mx = c.dx; mz = c.dz; moving = true;
      const before = this.pos.clone();
      this.move(mx * 18 * dt, mz * 18 * dt);
      if (this.pos.distanceTo(before) < 0.01 || c.t <= 0) { this.state = 'chase'; this.charge = null; }
      for (const p of g.players) {
        if (!p.alive || c.hit.has(p)) continue;
        if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius + 0.8 && Math.abs(p.pos.y - this.pos.y) < this.height) {
          c.hit.add(p);
          g.damagePlayer(p, this.dmg * 1.2, this.pos, 14);
        }
      }
      mx = 0; mz = 0;
    }
    // stay inside the arena
    const spd = this.def.speed * (this.status.slow > 0 ? 0.6 : 1) * (this.phase2 ? 1.25 : 1);
    this.move((mx * spd + this.kb.x) * dt, (mz * spd + this.kb.y) * dt);
    this.kb.multiplyScalar(Math.max(0, 1 - dt * 6));
    const ax = this.pos.x - this.arena.x, az = this.pos.z - this.arena.z;
    const ad = Math.hypot(ax, az), maxR = this.game.arenaR - 3;
    if (ad > maxR) { this.pos.x = this.arena.x + (ax / ad) * maxR; this.pos.z = this.arena.z + (az / ad) * maxR; }
    if (this.flying) {
      const want = this.state === 'charging' ? target.pos.y + 0.5 : this.arena.y + (this.def.hover || 5);
      this.pos.y += (want - this.pos.y) * Math.min(1, dt * 3);
    } else {
      this.vertical(dt, null);
      if (this.pos.y < this.arena.y - 1) this.pos.y = this.arena.y;
    }
    this.model.group.rotation.y = this.heading;
    this.model.anim(this.t, moving, this.state);
    if (this.flashT > 0) { this.flashT -= dt; if (this.flashT <= 0) flashModel(this.model, false); }
    this.minions = this.minions.filter((m) => m.alive);
  }

  prepareStrike() {
    const g = this.game;
    const spots = [];
    for (const p of g.players) if (p.alive) spots.push(new THREE.Vector3(p.pos.x, this.arena.y, p.pos.z));
    const extra = this.phase2 ? 4 : 2;
    for (let i = 0; i < extra; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * (g.arenaR - 3);
      spots.push(new THREE.Vector3(this.arena.x + Math.cos(a) * r, this.arena.y, this.arena.z + Math.sin(a) * r));
    }
    this.strikeSpots = spots;
    for (const s of spots) g.addEffect(new Telegraph(g, s, 2.3, 1.4, this.def.strike));
  }

  execute(target) {
    const g = this.game;
    this.state = 'chase';
    const from = this.center.clone();
    switch (this.current) {
      case 'volley': {
        const n = this.phase2 ? 9 : 6;
        const to = new THREE.Vector3(target.pos.x, target.pos.y + 1, target.pos.z);
        const base = to.sub(from).normalize();
        for (let i = 0; i < n; i++) {
          const ang = ((i / (n - 1)) - 0.5) * 1.0;
          const dir = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
          g.spawnProjectile({ pos: from.clone(), dir, speed: 14, dmg: this.dmg * 0.7, owner: 'mob', color: this.def.proj, size: 0.45 });
        }
        sfx.shoot();
        break;
      }
      case 'slam': {
        g.addEffect(new Shockwave(g, new THREE.Vector3(this.pos.x, this.arena.y, this.pos.z), 18, 1.4, this.def.proj, this.dmg));
        g.shake(0.4);
        sfx.boom();
        break;
      }
      case 'strike': {
        // telegraphs were placed during windup; they hurt when they finish
        break;
      }
      case 'summon': {
        if (this.minions.length < 5) {
          const n = this.phase2 ? 3 : 2;
          for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const m = g.spawnMob(this.def.summon, this.pos.x + Math.cos(a) * 4, this.arena.y + 1, this.pos.z + Math.sin(a) * 4, { minion: true, awake: true });
            if (m) this.minions.push(m);
          }
          g.particles.burst(from, this.def.proj, 20, 5);
        }
        break;
      }
      case 'charge': {
        const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.charge = { dx: dx / d, dz: dz / d, t: 1.1, hit: new Set() };
        this.state = 'charging';
        sfx.roar();
        break;
      }
      case 'gust': {
        for (const p of g.players) {
          if (!p.alive) continue;
          const dx = p.pos.x - this.pos.x, dz = p.pos.z - this.pos.z;
          const d = Math.hypot(dx, dz);
          if (d < 14) g.damagePlayer(p, this.dmg * 0.4, this.pos, 18);
        }
        g.addEffect(new Shockwave(g, new THREE.Vector3(this.pos.x, this.arena.y + 0.5, this.pos.z), 14, 0.6, 0xffffff, 0));
        sfx.boom();
        break;
      }
    }
  }
}

// ---------------------------------------------------------------- pet
export class Pet {
  constructor(game, owner, card, stats) {
    this.game = game;
    this.owner = owner;
    this.card = card;
    this.stats = stats;
    this.element = CARD_DEFS[card.def].element;
    this.model = petModel(card.def, stats.color);
    this.pos = this.model.group.position;
    this.pos.copy(owner.pos).add(new THREE.Vector3(1, 0, 1));
    game.scene.add(this.model.group);
    this.t = 0;
    this.actT = stats.cd;
    this.vy = 0;
  }
  update(dt) {
    const o = this.owner;
    this.t += dt;
    this.model.group.visible = o.alive;
    if (!o.alive) return;
    const g = this.game, w = g.world;
    const side = this.owner.index === 0 ? 1 : -1;
    let tx = o.pos.x + Math.cos(o.yaw) * 1.3 * side + Math.sin(o.yaw) * 1.2;
    let tz = o.pos.z - Math.sin(o.yaw) * 1.3 * side + Math.cos(o.yaw) * 1.2;
    const s = this.stats;
    let target = null;
    if (s.kind === 'bite' || s.kind === 'shoot') target = g.nearestMob(o.pos, s.kind === 'bite' ? 9 : 14);
    if (target && s.kind === 'bite') { tx = target.pos.x; tz = target.pos.z; }
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z) > 16 || Math.abs(o.pos.y - this.pos.y) > 8) {
      this.pos.set(o.pos.x, o.pos.y + 0.5, o.pos.z);
    }
    const moving = d > 0.5;
    if (moving) {
      const spd = Math.min(d * 3, 8);
      const nx = this.pos.x + (dx / d) * spd * dt, nz = this.pos.z + (dz / d) * spd * dt;
      this.pos.x = nx; this.pos.z = nz;
      this.model.group.rotation.y = Math.atan2(-dx, -dz);
    }
    if (s.fly) {
      const want = o.pos.y + 1.8 + Math.sin(this.t * 3) * 0.2;
      this.pos.y += (want - this.pos.y) * Math.min(1, dt * 4);
    } else {
      const gnd = w.groundBelow(this.pos.x, this.pos.y + 1.3, this.pos.z);
      this.vy -= 25 * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= gnd) { this.pos.y = gnd; this.vy = 0; }
      if (this.pos.y < o.pos.y - 4) this.pos.y = o.pos.y;
    }
    this.model.anim(this.t, moving);

    this.actT -= dt;
    if (this.actT > 0) return;
    if (s.kind === 'bite' && target && Math.hypot(target.pos.x - this.pos.x, target.pos.z - this.pos.z) < target.radius + 1) {
      this.actT = s.cd;
      g.hitMob(target, s.dmg, this.owner, { effect: s.effect, element: this.element, from: this.pos, kb: 2 });
    } else if (s.kind === 'shoot' && target) {
      this.actT = s.cd;
      const from = this.pos.clone(); from.y += 0.4;
      const to = target.center.clone();
      g.spawnProjectile({ pos: from, dir: to.sub(from).normalize(), speed: 24, dmg: s.dmg, owner: 'player', player: this.owner, color: s.effect === 'burn' ? 0xff6a10 : 0x9aff40, size: 0.18, effect: s.effect, element: this.element });
    } else if (s.kind === 'heal') {
      this.actT = s.cd;
      for (const p of g.players) {
        if (p.alive && (p === o || p.pos.distanceTo(o.pos) < 8) && p.hp < p.maxHp) {
          p.heal(s.heal);
          g.particles.burst(new THREE.Vector3(p.pos.x, p.pos.y + 1, p.pos.z), 0x66ffaa, 8, 2);
        }
      }
    }
  }
  remove() { this.game.scene.remove(this.model.group); }
}

// ---------------------------------------------------------------- projectile
const projGeo = new THREE.BoxGeometry(1, 1, 1);
export class Projectile {
  constructor(game, o) {
    this.game = game;
    this.owner = o.owner;
    this.player = o.player || null;
    this.dmg = o.dmg;
    this.effect = o.effect;
    this.element = o.element;
    this.size = o.size || 0.2;
    this.vel = o.dir.clone().multiplyScalar(o.speed);
    this.gravity = o.gravity || 0;
    this.life = o.life || 3;
    this.color = o.color;
    this.mesh = new THREE.Mesh(projGeo, new THREE.MeshBasicMaterial({ color: o.color }));
    this.mesh.scale.setScalar(this.size);
    this.mesh.position.copy(o.pos);
    this.pos = this.mesh.position;
    game.scene.add(this.mesh);
    this.alive = true;
  }
  update(dt) {
    const g = this.game;
    this.life -= dt;
    this.vel.y -= this.gravity * dt;
    const steps = 2;
    for (let s = 0; s < steps && this.alive; s++) {
      this.pos.addScaledVector(this.vel, dt / steps);
      if (g.world.isSolid(this.pos.x, this.pos.y, this.pos.z)) { this.kill(true); return; }
      if (this.owner === 'player') {
        for (const m of g.mobs) {
          if (!m.alive) continue;
          const dy = this.pos.y - m.pos.y;
          if (dy < -0.3 || dy > m.height + 0.3) continue;
          if (Math.hypot(this.pos.x - m.pos.x, this.pos.z - m.pos.z) < m.radius + this.size) {
            g.hitMob(m, this.dmg, this.player, { effect: this.effect, element: this.element, from: this.pos, kb: 3 });
            this.kill(true);
            return;
          }
        }
      } else {
        for (const p of g.players) {
          if (!p.alive) continue;
          const dy = this.pos.y - p.pos.y;
          if (dy < -0.2 || dy > p.height + 0.2) continue;
          if (Math.hypot(this.pos.x - p.pos.x, this.pos.z - p.pos.z) < 0.4 + this.size) {
            g.damagePlayer(p, this.dmg, this.pos.clone().sub(this.vel));
            this.kill(true);
            return;
          }
        }
      }
    }
    this.mesh.rotation.x += dt * 8;
    this.mesh.rotation.y += dt * 6;
    if (this.life <= 0) this.kill(false);
  }
  kill(burst) {
    this.alive = false;
    if (burst) this.game.particles.burst(this.pos, this.color, 5, 2);
    this.game.scene.remove(this.mesh);
    this.mesh.material.dispose();
  }
}

// ---------------------------------------------------------------- pickups
const cardGeo = new THREE.BoxGeometry(0.55, 0.8, 0.06);
const heartGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const beamGeo = new THREE.BoxGeometry(0.15, 14, 0.15);
export class Pickup {
  constructor(game, kind, pos, card = null) {
    this.game = game;
    this.kind = kind;
    this.card = card;
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    this.pos = this.group.position;
    this.baseY = pos.y;
    this.vy = 4;
    this.t = Math.random() * 6;
    if (kind === 'card') {
      const r = rarityOf(card.rarity);
      const tex = new THREE.TextureLoader().load(cardIcon(card));
      tex.magFilter = THREE.NearestFilter;
      tex.colorSpace = THREE.SRGBColorSpace;
      const edge = new THREE.MeshBasicMaterial({ color: r.color });
      const face = new THREE.MeshBasicMaterial({ map: tex, color: 0xffffff });
      const mesh = new THREE.Mesh(cardGeo, [edge, edge, edge, edge, face, face]);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.9, 0.04), new THREE.MeshBasicMaterial({ color: r.color }));
      this.group.add(frame, mesh);
      this.spinner = this.group;
      if (RARITY_INDEX[card.rarity] >= 1) {
        const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: r.color, transparent: true, opacity: 0.35, fog: false, depthWrite: false }));
        beam.position.y = 7;
        this.beam = beam;
        game.scene.add(beam);
      }
      this.life = 120;
    } else {
      const mesh = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xff3355 }));
      const shine = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.42), new THREE.MeshBasicMaterial({ color: 0xffaabb }));
      shine.position.set(-0.08, 0.08, 0);
      this.group.add(mesh, shine);
      this.life = 30;
    }
    game.scene.add(this.group);
    this.alive = true;
  }
  update(dt) {
    const g = this.game;
    this.t += dt;
    this.life -= dt;
    const gnd = g.world.groundBelow(this.pos.x, this.pos.y + 0.5, this.pos.z);
    this.vy -= 20 * dt;
    this.baseY += this.vy * dt;
    if (this.baseY < gnd + 0.6) { this.baseY = gnd + 0.6; this.vy = 0; }
    this.pos.y = this.baseY + Math.sin(this.t * 3) * 0.12;
    this.group.rotation.y += dt * 2;
    if (this.beam) this.beam.position.set(this.pos.x, this.pos.y + 7, this.pos.z);
    for (const p of g.players) {
      if (!p.alive) continue;
      if (Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < 1.5 && Math.abs(p.pos.y + 0.9 - this.pos.y) < 2) {
        if (this.kind === 'heart' && p.hp >= p.maxHp) continue;
        g.collect(this, p);
        this.remove();
        return;
      }
    }
    if (this.life <= 0) this.remove();
  }
  remove() {
    this.alive = false;
    this.game.scene.remove(this.group);
    if (this.beam) this.game.scene.remove(this.beam);
  }
}

// ---------------------------------------------------------------- particles (one instanced mesh)
export class Particles {
  constructor(scene, max = 500) {
    this.max = max;
    this.mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff }), max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.p = [];
    for (let i = 0; i < max; i++) this.p.push({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 0.1, g: 9 });
    this.next = 0;
    this.m = new THREE.Matrix4();
    this.c = new THREE.Color();
    for (let i = 0; i < max; i++) { this.m.makeScale(0, 0, 0); this.mesh.setMatrixAt(i, this.m); this.mesh.setColorAt(i, this.c.set(0xffffff)); }
  }
  burst(pos, color, n = 8, speed = 3, opts = {}) {
    for (let k = 0; k < n; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      const p = this.p[i];
      p.life = p.maxLife = (opts.life || 0.6) * (0.6 + Math.random() * 0.8);
      p.x = pos.x; p.y = pos.y; p.z = pos.z;
      p.vx = (Math.random() - 0.5) * speed * 2;
      p.vy = Math.random() * speed * (opts.up ?? 1.2);
      p.vz = (Math.random() - 0.5) * speed * 2;
      p.s = (opts.size || 0.12) * (0.6 + Math.random() * 0.8);
      p.g = opts.gravity ?? 9;
      this.mesh.setColorAt(i, this.c.set(color));
    }
    this.mesh.instanceColor.needsUpdate = true;
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) {
      const p = this.p[i];
      if (p.life <= 0) continue;
      p.life -= dt;
      p.vy -= p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const s = p.life > 0 ? p.s * Math.min(1, p.life / p.maxLife * 2) : 0;
      this.m.makeScale(s, s, s);
      this.m.setPosition(p.x, p.y, p.z);
      this.mesh.setMatrixAt(i, this.m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

// ---------------------------------------------------------------- effects
// Red warning circle on the ground; hurts players standing in it when the timer ends.
export class Telegraph {
  constructor(game, pos, radius, time, color) {
    this.game = game; this.pos = pos; this.radius = radius; this.time = time; this.t = 0; this.color = color;
    this.mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true, opacity: 0.35, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(pos.x, pos.y + 0.05, pos.z);
    this.inner = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.5, depthWrite: false }));
    this.inner.rotation.x = -Math.PI / 2;
    this.inner.position.set(pos.x, pos.y + 0.07, pos.z);
    this.inner.scale.setScalar(0.01);
    game.scene.add(this.mesh, this.inner);
  }
  update(dt) {
    this.t += dt;
    const k = Math.min(1, this.t / this.time);
    this.inner.scale.setScalar(k);
    if (this.t >= this.time) {
      const g = this.game;
      g.scene.remove(this.mesh, this.inner);
      this.mesh.geometry.dispose(); this.inner.geometry.dispose();
      g.addEffect(new Column(g, this.pos, this.color, this.radius));
      const boss = g.boss;
      for (const p of g.players) {
        if (p.alive && Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z) < this.radius && p.pos.y < this.pos.y + 3) {
          g.damagePlayer(p, boss ? boss.dmg * 1.1 : 6, this.pos, 6);
        }
      }
      return false;
    }
    return true;
  }
}

// A burst column (fire pillar / geyser / roots / lightning)
export class Column {
  constructor(game, pos, color, radius) {
    this.game = game; this.t = 0;
    this.mesh = new THREE.Mesh(new THREE.BoxGeometry(radius * 1.2, 10, radius * 1.2), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false }));
    this.mesh.position.set(pos.x, pos.y + 5, pos.z);
    game.scene.add(this.mesh);
    game.particles.burst(new THREE.Vector3(pos.x, pos.y + 0.5, pos.z), color, 16, 5);
  }
  update(dt) {
    this.t += dt;
    const k = this.t / 0.5;
    this.mesh.material.opacity = 0.8 * (1 - k);
    this.mesh.scale.set(1 - k * 0.6, 1, 1 - k * 0.6);
    if (k >= 1) { this.game.scene.remove(this.mesh); this.mesh.geometry.dispose(); return false; }
    return true;
  }
}

// Expanding ring on the ground — jump over it!
export class Shockwave {
  constructor(game, pos, maxR, time, color, dmg) {
    this.game = game; this.pos = pos; this.maxR = maxR; this.time = time; this.t = 0; this.dmg = dmg;
    this.hit = new Set();
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(pos.x, pos.y + 0.3, pos.z);
    game.scene.add(this.mesh);
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.time;
    const r = Math.max(0.1, k * this.maxR);
    this.mesh.scale.set(r, r, 1);
    this.mesh.material.opacity = 0.85 * (1 - k * 0.7);
    if (this.dmg > 0) {
      for (const p of this.game.players) {
        if (!p.alive || this.hit.has(p)) continue;
        const d = Math.hypot(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
        if (Math.abs(d - r) < 0.9 && p.pos.y - this.pos.y < 0.7) {
          this.hit.add(p);
          this.game.damagePlayer(p, this.dmg, this.pos, 10);
        }
      }
    }
    if (k >= 1) { this.game.scene.remove(this.mesh); this.mesh.geometry.dispose(); return false; }
    return true;
  }
}

// Short-lived expanding sphere-ish burst for hero abilities
export class Burst {
  constructor(game, pos, radius, color, time = 0.4) {
    this.game = game; this.t = 0; this.time = time; this.radius = radius;
    this.mesh = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 40), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.set(pos.x, pos.y + 0.4, pos.z);
    game.scene.add(this.mesh);
  }
  update(dt) {
    this.t += dt;
    const k = this.t / this.time;
    const r = Math.max(0.1, k * this.radius);
    this.mesh.scale.set(r, r, 1);
    this.mesh.material.opacity = 0.9 * (1 - k);
    if (k >= 1) { this.game.scene.remove(this.mesh); this.mesh.geometry.dispose(); return false; }
    return true;
  }
}

// Line of lightning between two points (for shock chains)
export class Bolt {
  constructor(game, a, b, color = 0xbfefff) {
    this.game = game; this.t = 0;
    const geo = new THREE.BufferGeometry().setFromPoints([a.clone(), a.clone().lerp(b, 0.5).add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5))), b.clone()]);
    this.mesh = new THREE.Line(geo, new THREE.LineBasicMaterial({ color }));
    game.scene.add(this.mesh);
  }
  update(dt) {
    this.t += dt;
    if (this.t > 0.2) { this.game.scene.remove(this.mesh); this.mesh.geometry.dispose(); return false; }
    return true;
  }
}

export function isLiquidAt(world, x, y, z) {
  return LIQUID[world.blockAt(x, y, z)] === 1;
}
export function isLavaAt(world, x, y, z) {
  return world.blockAt(x, y, z) === B.LAVA;
}
