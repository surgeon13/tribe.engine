/**
 * Add / delete tribe UI — custom or historical preset factions, persisted under data/.
 */

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
 * @param {(tribeId: string) => Promise<void> | void} onCreated
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

  /** @type {Array<object>} */
  let profiles = [];
  /** @type {Array<object>} */
  let archetypes = [];
  /** @type {Record<string, string>} */
  let slotLabels = {};

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
    archetypeSelect.innerHTML = archetypes
      .map((a) => `<option value="${a.id}">${a.label}</option>`)
      .join("");
    if (!archetypeSelect.value) archetypeSelect.value = "balanced";
    mountTroopNameInputs();
  }

  function mountTroopNameInputs() {
    if (!troopNamesWrap) return;
    const rows = [
      ...SLOT_ORDER.map((ref) => ({ key: ref, label: slotLabels[ref] || ref })),
      { key: "hero", label: "Hero" },
    ];
    troopNamesWrap.innerHTML = rows
      .map(
        (r) => `
      <label class="troop-name-field">
        <span>${r.label}</span>
        <input type="text" data-troop-key="${r.key}" autocomplete="off" />
      </label>`
      )
      .join("");
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

  async function fillDefaultTroopNames(name) {
    if (!name?.trim()) return;
    try {
      const res = await fetch(`/api/tribes/defaults?name=${encodeURIComponent(name.trim())}`);
      const body = await res.json();
      if (!body.ok || !body.troopNames) return;
      troopNamesWrap?.querySelectorAll("input[data-troop-key]").forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        const key = input.dataset.troopKey;
        if (key && body.troopNames[key] && !input.value.trim()) {
          input.value = body.troopNames[key];
        }
      });
    } catch {
      /* ignore */
    }
  }

  function selectedProfile() {
    return profiles.find((p) => p.id === cultureSelect.value) || null;
  }

  function selectedArchetype() {
    return archetypes.find((a) => a.id === archetypeSelect.value) || null;
  }

  function syncModeUi() {
    const custom = isCustomMode();
    cultureWrap?.classList.toggle("hidden", custom);
    customFields?.classList.toggle("hidden", !custom);
    renderPreview();
  }

  function renderPreview() {
    if (!preview) return;
    if (isCustomMode()) {
      const name = nameInput.value.trim() || "Custom tribe";
      const arch = selectedArchetype();
      preview.innerHTML = `
        <div class="add-tribe-swatches">
          <span style="background:${primaryInput.value}" title="${primaryInput.value}"></span>
          <span style="background:${secondaryInput.value}" title="${secondaryInput.value}"></span>
        </div>
        <p><strong>${name}</strong> · custom · ${arch?.label || "Balanced"}</p>
        <p class="muted">${arch?.description || ""}</p>
        <p>${contextInput.value.trim() || themeInput.value.trim() || "Your own lore — not tied to a preset culture."}</p>
        <p class="muted">Troop names editable above. Stats generated from archetype (editable later in JSON).</p>
      `;
      return;
    }
    const profile = selectedProfile();
    if (!profile) {
      preview.innerHTML = `<p class="muted">Pick a historical culture, or switch Mode to Custom.</p>`;
      return;
    }
    preview.innerHTML = `
      <div class="add-tribe-swatches">
        <span style="background:${profile.palette.primary}" title="${profile.palette.primary}"></span>
        <span style="background:${profile.palette.secondary}" title="${profile.palette.secondary}"></span>
      </div>
      <p><strong>${profile.name}</strong> · ${profile.archetype} archetype</p>
      <p class="muted">${profile.region}</p>
      <p>${profile.historicalContext}</p>
      <p class="muted">${profile.theme}</p>
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
    archetypeSelect.value = "balanced";
    primaryInput.value = "#3D5A80";
    secondaryInput.value = "#E09F3E";
    troopNamesWrap?.querySelectorAll("input").forEach((el) => {
      /** @type {HTMLInputElement} */ (el).value = "";
    });
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
    }
  });

  nameInput.addEventListener("change", () => {
    if (isCustomMode()) fillDefaultTroopNames(nameInput.value);
    renderPreview();
  });
  nameInput.addEventListener("blur", () => {
    if (isCustomMode()) fillDefaultTroopNames(nameInput.value);
  });

  archetypeSelect?.addEventListener("change", renderPreview);
  primaryInput?.addEventListener("input", renderPreview);
  secondaryInput?.addEventListener("input", renderPreview);
  themeInput?.addEventListener("input", renderPreview);
  contextInput.addEventListener("input", renderPreview);

  cancel?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  submit?.addEventListener("click", async () => {
    const custom = isCustomMode();
    const name = nameInput.value.trim();
    if (custom && !name) {
      toast("Enter a display name for your custom tribe");
      return;
    }
    if (!custom && !cultureSelect.value) {
      toast("Select a historical culture, or switch to Custom mode");
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
        troopNames: collectTroopNames(),
      };
      if (custom) {
        payload.archetype = archetypeSelect.value || "balanced";
        payload.theme = themeInput.value.trim() || undefined;
        payload.era = eraInput.value.trim() || undefined;
        payload.region = regionInput.value.trim() || undefined;
        payload.palette = {
          primary: primaryInput.value,
          secondary: secondaryInput.value,
        };
      }

      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);
      toast(`Saved ${body.tribe.name} to disk`);
      close();
      resetForm();
      await refreshRemovableTribes();
      await onCreated(body.tribe.id);
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
        `Delete tribe "${label}"?\n\nThis removes it from data/ permanently. Core tribes (Romans, Teutons, …) cannot be deleted.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/tribes/${encodeURIComponent(tribeId)}`, { method: "DELETE" });
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);
    toast(`Deleted ${body.tribe.name}`);
    await refreshRemovableTribes();
    await onDeleted?.(tribeId);
  };
}

export function setAddTribeEnabled(enabled) {
  const btn = /** @type {HTMLButtonElement | null} */ (document.querySelector("#btn-add-tribe"));
  if (!btn) return;
  btn.disabled = !enabled;
  btn.title = enabled
    ? "Create a custom or historical tribe (saved under data/)"
    : "Needs the local applet (npm start)";
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
