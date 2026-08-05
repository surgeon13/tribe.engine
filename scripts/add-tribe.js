#!/usr/bin/env node
/**
 * Add or remove tribes — historical presets or fully custom.
 *
 * Usage:
 *   node scripts/add-tribe.js --custom --name "Moors" --archetype cavalry
 *   node scripts/add-tribe.js --culture carthaginian
 *   node scripts/add-tribe.js --list
 *   node scripts/add-tribe.js --delete moors
 */
import {
  createTribe,
  deleteTribe,
  listTribes,
  listProfileSummaries,
  listArchetypes,
  matchProfile,
  CORE_TRIBE_IDS,
} from "../lib/tribe-generator/index.js";

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (
      a === "--list" ||
      a === "--list-tribes" ||
      a === "--npc" ||
      a === "--custom" ||
      a === "--help" ||
      a === "-h"
    ) {
      const key = a === "-h" ? "help" : a.slice(2);
      out[key === "list-tribes" ? "listTribes" : key] = true;
      continue;
    }
    const val = argv[++i];
    if (a === "--culture") out.cultureId = val;
    else if (a === "--name") out.name = val;
    else if (a === "--id") out.id = val;
    else if (a === "--context") out.historicalContext = val;
    else if (a === "--theme") out.theme = val;
    else if (a === "--era") out.era = val;
    else if (a === "--region") out.region = val;
    else if (a === "--archetype") out.archetype = val;
    else if (a === "--primary") out.primary = val;
    else if (a === "--secondary") out.secondary = val;
    else if (a === "--delete" || a === "--remove") out.deleteId = val;
  }
  return out;
}

function printHelp() {
  const cultures = listProfileSummaries()
    .map((p) => `  ${p.id.padEnd(14)} ${p.name} — ${p.era}`)
    .join("\n");
  const arches = listArchetypes()
    .map((a) => `  ${a.id.padEnd(12)} ${a.label}`)
    .join("\n");
  console.log(`Add or remove Tevel tribes (persisted under data/).

Options:
  --list                 List culture profiles (optional presets)
  --list-tribes          List registered tribes (core vs removable)
  --custom               Fully custom tribe (no preset; requires --name)
  --culture <id>         Optional historical preset
  --name <display name>  Display name (alone = custom tribe; required for --custom)
  --id <slug>            Override tribe id
  --theme <text>         Short design theme
  --era <text>           Era label
  --region <text>        Region label
  --context <text>       Free-form lore
  --archetype <id>       Balance archetype (custom mode)
  --npc                  Register as NPC
  --delete <id>          Remove a non-core tribe
  --primary #RRGGBB      Primary palette
  --secondary #RRGGBB    Secondary palette

Core tribes (cannot delete): ${CORE_TRIBE_IDS.join(", ")}

Archetypes:
${arches}

Optional presets:
${cultures}
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }
  if (args.list) {
    for (const p of listProfileSummaries()) {
      console.log(`${p.id}\t${p.name}\t${p.era}\t${p.region}`);
      console.log(`  ${p.historicalContext}`);
    }
    return;
  }
  if (args.listTribes) {
    const tribes = await listTribes();
    for (const t of tribes) {
      const flags = [t.type, t.core ? "core" : "removable", t.generated ? "generated" : "authored"]
        .filter(Boolean)
        .join(", ");
      console.log(`${t.id}\t${t.name}\t(${flags})`);
    }
    return;
  }
  if (args.deleteId) {
    const result = await deleteTribe(String(args.deleteId));
    console.log(`[Tevel] Deleted tribe "${result.name}" (${result.id})`);
    console.log(`[Tevel] Removed ${result.removedFile}`);
    if (result.buildMessage) console.log(`[Tevel] ${result.buildMessage}`);
    return;
  }

  let custom = Boolean(args.custom) || args.cultureId === "custom";

  // Name alone (no culture) → fully custom, no preset required
  if (!custom && !args.cultureId && args.name && !args.historicalContext) {
    custom = true;
    args.custom = true;
  }

  if (!custom && !args.cultureId && args.historicalContext) {
    const matched = matchProfile(String(args.historicalContext));
    if (matched) {
      args.cultureId = matched.id;
      console.log(`[Tevel] Matched culture: ${matched.id} (${matched.name})`);
    } else if (args.name) {
      custom = true;
      args.custom = true;
      console.log(`[Tevel] No preset match — creating as custom tribe`);
    } else {
      console.error("No culture matched. Use --custom --name … or --list.");
      process.exit(1);
    }
  }

  if (!custom && !args.custom && !args.cultureId && !args.historicalContext && !args.name) {
    printHelp();
    process.exit(1);
  }

  if ((custom || args.custom) && !args.name) {
    console.error("Custom tribes require --name");
    process.exit(1);
  }

  const result = await createTribe({
    custom: Boolean(custom || args.custom),
    cultureId: args.cultureId ? String(args.cultureId) : undefined,
    historicalContext: args.historicalContext ? String(args.historicalContext) : undefined,
    name: args.name ? String(args.name) : undefined,
    id: args.id ? String(args.id) : undefined,
    theme: args.theme ? String(args.theme) : undefined,
    era: args.era ? String(args.era) : undefined,
    region: args.region ? String(args.region) : undefined,
    archetype: args.archetype ? String(args.archetype) : undefined,
    type: args.npc ? "npc" : "playable",
    palette: {
      primary: args.primary ? String(args.primary) : undefined,
      secondary: args.secondary ? String(args.secondary) : undefined,
    },
  });

  console.log(
    `[Tevel] Created tribe "${result.name}" (${result.id})` +
      (result.custom ? " [custom]" : ` from ${result.cultureId}`)
  );
  console.log(`[Tevel] Persisted: ${result.file}`);
  if (result.buildMessage) console.log(`[Tevel] ${result.buildMessage}`);
}

main().catch((e) => {
  console.error("[Tevel] Error:", e.message);
  process.exit(1);
});
