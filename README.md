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

Double-click **`start-tevel.bat`** (Windows) or run:

```bash
npm start
```

This builds tribe data, starts a small local server, and opens the dashboard in your browser (app window on Edge if available). Use **Rebuild data** in the sidebar to refresh after editing JSON.

**Appearance** dropdown (sidebar): switch UI themes — Dark, Light, Midnight, Forest, Sand, Contrast. Your choice is saved in the browser.

## Progressive Web App (phone / offline)

The dashboard is a PWA. After it’s served over **HTTPS** (or `localhost`), you can install it and use tribe data offline.

### Install on iPhone

1. Open the live site in **Safari** (Chrome on iOS cannot Add to Home Screen for PWAs).
2. Tap **Share** → **Add to Home Screen** → Add.
3. Launch **Tevel** from your home screen — it runs standalone and keeps working offline after the first load.

GitHub Pages deploys automatically from `master` via `.github/workflows/pages.yml`. Enable Pages once in the repo settings (**Settings → Pages → Source: GitHub Actions**). The site URL will be:

`https://surgeon13.github.io/tribe.engine/`

Rebuild/regen buttons need the local applet (`npm start`); the installed app is for browsing and comparing tribes.

## Dashboard

View attack, defense, speed, carry, upkeep, **training resources** (wood/clay/iron/crop), **training time**, and building for every tribe at http://127.0.0.1:3456 — tribe sidebar, summary cards, sortable troop table, hero panel, and **Compare tribes** mode (table, **graphics**, **charts**, stat graphs).

| Path | Role |
|------|------|
| `lib/merge.js` | Merge engine + computed metrics |
| `scripts/build-dashboard-data.js` | Writes `dashboard/data.json` |
| `dashboard/` | Static UI + PWA (`manifest.webmanifest`, `sw.js`) |
| `.github/workflows/pages.yml` | Publishes the PWA to GitHub Pages |

After editing tribe JSON: `npm run build:data` then reload the browser (or push to `master` to refresh Pages).

## Workflow (planned)

1. Copy a tribe template, fill overrides and hero.
2. `npm run build:data` → resolved stats in dashboard.
3. Generate sprites using numbered paths (`01_…`, `02_…`) aligned to slots.
