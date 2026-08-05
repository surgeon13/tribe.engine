/**
 * Add / delete tribe UI — historically flavored factions persisted under data/.
 */

/** @type {(tribeId: string, tribeName: string) => Promise<void>} */
let deleteTribeHandler = async () => {
  throw new Error("Delete requires the applet API");
};

/** @type {Set<string>} */
let removableIds = new Set();

/**
 * @param {(msg: string) => void} toast
 * @param {(tribeId: string) => Promise<void> | void} onCreated
 * @param {(removedId: string) => Promise<void> | void} [onDeleted]
 */
export function initAddTribeUi(toast, onCreated, onDeleted) {
  const btn = document.querySelector("#btn-add-tribe");
  const overlay = document.querySelector("#add-tribe-overlay");
  if (!btn || !overlay) return;

  const cultureSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-culture"));
  const nameInput = /** @type {HTMLInputElement} */ (document.querySelector("#add-tribe-name"));
  const contextInput = /** @type {HTMLTextAreaElement} */ (document.querySelector("#add-tribe-context"));
  const typeSelect = /** @type {HTMLSelectElement} */ (document.querySelector("#add-tribe-type"));
  const preview = document.querySelector("#add-tribe-preview");
  const submit = /** @type {HTMLButtonElement} */ (document.querySelector("#add-tribe-submit"));
  const cancel = document.querySelector("#add-tribe-cancel");

  /** @type {Array<object>} */
  let profiles = [];

  async function loadProfiles() {
    const res = await fetch("/api/tribes/profiles");
    const body = await res.json();
    if (!res.ok || !body.ok) throw new Error(body.error || "Could not load cultures");
    profiles = body.profiles || [];
    cultureSelect.innerHTML =
      `<option value="">— Select historical culture —</option>` +
      profiles
        .map((p) => `<option value="${p.id}">${p.name} · ${p.era}</option>`)
        .join("");
  }

  function selectedProfile() {
    return profiles.find((p) => p.id === cultureSelect.value) || null;
  }

  function renderPreview(profile) {
    if (!preview) return;
    if (!profile) {
      preview.innerHTML = `<p class="muted">Pick a culture to see era, region, and roster theme.</p>`;
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
      <p class="muted">Saved persistently under data/tribes/ (survives restart).</p>
    `;
  }

  function open() {
    overlay.classList.remove("hidden");
    overlay.setAttribute("aria-hidden", "false");
    renderPreview(selectedProfile());
    nameInput.focus();
  }

  function close() {
    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");
  }

  btn.addEventListener("click", async () => {
    try {
      if (!profiles.length) await loadProfiles();
      open();
    } catch (e) {
      toast(e.message || String(e));
    }
  });

  cultureSelect.addEventListener("change", () => {
    const p = selectedProfile();
    renderPreview(p);
    if (p && !nameInput.value.trim()) nameInput.value = p.name;
    if (p) contextInput.value = p.historicalContext;
  });

  contextInput.addEventListener("change", async () => {
    const q = contextInput.value.trim();
    if (!q || cultureSelect.value) return;
    try {
      const res = await fetch(`/api/tribes/match?q=${encodeURIComponent(q)}`);
      const body = await res.json();
      if (body.match?.id) {
        cultureSelect.value = body.match.id;
        renderPreview(body.match);
        if (!nameInput.value.trim()) nameInput.value = body.match.name;
        toast(`Matched culture: ${body.match.name}`);
      }
    } catch {
      /* ignore */
    }
  });

  cancel?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });

  submit?.addEventListener("click", async () => {
    const cultureId = cultureSelect.value;
    if (!cultureId) {
      toast("Select a historical culture");
      return;
    }
    submit.disabled = true;
    submit.textContent = "Creating…";
    try {
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cultureId,
          name: nameInput.value.trim() || undefined,
          historicalContext: contextInput.value.trim() || undefined,
          type: typeSelect.value === "npc" ? "npc" : "playable",
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.ok) throw new Error(body.error || res.statusText);
      toast(`Saved ${body.tribe.name} to disk`);
      close();
      nameInput.value = "";
      contextInput.value = "";
      cultureSelect.value = "";
      renderPreview(null);
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
    ? "Create a historically flavored tribe (saved under data/)"
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
