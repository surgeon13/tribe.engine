# Tevel troop stat sources

## The default tribes do not change

The Romans, Teutons, Gauls, Egyptians, Huns, Spartans, Natars and Nature are
Travian's, and they are **frozen**. Their every number lives in
`data/balance/travian-canon.json` and is copied verbatim into the tribe files;
nothing about them is generated, so no rebalance, dial, or model change
anywhere else can move them. `npm run validate:canon` fails the build if one
drifts, and the file carries a checksum so editing a default tribe cannot be
done quietly.

**If you are here to change a default tribe, you almost certainly should not
be.** If you have actually been asked to:

1. Edit `data/balance/travian-canon.json`.
2. Run `npm run canon:seal` — the new checksum lands in the diff as its own
   line, which is the point.
3. Run `npm run balance:rebuild`.

Each of those tribes has exactly one slot that is ours rather than Travian's,
because Travian gives ten units and our roster has eleven. Those are marked
`extension` in the canon file and are the only part of a default tribe that is
open to design — see `data/balance/BALANCE.md`.

## Everything else is generated

The other ten tribes' tables are generated from `lib/balance/identities.js` by
`npm run balance:rebuild`; edit a tribe's identity rather than its numbers, or
the next rebuild will overwrite the change. Names, descriptions, logos, and
heroes are flavor and stay hand-authored.

The per-slot anchor prices the generator charges were measured from the six
Travian-canonical cores below, so the game still sits where **Travian Legends
(T4.6)** put it — see `data/balance/BALANCE.md` for the model.

## Original sources

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
| Generated cultures | `lib/tribe-generator/profiles.js` | Historically flavored Tevel balances (Carthaginian, Persian, Viking, Byzantine, Mongol, Japanese, Israelite, Axum, Greek, Slav, Balt, Dacian) via **Add tribe** |

## Troop role balance

Every tribe follows Travian role doctrine: standing defense is infantry;
cavalry is offense- **or** defense-oriented; Paladin-style def-cav keeps high carry;
cheap spears for anti-cav spam. See:

- **`data/balance/TROOP_ROLES.md`** — design doctrine
- **`npm run balance:roles`** — audit registered tribes
- **`npm run balance:roles:demo`** — print role-shaped stats per archetype
- **`npm run validate:balance`** — price every roster against the anchor

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
