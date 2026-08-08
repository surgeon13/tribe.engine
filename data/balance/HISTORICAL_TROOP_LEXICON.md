# Historical troop lexicon (c. 2000 BCE – 1500 CE)

Tevel keeps a **fixed Travian-style roster** (11 troops + hero). Richer names do **not** require more troop *slots* — they need a larger dictionary of historical role labels mapped onto those slots.

## What this is

`lib/tribe-generator/troop-lexicon.js` holds culture packs and name pools surveyed from common military-history vocabulary across roughly **2000 BCE to 1500 CE**.

Run a quick inventory:

```bash
node --input-type=module -e "import { lexiconStats } from './lib/tribe-generator/troop-lexicon.js'; console.log(lexiconStats())"
```

Current inventory: run `lexiconStats()` (target roughly **35+** culture packs and **700+** unique labels).

| Slot family | Example labels |
| --- | --- |
| Infantry | Hoplite, Hastatus, Sparabara, Medjay, Ashigaru, Skoutatos, Levy Spearman, Ghazi, Janissary, Falxman, Hwarang, Jaguar Warrior, Druzhina, Immortal |
| Cavalry | Faris, Mamluk, Cataphract, Klibanophoros, Sipahi, Companion Cavalry, Horse Archer, Knight, War Elephant, Camel Rider, Keshig, Battle Chariot |
| Rams | Battering Ram, Covered Ram, Aries, Tortoise Ram, Ship Ram, Helepolis Ram |
| Artillery | Ballista, Onager, Scorpio, Oxybeles, Lithobolos, Mangonel, Trebuchet, Springald, Petrary, Polybolos, Humbaracı Mortar |

## Culture packs

**Peoples / states:** Egyptian/Nubian, Hittite/Anatolian, Assyrian/Mesopotamian, Israelite/Levantine, Greek/Hellenistic, Thracian, Dacian, Roman, Persian/Iranian, Carthaginian, **North African / Berber / Maghreb**, Celtic/Brittonic, Germanic, **Norse / Scandinavian**, Byzantine, Arab/Islamic, Early Ottoman, **Eastern European / Slavic**, **Magyar / Hungarian**, Aksumite, **Indian subcontinent**, Chinese, Japanese, Korean, **Western / Central medieval Europe**, Mesoamerican (to c. 1500).

**Biome / doctrine packs:** desert (arid), steppe, naval, forest, mountain, arctic, tribal, imperial.

**Fantasy:** Undead.

**Levy:** reserved for Israelite-style muster language (not a global default). Generic / European / Dacian pools use Spearman, Militia, Muster Footman, Tribal Footman instead.

## How naming works

1. Match tribe name + lore against culture `match` keywords (name hits weigh more).
2. Prefer specific culture packs over biome packs on ties (`LEXICON_PRIORITY`).
3. Pick a **stable** label from that culture’s slot pool (hash of tribe name + slot).
4. If nothing matches, use generic pools, nudged by weapon/mount cues in the lore.

## Sources (survey)

Secondary summaries used while compiling / upgrading the dictionary (not exhaustive primary research):

- Wikipedia: siege engines, Psiloi, Cataphract, Clibanarii, Skoutatoi, Furusiyya, Gaesatae, Medjay, Dacian warfare, Peltasts, Ottoman army (to 1500), Hwarang
- Britannica: phalanx, cataphract, trebuchet, Ottoman military organization
- Iranica: Immortals
- Summaries of Hittite chariot armies, Aksumite sarwe, Chinese crossbow infantry, Japanese ashigaru/samurai, Indian elephant corps, Norse huscarls, Mesoamerican eagle/jaguar warrior societies

Expand pools in `troop-lexicon.js` when adding cultures; keep Travian slot count unchanged.

## Hero naming

Heroes are **not** culture-flavored. The unit type is simply **Hero**. Default display name is the player's **account / in-game name**; otherwise the placeholder is `Hero`.
