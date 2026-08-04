# Tevel game assets

Sprites and icons referenced from tribe JSON (`graphics.sprite`, `graphics.icon`, `graphics.logo`) are served at `/assets/…` when you run the applet.

## Troop SVG logos

SVG logos live in grouped folders and are tinted with each tribe's `palette.primary` (glyph) and `palette.secondary` (background) in the dashboard.

| Folder | Contents |
|--------|----------|
| `infantry/` | Melee weapons & scouts |
| `cavalry/` | Mount heads |
| `animals/` | Nature tribe / fauna |
| `resources/` | Settlers & economy |
| `powder.svg` | Siege (catapult) |

Catalog and defaults: `data/logo-groups.json`  
Per-tribe assignments (one unique logo per troop slot): `data/tribe-logos.json`

Override a single troop in tribe JSON:

```json
"overrides": {
  "graphics": {
    "logo": "infantry/trident.svg"
  }
}
```

## Tribe PNG sprites (full art)

Example layout for Romans:

```
assets/tribes/roman/banner.png
assets/tribes/roman/units/01_infantry.png
assets/tribes/roman/units/01_infantry_icon.png
…
assets/tribes/roman/hero/hero.png
```

Until PNG files exist, the dashboard uses SVG logos (when assigned) or palette-tinted placeholders with unit initials.
