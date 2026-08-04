#!/usr/bin/env node
/**
 * Tevel terminal mode — control leader monitor settings and view live stats.
 *
 * Usage: npm run terminal
 * Commands: help | status | toggle | interval <ms> | adapter <mock|travian> | url <url> | poll | rates | raids | snapshots | quit
 */

import readline from "readline";
import { getLeaderMonitor } from "../lib/leader-monitor/poll.js";
import { formatNumber, formatResources } from "../lib/leader-monitor/analytics.js";

const monitor = getLeaderMonitor({
  onTerminal: (line) => console.log(line),
});

function banner() {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Tevel Leader Monitor — Terminal Mode   ║
  ╚══════════════════════════════════════════╝
`);
  console.log("Type help for commands. Toggle polling with: toggle\n");
}

function printRates(analytics) {
  if (!analytics.snapshotCount) {
    console.log("No snapshots yet. Run: poll");
    return;
  }
  console.log("\n── Aggregate rates (top 10) ──");
  for (const rate of analytics.rates) {
    console.log(`  ${rate.label}:`);
    console.log(`    Points:     +${formatNumber(rate.pointsPerHour)}/hr`);
    console.log(`    Resources:  +${formatNumber(rate.totalResourcesPerHour)}/hr`);
    console.log(`    ${formatResources(rate.resourcesPerHour)}/hr`);
  }
  console.log("");
}

function printRaids(analytics) {
  if (!analytics.raids.length) {
    console.log("No raid sessions detected yet.");
    return;
  }
  console.log("\n── Raid sessions ──");
  for (const raid of analytics.raids.slice(-10)) {
    const mins = Math.round(raid.durationMs / 60_000);
    console.log(
      `  [${raid.status.toUpperCase()}] ${raid.start} → ${raid.end} (${mins}m)`
    );
    console.log(
      `    Loot: ${formatNumber(raid.totalResourcesRaised)} · Points: +${formatNumber(raid.pointsGained)}`
    );
    console.log(`    ${formatResources(raid.resourcesRaised)}`);
  }
  console.log("");
}

async function printStatus() {
  const config = await monitor.getConfig();
  const analytics = await monitor.getAnalytics();

  console.log("\n── Settings ──");
  console.log(`  Polling:     ${config.enabled ? "ON" : "OFF"}${monitor.isRunning ? " (running)" : ""}`);
  console.log(`  Interval:    ${config.pollIntervalMs}ms (${(config.pollIntervalMs / 60_000).toFixed(1)} min)`);
  console.log(`  Adapter:     ${config.adapter}`);
  console.log(`  Server URL:  ${config.serverUrl || "(none)"}`);
  console.log(`  Top count:   ${config.topCount}`);
  console.log(`  Terminal:    ${config.terminalOutput ? "ON" : "OFF"}`);
  console.log(`  Store data:  ${config.storeSnapshots ? "ON" : "OFF"}`);
  console.log(`  Snapshots:   ${analytics.snapshotCount}`);

  if (analytics.latest) {
    const agg = analytics.aggregate;
    console.log("\n── Latest aggregate (top 10) ──");
    console.log(`  Time:      ${analytics.latest.timestamp}`);
    console.log(`  Points:    ${formatNumber(agg.points)}`);
    console.log(`  Resources: ${formatNumber(agg.totalResources)}`);
    console.log(`  ${formatResources(agg.resources)}`);
  }
  console.log("");
}

async function handleCommand(line) {
  const [cmd, ...args] = line.trim().split(/\s+/);
  if (!cmd) return;

  switch (cmd.toLowerCase()) {
    case "help":
    case "?":
      console.log(`
Commands:
  status              Show settings and latest aggregate
  toggle              Enable/disable aggregate polling
  interval <ms>       Set poll interval (e.g. interval 300000)
  adapter <mock|travian>  Switch data source
  url <url>           Set Travian statistics URL (travian adapter)
  terminal <on|off>   Show poll output in this terminal
  poll                Force one poll now
  rates               Points/resources per hour, 2h, day
  raids               Raid activity sessions (active/ended)
  snapshots           Count stored snapshots
  quit / exit         Leave terminal mode
`);
      break;

    case "status":
      await printStatus();
      break;

    case "toggle": {
      const config = await monitor.getConfig();
      const next = !config.enabled;
      await monitor.updateConfig({ enabled: next });
      console.log(`Polling ${next ? "enabled" : "disabled"}.`);
      break;
    }

    case "interval": {
      const ms = Number(args[0]);
      if (!ms || ms < 10_000) {
        console.log("Usage: interval <ms>  (minimum 10000)");
        break;
      }
      await monitor.updateConfig({ pollIntervalMs: ms });
      console.log(`Poll interval set to ${ms}ms.`);
      break;
    }

    case "adapter": {
      const adapter = args[0];
      if (adapter !== "mock" && adapter !== "travian") {
        console.log("Usage: adapter mock|travian");
        break;
      }
      await monitor.updateConfig({ adapter });
      console.log(`Adapter set to ${adapter}.`);
      break;
    }

    case "url": {
      const url = args[0] || null;
      await monitor.updateConfig({ serverUrl: url });
      console.log(url ? `Server URL set to ${url}` : "Server URL cleared.");
      break;
    }

    case "terminal": {
      const val = args[0]?.toLowerCase();
      if (val !== "on" && val !== "off") {
        console.log("Usage: terminal on|off");
        break;
      }
      await monitor.updateConfig({ terminalOutput: val === "on" });
      console.log(`Terminal output ${val}.`);
      break;
    }

    case "poll":
      console.log("Polling…");
      await monitor.pollOnce();
      break;

    case "rates": {
      const analytics = await monitor.getAnalytics();
      printRates(analytics);
      break;
    }

    case "raids": {
      const analytics = await monitor.getAnalytics();
      printRaids(analytics);
      break;
    }

    case "snapshots": {
      const snaps = await monitor.getSnapshots();
      console.log(`Stored snapshots: ${snaps.length}`);
      if (snaps.length) {
        console.log(`  First: ${snaps[0].timestamp}`);
        console.log(`  Last:  ${snaps[snaps.length - 1].timestamp}`);
      }
      break;
    }

    case "quit":
    case "exit":
      console.log("Goodbye.");
      await monitor.stop();
      process.exit(0);
      break;

    default:
      console.log(`Unknown command: ${cmd}. Type help.`);
  }
}

async function main() {
  banner();
  const config = await monitor.getConfig();
  if (config.enabled) {
    await monitor.start();
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "tevel> ",
    terminal: true,
  });

  rl.prompt();
  rl.on("line", async (line) => {
    try {
      await handleCommand(line);
    } catch (e) {
      console.error("Error:", e.message || e);
    }
    rl.prompt();
  });

  rl.on("close", async () => {
    await monitor.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error("[Tevel] Terminal error:", e.message);
  process.exit(1);
});
