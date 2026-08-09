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

## Tribe colors (units + buildings)

Each tribe defines a **two-color palette** (`primary` + `secondary`). The same pair tints **troops**, **buildings**, and **UI** (banners, buttons).

## Troop SVG logos

Each troop can have a unique **SVG logo** tinted with the tribe palette (glyph = primary, tile = secondary).

| File | Role |
|------|------|
| `logo-groups.json` | Icon groups (`infantry`, `cavalry`, …) + default logo per roster ref |
| `tribe-logos.json` | One unique logo per troop slot for each faction |
| `troops[].overrides.graphics.logo` | Per-troop override in tribe JSON |

SVG assets live under `assets/infantry/`, `assets/cavalry/`, etc. See `assets/README.md`.

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

**Appearance** dropdown (sidebar): switch UI themes — Dark, Light, Sand, Dusk. Your choice is saved in the browser.

**Add tribe** (sidebar): **custom by default** — enter a name and describe the culture; archetype, colors, troop names, and lore flavor are derived from your words. Optional culture presets remain as a shortcut. Full 11-troop + hero roster is written under `data/` so it survives restarts.

**Delete tribe**: non-core factions show an **×** in the sidebar (or `npm run tribe:delete -- <id>`). Core Travian defaults (Romans–Nature) are protected and cannot be removed.

```bash
npm run tribe:list
npm run tribe:list-registered
npm run tribe:add -- --culture viking --name "Norse"
npm run tribe:delete -- norse
```

## Netlify (GitHub → https://tevelevet.netlify.app)

The site is a **static dashboard** plus **Netlify Functions** for `/api/*`. The repo root is not a valid publish folder (`index.html` lives under `dashboard/`, assets under `assets/`).

| Piece | Role |
|------|------|
| `netlify.toml` | Build command, publish dir, `/api/*` redirects |
| `npm run build:netlify` | Builds `dashboard/data.json` and copies UI + `assets/` into `netlify-dist/` |
| `netlify/functions/api.mjs` | Serverless API (status, profiles, name defaults, list, preview create) |

**Connect Netlify to this GitHub repo** (branch `master` or your deploy branch). Build settings are read from `netlify.toml` — you should not need to set Publish directory manually.

| Feature on Netlify | Behavior |
|------|------|
| Browse / compare tribes | Works (from built `data.json`) |
| Troop logos (`/assets/…`) | Works |
| Add tribe name preview | Works (`/api/tribes/defaults`) |
| Add tribe | Works as **browser session** only (cannot write GitHub from the CDN) |
| Rebuild data / persist delete | Use local `npm start` or push JSON changes to GitHub |

Local applet still writes tribes under `data/` permanently.

## Progressive Web App (phone / offline)

The dashboard is a PWA. After it’s served over **HTTPS** (or `localhost`), you can install it and use tribe data offline.

### Install on iPhone

1. Open the live site in **Safari** (Chrome on iOS cannot Add to Home Screen for PWAs).
2. Tap **Share** → **Add to Home Screen** → Add.
3. Launch **Tevel** from your home screen — it runs standalone and keeps working offline after the first load.

GitHub Pages deploys automatically from `master` via `.github/workflows/pages.yml`. Enable Pages once in the repo settings (**Settings → Pages → Source: GitHub Actions**). The site URL will be:

`https://surgeon13.github.io/tribe.engine/`

Rebuild needs the local applet (`npm start`) or a GitHub/Netlify deploy; the installed app is for browsing and comparing tribes.

## Median baseline (balance origin)

The six original playable tribes (Romans–Spartans) define a **Median** reference tribe — per-slot statistical median of resolved combat stats, costs, and training times.

```bash
npm run balance:median
```

| Path | Role |
|------|------|
| `data/tribes/median.json` | Integer median tribe in the dashboard |
| `data/balance/median-baseline.json` | Precise median/mean/ranges + tribe power diagnostics |
| `data/balance/BALANCE.md` | Point-buy budgets, Pareto, share models, PCA notes |

Natars/Nature are excluded. Use Median as the origin when giving tribes unique numerical identities (buffs paid for by nerfs).

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
