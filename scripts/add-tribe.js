#!/usr/bin/env node
/**
 * Add or remove historically flavored tribes.
 *
 * Usage:
 *   node scripts/add-tribe.js --culture carthaginian
 *   node scripts/add-tribe.js --culture viking --name "Norse Raiders"
 *   node scripts/add-tribe.js --context "Achaemenid Persian Immortals"
 *   node scripts/add-tribe.js --list
 *   node scripts/add-tribe.js --list-tribes
 *   node scripts/add-tribe.js --delete slav
 */
import {
  createTribe,
  deleteTribe,
  listTribes,
  listProfileSummaries,
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
  console.log(`Add or remove Tevel tribes (persisted under data/).

Options:
  --list                 List culture profiles (templates)
  --list-tribes          List registered tribes (core vs removable)
  --culture <id>         Profile id to generate from
  --context <text>       Free-text historical hint (fuzzy match)
  --name <display name>  Override display name
  --id <slug>            Override tribe id
  --npc                  Register as NPC
  --delete <id>          Remove a non-core tribe (persistent)
  --primary #RRGGBB      Override primary palette
  --secondary #RRGGBB    Override secondary palette

Core tribes (cannot delete): ${CORE_TRIBE_IDS.join(", ")}

Cultures:
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

  if (!args.cultureId && args.historicalContext) {
    const matched = matchProfile(String(args.historicalContext));
    if (!matched) {
      console.error("No culture matched that historical context. Try --list.");
      process.exit(1);
    }
    args.cultureId = matched.id;
    console.log(`[Tevel] Matched culture: ${matched.id} (${matched.name})`);
  }

  if (!args.cultureId && !args.historicalContext) {
    printHelp();
    process.exit(1);
  }

  const result = await createTribe({
    cultureId: args.cultureId ? String(args.cultureId) : undefined,
    historicalContext: args.historicalContext ? String(args.historicalContext) : undefined,
    name: args.name ? String(args.name) : undefined,
    id: args.id ? String(args.id) : undefined,
    type: args.type === "npc" ? "npc" : "playable",
    palette: {
      primary: args.primary ? String(args.primary) : undefined,
      secondary: args.secondary ? String(args.secondary) : undefined,
    },
  });

  console.log(`[Tevel] Created tribe "${result.name}" (${result.id}) from ${result.cultureId}`);
  console.log(`[Tevel] Persisted: ${result.file} (+ index, palette, training, logos, hero modifiers)`);
  if (result.buildMessage) console.log(`[Tevel] ${result.buildMessage}`);
}

main().catch((e) => {
  console.error("[Tevel] Error:", e.message);
  process.exit(1);
});
