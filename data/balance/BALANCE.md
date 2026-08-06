# Balance models for Tevel tribes

## What we built: Median baseline

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

## Recommended mathematical models (best → good)

### 1. Point-buy / identity budgets (recommended primary)

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

Custom tribe archetypes in `lib/tribe-generator/custom.js` already do a light
version of (1) via scale multipliers — they should eventually read Median as
\(\mathbf{m}\) instead of the hand-tuned `BASE_TROOPS` blob.

---

## Diagnostic combat index (not a simulator)

\[
CI = A + 0.5(D_i + D_c) + 0.1\,S + 0.02\,C
\]

Useful for dashboards and regression tests. Real balance still needs fight sims
or playtests for counter matchups (e.g. phalanx vs cav).
