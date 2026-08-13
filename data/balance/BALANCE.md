# Balance models for Tevel tribes

## What the game runs on: identity budgets

Every troop table in `data/tribes/*.json` is generated from one model rather
than hand-tuned per tribe. The contract is short:

> **Identity is shape. Fairness is price.**
> A tribe may put its power wherever it likes. Every point of power costs the
> same, in the two currencies players actually spend.

| Piece | Where |
|-------|-------|
| Per-slot anchor prices, measured from the six Travian cores | `lib/balance/anchors.js` |
| What each tribe is: roles, shape dials, eliteness, flavor | `lib/balance/identities.js` |
| The generator that turns one into the other | `lib/balance/generate-troops.js` |
| Rebuild the tables | `npm run balance:rebuild` |
| Fairness gate (runs in the Netlify build) | `npm run validate:balance` |

### The pipeline

```
role shape → identity dials → stats → combat index → crop upkeep → resource cost → train time
```

Cost is **derived from power**, never authored beside it. That is the whole
trick: the only way to make a unit cheaper is to make it weaker, or to move its
price onto the other currency. A tribe cannot end up both stronger and cheaper,
which is the failure mode hand-tuning always drifts into.

Crop upkeep is a small integer bracket, so rounding decides what a unit really
costs in population; resources then settle the difference. A unit that rounded
down in crop pays more per point of power in wood and iron, and the reverse.

### What still makes tribes different

| Dial | Effect |
|------|--------|
| `slotRoles` | which job each of the eleven slots does |
| `shape` | infantry or cavalry, attack or defense, speed and carry |
| `eliteness` | a few big units or many small ones — big units are crop-efficient and expensive, small ones the reverse |
| `cropPressure` | how much of the price sits on population rather than resources |
| `centerpiece` | how far the heavy cavalry outweighs the rest of the roster |
| `trainBias`, `mixBias`, `siege` | queue length, resource flavor, workshop strength |

Romans and Spartans field expensive units that are worth more per crop; Teutons
and Persians field cheap ones that eat more of a village. Both pay the same for
the army they end up with — `npm run validate:balance` prints the receipt.

### The heavy cavalry is the centerpiece

Every tribe is built around its tier-3 horse, so the generator guarantees three
things about it rather than hoping the dials produce them:

1. it out-fights every other army unit,
2. it tops the column its role is built for — attack for a hammer, defense for
   a guard,
3. it is the most expensive thing in the barracks.

The third follows from the first, because cost is derived from power. Siege is
excluded from the comparison: a catapult outcosts an Equites Caesaris in
Travian too, and neither is a unit you mass.

`centerpiece` sets how far ahead it sits, as a multiple of the next best unit.
The floor is **1.4**, the low end of Travian's own range — an Equites Caesaris
is about 1.5× an Equites Imperatoris, a Haeduan about 2× a Theutates Thunder.
Tribes go above it where doctrine says so (Huns 1.6, the whole tribe being a
delivery system for one horse) and sit near the floor where it does not (Japan
1.26, "cavalry that never caught up"). None may fall below.

This replaced a per-tribe fudge: because a tier multiplier is a fraction of the
gap between one role and another, a tribe whose top horse *defends* landed
behind its own tier-2 hammer no matter how the tier was tuned, and five tribes
carried bespoke multipliers to paper over it. The rule is now structural, and
`validate:balance` fails the build if any tribe breaks it.

### Tiers outside the player band

NPC and boss rosters are content, not opponents you choose, so they are exempt
from the price band and deliberately ordered: Undead > Natars > players > Nature.
The validator enforces that ordering so a player tribe cannot creep past the
Wonder garrison.

---

## Where the anchor came from: Median baseline

`scripts/compute-median-tribe.js` aggregates the **six original playable tribes**
(Romans, Teutons, Gauls, Egyptians, Huns, Spartans) after override resolution.

| Output | Role |
|--------|------|
| `data/balance/median-baseline.json` | Precise **median** + mean + min/max per slot (floats allowed) |
| `data/tribes/median.json` | Schema-safe **integer** median tribe for the dashboard |

Natars / Nature are excluded (NPC). Generated tribes (Moors, Undead, …) are also
excluded so the baseline stays Travian-canonical.

**Why median, not mean?** Means are pulled by outliers (e.g. Spartan cav_t2 attack 243).
Median is a stabler “center of the design space” for offsets.

---

## Goal: unique tribes that stay balanced

Each tribe should feel different **numerically**, not just in names — while keeping
fair win-rates / training economy. Treat **Median** as the origin \(\mathbf{m}\).
A tribe \(t\) is an offset vector:

\[
\mathbf{x}_t = \mathbf{m} + \mathbf{d}_t
\]

with a **budget constraint** on \(\mathbf{d}_t\) so buffs are paid for by nerfs.

---

## Mathematical models (best → good)

### 1. Point-buy / identity budgets — **implemented**, see the top of this file

Assign each combat axis a weight (from Median’s combat index or training cost):

| Axis | Example weight |
|------|----------------|
| Attack | 1.0 |
| Def vs infantry | 0.55 |
| Def vs cavalry | 0.55 |
| Speed | 0.35 |
| Carry | 0.08 |
| Resource cost | −0.02 per resource |
| Train time | −0.01 per second (scaled) |

Each tribe spends a fixed **identity budget** \(B\) (e.g. ±0 of Median):

\[
\sum_i w_i \, d_{t,i} \approx 0
\]

**Identity templates** (unique numerical features):

| Identity | Typical \(+\ ) | Typical \(−\) |
|----------|----------------|---------------|
| Infantry wall | defInf, cheap inf | cav attack, speed |
| Cavalry hammer | cav attack, speed | inf defense, cost |
| Raider | speed, cheap cost | raw defense |
| Elite | all combat | cost + train time |
| Eco / settler | resource bonus, carry | fightingStrength |

This is what Travian *feels* like, made explicit. Easy to tune in a spreadsheet or
`data/balance/identities/*.json`.

### 2. Pareto / multi-objective efficiency frontier

For each slot, plot tribes in (cost, combatIndex) or (trainTime, attack).
Healthy design: tribes lie near the same **Pareto front** but on different
segments (cheap-weak vs expensive-strong). Median sits near the center of the front.

Use to detect broken units (above the front = overtuned).

### 3. Softmax / relative share (composition identity)

Instead of absolute stats, constrain **share of power**:

\[
s_{t,\text{inf}} = \frac{\text{CI}_{\text{inf}}}{\text{CI}_{\text{inf}}+\text{CI}_{\text{cav}}}
\]

Romans ≈ balanced shares; Huns high cav share; Teutons high club attack share.
Keep total CI near Median while shifting shares — strong for “unique features”
without power creep.

### 4. Bradley–Terry / Elo from simulated fights (validation)

Once identities exist, simulate 1v1 or army mixes (Lanchester or discrete rounds).
Fit tribe strength \(\pi_t\); require \(\pi_t \approx \pi_{\text{median}}\) within ε.
Best for **verification**, expensive as the only design tool.

### 5. PCA / archetype axes (analysis)

Run PCA on the 6×(11 slots × 5 stats) matrix. Top components often recover
“offense vs defense”, “inf vs cav”, “elite cost”. New tribes should move along
1–2 components, not randomly in all dimensions — keeps uniqueness readable.

### 6. What to avoid

- **Independent per-stat buffs** with no budget → power creep.
- **Mean as baseline** with Spartans in the set → inflated cav.
- **Copying one tribe then +10% everything** → no identity, just stronger.

---

## Practical pipeline for Tevel

1. Regenerate Median: `npm run balance:median`
2. Pick an identity (infantry / cavalry / raider / elite / defensive)
3. Apply a **signed offset table** vs Median with \(\sum w_i d_i = 0\)
4. Clamp to observed ranges from `median-baseline.json` (`range.min`/`max`) unless intentionally outside
5. Spot-check with combat-index + cost efficiency vs Median (±5–8%)
6. Later: army sim / Elo gate before shipping

Custom tribes created in the UI still go through `lib/tribe-generator/custom.js`,
which shapes stats from archetype multipliers rather than the identity model
above. They land in the same role doctrine but are not priced against the
anchor, so a newly created tribe should be given an entry in
`lib/balance/identities.js` and rebuilt when it becomes a permanent faction.

---

## Diagnostic combat index (not a simulator)

\[
CI = A + 0.5(D_i + D_c) + 0.1\,S + 0.02\,C
\]

Useful for dashboards and regression tests. Real balance still needs fight sims
or playtests for counter matchups (e.g. phalanx vs cav).
