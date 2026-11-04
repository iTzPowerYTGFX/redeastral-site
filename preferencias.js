/* =====================================================================
   PREFERÊNCIAS DO VISITANTE (botão de engrenagem no topo do site)
   Tema, tamanho do texto e animações. Fica salvo só no aparelho de quem escolheu.
   Também guarda o "Modo computador" do editor (para editar pelo celular vendo como no PC).
   ===================================================================== */
(() => {
  const KEY = "astralPrefs";
  const prefs = { tema: "escuro", texto: "normal", animacao: "ligada" };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  const root = document.documentElement;
  const mqLight = matchMedia("(prefers-color-scheme: light)");
  const isLight = () => prefs.tema === "claro" || (prefs.tema === "auto" && mqLight.matches);

  function swapLogos() {
    document.querySelectorAll("img[data-logo]").forEach(img => {
      const want = isLight() ? "img/marca-escura.png" : "img/marca-clara.png";
      if (img.getAttribute("src") !== want) img.setAttribute("src", want);
    });
  }
  function apply() {
    root.setAttribute("data-theme", isLight() ? "light" : "dark");
    root.setAttribute("data-texto", prefs.texto);
    root.setAttribute("data-animacao", prefs.animacao);
    swapLogos();
    dispatchEvent(new Event("astralprefs"));
  }
  apply();
  mqLight.addEventListener && mqLight.addEventListener("change", () => { if (prefs.tema === "auto") apply(); });

  /* ---------- Modo computador (só para quem está no modo editor) ---------- */
  const VP_NORMAL = "width=device-width, initial-scale=1, viewport-fit=cover";
  const deskOn = () => { try { return localStorage.getItem("astralDesktop") === "1" && !!localStorage.getItem("astralGH"); } catch (e) { return false; } };
  function applyDesktop() {
    const m = document.querySelector('meta[name="viewport"]');
    if (m) m.setAttribute("content", deskOn() ? "width=1280, viewport-fit=cover" : VP_NORMAL);
    document.querySelectorAll("[data-desk-label]").forEach(b => { b.textContent = deskOn() ? "Modo celular" : "Modo computador"; });
  }
  window.astralDesktop = {
    isOn: deskOn,
    toggle() { try { localStorage.setItem("astralDesktop", deskOn() ? "0" : "1"); } catch (e) {} applyDesktop(); },
    refresh: applyDesktop
  };
  applyDesktop();

  /* ---------- botão e painel ---------- */
  const OPTS = [
    ["tema", "Tema", [["escuro", "Escuro"], ["claro", "Claro"], ["auto", "Automático"]]],
    ["texto", "Tamanho do texto", [["normal", "Normal"], ["grande", "Grande"]]],
    ["animacao", "Animações", [["ligada", "Ligadas"], ["desligada", "Desligadas"]]]
  ];
  /* "Área do editor" só aparece em aparelhos onde alguém já entrou como editor */
  function showEditorLinks() {
    let editor = false;
    try { editor = !!localStorage.getItem("astralGH") || localStorage.getItem("astralEditorDevice") === "1"; } catch (e) {}
    if (editor) document.querySelectorAll(".ed-link").forEach(el => { el.hidden = false; });
  }
  function buildUi() {
    swapLogos(); applyDesktop(); showEditorLinks();
    const host = document.querySelector(".top .wrap");
    if (!host || host.querySelector(".pref")) return;
    const style = document.createElement("style");
    style.textContent = `
    .pref { position: relative; flex: none; }
    .pref-btn { display: inline-grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 8px; border: 1px solid var(--line); background: var(--sky-2); color: var(--ink); cursor: pointer; }
    .pref-btn:hover, .pref-btn[aria-expanded="true"] { background: var(--sky-3); }
    .pref-panel { position: absolute; right: 0; top: calc(100% + .5rem); width: min(19rem, calc(100vw - 32px)); background: var(--sky-2); color: var(--ink); border: 1px solid var(--line); border-radius: 12px; padding: 1rem; box-shadow: 0 14px 36px rgba(0, 0, 0, .35); z-index: 50; display: grid; gap: .875rem; }
    .pref-h { margin: 0; font-family: var(--f-display, system-ui); font-weight: 700; font-size: 1.0625rem; }
    .pref-g { display: grid; gap: .375rem; font-size: .875rem; color: var(--ink-dim); }
    .pref-g > div { display: flex; gap: .375rem; flex-wrap: wrap; }
    .pref-g button { flex: 1; padding: .45rem .6rem; border-radius: 6px; border: 1px solid var(--line); background: var(--sky); color: var(--ink); font-family: inherit; font-size: .875rem; font-weight: 700; cursor: pointer; }
    .pref-g button[aria-pressed="true"] { background: var(--violet); border-color: var(--violet); color: var(--violet-ink); }
    .pref-note { margin: 0; font-size: .8125rem; color: var(--ink-dim); }
    @media (max-width: 600px) { .pref-panel { position: fixed; left: max(16px, env(safe-area-inset-left, 0px)); right: max(16px, env(safe-area-inset-right, 0px)); top: calc(env(safe-area-inset-top, 0px) + 4rem); width: auto; } }`;
    document.head.appendChild(style);
    const wrap = document.createElement("div");
    wrap.className = "pref ed-ui";
    wrap.innerHTML = `<button type="button" class="pref-btn" aria-expanded="false" aria-controls="pref-panel" aria-label="Configurações" title="Configurações">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
      </button>
      <div class="pref-panel" id="pref-panel" role="dialog" aria-label="Configurações" hidden>
        <p class="pref-h">Configurações</p>
        ${OPTS.map(([k, label, vals]) => `<div class="pref-g" role="group" aria-label="${label}"><span>${label}</span><div>${vals.map(([v, t]) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${prefs[k] === v}">${t}</button>`).join("")}</div></div>`).join("")}
        <p class="pref-note">Fica salvo só neste aparelho.</p>
      </div>`;
    const ref = host.querySelector(":scope > a.btn");
    if (ref) host.insertBefore(wrap, ref); else host.appendChild(wrap);
    const btn = wrap.querySelector(".pref-btn"), panel = wrap.querySelector(".pref-panel");
    const open = on => { panel.hidden = !on; btn.setAttribute("aria-expanded", on); };
    btn.addEventListener("click", e => { e.stopPropagation(); open(panel.hidden); });
    panel.addEventListener("click", e => {
      e.stopPropagation();
      const b = e.target.closest("button[data-k]"); if (!b) return;
      prefs[b.dataset.k] = b.dataset.v;
      try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (err) {}
      panel.querySelectorAll(`button[data-k="${b.dataset.k}"]`).forEach(x => x.setAttribute("aria-pressed", x === b));
      apply();
    });
    document.addEventListener("click", () => open(false));
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !panel.hidden) { open(false); btn.focus(); } });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildUi); else buildUi();
})();
