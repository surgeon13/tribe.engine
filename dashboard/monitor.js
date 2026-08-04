/**
 * Leader monitor dashboard — aggregate top-10 stats, rates, raid timeline, graphs.
 */

const POLL_UI_MS = 30_000;

/** @param {number} n */
function fmt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${(n / 1_000).toFixed(1)}k`;
  return Math.round(n).toLocaleString("en-US");
}

/** @param {{ wood: number, clay: number, iron: number, crop: number }} res */
function fmtRes(res) {
  return `W ${fmt(res.wood)} · C ${fmt(res.clay)} · I ${fmt(res.iron)} · Cr ${fmt(res.crop)}`;
}

/**
 * @param {SVGElement} svg
 * @param {{ label: string, values: number[], color?: string }[]} series
 * @param {string[]} labels x-axis labels (timestamps shortened)
 */
function drawTimeSeriesChart(svg, series, labels, title) {
  const width = 720;
  const height = 260;
  const pad = { top: 36, right: 20, bottom: 48, left: 56 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("role", "img");
  svg.innerHTML = "";

  const allVals = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  const maxV = allVals.length ? Math.max(...allVals, 1) : 1;
  const minV = allVals.length ? Math.min(...allVals, 0) : 0;
  const range = maxV - minV || 1;
  const n = labels.length;

  const titleEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
  titleEl.setAttribute("x", String(pad.left));
  titleEl.setAttribute("y", "22");
  titleEl.setAttribute("fill", "currentColor");
  titleEl.setAttribute("font-size", "14");
  titleEl.setAttribute("font-weight", "600");
  titleEl.textContent = title;
  svg.append(titleEl);

  const grid = document.createElementNS("http://www.w3.org/2000/svg", "g");
  grid.setAttribute("stroke", "currentColor");
  grid.setAttribute("stroke-opacity", "0.12");
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (innerH * i) / 4;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(width - pad.right));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    grid.append(line);

    const val = maxV - (range * i) / 4;
    const tick = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tick.setAttribute("x", String(pad.left - 8));
    tick.setAttribute("y", String(y + 4));
    tick.setAttribute("text-anchor", "end");
    tick.setAttribute("fill", "currentColor");
    tick.setAttribute("font-size", "10");
    tick.setAttribute("opacity", "0.7");
    tick.textContent = fmt(val);
    svg.append(tick);
  }
  svg.append(grid);

  for (const s of series) {
    if (!s.values.length) continue;
    const points = s.values.map((v, i) => {
      const x = pad.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
      const y = pad.top + innerH - ((v - minV) / range) * innerH;
      return `${x},${y}`;
    });

    const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", s.color || "var(--accent, #c9a227)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("points", points.join(" "));
    svg.append(path);
  }

  const step = Math.max(1, Math.floor(n / 6));
  for (let i = 0; i < n; i += step) {
    const x = pad.left + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(x));
    t.setAttribute("y", String(height - 12));
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", "9");
    t.setAttribute("opacity", "0.75");
    t.textContent = labels[i];
    svg.append(t);
  }

  const legendY = 12;
  let legendX = width - pad.right;
  for (const s of [...series].reverse()) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("fill", "currentColor");
    text.setAttribute("font-size", "10");
    text.setAttribute("y", String(legendY));
    text.setAttribute("text-anchor", "end");
    text.textContent = s.label;
    text.setAttribute("x", String(legendX));
    legendX -= text.getComputedTextLength?.() ? text.getComputedTextLength() + 20 : 60;

    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", String(legendX + 14));
    dot.setAttribute("cy", String(legendY - 3));
    dot.setAttribute("r", "4");
    dot.setAttribute("fill", s.color || "var(--accent)");
    g.append(dot, text);
    svg.append(g);
    legendX -= 8;
  }
}

/** @param {import('../lib/leader-monitor/types.js').RaidSession[]} raids */
function renderRaidTimeline(container, raids) {
  container.innerHTML = "";
  if (!raids.length) {
    container.innerHTML = '<p class="muted">No raid sessions detected yet. Enable polling and wait for resource spikes in the top 10.</p>';
    return;
  }

  const list = document.createElement("div");
  list.className = "monitor-raid-list";

  for (const raid of [...raids].reverse().slice(0, 12)) {
    const row = document.createElement("article");
    row.className = `monitor-raid-row monitor-raid-row--${raid.status}`;

    const head = document.createElement("header");
    head.innerHTML = `
      <strong>${raid.status === "active" ? "Raid active" : "Raid ended"}</strong>
      <span class="muted">${new Date(raid.start).toLocaleString()} → ${new Date(raid.end).toLocaleString()}</span>
    `;

    const body = document.createElement("p");
    const mins = Math.round(raid.durationMs / 60_000);
    body.textContent = `${mins} min · Loot ${fmt(raid.totalResourcesRaised)} · Points +${fmt(raid.pointsGained)} · ${fmtRes(raid.resourcesRaised)}`;

    row.append(head, body);
    list.append(row);
  }

  container.append(list);
}

/** @param {HTMLElement} container @param {import('../lib/leader-monitor/types.js').RateWindow[]} rates */
function renderRateCards(container, rates) {
  container.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "monitor-rate-grid";

  for (const rate of rates) {
    const card = document.createElement("article");
    card.className = "monitor-rate-card";
    card.innerHTML = `
      <h4>${rate.label}</h4>
      <dl>
        <div><dt>Points</dt><dd>+${fmt(rate.pointsPerHour)}/hr</dd></div>
        <div><dt>Resources</dt><dd>+${fmt(rate.totalResourcesPerHour)}/hr</dd></div>
        <div><dt>Breakdown</dt><dd class="muted">${fmtRes(rate.resourcesPerHour)}/hr</dd></div>
      </dl>
    `;
    grid.append(card);
  }

  container.append(grid);
}

/** @param {Array<{ timestamp: string, leaders: Array<{ points: number, resources: object }> }>} snapshots */
function aggregateSeries(snapshots) {
  const labels = snapshots.map((s) => {
    const d = new Date(s.timestamp);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });

  const points = [];
  const totalRes = [];
  const wood = [];
  const clay = [];
  const iron = [];
  const crop = [];

  for (const snap of snapshots) {
    let p = 0;
    const r = { wood: 0, clay: 0, iron: 0, crop: 0 };
    for (const l of snap.leaders) {
      p += l.points || 0;
      r.wood += l.resources?.wood || 0;
      r.clay += l.resources?.clay || 0;
      r.iron += l.resources?.iron || 0;
      r.crop += l.resources?.crop || 0;
    }
    points.push(p);
    wood.push(r.wood);
    clay.push(r.clay);
    iron.push(r.iron);
    crop.push(r.crop);
    totalRes.push(r.wood + r.clay + r.iron + r.crop);
  }

  return { labels, points, totalRes, wood, clay, iron, crop };
}

let uiTimer = null;
let hasApi = false;

async function apiGet(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function apiPost(path, body = {}) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function setMonitorStatus(text, ok = true) {
  const el = document.querySelector("#monitor-status-pill");
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("monitor-pill--on", ok);
  el.classList.toggle("monitor-pill--off", !ok);
}

/** @param {(msg: string) => void} toast */
export async function refreshMonitorView(toast) {
  if (!hasApi) {
    setMonitorStatus("Applet required", false);
    return;
  }

  try {
    const [statusRes, snapsRes] = await Promise.all([
      apiGet("/api/monitor/status"),
      apiGet("/api/monitor/snapshots?limit=120"),
    ]);

    const { config, running, analytics } = statusRes;
    const snapshots = snapsRes.snapshots || [];

    setMonitorStatus(running ? "Polling ON" : "Polling OFF", running);

    const toggleBtn = document.querySelector("#monitor-toggle");
    if (toggleBtn) {
      toggleBtn.textContent = config.enabled ? "Disable polling" : "Enable polling";
      toggleBtn.dataset.enabled = config.enabled ? "1" : "0";
    }

    const meta = document.querySelector("#monitor-meta");
    if (meta) {
      meta.innerHTML = `
        <span>Adapter: <strong>${config.adapter}</strong></span>
        <span>Interval: <strong>${(config.pollIntervalMs / 60_000).toFixed(1)} min</strong></span>
        <span>Snapshots: <strong>${analytics.snapshotCount}</strong></span>
      `;
    }

    const aggEl = document.querySelector("#monitor-aggregate");
    if (aggEl && analytics.aggregate) {
      const a = analytics.aggregate;
      aggEl.innerHTML = `
        <div class="monitor-stat"><span class="muted">Aggregate points</span><strong>${fmt(a.points)}</strong></div>
        <div class="monitor-stat"><span class="muted">Aggregate resources</span><strong>${fmt(a.totalResources)}</strong></div>
        <div class="monitor-stat monitor-stat--wide muted">${fmtRes(a.resources)}</div>
      `;
    }

    renderRateCards(document.querySelector("#monitor-rates"), analytics.rates || []);
    renderRaidTimeline(document.querySelector("#monitor-raids"), analytics.raids || []);

    if (snapshots.length >= 2) {
      const series = aggregateSeries(snapshots);
      drawTimeSeriesChart(
        document.querySelector("#monitor-chart-points"),
        [{ label: "Points", values: series.points, color: "var(--accent, #c9a227)" }],
        series.labels,
        "Top 10 aggregate points over time"
      );
      drawTimeSeriesChart(
        document.querySelector("#monitor-chart-resources"),
        [
          { label: "Total", values: series.totalRes, color: "var(--accent, #c9a227)" },
          { label: "Wood", values: series.wood, color: "#8B6914" },
          { label: "Clay", values: series.clay, color: "#C4784A" },
          { label: "Iron", values: series.iron, color: "#6B7B8C" },
          { label: "Crop", values: series.crop, color: "#6B9B37" },
        ],
        series.labels,
        "Top 10 aggregate resources over time"
      );
    }
  } catch (e) {
    setMonitorStatus("Error", false);
    toast?.(e.message || String(e));
  }
}

/** @param {boolean} apiAvailable @param {(msg: string) => void} toast */
export function initMonitorView(apiAvailable, toast) {
  hasApi = apiAvailable;

  document.querySelector("#monitor-toggle")?.addEventListener("click", async () => {
    try {
      const status = await apiGet("/api/monitor/status");
      const enabled = !status.config?.enabled;
      await apiPost("/api/monitor/config", { enabled });
      toast(enabled ? "Polling enabled" : "Polling disabled");
      await refreshMonitorView(toast);
    } catch (e) {
      toast(e.message);
    }
  });

  document.querySelector("#monitor-poll-now")?.addEventListener("click", async () => {
    try {
      await apiPost("/api/monitor/poll");
      toast("Snapshot recorded");
      await refreshMonitorView(toast);
    } catch (e) {
      toast(e.message);
    }
  });
}

export function startMonitorPolling(toast) {
  stopMonitorPolling();
  uiTimer = setInterval(() => refreshMonitorView(toast), POLL_UI_MS);
}

export function stopMonitorPolling() {
  if (uiTimer) {
    clearInterval(uiTimer);
    uiTimer = null;
  }
}
