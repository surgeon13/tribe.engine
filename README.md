# Tevel Tribe Engine

Semi-automatic tooling to define tribes, troop statistics, and graphics for **Tevel** (Travian-inspired).

## Standard army (every tribe)

| Slots | Role | Count |
|-------|------|-------|
| 1–3 | Infantry | 3 |
| 4 | Scout | 1 |
| 5–7 | Cavalry | 3 |
| 8 | Ram | 1 |
| 9 | Catapult | 1 |
| 10 | Chief | 1 |
| 11 | Settler | 1 |
| — | Hero | 1 (tribe-unique, not in base catalog) |

Slot layout is defined in `data/roster.json`. Base unit ids (`inf_t1`, `cav_t3`, …) map 1:1 to those slots.

## Data layout

| File | Purpose |
|------|---------|
| `data/roster.json` | Canonical slot → role → base unit id |
| `data/units.base.json` | 11 shared troop templates (stats, costs, placeholder art) |
| `data/tribes/<tribe-id>.json` | **One file per tribe** — 11 troop refs + overrides + 1 hero |
| `data/tribes/_template.json` | Copy this to start a new tribe |
| `data/units.schema.json` | JSON Schema for validation |
| `data/buildings.base.json` | Shared buildings (neutral art + recolor masks) |
| `data/tribes/palettes.json` | All faction colors in one table |
| `data/THEMING.md` | How two-color palette tints units & buildings |
| `data/hero.system.json` | Hero XP curve (levels 1–100), attributes, XP sources |
| `data/HERO.md` | Hero progression rules summary |

### One JSON file per tribe

```
data/
  units.base.json          ← slot templates (merge fallback)
  roster.json
  tribes/
    index.json             ← list of all factions
    roman.json
    teuton.json
    gaul.json
    egyptian.json
    hun.json
    spartan.json
    natar.json             ← NPC
    nature.json            ← NPC (oasis animals)
    _template.json         ← copy to add a new tribe
```

Playable tribes use **full stat overrides** per unit (Travian-accurate). See `data/STATS.md` for sources and roster extensions.

## Tribe colors (units + buildings)

Each tribe defines a **two-color palette** (`primary` + `secondary`). The same colors tint troops and buildings — see `data/THEMING.md`.

```json
"palette": { "primary": "#8B1A1A", "secondary": "#D4AF37" },
"buildings": { "usePalette": true, "spriteRoot": "tribes/roman/buildings" }
```

## Hero XP

All tribes share `data/hero.system.json` — level cap, XP table, four attributes, combat XP rules. Each tribe hero links via `"progression": "hero.system.json"`. See `data/HERO.md`.

Regenerate the level table after curve changes:

```bash
node scripts/generate-hero-xp.js
```

| Faction | File | Type |
|---------|------|------|
| Romans | `roman.json` | playable |
| Teutons | `teuton.json` | playable |
| Gauls | `gaul.json` | playable |
| Egyptians | `egyptian.json` | playable |
| Huns | `hun.json` | playable |
| Spartans | `spartan.json` | playable |
| Natars | `natar.json` | NPC |
| Nature | `nature.json` | NPC |

## Tribe file rules

- `troops` must have **exactly 11** entries, in slot order (see `roster.json`).
- Each entry uses `ref` pointing at a base unit id, plus optional `overrides` (name, stats, cost, training, graphics).
- Per-tribe **training times** live in `data/tribe-training.json` (Travian T4.6 base times); override in troop `overrides.training` if needed.
- `hero` is a single object — fully defined per tribe (not merged from base).

## Example

`data/tribes/teuton.json` — full Travian Teuton table (Clubswinger through Settler + hero).

## Applet (recommended)

Double-click **`start-tevel.bat`** (Windows), run **`bash start-tevel.sh`** (Linux / macOS / Android), or:

```bash
npm start
```

This builds tribe data, starts a small local server, and opens the dashboard in your browser (app window on Edge if available). Use **Rebuild data** in the sidebar to refresh after editing JSON.

**Appearance** dropdown (sidebar): switch UI themes — Dark, Light, Midnight, Forest, Sand, Contrast. Your choice is saved in the browser.

## Android (Termux)

Install from GitHub in one command on your phone terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/surgeon13/tribe.engine/master/scripts/install-android.sh | bash
```

Or clone and install manually:

```bash
pkg update && pkg install -y git nodejs
git clone https://github.com/surgeon13/tribe.engine.git ~/tribe.engine
cd ~/tribe.engine
bash scripts/install-android.sh
```

Start the dashboard:

```bash
tevel
# or
cd ~/tribe.engine && npm start
```

Open **http://127.0.0.1:3456** in Chrome on the same phone. In Termux you can also run:

```bash
termux-open-url http://127.0.0.1:3456
```

Leave the Termux session running while you use the dashboard.

| Script | Purpose |
|--------|---------|
| `scripts/install-android.sh` | Download from GitHub, install deps, build data, create `~/bin/tevel` launcher |
| `start-tevel.sh` | Quick start from a cloned repo |

Optional env vars for the installer: `TEVEL_INSTALL_DIR`, `TEVEL_BRANCH`, `PORT`.

## Dashboard

View attack, defense, speed, carry, upkeep, **training resources** (wood/clay/iron/crop), **training time**, and building for every tribe at http://127.0.0.1:3456 — tribe sidebar, summary cards, sortable troop table, hero panel, and **Compare tribes** mode (table, **graphics**, **charts**, stat graphs).

| Path | Role |
|------|------|
| `lib/merge.js` | Merge engine + computed metrics |
| `scripts/build-dashboard-data.js` | Writes `dashboard/data.json` |
| `dashboard/` | Static UI |

After editing tribe JSON: `npm run build:data` then reload the browser.

## Workflow (planned)

1. Copy a tribe template, fill overrides and hero.
2. `npm run build:data` → resolved stats in dashboard.
3. Generate sprites using numbered paths (`01_…`, `02_…`) aligned to slots.
