#!/usr/bin/env node
/**
 * Add a historically flavored tribe on the fly.
 *
 * Usage:
 *   node scripts/add-tribe.js --culture carthaginian
 *   node scripts/add-tribe.js --culture viking --name "Norse Raiders"
 *   node scripts/add-tribe.js --context "Achaemenid Persian Immortals"
 *   node scripts/add-tribe.js --list
 */
import { createTribe, listProfileSummaries, matchProfile } from "../lib/tribe-generator/index.js";

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--list" || a === "--npc" || a === "--help" || a === "-h") {
      const key = a === "-h" ? "help" : a.slice(2);
      out[key] = true;
      continue;
    }
    const val = argv[++i];
    if (a === "--culture") out.cultureId = val;
    else if (a === "--name") out.name = val;
    else if (a === "--id") out.id = val;
    else if (a === "--context") out.historicalContext = val;
    else if (a === "--primary") out.primary = val;
    else if (a === "--secondary") out.secondary = val;
  }
  return out;
}

function printHelp() {
  const cultures = listProfileSummaries()
    .map((p) => `  ${p.id.padEnd(14)} ${p.name} — ${p.era}`)
    .join("\n");
  console.log(`Add a Tevel tribe from a historical culture profile.

Options:
  --list                 List culture profiles
  --culture <id>         Profile id (carthaginian, persian, viking, …)
  --context <text>       Free-text historical hint (fuzzy match)
  --name <display name>  Override display name
  --id <slug>            Override tribe id
  --npc                  Register as NPC
  --primary #RRGGBB      Override primary palette
  --secondary #RRGGBB    Override secondary palette

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
  console.log(`[Tevel] File: ${result.file}`);
  if (result.buildMessage) console.log(`[Tevel] ${result.buildMessage}`);
}

main().catch((e) => {
  console.error("[Tevel] Error:", e.message);
  process.exit(1);
});
