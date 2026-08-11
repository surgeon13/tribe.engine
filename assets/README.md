# Tevel game assets

Sprites and icons referenced from tribe JSON (`graphics.sprite`, `graphics.icon`, `graphics.logo`) are served at `/assets/…` when you run the applet.

## Troop SVG logos

SVG logos live in grouped folders and are tinted with each tribe's `palette.primary` (glyph) and `palette.secondary` (background) in the dashboard.

| Folder | Contents |
|--------|----------|
| `infantry/` | Melee weapons & scouts |
| `cavalry/` | Mount heads |
| `animals/` | Nature tribe / fauna |
| `resources/` | Economy piles (legacy settler placeholders) |
| `rams/` | Wall-breaker / ram logos |
| `catapults/` | Catapult / artillery logos |
| `chiefs/` | Chief / administrator logos |
| `settlers/` | Settler / expansion logos |
| `powder.svg` | Legacy siege placeholder (prefer `catapults/`) |

Default logos for ram / catapult / chief / settler now live under those folders; see `data/logo-groups.json`.

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
