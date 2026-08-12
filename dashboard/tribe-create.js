/**
 * Add / delete tribe UI — custom (from user input) or optional culture presets.
 */

import { mountPaletteContrastHint } from "./palette-hint.js";

/** @type {(tribeId: string, tribeName: string) => Promise<void>} */
let deleteTribeHandler = async () => {
  throw new Error("Delete requires the applet API");
};

/** @type {Set<string>} */
let removableIds = new Set();

const SLOT_ORDER = [
  "inf_t1",
  "inf_t2",
  "inf_t3",
  "scout",
  "cav_t1",
  "cav_t2",
  "cav_t3",
  "ram",
  "catapult",
  "chief",
  "settler",
];

/**
 * @param {(msg: string) => void} toast
 * @param {(tribeId: string, dashboardTribe?: object | null) => Promise<void> | void} onCreated
 * @param {(removedId: string) => Promise<void> | void} [onDeleted]
 */
export function initAddTribeUi(toast, onCreated, onDeleted) {
  const btn = document.querySelector("#btn-add-tribe");
  const overlay = document.querySelector("#add-tribe-overlay");
  if (!btn || !overlay) return;

  const modeSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-mode"));
  const cultureWrap = document.querySelector("#add-tribe-culture-wrap");
  const cultureSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-culture"));
  const customFields = document.querySelector("#add-tribe-custom-fields");
  const nameInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-name"));
  const contextInput = /** @type {HTMLTextAreaElement} */ (document.querySelector("#add-tribe-context"));
  const typeSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-type"));
  const archetypeSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-archetype"));
  const primaryInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-primary"));
  const secondaryInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-secondary"));
  const themeInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-theme"));
  const eraInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-era"));
  const regionInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-region"));
  const troopNamesWrap = document.querySelector("#add-tribe-troop-names");
  const preview = document.querySelector("#add-tribe-preview");
  const submit = /** @type {HTMLButtonElement} */ (document.querySelector("#add-tribe-submit"));
  const cancel = document.querySelector("#add-tribe-cancel");
  const paletteHint = /** @type {HTMLElement | null} */ (document.querySelector("#add-palette-hint"));
  const refreshPaletteHint = mountPaletteContrastHint(primaryInput, secondaryInput, paletteHint);

  /** @type {Array<object>} */
  let profiles = [];
  /** @type {Array<object>} */
  let archetypes = [];
  /** @type {Record<string, string>} */
  let slotLabels = {};
  /** @type {object | null} */
  let lastDerived = null;
  let deriveTimer = 0;
  let paletteDirty = false;
  let archetypeDirty = false;
  let eraDirty = false;
  let regionDirty = false;
  let themeDirty = false;
  /** @type {Set<string>} */
  let troopDirty = new Set();

  function isCustomMode() {
    return modeSelect?.value !== "preset";
  }

  async function loadMeta() {
    const res = await fetch("/api/tribes/profiles");
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Could not load cultures");
    profiles = body.profiles || [];
    archetypes = body.archetypes || [];
    slotLabels = body.slotLabels || {};
    cultureSelect.innerHTML =
      `<option value="">— Select culture preset —</option>` +
      profiles.map((p) => `<option value="${p.id}">${p.name} · ${p.era}</option>`).join("");
    archetypeSelect.innerHTML =
      `<option value="">Auto (from your description)</option>` +
      archetypes.map((a) => `<option value="${a.id}">${a.label}</option>`).join("");
    mountTroopNameInputs();
  }

  function mountTroopNameInputs() {
    if (!troopNamesWrap) return;
    const rows = [
      ...SLOT_ORDER.map((ref) => ({ key: ref, label: slotLabels[ref] || ref })),
      { key: "hero", label: "Hero (account name)" },
    ];
    troopNamesWrap.innerHTML = rows
      .map(
        (r) => `
      <label class="troop-name-field">
        <span>${r.label}</span>
        <input type="text" data-troop-key="${r.key}" autocomplete="off" ${
          r.key === "hero"
            ? 'placeholder="Defaults to your in-game account name"'
            : ""
        } />
      </label>`
      )
      .join("");
    troopNamesWrap.querySelectorAll("input[data-troop-key]").forEach((el) => {
      el.addEventListener("input", () => {
        const key = /** @type {HTMLInputElement} */ (el).dataset.troopKey;
        if (key) troopDirty.add(key);
      });
    });
  }

  function collectTroopNames() {
    /** @type {Record<string, string>} */
    const out = {};
    troopNamesWrap?.querySelectorAll("input[data-troop-key]").forEach((el) => {
      const input = /** @type {HTMLInputElement} */ (el);
      const key = input.dataset.troopKey;
      const val = input.value.trim();
      if (key && val) out[key] = val;
    });
    return out;
  }

  function applyDerivedToForm(derived, { force = false } = {}) {
    if (!derived) return;
    lastDerived = derived;
    if ((!archetypeDirty || force) && !archetypeSelect.value) {
      // keep Auto selected; preview shows inferred id
    }
    if ((!paletteDirty || force) && derived.palette) {
      if (primaryInput.dataset.auto !== "0") primaryInput.value = derived.palette.primary;
      if (secondaryInput.dataset.auto !== "0") secondaryInput.value = derived.palette.secondary;
      refreshPaletteHint();
    }
    if ((!eraDirty || force) && !eraInput.value.trim() && derived.era) {
      eraInput.placeholder = derived.era;
    }
    if ((!regionDirty || force) && !regionInput.value.trim() && derived.region) {
      regionInput.placeholder = derived.region;
    }
    if ((!themeDirty || force) && !themeInput.value.trim() && derived.theme) {
      themeInput.placeholder = derived.theme;
    }
    if (derived.troopNames) {
      troopNamesWrap?.querySelectorAll("input[data-troop-key]").forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        const key = input.dataset.troopKey;
        if (!key || !derived.troopNames[key]) return;
        if (force || !troopDirty.has(key)) {
          // Hero stays "Hero" — runtime default is the player's account name.
          input.value = key === "hero" ? "Hero" : derived.troopNames[key];
        }
      });
    }
  }

  async function refreshDerived() {
    if (!isCustomMode()) {
      renderPreview();
      return;
    }
    const name = nameInput.value.trim();
    if (!name) {
      lastDerived = null;
      renderPreview();
      return;
    }
    const params = new URLSearchParams({
      name,
      theme: themeInput.value.trim(),
      context: contextInput.value.trim(),
    });
    try {
      const res = await fetch(`/api/tribes/defaults?${params}`);
      const body = await res.json();
      if (!body.ok) return;
      applyDerivedToForm(body);
      renderPreview();
    } catch {
      /* ignore */
    }
  }

  function scheduleDerive() {
    window.clearTimeout(deriveTimer);
    deriveTimer = window.setTimeout(() => {
      refreshDerived();
    }, 280);
  }

  function selectedProfile() {
    return profiles.find((p) => p.id === cultureSelect.value) || null;
  }

  function selectedArchetype() {
    const id = archetypeSelect.value || lastDerived?.archetype;
    return archetypes.find((a) => a.id === id) || null;
  }

  function syncModeUi() {
    const custom = isCustomMode();
    cultureWrap?.classList.toggle("hidden", custom);
    customFields?.classList.toggle("hidden", !custom);
    if (custom) scheduleDerive();
    else renderPreview();
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderPreview() {
    if (!preview) return;
    if (isCustomMode()) {
      const name = nameInput.value.trim() || "Your tribe";
      const arch = selectedArchetype();
      const lore = contextInput.value.trim();
      const primary = primaryInput.value;
      const secondary = secondaryInput.value;
      const flavor = lastDerived?.flavorId ? ` · ${lastDerived.flavorId} flavor` : "";
      const sampleNames = lastDerived?.troopNames
        ? [lastDerived.troopNames.inf_t1, lastDerived.troopNames.cav_t1]
            .filter(Boolean)
            .join(" · ")
        : "";
      preview.innerHTML = `
        <div class="add-tribe-swatches">
          <span style="background:${primary}" title="${primary}"></span>
          <span style="background:${secondary}" title="${secondary}"></span>
        </div>
        <p><strong>${escapeHtml(name)}</strong> · from your input · ${escapeHtml(arch?.label || lastDerived?.archetype || "Balanced")}${escapeHtml(flavor)}</p>
        <p class="muted">${escapeHtml(arch?.description || "Balance inferred from your description")}</p>
        <p>${escapeHtml(lore || themeInput.value.trim() || lastDerived?.theme || "Write a description above — roster, colors, and names follow your words.")}</p>
        ${sampleNames ? `<p class="muted">Units: ${escapeHtml(sampleNames)} · Hero = account name</p>` : `<p class="muted">Hero defaults to the player's in-game account name</p>`}
      `;
      return;
    }
    const profile = selectedProfile();
    if (!profile) {
      preview.innerHTML = `<p class="muted">Pick a culture preset, or switch Source back to Custom.</p>`;
      return;
    }
    preview.innerHTML = `
      <div class="add-tribe-swatches">
        <span style="background:${profile.palette.primary}" title="${profile.palette.primary}"></span>
        <span style="background:${profile.palette.secondary}" title="${profile.palette.secondary}"></span>
      </div>
      <p><strong>${escapeHtml(profile.name)}</strong> · ${escapeHtml(profile.archetype)} archetype</p>
      <p class="muted">${escapeHtml(profile.region)}</p>
      <p>${escapeHtml(profile.historicalContext)}</p>
      <p class="muted">${escapeHtml(profile.theme)}</p>
    `;
  }

  function open() {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    syncModeUi();
    nameInput.focus();
  }

  function close() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  function resetForm() {
    nameInput.value = "";
    contextInput.value = "";
    themeInput.value = "";
    eraInput.value = "";
    regionInput.value = "";
    cultureSelect.value = "";
    modeSelect.value = "custom";
    archetypeSelect.value = "";
    primaryInput.value = "#3D5A80";
    secondaryInput.value = "#E09F3E";
    primaryInput.dataset.auto = "1";
    secondaryInput.dataset.auto = "1";
    paletteDirty = false;
    archetypeDirty = false;
    eraDirty = false;
    regionDirty = false;
    themeDirty = false;
    troopDirty = new Set();
    lastDerived = null;
    troopNamesWrap?.querySelectorAll("input").forEach((el) => {
      /** @type {HTMLInputElement} */ (el).value = "";
    });
    refreshPaletteHint();
    syncModeUi();
  }

  btn.addEventListener("click", async () => {
    try {
      if (!profiles.length) await loadMeta();
      open();
    } catch (e) {
      toast(e.message || String(e));
    }
  });

  modeSelect?.addEventListener("change", syncModeUi);

  cultureSelect.addEventListener("change", () => {
    const p = selectedProfile();
    renderPreview();
    if (p && !nameInput.value.trim()) nameInput.value = p.name;
    if (p) {
      contextInput.value = p.historicalContext;
      if (p.palette?.primary) primaryInput.value = p.palette.primary;
      if (p.palette?.secondary) secondaryInput.value = p.palette.secondary;
      refreshPaletteHint();
    }
  });

  nameInput.addEventListener("input", scheduleDerive);
  contextInput.addEventListener("input", scheduleDerive);
  themeInput.addEventListener("input", () => {
    themeDirty = Boolean(themeInput.value.trim());
    scheduleDerive();
  });
  eraInput.addEventListener("input", () => {
    eraDirty = Boolean(eraInput.value.trim());
  });
  regionInput.addEventListener("input", () => {
    regionDirty = Boolean(regionInput.value.trim());
  });
  archetypeSelect?.addEventListener("change", () => {
    archetypeDirty = Boolean(archetypeSelect.value);
    renderPreview();
  });
  primaryInput?.addEventListener("input", () => {
    paletteDirty = true;
    primaryInput.dataset.auto = "0";
    renderPreview();
  });
  secondaryInput?.addEventListener("input", () => {
    paletteDirty = true;
    secondaryInput.dataset.auto = "0";
    renderPreview();
  });

  cancel?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  submit?.addEventListener("click", async () => {
    const custom = isCustomMode();
    const name = nameInput.value.trim();
    if (custom && !name) {
      toast("Enter a display name — culture is built from your input");
      return;
    }
    if (custom && !contextInput.value.trim() && !themeInput.value.trim()) {
      toast("Describe your culture (lore / how they fight) — generation is based on that");
      return;
    }
    if (!custom && !cultureSelect.value) {
      toast("Select a culture preset, or switch Source to Custom");
      return;
    }

    submit.disabled = true;
    submit.textContent = "Creating…";
    try {
      /** @type {Record<string, unknown>} */
      const payload = {
        custom,
        cultureId: custom ? "custom" : cultureSelect.value,
        name: name || undefined,
        historicalContext: contextInput.value.trim() || undefined,
        type: typeSelect.value === "npc" ? "npc" : "playable",
      };

      if (custom) {
        // Only send overrides the user actually set; server derives the rest from name+lore
        if (archetypeSelect.value) payload.archetype = archetypeSelect.value;
        if (themeInput.value.trim()) payload.theme = themeInput.value.trim();
        if (eraInput.value.trim()) payload.era = eraInput.value.trim();
        if (regionInput.value.trim()) payload.region = regionInput.value.trim();
        if (paletteDirty || primaryInput.dataset.auto === "0" || secondaryInput.dataset.auto === "0") {
          payload.palette = {
            primary: primaryInput.value,
            secondary: secondaryInput.value,
          };
        }
        const troopNames = collectTroopNames();
        if (Object.keys(troopNames).length) payload.troopNames = troopNames;
      } else {
        const troopNames = collectTroopNames();
        if (Object.keys(troopNames).length) payload.troopNames = troopNames;
      }

      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);

      const tribeMeta = body.tribe || {};
      const dashboardTribe = body.dashboardTribe || null;
      const sessionOnly =
        tribeMeta.persisted === false ||
        tribeMeta.sessionOnly === true ||
        body.persisted === false;

      if (dashboardTribe) {
        const { upsertSessionTribe } = await import("./session-tribes.js");
        // Netlify / non-writable: durable store is localStorage.
        // Local applet: session upsert is a no-op when session store is disabled.
        upsertSessionTribe(dashboardTribe);
      }

      if (tribeMeta.buildWarning) {
        toast(
          `Saved ${tribeMeta.name || "tribe"} but dashboard rebuild warned: ${tribeMeta.buildWarning}`
        );
      } else if (sessionOnly) {
        toast(body.message || `Added ${tribeMeta.name} (browser session)`);
      } else {
        toast(body.message || `Saved ${tribeMeta.name} to disk`);
      }
      close();
      resetForm();
      await refreshRemovableTribes();
      await onCreated(tribeMeta.id, dashboardTribe);
    } catch (e) {
      toast(e.message || String(e));
    } finally {
      submit.disabled = false;
      submit.textContent = "Add tribe";
    }
  });

  deleteTribeHandler = async (tribeId, tribeName) => {
    const label = tribeName || tribeId;
    if (
      !confirm(
        `Delete tribe "${label}"?\n\nOn the local applet this removes it from data/. On Netlify it only leaves this browser session.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tribes/${encodeURIComponent(tribeId)}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);
    if (body.sessionOnly) {
      const { removeSessionTribe } = await import("./session-tribes.js");
      removeSessionTribe(tribeId);
      toast(`Removed ${label} from this browser session`);
    } else {
      toast(`Deleted ${body.tribe.name}`);
    }
    await refreshRemovableTribes();
    await onDeleted?.(tribeId);
  };
}

export function setAddTribeEnabled(enabled) {
  const btn = /** @type {HTMLButtonElement | null} */ (document.querySelector("#btn-add-tribe"));
  if (!btn) return;
  btn.disabled = !enabled;
  btn.title = enabled
    ? "Create a tribe from your description"
    : "Needs the local applet (npm start) or a Netlify Functions deploy";
}

export async function refreshRemovableTribes() {
  try {
    const res = await fetch("/api/tribes");
    const body = await res.json();
    if (!res.ok || !body.ok) return removableIds;
    removableIds = new Set((body.tribes || []).filter((t) => t.removable).map((t) => t.id));
  } catch {
    /* static mode */
  }
  try {
    const { loadSessionTribes } = await import("./session-tribes.js");
    for (const t of loadSessionTribes()) removableIds.add(t.id);
  } catch {
    /* ignore */
  }
  return removableIds;
}

export function isRemovableTribe(id) {
  return removableIds.has(id);
}

/**
 * @param {string} tribeId
 * @param {string} tribeName
 */
export async function requestDeleteTribe(tribeId, tribeName) {
  await deleteTribeHandler(tribeId, tribeName);
}
