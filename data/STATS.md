# Tevel troop stat sources

Base combat values match **Travian Legends (T4.6)** unless noted.

| Tribe | Source | Notes |
|-------|--------|-------|
| Romans | [Fandom Romans](https://travian.fandom.com/wiki/Roman), [Wiki Travian](http://wikitravian.free.fr/voir.php?page=Troop-statistics-tables) | Slot 7 cavalry extended for Tevel roster |
| Teutons | Wiki Travian, Fandom | Slot 7 cavalry extended |
| Gauls | Wiki Travian | Slot 3 infantry extended (Travian has 2) |
| Egyptians | [Fandom Egyptians](https://travian.fandom.com/wiki/Egyptians) | Slot 7 cavalry extended |
| Huns | [Fandom Huns](https://travian.fandom.com/wiki/Huns) | Slot 3 infantry extended |
| Spartans | Travian Legends support tables | Siege/chief aligned with Roman-tier NPC |
| Natars | [Wiki Travian Natars](http://wikitravian.free.fr/voir.php?page=Troop-statistics-tables) | Slot 7 cavalry extended |
| Nature | [Fandom Nature](https://travian.fandom.com/wiki/Nature) | Oasis animals mapped to 11 slots; 0 crop upkeep |
| Generated cultures | `lib/tribe-generator/profiles.js` | Historically flavored Tevel balances (Carthaginian, Persian, Viking, Byzantine, Mongol, Japanese, Israelite, Axum, Greek) via **Add tribe** |

Hero stats are **Tevel placeholders** (Travian heroes use a separate progression system).

## Adding a tribe on the fly

Use the applet sidebar **Add tribe**, or:

```bash
npm run tribe:list
npm run tribe:add -- --culture carthaginian
npm run tribe:add -- --context "Achaemenid Immortals" --name Persians
```

This writes `data/tribes/<id>.json`, registers the faction in `index.json`, palettes, training, logos, and hero modifiers, then rebuilds dashboard data so the tribe appears in every view.

## Training costs and time

- **Resources** (`wood`, `clay`, `iron`, `crop`) are set per tribe in each `data/tribes/<id>.json` troop `overrides.cost` (Travian-accurate).
- **Training time** and **building** are in `data/tribe-training.json`, merged over `data/units.base.json` defaults. Times are base Travian Legends values at minimum building level (before Barracks/Stable speed bonuses).
- NPC factions (Natars, Nature) use `timeSeconds: 0` — not player-trainable.
