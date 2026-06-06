# Hero XP system

Defined in `hero.system.json` — shared by all tribes. Tribe files (`tribes/*.json`) define hero **identity** (name, base stats, art); this file defines **progression**.

## Leveling

| Rule | Value |
|------|-------|
| Max level | 100 |
| Attribute points per level | 4 |
| Starting points (level 1) | 4 (default all in Resources) |
| Level-up | Full heal |
| XP curve | `xpToNext = round(50 × level^1.85)` |

Lookup: `leveling.levels[n]` where `level === n` gives `xpTotal` (XP at start of level) and `xpToNext`.

Example: reach level 10 → need `levels[9].xpTotal` XP (0-indexed: level 10 entry's `xpTotal`).

## Attributes (4 points each level)

| Attribute | Effect |
|-----------|--------|
| **Fighting Strength** | +hero attack/defense; per-point value depends on tribe |
| **Off Bonus** | +0.2% army attack per point (max 20%) |
| **Def Bonus** | +0.2% army defense per point (max 20%) |
| **Resources** | +0.5% home village production per point (max 25%) |

### Tribe fighting strength

| Tribe | Per point |
|-------|-----------|
| Romans | 100 |
| All other playable | 80 |
| Nature / Natars | 0 (not playable heroes) |

Egyptians also get **+25%** hero resource production (tribe passive) via `tribeModifiers.egyptian.resourceProductionBonusPercent`.

## Earning XP

| Source | Rule |
|--------|------|
| **Combat** | 1 XP per 1 crop upkeep of enemy units killed |
| **Adventure** | 1 XP per nature unit crop upkeep cleared |
| **Quests** | Flat rewards (link to quest data later) |
| **Items** | Scrolls, helmets, etc. |

Defenders split combat XP by army crop consumption share.

## Health & death

- Health scales with level (`baseHealth` + `healthPerLevel` × level).
- Hero can die; revival cost scales by level bracket in `death.reviveCostsByLevelBracket`.

## Linking tribe heroes

In `tribes/roman.json`:

```json
"hero": {
  "id": "roman_hero",
  "progression": "hero.system.json",
  ...
}
```

Optional future field on tribe hero — for now all heroes use the global system.
