# Troop role doctrine (Tevel)

Travian-style identity: every combat slot should have a **clear job**. Power without
role clarity creates hybrid mush and standing-defense cavalry that should be infantry.

Canonical playable references: **Romans**, **Teutons**, **Gauls** (plus Egyptians /
Huns / Spartans as variants). Natars / Nature are NPC outliers — excluded from role audits.

---

## Core principles

### 1. Standing defense is infantry work

Infantry move slower and are cheaper to mass from **many villages**. They are the
units you leave home.

| Pattern | Example | Job |
|---------|---------|-----|
| Anti-infantry wall | Roman **Praetorian** | High `defenseInfantry`, low attack, low carry |
| Anti-cavalry spears | Teuton **Spearman** | High `defenseCavalry`, cheap, easy to spam |
| Line / levy | Legionnaire, Phalanx | Modest hybrid or mild defense |

### 2. Cavalry are either offense- or defense-oriented

Do **not** give cavalry strong attack *and* strong both defenses by default.

| Orientation | Example | Shape |
|-------------|---------|-------|
| **Off cavalry** | Equites Imperatoris, Teutonic Knight, Theutates Thunder | High attack; defenses secondary |
| **Def cavalry** | Teuton **Paladin**, Gaul **Druidrider** | Basic attack; strong specialized defense; **high carry** |
| **Off + armored** (exception) | Gaul **Haeduan** | Strong attack *and* a high defense axis — only when the tribe is a **defense specialist** |

Defensive cavalry are **mobile** response / raid-capable horses, not a standing wall.
High carry encourages using them in the field instead of parking them forever.

### 3. Production geography

- **Infantry defense** — many villages, barracks, cheap crop/time → volume.
- **Cavalry** — fewer villages with high stables → quality spikes and big single-village waves.

### 4. Scout / siege / chief / settler

- Scout: near-zero attack, light defenses, high speed.
- Ram / catapult: utility slots; combat stats are secondary.
- Settler: high carry, defensive padding, not a fighter.

---

## Slot role map (generation default)

When generating a custom tribe, each combat slot is assigned a **role id** from the
tribe archetype, then shaped toward Travian-like targets (see `lib/balance/troop-roles.js`).

| Archetype | inf_t1 | inf_t2 | inf_t3 | cav_t1 | cav_t2 | cav_t3 |
|-----------|--------|--------|--------|--------|--------|--------|
| balanced | line | def_inf | off_inf | cav_def | cav_off | cav_off |
| defensive | def_cav | def_inf | off_inf | cav_def | cav_off_armored | cav_def |
| infantry | def_cav | def_inf | off_inf | cav_def | cav_off | cav_def |
| cavalry | def_cav | line | off_inf | cav_off | cav_off | cav_off |
| raider | off_inf | def_cav | off_inf | cav_off | cav_off | cav_off |
| elite | line | def_inf | off_inf | cav_off | cav_off | cav_off |

Archetype **scale** multipliers still apply after shaping (cost, overall intensity).

---

## Classification heuristics

For a unit with attack \(A\), defInf \(D_i\), defCav \(D_c\):

- **Offense** if \(A \ge 1.15 \cdot \max(D_i, D_c)\)
- **Def-inf** if \(D_i \ge 1.15 \cdot A\) and \(D_i \ge 1.15 \cdot D_c\)
- **Def-cav** if \(D_c \ge 1.15 \cdot A\) and \(D_c \ge 1.15 \cdot D_i\)
- **Defense (general)** if \(\max(D_i,D_c) \ge 1.15 \cdot A\)
- Else **hybrid**

Cavalry **hybrid** is a design smell unless the unit qualifies as **off+armored**
on a defensive tribe (\(A\) strong and \(\max(D_i,D_c)\) also strong).

---

## Audit checklist (`npm run balance:roles`)

1. Each cavalry slot is `cav_off`, `cav_def`, or `cav_off_armored` (no bare hybrid).
2. `cav_off_armored` only on defensive / infantry-wall identities.
3. At least one infantry slot is a standing defender (`def_inf` or `def_cav`).
4. If a `cav_def` exists, its carry ≥ that tribe’s best standing-def infantry carry.
5. Cheap anti-cav infantry (`def_cav` foot) costs less than `cav_t1` (total resources).
6. Off cavalry are faster than standing-def infantry of the same tribe (usually).

NPC tribes (`natar`, `nature`) are skipped. Hand-authored cores may warn without failing
if they match Travian canon quirks (documented in audit output).

---

## Related

- Median / identity budgets: `data/balance/BALANCE.md` (when present on median branch)
- Stat sources: `data/STATS.md`
- Generator hooks: `lib/tribe-generator/custom.js` → `applyArchetypeRoster`
