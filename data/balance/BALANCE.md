# Balance models for Tevel tribes

## First: eight tribes we do not balance

The Romans, Teutons, Gauls, Egyptians, Huns and Spartans are Travian's tribes,
and the Natars and Nature are its NPCs. Their numbers are published, players
know them by heart, and every combat calculator on the internet assumes them.
We transcribe them; we do not tune them.

| Piece | Where |
|-------|-------|
| The published tables | `data/balance/travian-canon.json` |
| Loader and helpers | `lib/balance/canon.js` |
| Gate that fails the build on drift | `npm run validate:canon` |

Three rules follow from this, and all three are enforced:

1. **The canon does not move.** `validate-canon.js` compares every published
   unit's name, stats, crop upkeep and cost against the canon file. A Hun
   Marksman is 110/80/70. It once drifted to 142/46/42 through the generator,
   which is what prompted all of this.
2. **Nothing about a default tribe is computed.** Travian does not publish a
   price for every unit, and publishes nothing at all for oasis animals, which
   never move and cannot be bought. Those gaps used to be filled at rebuild
   time by our pricing model — which meant a default tribe's costs shifted
   whenever an unrelated dial moved, because the calibration is a mean across
   all player tribes. They were filled once by `npm run canon:freeze` and are
   plain data now. `canonTable()` consults neither the model nor the
   calibration, and the validator fails on any gap that could reopen the door.
3. **The canonical tribes are exempt from the identity model below.** The
   anchors that model prices against were measured *from* these tribes, so
   holding them to it would be marking the ruler against the thing it measures.
   They are skipped by the fairness band, the centerpiece rule, tier ordering
   and filler detection.

### Changing a default tribe on purpose

The canon carries a `lock`: a checksum over every number in it. This is not
security, it is intent — a default tribe should only change when somebody asks
for that, so changing one is a visible act rather than a nudge.

```
npm run canon:seal      # re-seal after a deliberate edit
npm run canon:freeze    # fill any new gap from the model, then seal
```

Edit the canon, re-seal, rebuild. The new checksum lands in the diff on its own
line. Skip the re-seal and the build fails with the old and new hashes side by
side. Prose and `$comment` keys are excluded from the checksum, so
documentation can be improved freely.

Where a cost is Travian's own it is marked in `sources`; the rest are ours,
frozen at the value the model last produced, and can be replaced with published
figures as they are verified.

### The eleventh slot

Travian gives each tribe ten units. Our roster has eleven, so exactly one slot
per canonical tribe is ours to invent:

| Tribe | Slot | Unit |
|-------|------|------|
| Rome | `cav_t3` | Equites Regales — the anvil Rome never had |
| Teutons | `cav_t3` | Teutonic Raider — the plunder horse |
| Gauls | `inf_t3` | Gaul Tracker — a third footman |
| Egyptians | `cav_t3` | Royal Chariot — Egypt's only mounted attacker |
| Huns | `inf_t3` | Hun Warrior — a footman who can hold a gate |
| Spartans | `cav_t3` | Spartan Horseman — a flank guard |
| Natars | `cav_t3` | Natarian Lancer |
| Nature | `settler` | Herd |

These are marked `extension` in the canon file and held by the same validator
to **sitting alongside the published units rather than outclassing them**. An
extension that out-weighs everything Travian gives its tribe fails the build.

That is also why the canonical tribes have no centerpiece: Travian does not
make every tribe's third horse its best one. Rome's third horse is our anvil
and the Teutons' is our raider, so the rule is simply not applied to them —
and not to the median tribe either, which is the per-slot median of exactly
these rosters and honestly inherits the same shape.

### Reading Travian's own tables

The official comparison table at `support.travian.com` publishes **smithy
level 20** values — it lists a Legionnaire at 52.4 attack where the base figure
is 40. Those can be back-solved to base with

```
upgraded = base + (base + 300 * crop / 7) * 0.149
```

which reproduces every unit whose base figure is published independently. It is
how the Egyptian, Spartan and Natar transcriptions were cross-checked against a
second source, and it is worth re-deriving before trusting any new figure.

## What the rest of the game runs on: identity budgets

The other ten tribes are ours, and every troop table in `data/tribes/*.json` is
generated from one model rather than hand-tuned per tribe. The contract is
short:

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

### Everything lands on a five-point grid

Attack, both defences, carrying capacity and all four resource costs are
multiples of five for every tribe we author. `lib/balance/quantize.js` owns the
rule and `validate:balance` enforces it.

This is measured from Travian, not imposed on it. Across the 80 published units
in the canon, every attack value, every one of the cost figures, and every carry
outside the oasis animals is already a multiple of five; three defence values
stray. Rosters of 37s and 68s sitting beside Travian's 35s and 70s read as
arithmetic left showing rather than as design.

Three things are deliberately exempt, on the same evidence:

| Exempt | Why |
|--------|-----|
| speed | Travian's own are 3, 4, 6, 7, 9, 13, 16, 19 — a scale too short to round without collapsing light, medium and heavy horse together |
| crop upkeep | a 1–6 bracket, for the same reason |
| training time | arbitrary seconds in Travian too, and not a number players compare across tribes |

Quantization happens **before** pricing. Cost is derived from the combat index,
so rounding afterwards would price every unit for a slightly different unit than
the one on display.

The heavy cavalry is the one number that cannot merely be rounded: its job is a
stated margin over the rest of the roster and the gate fails on a tie, so half a
step in the wrong direction could break it. `settleCenterpiece` rounds it, then
checks the margin and tops it back up one step at a time along its own growth
axis until it clears. That is why Persia sits on exactly 1.400.

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

"Most expensive" is measured in both currencies. A unit is bought once at the
marketplace and then forever out of the granary, and the centerpiece usually
rounds up into a higher crop bracket — for which the model hands it a resource
discount. Read the market columns alone and a Teutonic Raider looks cheaper
than a Teutonic Knight while quietly eating twice the population.

The lead is added along the axis the unit's role is about: a hammer hits
harder, a guard gets harder to kill, and only armored off-cavalry like the
Haeduan grows both. Growing both by default made hammers out-defend their own
tribe's wall — an inflated Roman horse shaded a Praetorian on raw
anti-infantry defense — which quietly cost the defensive infantry its job.

Attack and defense share one ceiling, 320. A point of defense counts half a
point of attack in the combat index, so a wall needs about twice the raw number
to weigh what a hammer weighs; while the defense ceiling sat lower than the
attack ceiling, every defensive centerpiece in the game ran into it and stopped.
Five of them sat on exactly the same anti-infantry number, and four tribes
silently missed the lead their dial asked for — Rome by 0.32. Where the lift
does reach the ceiling, the excess moves to the other defense stat rather than
being thrown away, because the role shapes are lopsided on purpose and
multiplying a lopsided pair saturates one side long before the other.

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

### Every slot needs a job

A unit earns its place by being the best pick for *something*: a stat, a speed,
a haul, or any of those per crop or per resource. If nothing on that list picks
it out, nobody has a reason to train it, and the slot is filler.

The middle of a family is where filler collects, squeezed between a cheap tier
one and a powerful tier three. The cavalry line fixes this by giving each tier
a column of its own — the first outruns everything, the second hauls the most
and is what a raid is actually made of, the third wins the fight. Before the
split the light horse held both speed and carry, and the middle horse was left
best at nothing in seven tribes.

Rome is the worked example. It fielded three offensive horses and owned no
anvil at all, and the `Equites Regales` was the one earning no keep — the
Caesaris hit harder for less. A legion is a hammer *and* an anvil, so the
Regales became the anvil: 45 attack against 320 anti-infantry defence, the one
thing in the stable that cannot raid, and by a distance the most expensive unit
Rome trains. Being the centerpiece is what makes it expensive, since price is
derived from power — an elite defender has to be the top slot to be priced like
one.

`validate:balance` fails on a unit that is matched or beaten everywhere for no
more crop and no more money, and warns on one that merely tops no column. Seven
warnings stand today, all of them middle infantry in the hybrid `line` role,
whose average stats at an average price cannot win an efficiency column by
construction.

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
