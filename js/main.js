// World of Elements: Dungeons — game setup, main loop, combat rules and realm flow.
import * as THREE from '../vendor/three.module.min.js';
import { Input, lockKeys } from './input.js';
import { loadSave, writeSave, resetSave, addCard } from './save.js';
import { REALMS, generateRealm, ARENA_R } from './realms.js';
import { ChunkManager } from './world.js';
import { Player } from './player.js';
import { Mob, Boss, Projectile, Pickup, Particles, Bolt, MOB_DEFS } from './entities.js';
import { STRONG_VS, rollCard, RARITY_INDEX, CARD_DEFS } from './cards.js';
import { UI } from './ui.js';
import { sfx, initAudio, setSound } from './audio.js';

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));

class Game {
  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('view').appendChild(this.renderer.domElement);
    this.input = new Input();
    this.save = loadSave();
    this.numPlayers = 1;
    this.state = 'menu';
    this.players = [];
    this.mobs = [];
    this.scene = null;
    this.rng = Math.random;
    this.ui = new UI(this);
    this.applySettings();
    this.ui.showMenu();
    this.clock = new THREE.Clock();
    window.addEventListener('resize', () => this.renderer.setSize(window.innerWidth, window.innerHeight));
    window.addEventListener('pointerdown', () => initAudio());
    window.addEventListener('keydown', () => initAudio());
    document.addEventListener('fullscreenchange', () => {
      if (!document.fullscreenElement && this.state === 'playing') this.pause();
    });
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  applySettings() { setSound(this.save.settings.sound); }
  resetSave() { this.save = resetSave(); writeSave(this.save); this.applySettings(); }

  // ------------------------------------------------ realm lifecycle
  async startRealm(realmId) {
    initAudio();
    if (this.save.settings.fullscreen) lockKeys(true);
    const realm = REALMS[realmId];
    this.ui.showLoading(`Building the ${realm.name}...`);
    await nextFrame();
    this.cleanupRealm();
    this.realm = realm;
    this.realmId = realmId;
    this.level = this.save.cleared[realmId] + 1;
    const seed = (Math.random() * 1e9) | 0;
    const t0 = performance.now();
    const { world, spawn, arena, mobSpawns } = generateRealm(realmId, seed);
    this.world = world;
    this.spawn = spawn;
    this.arena = arena;
    this.arenaR = ARENA_R;

    const scene = new THREE.Scene();
    this.scene = scene;
    scene.background = new THREE.Color(realm.sky);
    scene.fog = new THREE.Fog(realm.fog, realm.fogNear, realm.fogFar);
    scene.add(new THREE.HemisphereLight(realm.hemiSky, realm.hemiGround, 1.8));
    const sun = new THREE.DirectionalLight(realm.sun, 1.6);
    sun.position.set(40, 100, 25);
    scene.add(sun);

    this.ui.showLoading(`Building the ${realm.name}... (placing blocks)`);
    await nextFrame();
    this.chunks = new ChunkManager(world, scene);
    this.chunks.buildAround([spawn], 60);

    // beam of light over the boss arena (visible from far away)
    const beam = new THREE.Mesh(new THREE.BoxGeometry(1.6, 160, 1.6), new THREE.MeshBasicMaterial({ color: realm.beacon, transparent: true, opacity: 0.45, fog: false, depthWrite: false }));
    beam.position.set(arena.x, arena.y + 80, arena.z);
    scene.add(beam);
    this.beam = beam;

    this.particles = new Particles(scene);
    this.projectiles = [];
    this.pickups = [];
    this.effects = [];
    this.mobs = [];
    this.kills = 0;
    this.runCards = [];
    this.lives = this.numPlayers === 2 ? 5 : 3;
    this.shakeT = 0;
    this.victoryT = -1;
    this.defeatT = -1;
    this.elapsed = 0;
    this.checkpoint = { x: spawn.x, y: spawn.y, z: spawn.z };
    this.checkpointArena = false;

    const yaw = Math.atan2(-(arena.x - spawn.x), -(arena.z - spawn.z));
    this.players = [];
    for (let i = 0; i < this.numPlayers; i++) {
      this.players.push(new Player(this, i, structuredClone(this.save.loadouts[i]), spawn, yaw));
    }
    for (const s of mobSpawns) this.spawnMob(s.type, s.x, s.y, s.z);
    this.boss = new Boss(this, realm.boss, arena.x, arena.y, arena.z);
    this.mobs.push(this.boss);
    console.log(`Realm built in ${Math.round(performance.now() - t0)}ms`);

    this.ui.setupHUD();
    this.ui.show(null);
    this.input.capture = true;
    this.state = 'playing';
    this.clock.getDelta();
    this.ui.banner(`${realm.name} — Round ${this.level}`, realm.color, 3.5);
    this.ui.toast(-1, 'Follow the compass to find the boss!', '#ffffff', 5);
  }

  cleanupRealm() {
    if (!this.scene) return;
    for (const p of this.players) p.dispose();
    this.chunks.dispose();
    this.scene = null;
    this.players = [];
    this.mobs = [];
    this.boss = null;
  }

  quitRealm() {
    this.state = 'menu';
    this.input.capture = false;
    this.cleanupRealm();
    this.ui.showRealms();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.capture = false;
    this.ui.showPause();
  }

  resume() {
    if (this.save.settings.fullscreen && !document.fullscreenElement) lockKeys(true);
    this.onLoadoutsChanged();
    this.state = 'playing';
    this.input.capture = true;
    this.ui.show(null);
    this.clock.getDelta();
  }

  onLoadoutsChanged() {
    for (const p of this.players) {
      const want = this.save.loadouts[p.index];
      if (JSON.stringify(want) !== JSON.stringify(p.loadout)) {
        p.setLoadout(structuredClone(want));
        this.ui.refreshSlots(p);
      }
    }
  }

  endRealm(won) {
    this.state = 'results';
    this.input.capture = false;
    if (won) { this.save.cleared[this.realmId]++; writeSave(this.save); }
    const secs = Math.round(this.elapsed);
    const info = {
      realmId: this.realmId, realmName: this.realm.name, bossName: this.boss.def.name,
      kills: this.kills, cards: this.runCards, time: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
      nextRound: this.save.cleared[this.realmId] + 1,
    };
    this.cleanupRealm();
    this.ui.showResults(won, info);
  }

  // ------------------------------------------------ helpers used by entities
  spawnMob(type, x, y, z, opts = {}) {
    const g = this.world.groundBelow(x, y + 2, z);
    const m = new Mob(this, type, x, g === -Infinity ? y : g, z, opts);
    this.mobs.push(m);
    return m;
  }
  spawnProjectile(o) { this.projectiles.push(new Projectile(this, o)); }
  addEffect(e) { this.effects.push(e); }
  shake(t) { this.shakeT = Math.max(this.shakeT, t); }
  toast(i, text, color, dur) { this.ui.toast(i, text, color, dur); }

  nearestPlayer(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const p of this.players) {
      if (!p.alive || p.invisT > 0) continue;
      const d = Math.hypot(p.pos.x - pos.x, (p.pos.y - pos.y) * 0.7, p.pos.z - pos.z);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  nearestMob(pos, maxDist) {
    let best = null, bd = maxDist;
    for (const m of this.mobs) {
      if (!m.alive || (m.isBoss && !m.awake)) continue;
      const d = m.pos.distanceTo(pos);
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  hitMob(m, dmg, player, o = {}) {
    if (!m.alive) return;
    if (m.isBoss && !m.awake) return;
    let d = dmg;
    const strong = o.element && STRONG_VS[o.element] === this.realm.element;
    if (strong) d *= 1.5;
    m.takeHit(d, o.from, o.kb ?? 4);
    const c = m.center.clone();
    this.particles.burst(c, strong ? 0xffd040 : 0xffffff, strong ? 8 : 4, 2.5);
    const s = m.status;
    switch (o.effect) {
      case 'burn': s.burn = 3; s.burnDps = Math.max(s.burnDps, dmg * 0.4); break;
      case 'poison': s.poison = 5; s.poisonDps = Math.max(s.poisonDps, dmg * 0.25); break;
      case 'slow': s.slow = 2.5; break;
      case 'shock': {
        let n = 0;
        for (const o2 of this.mobs) {
          if (n >= 2 || o2 === m || !o2.alive) continue;
          if (o2.pos.distanceTo(m.pos) < 7) {
            this.addEffect(new Bolt(this, c, o2.center.clone()));
            o2.takeHit(d * 0.5, m.pos, 2);
            n++;
          }
        }
        break;
      }
    }
  }

  damagePlayer(p, dmg, fromPos, kb = 5, ignoreInvuln = false) {
    if (!p.alive || (p.invuln > 0 && !ignoreInvuln)) return;
    if (this.victoryT >= 0) return; // boss beaten: you're safe
    const amount = dmg * (1 - p.armorStats.reduce);
    p.hp -= amount;
    p.invuln = 0.45;
    p.hurtT = 0.35;
    p.lastHurt = 0;
    sfx.hurt();
    if (fromPos && kb) {
      const dx = p.pos.x - fromPos.x, dz = p.pos.z - fromPos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.vel.x += (dx / d) * kb;
      p.vel.z += (dz / d) * kb;
      p.vel.y = Math.max(p.vel.y, Math.min(8, kb * 0.4));
    }
    if (p.hp <= 0) this.playerDown(p);
  }

  playerDown(p) {
    p.alive = false;
    p.hp = 0;
    sfx.death();
    this.particles.burst(new THREE.Vector3(p.pos.x, p.pos.y + 1, p.pos.z), 0xffffff, 20, 4);
    if (this.lives > 0) {
      this.lives--;
      p.respawnT = 5;
    } else p.respawnT = Infinity;
    if (this.players.every((q) => !q.alive && !Number.isFinite(q.respawnT))) this.defeatT = 3;
  }

  respawn(p) {
    const partner = this.players.find((q) => q !== p && q.alive);
    if (partner) p.pos.set(partner.pos.x, partner.pos.y + 0.2, partner.pos.z);
    else p.pos.set(this.checkpoint.x, this.checkpoint.y + 0.2, this.checkpoint.z);
    p.vel.set(0, 0, 0);
    p.alive = true;
    p.hp = p.maxHp;
    p.invuln = 2;
    p.lastSafe.copy(p.pos);
    this.toast(p.index, 'Back in the fight!', '#7fff7f');
  }

  onMobKilled(m) {
    if (m.isBoss) { this.bossDefeated(m); return; }
    this.kills++;
    const c = m.center.clone();
    const chance = (m.minion ? 0.06 : 0.14) * (1 + 0.1 * (this.level - 1));
    if (Math.random() < chance) this.pickups.push(new Pickup(this, 'card', c, rollCard(Math.random, this.realm.element, this.level)));
    else if (Math.random() < 0.22) this.pickups.push(new Pickup(this, 'heart', c));
  }

  onBossAwake(b) {
    this.ui.banner(b.def.name, this.realm.color, 3);
  }

  bossDefeated(b) {
    this.kills++;
    sfx.victory();
    this.shake(0.6);
    this.ui.banner('BOSS DEFEATED!', '#ffd040', 4);
    const c = new THREE.Vector3(b.pos.x, b.pos.y + 1.5, b.pos.z);
    const drops = [rollCard(Math.random, this.realm.element, this.level, 2)];
    for (let i = 0; i < this.numPlayers + 1; i++) drops.push(rollCard(Math.random, this.realm.element, this.level, 1));
    drops.forEach((card, i) => {
      const a = (i / drops.length) * Math.PI * 2;
      const p = new Pickup(this, 'card', c.clone().add(new THREE.Vector3(Math.cos(a) * 2, 0, Math.sin(a) * 2)), card);
      p.bossDrop = true;
      this.pickups.push(p);
    });
    this.victoryT = 25;
    this.toast(-1, 'Grab the boss cards!', '#ffd040', 5);
    // remaining minions flee
    for (const m of this.mobs) if (m.minion && m.alive) { m.alive = false; m.remove(); }
  }

  collect(pickup, player) {
    if (pickup.kind === 'heart') {
      player.heal(6);
      sfx.heart();
      this.toast(player.index, '+6 health', '#ff7a8a', 1.5);
      return;
    }
    const isNew = addCard(this.save, pickup.card);
    this.runCards.push(pickup.card);
    sfx.card(RARITY_INDEX[pickup.card.rarity]);
    this.ui.cardToast(player.index, pickup.card, isNew);
    if (RARITY_INDEX[pickup.card.rarity] >= 3) this.ui.banner(`${pickup.card.rarity.toUpperCase()} CARD: ${CARD_DEFS[pickup.card.def].name}!`, '#ffd040', 3);
  }

  // ------------------------------------------------ main loop
  update(dt) {
    const inp = this.input;
    if (this.state === 'paused') {
      const bpOpen = !document.querySelector('#backpack.hidden');
      if (bpOpen && (inp.hit('Escape') || inp.hit('KeyB') || inp.hit('KeyI'))) { this.ui.closeBackpack(); return; }
      if (!bpOpen && (inp.hit('Escape') || inp.hit('KeyP')) && !document.querySelector('#pause.hidden')) { this.resume(); return; }
    }
    if (this.state !== 'playing') return;
    if (inp.hit('Escape') || inp.hit('KeyP')) { this.pause(); return; }
    if (inp.hit('KeyB') || inp.hit('KeyI')) { this.state = 'paused'; this.input.capture = false; this.ui.showBackpack('game'); return; }

    this.elapsed += dt;
    for (const p of this.players) {
      p.update(dt, inp.player(p.index, this.numPlayers));
      if (!p.alive && Number.isFinite(p.respawnT)) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) this.respawn(p);
      }
    }

    // checkpoint at the arena entrance
    if (!this.checkpointArena && this.players.some((p) => p.alive && Math.hypot(p.pos.x - this.arena.x, p.pos.z - this.arena.z) < this.arenaR + 6)) {
      this.checkpointArena = true;
      const dx = this.spawn.x - this.arena.x, dz = this.spawn.z - this.arena.z;
      const d = Math.hypot(dx, dz);
      const cx = this.arena.x + (dx / d) * (this.arenaR - 3), cz = this.arena.z + (dz / d) * (this.arenaR - 3);
      this.checkpoint = { x: cx, y: this.world.surface(cx, cz), z: cz };
      this.toast(-1, 'Checkpoint reached!', '#7fffff');
    }

    const alivePlayers = this.players.filter((p) => p.alive);
    const focus = alivePlayers.length ? alivePlayers.map((p) => p.pos) : this.players.map((p) => p.pos);
    for (const m of this.mobs) {
      if (!m.alive) continue;
      let near = Infinity;
      for (const f of focus) near = Math.min(near, Math.hypot(m.pos.x - f.x, m.pos.z - f.z));
      m.model.group.visible = near < this.realm.fogFar + 10 || m.isBoss;
      if (near < 64 || m.isBoss || (m.awake && near < 100)) m.update(dt);
    }
    this.mobs = this.mobs.filter((m) => m.alive);

    for (const pr of this.projectiles) pr.update(dt);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    for (const pk of this.pickups) pk.update(dt);
    this.pickups = this.pickups.filter((p) => p.alive);
    this.effects = this.effects.filter((e) => e.update(dt));
    this.particles.update(dt);
    this.chunks.stream(focus, this.realm.fogFar + 30, 2);
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.beam.material.opacity = 0.35 + Math.sin(this.elapsed * 2) * 0.1;
    if (this.boss && !this.boss.alive) this.beam.visible = false;

    if (this.victoryT >= 0) {
      this.victoryT -= dt;
      if (!this.pickups.some((p) => p.bossDrop) && this.victoryT > 2.5) this.victoryT = 2.5;
      if (this.victoryT <= 0) { this.endRealm(true); return; }
    }
    if (this.defeatT >= 0) {
      this.defeatT -= dt;
      if (this.defeatT <= 0) { this.endRealm(false); return; }
    }
    this.ui.updateHUD();
  }

  render() {
    if (!this.scene || (this.state !== 'playing' && this.state !== 'paused')) return;
    const r = this.renderer;
    const W = window.innerWidth, H = window.innerHeight;
    const n = this.players.length;
    const viewDist = this.realm.fogFar + 16;
    r.setScissorTest(n > 1);
    for (let i = 0; i < n; i++) {
      const p = this.players[i];
      const w = W / n;
      r.setViewport(i * w, 0, w, H);
      r.setScissor(i * w, 0, w, H);
      p.camera.aspect = w / H;
      p.camera.fov = n > 1 ? 80 : 72;
      p.camera.updateProjectionMatrix();
      this.chunks.setVisibleFrom(p.camera.position, viewDist);
      r.render(this.scene, p.camera);
    }
  }

  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    try {
      this.update(dt);
      this.render();
    } catch (e) {
      console.error(e);
    }
    this.input.endFrame();
  }
}

window.game = new Game();

// Developer shortcut: index.html?realm=fire&players=2 jumps straight into a realm
const params = new URLSearchParams(location.search);
if (params.get('realm')) {
  window.game.numPlayers = Number(params.get('players') || 1);
  window.game.save.settings.fullscreen = false;
  window.game.startRealm(params.get('realm'));
}
