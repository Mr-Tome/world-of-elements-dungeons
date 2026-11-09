// Auto-save of the card collection, loadouts and realm progress (browser localStorage).
import { STARTER_LOADOUT, STARTER_LOADOUT_P2, cardKey } from './cards.js';

const KEY = 'world-of-elements-save-v1';

function freshSave() {
  const collection = {};
  for (const c of [...Object.values(STARTER_LOADOUT), ...Object.values(STARTER_LOADOUT_P2)]) collection[cardKey(c)] = 1;
  return {
    collection, // "def|rarity" -> count
    loadouts: [structuredClone(STARTER_LOADOUT), structuredClone(STARTER_LOADOUT_P2)],
    cleared: { fire: 0, water: 0, jungle: 0, sky: 0 },
    settings: { autoJump: true, fullscreen: true, sound: true },
    seen: {}, // card keys the player has looked at in the backpack
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      const base = freshSave();
      return { ...base, ...s, settings: { ...base.settings, ...(s.settings || {}) }, cleared: { ...base.cleared, ...(s.cleared || {}) } };
    }
  } catch (e) { console.warn('Could not load save', e); }
  return freshSave();
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { console.warn('Could not save', e); }
}

export function resetSave() {
  try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
  return freshSave();
}

export function addCard(save, card) {
  const k = cardKey(card);
  const isNew = !save.collection[k];
  save.collection[k] = (save.collection[k] || 0) + 1;
  writeSave(save);
  return isNew;
}
