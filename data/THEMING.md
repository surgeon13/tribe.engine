# Tribe theming (two-color palette)

Every tribe defines exactly **two colors**. The same pair tints **troops**, **buildings**, and **UI** (banners, buttons).

## Data locations

| File | Role |
|------|------|
| `tribes/palettes.json` | Quick reference — all faction colors in one place |
| `tribes/<id>.json` → `palette` | Colors used at runtime for that tribe |
| `buildings.base.json` | Neutral building sprites + grayscale masks |
| `units.base.json` | Neutral unit sprites (recolor same way) |

## How recoloring works

1. Art exports a **neutral base sprite** (stone/wood tones).
2. Art exports a **mask** (`*_mask.png`): white = primary slot, light gray = secondary slot, black = no tint.
3. The game/tool reads `tribe.palette.primary` / `secondary` and replaces mask regions with those hex colors.

```
base sprite  +  mask  +  palette  →  tribe-colored building
```

Units use the same pipeline (`units/base/*.png` + mask, or per-tribe output under `tribes/{id}/units/`).

## Tribe JSON shape

```json
{
  "tribe": { "id": "roman", "name": { "en": "Romans" } },
  "palette": {
    "primary": "#8B1A1A",
    "secondary": "#D4AF37"
  },
  "graphics": {
    "banner": "tribes/roman/banner.png"
  },
  "buildings": {
    "usePalette": true
  },
  "troops": [ ... ],
  "hero": { ... }
}
```

`buildings.usePalette: true` means: for every entry in `buildings.base.json`, output paths are:

`tribes/roman/buildings/barracks.png` (generated or baked at build time).

## Adding a new tribe

1. Pick two unique hex colors in `palettes.json`.
2. Copy `_template.json`, set `palette` and `buildings.usePalette`.
3. Run the recolor step (future script) or paint masks manually.

## Tribe-specific buildings

Optional per-building override in tribe JSON:

```json
"buildings": {
  "usePalette": true,
  "overrides": {
    "wall": {
      "graphics": {
        "sprite": "tribes/roman/buildings/roman_wall.png",
        "mask": "tribes/roman/buildings/roman_wall_mask.png"
      }
    }
  }
}
```

Still uses the same `palette` for tinting unless `usePalette: false` on that entry (future).
