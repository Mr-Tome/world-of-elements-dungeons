# World of Elements: Dungeons

A blocky, first-person dungeon adventure for 1 or 2 players on one keyboard.
Pick a realm (Fire, Water, Jungle or Sky), explore a huge world, fight mobs,
collect cards, and defeat the realm's boss.

## How to start

```bash
./play.sh
```

This starts a small local web server and opens the game in Chromium.
(Or run `python3 -m http.server` in this folder and open http://localhost:8000.)

## Controls

| Action            | Player 1 (arrows)      | Player 2 (WASD)       |
|-------------------|------------------------|-----------------------|
| Forward / back    | ↑ / ↓                  | W / S                 |
| Turn left / right | ← / →                  | A / D                 |
| Jump              | Right-Shift + ↑        | Left-Shift + W        |
| Duck              | Right-Shift + ↓        | Left-Shift + S        |
| Melee             | Right-Ctrl             | Alt                   |
| Ranged            | Enter                  | Tab                   |
| Hero ability      | /                      | Q                     |

- In 1-player mode, Player 1 can use **either** set (so Alt / Tab / Q work too).
- `Esc` or `P` pauses, `B` opens the backpack.
- When you press Play the game goes fullscreen and locks the keyboard (Chromium),
  so Alt+Tab, Tab and Ctrl+W can't throw you out of the game. Hold `Esc` to leave
  fullscreen. You can turn this off in the main menu.

## Cards

Six card types: **Hero** (special ability), **Melee**, **Ranged**, **Armor**, **Skin**, **Pet**.
Five rarities: Common → Uncommon → Rare → Unique → Mythical. Higher rarity = stronger.
Mobs sometimes drop cards; bosses always drop a Rare-or-better card.
Element weapons get +50% damage in one realm: Water > Fire > Jungle > Sky > Water.

Progress (cards, loadouts, rounds beaten) saves automatically in the browser.

## Project layout

- `js/main.js` – game loop, combat rules, realm flow
- `js/realms.js` – realm settings and terrain generators
- `js/world.js` – voxel storage and chunk meshing
- `js/blocks.js` – block types and the pixel texture atlas
- `js/player.js` – player movement, camera, attacks, abilities
- `js/entities.js` – mobs, bosses, pets, projectiles, pickups, effects
- `js/models.js` – blocky 3D models
- `js/cards.js` – card definitions, rarities, drops, card art
- `js/ui.js` – menus, HUD, backpack
- `vendor/three.module.min.js` – Three.js r160 (MIT)

Developer shortcut: `index.html?realm=fire&players=2` jumps straight into a realm.
