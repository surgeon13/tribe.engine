# Historical troop lexicon (c. 2000 BCE – 1500 CE)

Tevel keeps a **fixed Travian-style roster** (11 troops + hero). Richer names do **not** require more troop *slots* — they need a larger dictionary of historical role labels mapped onto those slots.

## What this is

`lib/tribe-generator/troop-lexicon.js` holds culture packs and name pools surveyed from common military-history vocabulary across roughly **2000 BCE to 1500 CE**:

| Slot family | Example labels in the dictionary |
| --- | --- |
| Infantry | Hoplite, Hastatus, Sparabara, Medjay, Ashigaru, Skoutatos, Levy Spearman, Ghazi, Billman, Longbowman, Huscarl, Immortal, Gaesatae |
| Cavalry | Faris, Mamluk, Cataphract, Klibanophoros, Companion Cavalry, Horse Archer, Knight, War Elephant, Camel Rider, Numidian Cavalry, Keshig |
| Rams | Battering Ram, Covered Ram, Aries, Tortoise Ram, Ship Ram, Timber Ram |
| Artillery | Ballista, Onager, Scorpio, Oxybeles, Lithobolos, Mangonel, Traction Trebuchet, Counterweight Trebuchet, Springald, Petrary |

Culture families currently covered: Egyptian/Nubian, Assyrian/Mesopotamian, Israelite/Levantine, Greek/Hellenistic, Roman, Persian/Iranian, Carthaginian, Celtic, Germanic, Norse, Byzantine, Arab/Islamic, desert/Maghreb, steppe, Indian, Chinese, Japanese, medieval European, plus biome packs (naval, forest, mountain, arctic, tribal, imperial) and Undead fantasy.

## How naming works

1. Match tribe name + lore against culture `match` keywords (name hits weigh more).
2. Pick a **stable** label from that culture’s slot pool (hash of tribe name + slot) so two Arab tribes can differ without randomness on rebuild.
3. If nothing matches, use generic pools, nudged by weapon/mount cues in the lore.

## Sources (survey)

Secondary summaries and reference pages used while compiling the dictionary (not exhaustive primary research):

- Wikipedia: *List of siege engines*, *Psiloi*, *Cataphract*, *Clibanarii*, *Skoutatoi*, *Furusiyya*, *Gaesatae*, *Medjay*, torsion engines / Greek–Roman artillery
- Britannica: phalanx, cataphract, trebuchet
- Iranica: Immortals
- Common military-history unit terminology for Chinese crossbow infantry, Japanese ashigaru/samurai, Indian elephant corps, Norse huscarls/berserkers, medieval European billmen/longbowmen/knights

Expand pools in `troop-lexicon.js` when adding cultures; keep Travian slot count unchanged.
