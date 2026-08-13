/** SVG charts for tribe comparison. */

const CHART_FONT = {
  title: 16,
  label: 12,
  value: 11,
  tick: 11,
  legend: 12,
};

/** Approximate px per character at chart label font sizes. */
const CHAR_PX = 5.8;

/** @param {string} label @param {number} maxCharsPerLine @param {number} [maxLines] */
function wrapLabelLines(label, maxCharsPerLine, maxLines = 2) {
  const text = String(label || "—").trim() || "—";
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";

  const pushCurrent = () => {
    if (current) {
      lines.push(current);
      current = "";
    }
  };

  for (const word of words) {
    if (lines.length >= maxLines) break;

    if (!current) {
      if (word.length <= maxCharsPerLine) {
        current = word;
      } else {
        lines.push(word.slice(0, maxCharsPerLine));
        if (lines.length < maxLines && word.length > maxCharsPerLine) {
          current = word.slice(maxCharsPerLine);
        }
      }
      continue;
    }

    const candidate = `${current} ${word}`;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      pushCurrent();
      if (lines.length >= maxLines) break;
      current = word.length <= maxCharsPerLine ? word : word.slice(0, maxCharsPerLine);
    }
  }

  pushCurrent();
  return lines.length ? lines.slice(0, maxLines) : ["—"];
}

/** Min width per x-axis column so troop names fit on 1–2 horizontal lines. */
function minGroupWidthForLabels(labels, minGroupW = 88) {
  let needed = minGroupW;
  for (const label of labels) {
    const text = String(label || "");
    const words = text.split(/\s+/);
    const longestWord = Math.max(...words.map((w) => w.length), 0);
    const twoLineChars = Math.ceil(text.length / 2);
    const lineChars = Math.max(longestWord, twoLineChars);
    needed = Math.max(needed, Math.ceil(lineChars * CHAR_PX + 12));
  }
  return needed;
}

/** @param {string[]} labels @param {number} groupW */
function chartBottomPad(labels, groupW) {
  const maxChars = Math.max(6, Math.floor((groupW - 8) / CHAR_PX));
  const maxLines = Math.max(
    1,
    ...labels.map((l) => wrapLabelLines(l, maxChars).length)
  );
  return 16 + maxLines * 15;
}

/**
 * Horizontal multi-line x-axis label (never rotated).
 * @returns {number} line count used
 */
function appendXAxisLabel(svg, x, height, label, opts = {}) {
  const groupW = opts.groupW ?? 88;
  const bottomInset = opts.bottomInset ?? 0;
  const base = height - bottomInset;
  const maxChars = Math.max(6, Math.floor((groupW - 8) / CHAR_PX));
  const lines = wrapLabelLines(label, maxChars);
  const fontSize = groupW < 76 ? 9 : 10;
  const lineHeight = fontSize + 4;
  const blockH = lines.length * lineHeight;
  const startY = base - 8 - blockH + fontSize;

  const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
  t.setAttribute("x", String(x));
  t.setAttribute("y", String(startY));
  t.setAttribute("text-anchor", "middle");
  t.setAttribute("fill", "currentColor");
  t.setAttribute("font-size", String(fontSize));
  t.setAttribute("font-weight", "600");
  t.setAttribute("font-family", "DM Sans, system-ui, sans-serif");

  lines.forEach((line, i) => {
    const tsp = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
    tsp.setAttribute("x", String(x));
    if (i === 0) tsp.setAttribute("y", String(startY));
    else tsp.setAttribute("dy", String(lineHeight));
    tsp.textContent = line;
    t.append(tsp);
  });

  svg.append(t);
  return lines.length;
}

/** @param {string[]} labels @param {number} [containerW] @param {number} [padX] */
export function computeChartWidth(labels, containerW = 720, padX = 78) {
  const minGroupW = minGroupWidthForLabels(labels);
  return Math.max(containerW, labels.length * minGroupW + padX);
}

/**
 * Prefer a chart pixel width that matches the on-screen container so SVG text
 * stays readable (wide viewBoxes shrink to unreadably small type on phones).
 * @param {number} containerW
 * @param {"bars"|"lines"|"horizontal"} layoutId
 * @param {string[]} labels
 */
export function computeReadableChartWidth(containerW, layoutId, labels) {
  const w = Math.max(280, Math.floor(containerW || 360));
  if (layoutId === "horizontal") return w;
  // Vertical/line charts still need slot columns — allow mild scroll, not 2× shrink.
  const minGroupW = Math.min(72, minGroupWidthForLabels(labels, 64));
  const needed = labels.length * minGroupW + 78;
  if (w < 560) return Math.min(needed, Math.max(w, w * 1.15));
  return Math.max(w, needed);
}

function drawYAxisTicks(svg, pad, innerW, innerH, maxVal, formatTick = (v) => String(Math.round(v))) {
  for (let tick = 0; tick <= 4; tick++) {
    const yVal = (maxVal * tick) / 4;
    const y = pad.top + innerH - (yVal / maxVal) * innerH;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(pad.left + innerW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "var(--chart-grid)");
    line.setAttribute("stroke-width", "1");
    svg.append(line);
    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", String(pad.left - 8));
    lbl.setAttribute("y", String(y + 4));
    lbl.setAttribute("text-anchor", "end");
    lbl.setAttribute("fill", "var(--text-muted)");
    lbl.setAttribute("font-size", String(CHART_FONT.tick));
    lbl.setAttribute("font-weight", "600");
    lbl.textContent = formatTick(yVal);
    svg.append(lbl);
  }
}

export const CHART_LAYOUTS = [
  { id: "split", name: "One graph per unit", description: "A small chart per slot, bars are tribes" },
  { id: "bars", name: "Vertical bars", description: "Grouped columns per slot" },
  { id: "lines", name: "Line chart", description: "Trend across slots 1–11" },
  { id: "horizontal", name: "Horizontal bars", description: "Side-by-side bars per slot" },
];

/**
 * One slot, one chart, tribes along the bottom.
 *
 * The grouped layout puts all eleven slots on a single axis, which leaves each
 * bar a few pixels wide and no room to say whose it is — you get a picket fence
 * and a legend, and matching the two up is work. Turning the axis around fixes
 * it: with one chart per slot the x-axis is four or five tribes rather than
 * eleven groups, so every bar is wide enough to stand its own name underneath
 * and its value on top, and the legend stops being load-bearing.
 *
 * Each chart scales to its own slot. A shared scale would be the honest choice
 * for reading across charts, but the ranges do not allow it — a settler hauls
 * 3000 where a horse hauls 130, and one shared axis turns every army unit into
 * a sliver, which is the disease being cured. The caption says so, and the axis
 * top is printed on each chart.
 *
 * @param {SVGSVGElement} svg
 * @param {{
 *   title: string,
 *   bars: Array<{ name: string, unitName?: string, value: number, color: string }>,
 *   formatValue?: (v: number, i: number) => string,
 *   width?: number,
 *   height?: number,
 * }} opts
 */
export function drawSlotBarChart(svg, opts) {
  const bars = opts.bars ?? [];
  const n = Math.max(bars.length, 1);
  const width = opts.width ?? 320;
  const height = opts.height ?? 250;
  const fmt = opts.formatValue || ((v) => String(Math.round(v)));
  const hasUnitNames = bars.some((b) => b.unitName && b.unitName !== b.name);
  const pad = { top: 42, right: 12, bottom: hasUnitNames ? 48 : 32, left: 44 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const maxVal = Math.max(1, ...bars.map((b) => b.value || 0));
  const colW = innerW / n;
  const barW = Math.min(56, Math.max(12, colW * 0.62));

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg", "chart-svg-slot");

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", String(pad.left - 30));
  title.setAttribute("y", "20");
  title.setAttribute("fill", "currentColor");
  title.setAttribute("font-size", String(CHART_FONT.label + 1));
  title.setAttribute("font-weight", "700");
  title.textContent = opts.title || "";
  svg.append(title);

  drawYAxisTicks(svg, pad, innerW, innerH, maxVal, fmt);

  const baseY = pad.top + innerH;
  const nameChars = Math.max(4, Math.floor(colW / 5.4));
  const unitChars = Math.max(4, Math.floor(colW / 5));

  bars.forEach((b, i) => {
    const val = b.value || 0;
    const h = (val / maxVal) * innerH;
    const cx = pad.left + colW * i + colW / 2;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(cx - barW / 2));
    rect.setAttribute("y", String(baseY - h));
    rect.setAttribute("width", String(barW));
    rect.setAttribute("height", String(Math.max(h, val > 0 ? 2 : 0)));
    rect.setAttribute("rx", "4");
    rect.setAttribute("fill", b.color);
    rect.setAttribute("stroke", "rgba(0,0,0,0.12)");
    rect.setAttribute("stroke-width", "1");
    const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
    tip.textContent = `${b.name}${b.unitName ? ` — ${b.unitName}` : ""}: ${fmt(val, i)}`;
    rect.append(tip);
    svg.append(rect);

    const value = document.createElementNS("http://www.w3.org/2000/svg", "text");
    value.setAttribute("x", String(cx));
    value.setAttribute("y", String(baseY - h - 6));
    value.setAttribute("text-anchor", "middle");
    value.setAttribute("fill", b.color);
    value.setAttribute("font-size", String(CHART_FONT.value));
    value.setAttribute("font-weight", "700");
    value.textContent = fmt(val, i);
    svg.append(value);

    const tribe = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tribe.setAttribute("x", String(cx));
    tribe.setAttribute("y", String(baseY + 16));
    tribe.setAttribute("text-anchor", "middle");
    tribe.setAttribute("fill", "currentColor");
    tribe.setAttribute("font-size", String(CHART_FONT.tick));
    tribe.setAttribute("font-weight", "600");
    tribe.textContent = clipLabel(b.name, nameChars);
    svg.append(tribe);

    if (hasUnitNames) {
      const unit = document.createElementNS("http://www.w3.org/2000/svg", "text");
      unit.setAttribute("x", String(cx));
      unit.setAttribute("y", String(baseY + 31));
      unit.setAttribute("text-anchor", "middle");
      unit.setAttribute("fill", "var(--text-muted)");
      unit.setAttribute("font-size", "10");
      unit.textContent = clipLabel(b.unitName || "", unitChars);
      svg.append(unit);
    }
  });
}

/** @param {number} seconds */
function clockFromSeconds(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  if (!total) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  return h > 0 ? `${h}:${pad(m)}:${pad(total % 60)}` : `${m}:${pad(total % 60)}`;
}

export const CHART_METRICS = [
  { key: "offense", label: "Attack", combat: true },
  { key: "defenseInfantry", label: "Def vs infantry", combat: true },
  { key: "defenseCavalry", label: "Def vs cavalry", combat: true },
  { key: "speed", label: "Speed", combat: true },
  { key: "carry", label: "Carry", combat: true },
  {
    key: "trainTimeSeconds",
    label: "Training time",
    from: (u) => u.metrics.trainTimeSeconds ?? 0,
    // Also formats axis ticks, which are a number with no unit behind them, so
    // it has to stand on the value alone rather than reaching into the troop.
    format: (v, u) => u?.metrics?.trainTimeFormatted || clockFromSeconds(v),
  },
  {
    key: "resourceCost",
    label: "Resource cost",
    from: (u) => u.metrics.resourceCost ?? u.totalCost ?? 0,
    format: (v) => (v > 0 ? v.toLocaleString() : "0"),
  },
];

/**
 * @param {SVGElement} svg
 * @param {{
 *   labels: string[],
 *   valuesA: number[],
 *   valuesB: number[],
 *   nameA: string,
 *   nameB: string,
 *   colorA: string,
 *   colorB: string,
 *   title?: string,
 *   yAxisLabel?: string,
 *   showBarValues?: boolean,
 *   formatValue?: (value: number, index: number, side: "a" | "b") => string,
 *   width?: number,
 *   height?: number,
 * }} opts
 */
export function drawGroupedBarChart(svg, opts) {
  const width = opts.width ?? 720;
  const height = opts.height ?? 320;
  const pad = { top: 44, right: 16, bottom: 64, left: 52 };
  const showValues = opts.showBarValues !== false;
  const fmt =
    opts.formatValue ||
    ((v) => (Number.isInteger(v) ? String(v) : v % 1 === 0 ? String(v) : v.toFixed(1)));
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = opts.labels.length;
  const maxVal = Math.max(
    1,
    ...opts.valuesA,
    ...opts.valuesB
  );
  const groupW = innerW / Math.max(n, 1);
  const barW = Math.min(18, groupW * 0.32);
  const gap = 4;

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  if (opts.title) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(pad.left));
    t.setAttribute("y", "20");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", "14");
    t.setAttribute("font-weight", "600");
    t.textContent = opts.title;
    svg.append(t);
  }

  if (opts.yAxisLabel) {
    const yl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yl.setAttribute("x", "12");
    yl.setAttribute("y", String(pad.top + innerH / 2));
    yl.setAttribute("fill", "var(--text-muted)");
    yl.setAttribute("font-size", "10");
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("transform", `rotate(-90 12 ${pad.top + innerH / 2})`);
    yl.textContent = opts.yAxisLabel;
    svg.append(yl);
  }

  const legendY = 12;
  [
    { name: opts.nameA, color: opts.colorA },
    { name: opts.nameB, color: opts.colorB },
  ].forEach((item, i) => {
    const lx = width - pad.right - 140 + i * 72;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(lx));
    rect.setAttribute("y", String(legendY));
    rect.setAttribute("width", "10");
    rect.setAttribute("height", "10");
    rect.setAttribute("rx", "2");
    rect.setAttribute("fill", item.color);
    svg.append(rect);
    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", String(lx + 14));
    lab.setAttribute("y", String(legendY + 9));
    lab.setAttribute("fill", "currentColor");
    lab.setAttribute("font-size", "11");
    lab.textContent = item.name;
    svg.append(lab);
  });

  for (let tick = 0; tick <= 4; tick++) {
    const yVal = (maxVal * tick) / 4;
    const y = pad.top + innerH - (yVal / maxVal) * innerH;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(pad.left + innerW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "var(--chart-grid)");
    line.setAttribute("stroke-width", "1");
    svg.append(line);
    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", String(pad.left - 8));
    lbl.setAttribute("y", String(y + 4));
    lbl.setAttribute("text-anchor", "end");
    lbl.setAttribute("fill", "var(--text-muted)");
    lbl.setAttribute("font-size", "10");
    lbl.textContent = String(Math.round(yVal));
    svg.append(lbl);
  }

  opts.labels.forEach((label, i) => {
    const cx = pad.left + groupW * i + groupW / 2;
    const va = opts.valuesA[i] ?? 0;
    const vb = opts.valuesB[i] ?? 0;
    const ha = (va / maxVal) * innerH;
    const hb = (vb / maxVal) * innerH;
    const baseY = pad.top + innerH;

    const barA = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    barA.setAttribute("x", String(cx - barW - gap / 2));
    barA.setAttribute("y", String(baseY - ha));
    barA.setAttribute("width", String(barW));
    barA.setAttribute("height", String(ha));
    barA.setAttribute("rx", "3");
    barA.setAttribute("fill", opts.colorA);
    svg.append(barA);

    if (showValues && ha > 0) {
      const ta = document.createElementNS("http://www.w3.org/2000/svg", "text");
      ta.setAttribute("x", String(cx - barW / 2 - gap / 2));
      ta.setAttribute("y", String(baseY - ha - 4));
      ta.setAttribute("text-anchor", "middle");
      ta.setAttribute("fill", opts.colorA);
      ta.setAttribute("font-size", "9");
      ta.setAttribute("font-weight", "600");
      ta.textContent = fmt(va, i, "a");
      svg.append(ta);
    }

    const barB = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    barB.setAttribute("x", String(cx + gap / 2));
    barB.setAttribute("y", String(baseY - hb));
    barB.setAttribute("width", String(barW));
    barB.setAttribute("height", String(hb));
    barB.setAttribute("rx", "3");
    barB.setAttribute("fill", opts.colorB);
    svg.append(barB);

    if (showValues && hb > 0) {
      const tb = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tb.setAttribute("x", String(cx + barW / 2 + gap / 2));
      tb.setAttribute("y", String(baseY - hb - 4));
      tb.setAttribute("text-anchor", "middle");
      tb.setAttribute("fill", opts.colorB);
      tb.setAttribute("font-size", "9");
      tb.setAttribute("font-weight", "600");
      tb.textContent = fmt(vb, i, "b");
      svg.append(tb);
    }

    const slotLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    slotLbl.setAttribute("x", String(cx));
    slotLbl.setAttribute("y", String(height - 20));
    slotLbl.setAttribute("text-anchor", "middle");
    slotLbl.setAttribute("fill", "var(--text-muted)");
    slotLbl.setAttribute("font-size", "10");
    slotLbl.setAttribute("font-weight", "600");
    slotLbl.textContent = label;
    svg.append(slotLbl);

    if (opts.slotSubLabels?.[i]) {
      const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sub.setAttribute("x", String(cx));
      sub.setAttribute("y", String(height - 8));
      sub.setAttribute("text-anchor", "middle");
      sub.setAttribute("fill", "var(--text-muted)");
      sub.setAttribute("font-size", "8");
      sub.textContent = opts.slotSubLabels[i];
      svg.append(sub);
    }
  });
}

/**
 * Stacked W/C/I/Cr cost comparison per slot.
 * @param {SVGElement} svg
 * @param {object} opts
 */
export function drawCostStackChart(svg, opts) {
  const width = opts.width ?? 720;
  const height = opts.height ?? 280;
  const pad = { top: 32, right: 16, bottom: 48, left: 48 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const resources = [
    { key: "wood", label: "W", color: "#8B6914" },
    { key: "clay", label: "C", color: "#C4784A" },
    { key: "iron", label: "I", color: "#7A8B99" },
    { key: "crop", label: "Cr", color: "#6B9B37" },
  ];
  const n = opts.slots.length;
  const maxTotal = Math.max(
    1,
    ...opts.slots.map((s) => s.totalA + s.totalB)
  );
  const colW = innerW / Math.max(n, 1);

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.classList.add("chart-svg");

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", String(pad.left));
  title.setAttribute("y", "20");
  title.setAttribute("fill", "currentColor");
  title.setAttribute("font-size", "14");
  title.setAttribute("font-weight", "600");
  title.textContent = opts.title || "Training resources by slot";
  svg.append(title);

  if (opts.nameA && opts.nameB) {
    const legendY = 10;
    [
      { name: opts.nameA, color: opts.colorA || "#c9a227" },
      { name: opts.nameB, color: opts.colorB || "#4fc3f7" },
    ].forEach((item, i) => {
      const lx = width - pad.right - 140 + i * 72;
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", String(lx));
      rect.setAttribute("y", String(legendY));
      rect.setAttribute("width", "10");
      rect.setAttribute("height", "10");
      rect.setAttribute("rx", "2");
      rect.setAttribute("fill", item.color);
      svg.append(rect);
      const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
      lab.setAttribute("x", String(lx + 14));
      lab.setAttribute("y", String(legendY + 9));
      lab.setAttribute("fill", "currentColor");
      lab.setAttribute("font-size", "11");
      lab.textContent = item.name;
      svg.append(lab);
    });
  }

  opts.slots.forEach((slot, i) => {
    const x0 = pad.left + colW * i + colW * 0.12;
    const w = colW * 0.36;
    const baseY = pad.top + innerH;
    const scale = innerH / maxTotal;

    const stack = (side, cost, offsetX) => {
      let y = baseY;
      for (const res of resources) {
        const v = cost[res.key] ?? 0;
        const h = v * scale;
        y -= h;
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", String(offsetX));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(w));
        r.setAttribute("height", String(h));
        r.setAttribute("fill", res.color);
        r.setAttribute("opacity", side === "a" ? "0.95" : "0.65");
        svg.append(r);
      }
    };

    stack("a", slot.costA, x0);
    stack("b", slot.costB, x0 + w + 6);

    const labelTotal = (total, x, color) => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("x", String(x + w / 2));
      t.setAttribute("y", String(baseY - total * scale - 6));
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("fill", color);
      t.setAttribute("font-size", "9");
      t.setAttribute("font-weight", "600");
      t.textContent = total > 0 ? total.toLocaleString() : "";
      svg.append(t);
    };
    labelTotal(slot.totalA, x0, opts.colorA || "#c9a227");
    labelTotal(slot.totalB, x0 + w + 6, opts.colorB || "#4fc3f7");

    const lbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lbl.setAttribute("x", String(pad.left + colW * i + colW / 2));
    lbl.setAttribute("y", String(height - 16));
    lbl.setAttribute("text-anchor", "middle");
    lbl.setAttribute("fill", "var(--text-muted)");
    lbl.setAttribute("font-size", "10");
    lbl.textContent = slot.label;
    svg.append(lbl);

    if (slot.subLabel) {
      const sub = document.createElementNS("http://www.w3.org/2000/svg", "text");
      sub.setAttribute("x", String(pad.left + colW * i + colW / 2));
      sub.setAttribute("y", String(height - 4));
      sub.setAttribute("text-anchor", "middle");
      sub.setAttribute("fill", "var(--text-muted)");
      sub.setAttribute("font-size", "8");
      sub.textContent = slot.subLabel;
      svg.append(sub);
    }
  });
}

function drawChartChrome(svg, opts, pad, innerW, innerH, maxVal) {
  const width = opts.width ?? 720;
  if (opts.title) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(pad.left));
    t.setAttribute("y", "20");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", "14");
    t.setAttribute("font-weight", "600");
    t.textContent = opts.title;
    svg.append(t);
  }
  const legendY = 12;
  [
    { name: opts.nameA, color: opts.colorA },
    { name: opts.nameB, color: opts.colorB },
  ].forEach((item, i) => {
    const lx = width - pad.right - 140 + i * 72;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(lx));
    rect.setAttribute("y", String(legendY));
    rect.setAttribute("width", "10");
    rect.setAttribute("height", "10");
    rect.setAttribute("rx", "2");
    rect.setAttribute("fill", item.color);
    svg.append(rect);
    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", String(lx + 14));
    lab.setAttribute("y", String(legendY + 9));
    lab.setAttribute("fill", "currentColor");
    lab.setAttribute("font-size", "11");
    lab.textContent = item.name;
    svg.append(lab);
  });
  for (let tick = 0; tick <= 4; tick++) {
    const yVal = (maxVal * tick) / 4;
    const y = pad.top + innerH - (yVal / maxVal) * innerH;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", String(pad.left));
    line.setAttribute("x2", String(pad.left + innerW));
    line.setAttribute("y1", String(y));
    line.setAttribute("y2", String(y));
    line.setAttribute("stroke", "var(--chart-grid)");
    line.setAttribute("stroke-width", "1");
    svg.append(line);
  }
}

/**
 * Line chart — two series across roster slots.
 */
export function drawLineCompareChart(svg, opts) {
  const width = opts.width ?? 720;
  const height = opts.height ?? 340;
  const pad = { top: 44, right: 16, bottom: 64, left: 52 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = opts.labels.length;
  const maxVal = Math.max(1, ...opts.valuesA, ...opts.valuesB);
  const fmt = opts.formatValue || ((v) => String(Math.round(v)));
  const showValues = opts.showBarValues !== false;

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  drawChartChrome(svg, opts, pad, innerW, innerH, maxVal);

  const points = (values, color) => {
    const pts = [];
    values.forEach((val, i) => {
      const x = pad.left + (innerW * (i + 0.5)) / Math.max(n, 1);
      const y = pad.top + innerH - (val / maxVal) * innerH;
      pts.push({ x, y, val, i });
    });
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", color);
    poly.setAttribute("stroke-width", "2.5");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
    svg.append(poly);
    for (const p of pts) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", "4");
      c.setAttribute("fill", color);
      c.setAttribute("stroke", "var(--bg-elevated)");
      c.setAttribute("stroke-width", "1.5");
      svg.append(c);
      if (showValues) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", String(p.x));
        t.setAttribute("y", String(p.y - 8));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", color);
        t.setAttribute("font-size", "9");
        t.setAttribute("font-weight", "600");
        t.textContent = fmt(p.val, p.i, color === opts.colorA ? "a" : "b");
        svg.append(t);
      }
    }
  };

  points(opts.valuesA, opts.colorA);
  points(opts.valuesB, opts.colorB);

  opts.labels.forEach((label, i) => {
    const x = pad.left + (innerW * (i + 0.5)) / Math.max(n, 1);
    const slotLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    slotLbl.setAttribute("x", String(x));
    slotLbl.setAttribute("y", String(height - 20));
    slotLbl.setAttribute("text-anchor", "middle");
    slotLbl.setAttribute("fill", "var(--text-muted)");
    slotLbl.setAttribute("font-size", "10");
    slotLbl.textContent = label;
    svg.append(slotLbl);
  });
}

/**
 * Horizontal grouped bars per slot.
 */
export function drawHorizontalCompareChart(svg, opts) {
  const width = opts.width ?? 720;
  const height = Math.max(320, opts.labels.length * 36 + 80);
  const pad = { top: 44, right: 24, bottom: 24, left: 120 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const n = opts.labels.length;
  const maxVal = Math.max(1, ...opts.valuesA, ...opts.valuesB);
  const rowH = innerH / Math.max(n, 1);
  const barH = Math.min(12, rowH * 0.28);
  const fmt = opts.formatValue || ((v) => String(Math.round(v)));

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  drawChartChrome(svg, { ...opts, height }, pad, innerW, innerH, maxVal);

  opts.labels.forEach((label, i) => {
    const y = pad.top + rowH * i + rowH / 2;
    const va = opts.valuesA[i] ?? 0;
    const vb = opts.valuesB[i] ?? 0;
    const wa = (va / maxVal) * innerW;
    const wb = (vb / maxVal) * innerW;

    const nameLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    nameLbl.setAttribute("x", String(pad.left - 8));
    nameLbl.setAttribute("y", String(y + 4));
    nameLbl.setAttribute("text-anchor", "end");
    nameLbl.setAttribute("fill", "var(--text-muted)");
    nameLbl.setAttribute("font-size", "10");
    nameLbl.textContent = label;
    svg.append(nameLbl);

    const barA = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    barA.setAttribute("x", String(pad.left));
    barA.setAttribute("y", String(y - barH - 2));
    barA.setAttribute("width", String(wa));
    barA.setAttribute("height", String(barH));
    barA.setAttribute("rx", "2");
    barA.setAttribute("fill", opts.colorA);
    svg.append(barA);

    const barB = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    barB.setAttribute("x", String(pad.left));
    barB.setAttribute("y", String(y + 2));
    barB.setAttribute("width", String(wb));
    barB.setAttribute("height", String(barH));
    barB.setAttribute("rx", "2");
    barB.setAttribute("fill", opts.colorB);
    svg.append(barB);

    if (wa > 40) {
      const ta = document.createElementNS("http://www.w3.org/2000/svg", "text");
      ta.setAttribute("x", String(pad.left + wa - 4));
      ta.setAttribute("y", String(y - barH));
      ta.setAttribute("text-anchor", "end");
      ta.setAttribute("fill", opts.colorA);
      ta.setAttribute("font-size", "9");
      ta.textContent = fmt(va, i, "a");
      svg.append(ta);
    }
    if (wb > 40) {
      const tb = document.createElementNS("http://www.w3.org/2000/svg", "text");
      tb.setAttribute("x", String(pad.left + wb - 4));
      tb.setAttribute("y", String(y + barH + 10));
      tb.setAttribute("text-anchor", "end");
      tb.setAttribute("fill", opts.colorB);
      tb.setAttribute("font-size", "9");
      tb.textContent = fmt(vb, i, "b");
      svg.append(tb);
    }
  });
}

/** @typedef {{ name: string, color: string, values: number[] }} ChartSeries */

function resolveChartSeries(opts) {
  if (opts.series?.length) return opts.series;
  return [
    { name: opts.nameA, color: opts.colorA, values: opts.valuesA ?? [] },
    { name: opts.nameB, color: opts.colorB, values: opts.valuesB ?? [] },
  ];
}

/** @param {ChartSeries[]} series @param {number} innerWidth */
function legendLayoutMetrics(series, innerWidth) {
  const itemMinW = Math.min(132, Math.max(88, innerWidth / Math.max(series.length, 1)));
  const itemsPerRow = Math.max(1, Math.min(series.length, Math.floor(innerWidth / itemMinW)));
  const itemW = innerWidth / itemsPerRow;
  const rows = Math.ceil(series.length / itemsPerRow);
  return { itemsPerRow, itemW, rows, rowHeight: 18, height: rows * 18 + 8 };
}

/** @param {string} name @param {number} maxWidth */
function fitLegendLabel(name, maxWidth) {
  const text = String(name || "—");
  const charW = 6.1;
  if (text.length * charW <= maxWidth) return { text, fontSize: 11 };
  const fontSize = Math.max(8, Math.min(11, Math.floor((maxWidth / (text.length * charW)) * 11)));
  return { text, fontSize };
}

/**
 * @param {SVGElement} svg
 * @param {ChartSeries[]} series
 * @param {{ x: number, y: number, width: number }} region
 */
function drawSeriesLegendRegion(svg, series, region) {
  const { itemsPerRow, itemW, rowHeight } = legendLayoutMetrics(series, region.width);
  const labelMaxW = itemW - 22;

  series.forEach((item, i) => {
    const row = Math.floor(i / itemsPerRow);
    const col = i % itemsPerRow;
    const lx = region.x + col * itemW;
    const ly = region.y + row * rowHeight;
    const { text, fontSize } = fitLegendLabel(item.name, labelMaxW);

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", String(lx));
    rect.setAttribute("y", String(ly));
    rect.setAttribute("width", "12");
    rect.setAttribute("height", "12");
    rect.setAttribute("rx", "3");
    rect.setAttribute("fill", item.color);
    rect.setAttribute("stroke", "rgba(0,0,0,0.15)");
    rect.setAttribute("stroke-width", "1");
    svg.append(rect);

    const lab = document.createElementNS("http://www.w3.org/2000/svg", "text");
    lab.setAttribute("x", String(lx + 16));
    lab.setAttribute("y", String(ly + 10));
    lab.setAttribute("fill", "currentColor");
    lab.setAttribute("font-size", String(fontSize));
    lab.setAttribute("font-weight", "600");
    lab.textContent = text;
    svg.append(lab);
  });
}

/** @returns {number} legend block height */
function measureLegendHeight(series, innerWidth) {
  return legendLayoutMetrics(series, innerWidth).height;
}

/**
 * @param {SVGElement} svg
 * @param {ChartSeries[]} series
 * @param {number} width
 * @param {number} totalHeight
 * @param {{ top: number, right: number, bottom: number, left: number }} pad
 */
function drawSeriesLegend(svg, series, width, totalHeight, pad) {
  const innerW = width - pad.left - pad.right;
  const metrics = legendLayoutMetrics(series, innerW);
  drawSeriesLegendRegion(svg, series, {
    x: pad.left,
    y: totalHeight - metrics.height - 4,
    width: innerW,
  });
  return metrics.height;
}

/**
 * Grouped vertical bars for any number of tribes.
 */
export function drawMultiGroupedBarChart(svg, opts) {
  const series = resolveChartSeries(opts);
  const k = series.length;
  const n = opts.labels.length;
  const padLeft = 58;
  const padRight = 20;
  const labels = opts.labels;
  const minGroupW = minGroupWidthForLabels(labels);
  const width = Math.max(opts.width ?? 720, n * minGroupW + padLeft + padRight);
  const innerW = width - padLeft - padRight;
  const groupW = innerW / Math.max(n, 1);
  const xAxisBottom = chartBottomPad(labels, groupW);
  const legendH = measureLegendHeight(series, innerW);
  const height = (opts.height ?? Math.min(520, 380 + k * 8)) + xAxisBottom + legendH;
  const pad = { top: 48, right: padRight, bottom: xAxisBottom + legendH, left: padLeft };
  const showValues = opts.showBarValues !== false;
  const fmt =
    opts.formatValue ||
    ((v) => (Number.isInteger(v) ? String(v) : v % 1 === 0 ? String(v) : v.toFixed(1)));
  const innerH = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(1, ...allVals);
  const barW = Math.min(22, Math.max(8, (groupW * 0.78) / Math.max(k, 1)));
  const totalBarSpan = barW * k + 2 * Math.max(k - 1, 0);
  const showBarValues = showValues && barW >= 10;

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  if (opts.title) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(pad.left));
    t.setAttribute("y", "24");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", String(CHART_FONT.title));
    t.setAttribute("font-weight", "700");
    t.textContent = opts.title;
    svg.append(t);
  }

  if (opts.yAxisLabel) {
    const yl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    yl.setAttribute("x", "14");
    yl.setAttribute("y", String(pad.top + innerH / 2));
    yl.setAttribute("fill", "var(--text-muted)");
    yl.setAttribute("font-size", String(CHART_FONT.tick));
    yl.setAttribute("text-anchor", "middle");
    yl.setAttribute("transform", `rotate(-90 14 ${pad.top + innerH / 2})`);
    yl.textContent = opts.yAxisLabel;
    svg.append(yl);
  }

  drawSeriesLegend(svg, series, width, height, pad);
  drawYAxisTicks(svg, pad, innerW, innerH, maxVal, fmt);

  opts.labels.forEach((label, i) => {
    const cx = pad.left + groupW * i + groupW / 2;
    const baseY = pad.top + innerH;
    const x0 = cx - totalBarSpan / 2;

    series.forEach((s, si) => {
      const val = s.values[i] ?? 0;
      const h = (val / maxVal) * innerH;
      const x = x0 + si * (barW + 2);
      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", String(x));
      bar.setAttribute("y", String(baseY - h));
      bar.setAttribute("width", String(barW));
      bar.setAttribute("height", String(Math.max(h, val > 0 ? 2 : 0)));
      bar.setAttribute("rx", "4");
      bar.setAttribute("fill", s.color);
      bar.setAttribute("stroke", "rgba(0,0,0,0.12)");
      bar.setAttribute("stroke-width", "1");
      // The axis is labelled by category, so the bar carries the tribe's own
      // name for the unit; a vertical bar is too narrow to print it on.
      bar.append(pointTitle(s, i, val, fmt, label, si));
      svg.append(bar);
      if (showBarValues && val > 0) {
        const ta = document.createElementNS("http://www.w3.org/2000/svg", "text");
        ta.setAttribute("x", String(x + barW / 2));
        ta.setAttribute("y", String(baseY - h - 5));
        ta.setAttribute("text-anchor", "middle");
        ta.setAttribute("fill", s.color);
        ta.setAttribute("font-size", String(Math.min(CHART_FONT.value, barW >= 14 ? 11 : 9)));
        ta.setAttribute("font-weight", "700");
        ta.textContent = fmt(val, i, si);
        svg.append(ta);
      }
    });

    appendXAxisLabel(svg, cx, height, label, { groupW, bottomInset: legendH });
  });
}

export function drawMultiLineCompareChart(svg, opts) {
  const series = resolveChartSeries(opts);
  const n = opts.labels.length;
  const padLeft = 58;
  const padRight = 20;
  const labels = opts.labels;
  const minGroupW = minGroupWidthForLabels(labels);
  const width = Math.max(opts.width ?? 720, n * minGroupW + padLeft + padRight);
  const innerW = width - padLeft - padRight;
  const groupW = innerW / Math.max(n, 1);
  const xAxisBottom = chartBottomPad(labels, groupW);
  const legendH = measureLegendHeight(series, innerW);
  const height = (opts.height ?? 400) + xAxisBottom + legendH;
  const pad = { top: 48, right: padRight, bottom: xAxisBottom + legendH, left: padLeft };
  const innerH = height - pad.top - pad.bottom;
  const allVals = series.flatMap((s) => s.values);
  const maxVal = Math.max(1, ...allVals);
  const fmt = opts.formatValue || ((v) => String(Math.round(v)));
  const showValues = opts.showBarValues !== false;

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  if (opts.title) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(pad.left));
    t.setAttribute("y", "24");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", String(CHART_FONT.title));
    t.setAttribute("font-weight", "700");
    t.textContent = opts.title;
    svg.append(t);
  }
  drawYAxisTicks(svg, pad, innerW, innerH, maxVal, fmt);
  drawSeriesLegend(svg, series, width, height, pad);

  series.forEach((s) => {
    const pts = [];
    s.values.forEach((val, i) => {
      const x = pad.left + (innerW * (i + 0.5)) / Math.max(n, 1);
      const y = pad.top + innerH - (val / maxVal) * innerH;
      pts.push({ x, y, val, i });
    });
    const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    poly.setAttribute("fill", "none");
    poly.setAttribute("stroke", s.color);
    poly.setAttribute("stroke-width", "3");
    poly.setAttribute("stroke-linejoin", "round");
    poly.setAttribute("stroke-linecap", "round");
    poly.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
    svg.append(poly);
    for (const p of pts) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", String(p.x));
      c.setAttribute("cy", String(p.y));
      c.setAttribute("r", "5");
      c.setAttribute("fill", s.color);
      c.setAttribute("stroke", "var(--bg-elevated)");
      c.setAttribute("stroke-width", "2");
      // The axis is labelled by category, so the point carries the tribe's own
      // name for the unit; there is nowhere to print it in this layout.
      c.append(pointTitle(s, p.i, p.val, fmt, opts.labels?.[p.i], series.indexOf(s)));
      svg.append(c);
      if (showValues) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", String(p.x));
        t.setAttribute("y", String(p.y - 10));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", s.color);
        t.setAttribute("font-size", String(CHART_FONT.value));
        t.setAttribute("font-weight", "700");
        t.textContent = fmt(p.val, p.i, series.indexOf(s));
        svg.append(t);
      }
    }
  });

  opts.labels.forEach((label, i) => {
    const x = pad.left + (innerW * (i + 0.5)) / Math.max(n, 1);
    appendXAxisLabel(svg, x, height, label, { groupW, bottomInset: legendH });
  });
}

/**
 * Grouped horizontal bars: one block per roster slot, one bar per tribe.
 *
 * The block is headed by the slot's generic category ("Infantry I"), and each
 * bar is labelled in the gutter with what that tribe calls the unit. Naming the
 * rows after one tribe's units, as this used to, made a six-tribe chart look
 * like it was about the Romans and meant reordering the picker renamed every
 * row. The category names the thing being compared; the gutter names the
 * things doing the comparing.
 */
export function drawMultiHorizontalCompareChart(svg, opts) {
  const series = resolveChartSeries(opts);
  const k = series.length;
  const labels = opts.labels;
  const width = Math.max(280, opts.width ?? 720);
  const narrow = width < 560;
  const fmt = opts.formatValue || ((v) => String(Math.round(v)));
  const labelFont = narrow ? 11 : CHART_FONT.label;
  const valueFont = narrow ? 12 : CHART_FONT.value;
  const unitFont = narrow ? 10 : 11;
  const headFont = narrow ? 12 : 13;

  // The gutter now holds unit names rather than one label per row, so it is
  // sized from the longest name any tribe uses. The category header sits above
  // its block on the full width, so it never has to fit in here.
  const unitNames = series.map((s) => s.unitNames || []);
  const hasUnitNames = unitNames.some((names) => names.length > 0);
  const longestUnit = Math.max(
    8,
    ...unitNames.flat().map((nm) => String(nm).length),
    ...(hasUnitNames ? [] : labels.map((l) => String(l).length))
  );
  // CHAR_PX is calibrated for the 12px label font; the gutter names are smaller
  // than that, and measuring them at the larger width truncated names that
  // would have fitted ("Javelin Skirmish…" for an 18-character unit).
  const unitCharPx = CHAR_PX * (unitFont / CHART_FONT.label);
  const idealLeft = Math.min(narrow ? 148 : 210, longestUnit * unitCharPx + 16);
  const leftPad = Math.max(narrow ? 76 : 110, Math.min(idealLeft, Math.floor(width * (narrow ? 0.42 : 0.32))));
  const rightPad = narrow ? 44 : 28;
  const innerW = Math.max(110, width - leftPad - rightPad);
  const legendH = measureLegendHeight(series, innerW);

  const barH = narrow ? 15 : 14;
  const barGap = 2;
  const blockH = barH * k + barGap * (k - 1);
  const headH = headFont + 8;
  const groupGap = narrow ? 16 : 18;
  const rowH = headH + blockH + groupGap;

  const n = labels.length;
  const pad = { top: narrow ? 56 : 48, right: rightPad, bottom: 20 + legendH, left: leftPad };
  const height = pad.top + n * rowH + pad.bottom;
  const maxVal = Math.max(1, ...series.flatMap((s) => s.values));

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");
  if (narrow) svg.classList.add("chart-svg--compact");

  if (opts.title) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", String(12));
    t.setAttribute("y", "22");
    t.setAttribute("fill", "currentColor");
    t.setAttribute("font-size", String(narrow ? 14 : CHART_FONT.title));
    t.setAttribute("font-weight", "700");
    t.textContent = opts.title;
    svg.append(t);
  }
  drawSeriesLegend(svg, series, width, height, pad);

  const maxUnitChars = Math.max(6, Math.floor((leftPad - 10) / unitCharPx));

  labels.forEach((label, i) => {
    const top = pad.top + rowH * i;
    const yStart = top + headH;

    // Category header, on the full width so long names are never clipped.
    const head = document.createElementNS("http://www.w3.org/2000/svg", "text");
    head.setAttribute("x", "12");
    head.setAttribute("y", String(top + headFont));
    head.setAttribute("fill", "currentColor");
    head.setAttribute("font-size", String(headFont));
    head.setAttribute("font-weight", "700");
    head.setAttribute("font-family", "DM Sans, system-ui, sans-serif");
    head.textContent = String(label);
    svg.append(head);

    const rule = document.createElementNS("http://www.w3.org/2000/svg", "line");
    rule.setAttribute("x1", String(12));
    rule.setAttribute("x2", String(width - pad.right));
    rule.setAttribute("y1", String(top + headFont + 4));
    rule.setAttribute("y2", String(top + headFont + 4));
    rule.setAttribute("stroke", "currentColor");
    rule.setAttribute("stroke-opacity", "0.14");
    rule.setAttribute("stroke-width", "1");
    svg.append(rule);

    series.forEach((s, si) => {
      const val = s.values[i] ?? 0;
      const w = (val / maxVal) * innerW;
      const y = yStart + si * (barH + barGap);
      const unitName = s.unitNames?.[i];

      if (unitName) {
        const nameLbl = document.createElementNS("http://www.w3.org/2000/svg", "text");
        nameLbl.setAttribute("x", String(pad.left - 8));
        nameLbl.setAttribute("y", String(y + barH - Math.max(1, (barH - unitFont) / 2) - 0.5));
        nameLbl.setAttribute("text-anchor", "end");
        // Tinted to its series so the gutter doubles as the legend: you can read
        // which tribe a bar belongs to without counting down from the top.
        nameLbl.setAttribute("fill", s.color);
        nameLbl.setAttribute("font-size", String(unitFont));
        nameLbl.setAttribute("font-weight", "600");
        nameLbl.setAttribute("font-family", "DM Sans, system-ui, sans-serif");
        nameLbl.textContent = clipLabel(unitName, maxUnitChars);
        const nameTitle = document.createElementNS("http://www.w3.org/2000/svg", "title");
        nameTitle.textContent = `${unitName} — ${s.name}`;
        nameLbl.append(nameTitle);
        svg.append(nameLbl);
      }

      const bar = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bar.setAttribute("x", String(pad.left));
      bar.setAttribute("y", String(y));
      bar.setAttribute("width", String(Math.max(w, val > 0 ? 2 : 0)));
      bar.setAttribute("height", String(barH));
      bar.setAttribute("rx", "3");
      bar.setAttribute("fill", s.color);
      bar.setAttribute("stroke", "rgba(0,0,0,0.12)");
      bar.setAttribute("stroke-width", "1");
      const tip = document.createElementNS("http://www.w3.org/2000/svg", "title");
      tip.textContent = `${s.name} — ${unitName || label}: ${fmt(val, i, si)}`;
      bar.append(tip);
      svg.append(bar);

      const tb = document.createElementNS("http://www.w3.org/2000/svg", "text");
      const valueOutside = w < innerW * 0.45;
      tb.setAttribute("x", String(valueOutside ? pad.left + w + 6 : pad.left + w - 6));
      tb.setAttribute("y", String(y + barH - Math.max(1, (barH - valueFont) / 2)));
      tb.setAttribute("text-anchor", valueOutside ? "start" : "end");
      tb.setAttribute("fill", valueOutside ? s.color : "var(--bg-elevated, #fff)");
      tb.setAttribute("font-size", String(valueFont));
      tb.setAttribute("font-weight", "700");
      tb.textContent = fmt(val, i, si);
      svg.append(tb);
    });
  });
}

/**
 * Hover text naming the tribe, its own name for the unit, and the value.
 * @param {{ name: string, unitNames?: string[] }} s
 * @param {number} i slot index
 * @param {number} val
 * @param {(v: number, i: number, si: number) => string} fmt
 * @param {string} [fallback] the slot category, when the series has no names
 * @param {number} [si] series index
 */
function pointTitle(s, i, val, fmt, fallback, si = 0) {
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  const unit = s.unitNames?.[i] || fallback || "";
  title.textContent = `${s.name}${unit ? ` — ${unit}` : ""}: ${fmt(val, i, si)}`;
  return title;
}

/**
 * Trim to fit the gutter, keeping the ellipsis inside the budget.
 * @param {string} text
 * @param {number} maxChars
 */
function clipLabel(text, maxChars) {
  const value = String(text || "").trim();
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(1, maxChars - 1))}…`;
}

/**
 * Stacked resource cost — one column group per slot, one stack per tribe.
 */
export function drawMultiCostStackChart(svg, opts) {
  const series = opts.series ?? [];
  const slotLabels = opts.slots.map((s) => s.label);
  const n = slotLabels.length;
  const padLeft = 52;
  const padRight = 20;
  const minGroupW = minGroupWidthForLabels(slotLabels);
  const width = Math.max(opts.width ?? 720, n * minGroupW + padLeft + padRight);
  const innerW = width - padLeft - padRight;
  const groupW = innerW / Math.max(n, 1);
  const xAxisBottom = chartBottomPad(slotLabels, groupW);
  const legendH = measureLegendHeight(series, innerW);
  const height = (opts.height ?? Math.min(480, 340 + series.length * 12)) + xAxisBottom + legendH;
  const pad = { top: 44, right: padRight, bottom: xAxisBottom + legendH, left: padLeft };
  const innerH = height - pad.top - pad.bottom;
  const resources = [
    { key: "wood", color: "#8B6914" },
    { key: "clay", color: "#C4784A" },
    { key: "iron", color: "#7A8B99" },
    { key: "crop", color: "#6B9B37" },
  ];
  const k = series.length;
  const maxTotal = Math.max(
    1,
    ...opts.slots.map((slot) => Math.max(...series.map((_, si) => slot.totals[si] ?? 0)))
  );
  const colW = groupW;
  const stackW = Math.min(28, (colW * 0.82) / Math.max(k, 1));

  svg.innerHTML = "";
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("width", String(width));
  svg.setAttribute("height", String(height));
  svg.classList.add("chart-svg");

  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", String(pad.left));
  title.setAttribute("y", "24");
  title.setAttribute("fill", "currentColor");
  title.setAttribute("font-size", String(CHART_FONT.title));
  title.setAttribute("font-weight", "700");
  title.textContent = opts.title || "Training resources";
  svg.append(title);

  drawSeriesLegend(svg, series, width, height, pad);

  opts.slots.forEach((slot, i) => {
    const baseY = pad.top + innerH;
    const scale = innerH / maxTotal;
    const gap = 5;
    const totalW = stackW * k + gap * (k - 1);
    const xBase = pad.left + colW * i + (colW - totalW) / 2;

    series.forEach((s, si) => {
      const cost = slot.costs[si] ?? {};
      const total = slot.totals[si] ?? 0;
      const x0 = xBase + si * (stackW + gap);
      let y = baseY;
      for (const res of resources) {
        const v = cost[res.key] ?? 0;
        const h = v * scale;
        y -= h;
        const r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        r.setAttribute("x", String(x0));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(stackW));
        r.setAttribute("height", String(Math.max(h, v > 0 ? 1 : 0)));
        r.setAttribute("fill", res.color);
        r.setAttribute("opacity", String(0.95 - si * 0.06));
        r.setAttribute("stroke", "rgba(0,0,0,0.1)");
        r.setAttribute("stroke-width", "0.5");
        const rt = document.createElementNS("http://www.w3.org/2000/svg", "title");
        const unit = slot.unitNames?.[si] || slot.label;
        rt.textContent = `${s.name} — ${unit}: ${res.label || res.key} ${v.toLocaleString()}`;
        r.append(rt);
        svg.append(r);
      }
      // Only label a stack that is wide enough to hold the number. With seven
      // tribes the stacks are a few pixels apart, and printing a five-digit
      // total over each one turned the top of the chart into one long smear of
      // overlapping digits. The hover text carries it in that case.
      if (total > 0 && stackW + gap >= String(total.toLocaleString()).length * CHAR_PX) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", String(x0 + stackW / 2));
        t.setAttribute("y", String(baseY - total * scale - 6));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("fill", s.color);
        t.setAttribute("font-size", String(CHART_FONT.value));
        t.setAttribute("font-weight", "700");
        t.textContent = total.toLocaleString();
        svg.append(t);
      }
    });

    appendXAxisLabel(svg, pad.left + colW * i + colW / 2, height, slot.label, {
      groupW: colW,
      bottomInset: legendH,
    });
  });
}

/**
 * Dispatch compare metric chart by layout id.
 */
export function drawCompareMetricChart(svg, layoutId, opts) {
  const series = resolveChartSeries(opts);
  const multi = { ...opts, series };
  if (layoutId === "lines") return drawMultiLineCompareChart(svg, multi);
  if (layoutId === "horizontal") return drawMultiHorizontalCompareChart(svg, multi);
  return drawMultiGroupedBarChart(svg, multi);
}
