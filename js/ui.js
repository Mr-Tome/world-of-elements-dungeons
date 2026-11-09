// Menus, HUD, backpack and results screens (plain HTML on top of the 3D canvas).
import { RARITIES, RARITY_INDEX, CARD_TYPES, CARD_DEFS, ELEMENTS, cardIcon, cardKey, parseKey, rarityOf, statLines } from './cards.js';
import { REALMS, REALM_ORDER } from './realms.js';
import { BOSS_DEFS } from './entities.js';
import { writeSave } from './save.js';
import { sfx } from './audio.js';

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const SCREENS = ['menu', 'realms', 'loading', 'backpack', 'pause', 'results', 'help'];
const KEY_LABELS = [
  { move: '↑ ↓', turn: '← →', jump: 'R-Shift + ↑', duck: 'R-Shift + ↓', melee: 'R-Ctrl', ranged: 'Enter', ability: '/' },
  { move: 'W S', turn: 'A D', jump: 'L-Shift + W', duck: 'L-Shift + S', melee: 'Alt', ranged: 'Tab', ability: 'Q' },
];

export function pipsHTML(rarity) {
  const idx = RARITY_INDEX[rarity];
  const col = rarityOf(rarity).color;
  return `<div class="pips">${RARITIES.map((_, i) => `<i style="${i <= idx ? `background:${col}` : ''}"></i>`).join('')}</div>`;
}

export function cardHTML(card, opts = {}) {
  const d = CARD_DEFS[card.def];
  const r = rarityOf(card.rarity);
  const el = ELEMENTS[d.element];
  const type = CARD_TYPES.find((t) => t.id === d.type).name;
  const badges = (opts.equipped || []).map((p) => `<span class="eq p${p}">P${p + 1}</span>`).join('');
  return `<div class="card ${opts.small ? 'small' : ''} ${opts.selected ? 'selected' : ''} ${opts.isNew ? 'is-new' : ''}" data-key="${cardKey(card)}" style="--rc:${r.color}">
    <div class="card-top"><span>${type}</span><span style="color:${el.color}">${el.name}</span></div>
    <img class="art" src="${cardIcon(card)}" alt="">
    <div class="cname">${esc(d.name)}</div>
    ${pipsHTML(card.rarity)}
    <div class="rname">${r.name}</div>
    ${opts.count > 1 ? `<div class="count">x${opts.count}</div>` : ''}
    ${badges ? `<div class="badges">${badges}</div>` : ''}
    ${opts.isNew ? '<div class="newtag">NEW</div>' : ''}
  </div>`;
}

export class UI {
  constructor(game) {
    this.game = game;
    this.bpFilter = 'all';
    this.bpSelected = null;
    this.bpReturn = 'menu';
    this.buildMenu();
    this.buildHelp();
    this.buildHUD();
  }

  show(id) {
    for (const s of SCREENS) $(`#${s}`).classList.toggle('hidden', s !== id);
    $('#hud').classList.toggle('hidden', !(id === null || id === 'pause'));
  }
  hideAll() { for (const s of SCREENS) $(`#${s}`).classList.add('hidden'); }

  // ------------------------------------------------ main menu
  buildMenu() {
    const g = this.game;
    $('#menu').innerHTML = `
      <div class="title-wrap">
        <h1 class="logo"><span class="f">WORLD</span> <span class="w">OF</span> <span class="j">ELEMENTS</span></h1>
        <div class="subtitle">Dungeons of Fire, Water, Jungle &amp; Sky</div>
        <div class="menu-buttons">
          <button class="big" data-act="p1">1 Player</button>
          <button class="big" data-act="p2">2 Players</button>
          <button data-act="backpack">Backpack</button>
          <button data-act="help">How to Play</button>
        </div>
        <div class="settings">
          <label><input type="checkbox" data-set="autoJump"> Auto-jump up blocks</label>
          <label><input type="checkbox" data-set="fullscreen"> Fullscreen &amp; lock keys (stops Alt+Tab)</label>
          <label><input type="checkbox" data-set="sound"> Sound</label>
          <button class="tiny danger" data-act="reset">Reset save</button>
        </div>
      </div>`;
    $('#menu').addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      sfx.click();
      if (act === 'p1' || act === 'p2') { g.numPlayers = act === 'p1' ? 1 : 2; this.showRealms(); }
      if (act === 'backpack') this.showBackpack('menu');
      if (act === 'help') { this.show('help'); }
      if (act === 'reset') {
        const b = e.target;
        if (b.dataset.armed) { g.resetSave(); b.textContent = 'Save reset!'; delete b.dataset.armed; this.syncSettings(); }
        else { b.dataset.armed = '1'; b.textContent = 'Click again to erase all cards'; }
      }
    });
    $('#menu').addEventListener('change', (e) => {
      const k = e.target.dataset.set;
      if (!k) return;
      g.save.settings[k] = e.target.checked;
      writeSave(g.save);
      g.applySettings();
    });
    this.syncSettings();
  }
  syncSettings() {
    for (const el of document.querySelectorAll('[data-set]')) el.checked = !!this.game.save.settings[el.dataset.set];
  }
  showMenu() { this.show('menu'); }

  // ------------------------------------------------ realm select
  showRealms() {
    const g = this.game;
    const html = REALM_ORDER.map((id) => {
      const r = REALMS[id];
      const cleared = g.save.cleared[id];
      const boss = BOSS_DEFS[r.boss];
      return `<button class="realm-card realm-${id}" data-realm="${id}" style="--rc:${r.color}">
        <div class="realm-name">${r.name}</div>
        <div class="realm-desc">${r.desc}</div>
        <div class="realm-boss">Boss: <b>${esc(boss.name)}</b></div>
        <div class="realm-round">Round ${cleared + 1}${cleared ? ` &middot; beaten ${cleared}x` : ''}</div>
      </button>`;
    }).join('');
    $('#realms').innerHTML = `<h2>Choose a Realm</h2>
      <div class="sub">${g.numPlayers === 2 ? '2 players' : '1 player'} &middot; each round has a bigger challenge and better card drops</div>
      <div class="realm-grid">${html}</div>
      <div class="row"><button data-act="back">Back</button><button data-act="backpack">Backpack</button></div>`;
    $('#realms').onclick = (e) => {
      const realm = e.target.closest('[data-realm]')?.dataset.realm;
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (realm) { sfx.click(); g.startRealm(realm); }
      if (act === 'back') { sfx.click(); this.showMenu(); }
      if (act === 'backpack') { sfx.click(); this.showBackpack('realms'); }
    };
    this.show('realms');
  }

  showLoading(text) {
    $('#loading').innerHTML = `<div class="loading-box"><div class="spinner"></div><div>${esc(text)}</div></div>`;
    this.show('loading');
  }

  // ------------------------------------------------ help
  buildHelp() {
    const row = (label, k) => `<tr><td>${label}</td><td><kbd>${KEY_LABELS[0][k]}</kbd></td><td><kbd>${KEY_LABELS[1][k]}</kbd></td></tr>`;
    $('#help').innerHTML = `<div class="panel">
      <h2>How to Play</h2>
      <table class="keys"><tr><th></th><th>Player 1</th><th>Player 2</th></tr>
        ${row('Forward / Back', 'move')}${row('Turn left / right', 'turn')}${row('Jump', 'jump')}${row('Duck', 'duck')}
        ${row('Melee attack', 'melee')}${row('Ranged attack', 'ranged')}${row('Hero ability', 'ability')}
      </table>
      <p>Playing alone? Player 1 can use <b>either</b> set of keys, so Alt and Tab work too.</p>
      <p><kbd>Esc</kbd> or <kbd>P</kbd> pauses. <kbd>B</kbd> opens your backpack.</p>
      <ul>
        <li>Explore the realm and defeat mobs. They sometimes drop <b>cards</b> and hearts.</li>
        <li>Follow the <b>compass</b> and the glowing beam of light to find the <b>boss arena</b>.</li>
        <li>Red circles on the ground mean danger: move out! Jump over shockwave rings.</li>
        <li>Each boss always drops a <b>Rare or better</b> card.</li>
        <li>Element weapons do <b>+50% damage</b> in one realm: Water &gt; Fire &gt; Jungle &gt; Sky &gt; Water.</li>
        <li>Your team shares lives. If a player gets knocked out, they come back next to their partner.</li>
      </ul>
      <div class="rarity-legend">${RARITIES.map((r, i) => `<span style="--rc:${r.color}">${pipsHTML(r.id)}${r.name}</span>`).join('')}</div>
      <div class="row"><button data-act="back">Back</button></div>
    </div>`;
    $('#help').onclick = (e) => {
      if (e.target.closest('[data-act="back"]')) { sfx.click(); this.game.state === 'paused' ? this.show('pause') : this.showMenu(); }
    };
  }

  // ------------------------------------------------ backpack
  showBackpack(returnTo) {
    this.bpReturn = returnTo;
    this.renderBackpack();
    this.show('backpack');
  }

  renderBackpack() {
    const g = this.game;
    const save = g.save;
    const entries = Object.entries(save.collection).filter(([, n]) => n > 0).map(([k, n]) => ({ card: parseKey(k), count: n }))
      .filter((e) => CARD_DEFS[e.card.def]);
    entries.sort((a, b) => RARITY_INDEX[b.card.rarity] - RARITY_INDEX[a.card.rarity] ||
      CARD_TYPES.findIndex((t) => t.id === CARD_DEFS[a.card.def].type) - CARD_TYPES.findIndex((t) => t.id === CARD_DEFS[b.card.def].type) ||
      CARD_DEFS[a.card.def].name.localeCompare(CARD_DEFS[b.card.def].name));
    const total = entries.reduce((s, e) => s + e.count, 0);
    const byRarity = RARITIES.map((r) => entries.filter((e) => e.card.rarity === r.id).reduce((s, e) => s + e.count, 0));
    const shown = entries.filter((e) => this.bpFilter === 'all' || CARD_DEFS[e.card.def].type === this.bpFilter);
    const equippedBy = (k) => [0, 1].filter((p) => Object.values(save.loadouts[p]).some((c) => cardKey(c) === k));
    if (!this.bpSelected || !save.collection[this.bpSelected]) this.bpSelected = shown[0] ? cardKey(shown[0].card) : null;

    const loadoutHTML = (p) => `<div class="loadout p${p}">
        <div class="lo-title">Player ${p + 1}</div>
        <div class="lo-slots">${CARD_TYPES.map((t) => `<div class="lo-slot"><div class="lo-label">${t.name}</div>${cardHTML(save.loadouts[p][t.id], { small: true })}</div>`).join('')}</div>
      </div>`;

    let detail = '<div class="detail-empty">Pick a card to see it here.</div>';
    if (this.bpSelected) {
      const card = parseKey(this.bpSelected);
      const d = CARD_DEFS[card.def];
      const lines = statLines(card).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
      const eq = equippedBy(this.bpSelected);
      detail = `${cardHTML(card, { count: save.collection[this.bpSelected] })}
        <p class="desc">${esc(d.desc)}</p>
        <table class="stats">${lines}</table>
        <div class="equip-row">
          <button data-equip="0" ${eq.includes(0) ? 'disabled' : ''}>${eq.includes(0) ? 'Player 1 has it' : 'Equip for Player 1'}</button>
          <button data-equip="1" ${eq.includes(1) ? 'disabled' : ''}>${eq.includes(1) ? 'Player 2 has it' : 'Equip for Player 2'}</button>
        </div>`;
    }

    $('#backpack').innerHTML = `<div class="bp">
      <div class="bp-head">
        <h2>Backpack <small>${total} cards &middot; ${entries.length} different</small></h2>
        <button data-act="close">Close</button>
      </div>
      <div class="rarity-scale">${RARITIES.map((r, i) => `<div class="rs" style="--rc:${r.color}">${pipsHTML(r.id)}<b>${r.name}</b><span>${byRarity[i]}</span></div>`).join('<div class="rs-arrow"></div>')}</div>
      <div class="bp-body">
        <aside class="bp-loadouts">${loadoutHTML(0)}${loadoutHTML(1)}</aside>
        <main class="bp-main">
          <div class="tabs">${[{ id: 'all', name: 'All' }, ...CARD_TYPES].map((t) => `<button class="tab ${this.bpFilter === t.id ? 'on' : ''}" data-filter="${t.id}">${t.name}</button>`).join('')}</div>
          <div class="grid">${shown.map((e) => {
            const k = cardKey(e.card);
            return cardHTML(e.card, { count: e.count, equipped: equippedBy(k), selected: k === this.bpSelected, isNew: !save.seen[k] });
          }).join('') || '<div class="detail-empty">No cards of this type yet. Defeat mobs and bosses to find some!</div>'}</div>
        </main>
        <section class="bp-detail">${detail}</section>
      </div>
    </div>`;
    if (this.bpSelected && !save.seen[this.bpSelected]) { save.seen[this.bpSelected] = 1; writeSave(save); }

    $('#backpack').onclick = (e) => {
      const f = e.target.closest('[data-filter]');
      if (f) { sfx.click(); this.bpFilter = f.dataset.filter; this.bpSelected = null; this.renderBackpack(); return; }
      const eqBtn = e.target.closest('[data-equip]');
      if (eqBtn) {
        sfx.click();
        const p = Number(eqBtn.dataset.equip);
        const card = parseKey(this.bpSelected);
        save.loadouts[p][CARD_DEFS[card.def].type] = card;
        writeSave(save);
        this.renderBackpack();
        return;
      }
      const c = e.target.closest('.grid .card, .lo-slot .card');
      if (c) { sfx.click(); this.bpSelected = c.dataset.key; this.renderBackpack(); return; }
      if (e.target.closest('[data-act="close"]')) { sfx.click(); this.closeBackpack(); }
    };
  }

  closeBackpack() {
    const g = this.game;
    g.onLoadoutsChanged();
    if (this.bpReturn === 'game') g.resume();
    else if (this.bpReturn === 'pause') this.show('pause');
    else if (this.bpReturn === 'realms') this.showRealms();
    else if (this.bpReturn === 'results') this.show('results');
    else this.showMenu();
  }

  // ------------------------------------------------ pause
  showPause() {
    $('#pause').innerHTML = `<div class="panel small-panel">
      <h2>Paused</h2>
      <div class="menu-buttons">
        <button class="big" data-act="resume">Resume</button>
        <button data-act="backpack">Backpack</button>
        <button data-act="help">Controls</button>
        <label class="inline"><input type="checkbox" data-pset="autoJump" ${this.game.save.settings.autoJump ? 'checked' : ''}> Auto-jump</label>
        <button data-act="quit">Leave realm</button>
      </div></div>`;
    $('#pause').onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      sfx.click();
      if (act === 'resume') this.game.resume();
      if (act === 'backpack') this.showBackpack('pause');
      if (act === 'help') this.show('help');
      if (act === 'quit') this.game.quitRealm();
    };
    $('#pause').onchange = (e) => {
      if (e.target.dataset.pset) { this.game.save.settings.autoJump = e.target.checked; writeSave(this.game.save); this.syncSettings(); }
    };
    this.show('pause');
    $('#hud').classList.remove('hidden');
  }

  // ------------------------------------------------ results
  showResults(won, info) {
    const g = this.game;
    const cards = info.cards.map((c) => cardHTML(c, { small: true })).join('');
    $('#results').innerHTML = `<div class="panel">
      <h2 class="${won ? 'win' : 'lose'}">${won ? 'Realm Cleared!' : 'Defeated...'}</h2>
      <p>${won ? `You beat <b>${esc(info.bossName)}</b>! The ${esc(info.realmName)} is now on round ${info.nextRound}.` : 'Your team ran out of lives. The cards you found are still yours!'}</p>
      <div class="result-stats"><div><b>${info.kills}</b> mobs defeated</div><div><b>${info.time}</b> time</div><div><b>${info.cards.length}</b> cards found</div></div>
      <div class="result-cards">${cards || '<i>No cards this time.</i>'}</div>
      <div class="row">
        <button class="big" data-act="again">${won ? 'Next round' : 'Try again'}</button>
        <button data-act="realms">Choose realm</button>
        <button data-act="backpack">Backpack</button>
      </div></div>`;
    $('#results').onclick = (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (!act) return;
      sfx.click();
      if (act === 'again') g.startRealm(info.realmId);
      if (act === 'realms') this.showRealms();
      if (act === 'backpack') this.showBackpack('results');
    };
    this.show('results');
  }

  // ------------------------------------------------ HUD
  buildHUD() {
    const pv = (i) => `<div class="pview" id="pview${i}">
      <div class="pv-hurt"></div>
      <div class="pv-label">P${i + 1}</div>
      <div class="pv-compass"><div class="needle"></div><span class="cdist"></span></div>
      <div class="pv-cross"></div>
      <div class="pv-down"></div>
      <div class="pv-toasts"></div>
      <div class="pv-bottom">
        <div class="pv-hp"><div class="fill"></div><span></span></div>
        <div class="pv-slots">
          <div class="slot s-ability"><img><div class="cd"></div><kbd>${KEY_LABELS[i].ability}</kbd></div>
          <div class="slot s-melee"><img><div class="cd"></div><kbd>${KEY_LABELS[i].melee}</kbd></div>
          <div class="slot s-ranged"><img><div class="cd"></div><kbd>${KEY_LABELS[i].ranged}</kbd></div>
        </div>
      </div>
    </div>`;
    $('#hud').innerHTML = `${pv(0)}${pv(1)}<div id="divider"></div>
      <div id="topbar"><span class="realm"></span><span class="lives"></span></div>
      <div id="bossbar" class="hidden"><div class="bname"></div><div class="bbar"><div class="bfill"></div></div></div>
      <div id="banner"></div>`;
  }

  setupHUD() {
    const g = this.game;
    const two = g.numPlayers === 2;
    $('#hud').classList.toggle('two', two);
    $('#pview1').classList.toggle('hidden', !two);
    $('#divider').classList.toggle('hidden', !two);
    $('#bossbar').classList.add('hidden');
    $('#topbar .realm').textContent = `${g.realm.name} · Round ${g.level}`;
    for (const p of g.players) this.refreshSlots(p);
    if (!two) {
      // In 1-player mode show both key options
      const v = $('#pview0');
      v.querySelector('.s-ability kbd').textContent = 'Q or /';
      v.querySelector('.s-melee kbd').textContent = 'Alt';
      v.querySelector('.s-ranged kbd').textContent = 'Tab';
    } else {
      const v = $('#pview0');
      v.querySelector('.s-ability kbd').textContent = KEY_LABELS[0].ability;
      v.querySelector('.s-melee kbd').textContent = KEY_LABELS[0].melee;
      v.querySelector('.s-ranged kbd').textContent = KEY_LABELS[0].ranged;
    }
  }

  refreshSlots(p) {
    const v = $(`#pview${p.index}`);
    v.querySelector('.s-ability img').src = cardIcon(p.loadout.hero);
    v.querySelector('.s-melee img').src = cardIcon(p.loadout.melee);
    v.querySelector('.s-ranged img').src = cardIcon(p.loadout.ranged);
  }

  updateHUD() {
    const g = this.game;
    for (const p of g.players) {
      const v = $(`#pview${p.index}`);
      const pct = Math.max(0, p.hp / p.maxHp);
      v.querySelector('.pv-hp .fill').style.width = `${pct * 100}%`;
      v.querySelector('.pv-hp .fill').style.background = pct > 0.5 ? '#3ad65a' : pct > 0.25 ? '#ffc020' : '#ff3a3a';
      v.querySelector('.pv-hp span').textContent = `${Math.ceil(Math.max(0, p.hp))} / ${p.maxHp}`;
      const cdf = (t, max) => `${Math.max(0, Math.min(1, t / max)) * 100}%`;
      v.querySelector('.s-ability .cd').style.height = cdf(p.abilityT, p.heroStats.cd);
      v.querySelector('.s-melee .cd').style.height = cdf(p.meleeT, p.meleeStats.cd);
      v.querySelector('.s-ranged .cd').style.height = cdf(p.rangedT, p.rangedStats.cd);
      v.querySelector('.pv-hurt').style.opacity = p.hurtT > 0 ? Math.min(1, p.hurtT * 3) : (p.alive && p.hp / p.maxHp < 0.25 ? 0.35 : 0);
      const down = v.querySelector('.pv-down');
      if (!p.alive) {
        down.style.display = 'flex';
        down.textContent = Number.isFinite(p.respawnT) ? `Knocked out! Back in ${Math.ceil(p.respawnT)}...` : 'Knocked out! No lives left — cheer on your partner!';
      } else down.style.display = 'none';
      // compass toward the boss arena
      const dx = g.arena.x - p.pos.x, dz = g.arena.z - p.pos.z;
      const dist = Math.hypot(dx, dz);
      const ang = Math.atan2(-dx, -dz) - p.yaw;
      v.querySelector('.needle').style.transform = `rotate(${-ang}rad)`;
      v.querySelector('.cdist').textContent = dist < g.arenaR ? 'Boss arena!' : `Boss ${Math.round(dist)}m`;
    }
    $('#topbar .lives').textContent = `Lives: ${g.lives}   ·   Mobs: ${g.kills}`;
    const b = g.boss;
    const bb = $('#bossbar');
    if (b && b.awake && b.alive) {
      bb.classList.remove('hidden');
      bb.querySelector('.bname').textContent = b.def.name;
      bb.querySelector('.bfill').style.width = `${Math.max(0, b.hp / b.maxHp) * 100}%`;
    } else bb.classList.add('hidden');
  }

  toast(index, html, color = '#fff', dur = 2.5) {
    const targets = index === -1 ? [0, 1] : [index];
    for (const i of targets) {
      const box = $(`#pview${i} .pv-toasts`);
      if (!box) continue;
      if (box.lastChild && box.lastChild.dataset.text === html) continue;
      const el = document.createElement('div');
      el.className = 'toast';
      el.dataset.text = html;
      el.style.color = color;
      el.innerHTML = html;
      box.appendChild(el);
      setTimeout(() => el.remove(), dur * 1000);
      while (box.children.length > 4) box.firstChild.remove();
    }
  }

  cardToast(index, card, isNew) {
    const r = rarityOf(card.rarity);
    const d = CARD_DEFS[card.def];
    const box = $(`#pview${index} .pv-toasts`);
    const el = document.createElement('div');
    el.className = 'toast card-toast';
    el.style.setProperty('--rc', r.color);
    el.innerHTML = `<img src="${cardIcon(card)}"><div><div class="ct-top">${isNew ? 'NEW CARD!' : 'Card found'}</div><div class="ct-name">${esc(d.name)}</div><div class="ct-r">${r.name}</div>${pipsHTML(card.rarity)}</div>`;
    box.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    while (box.children.length > 4) box.firstChild.remove();
  }

  banner(text, color = '#fff', dur = 3) {
    const b = $('#banner');
    b.textContent = text;
    b.style.color = color;
    b.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => b.classList.remove('show'), dur * 1000);
  }
}
