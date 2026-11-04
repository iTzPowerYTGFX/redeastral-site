/* =====================================================================
   EDITOR DA PÁGINA INICIAL — só carrega para quem entrou no modo editor
   (a chave do GitHub fica no localStorage deste navegador).
   Clique em qualquer texto para editar; "+ Adicionar" e "✕" mexem nas listas.
   Ao salvar, o index.html do repositório é atualizado no GitHub.
   ===================================================================== */
(() => {
  let GH = null;
  try { GH = JSON.parse(localStorage.getItem("astralGH") || "null"); } catch (e) {}
  if (!GH || !GH.token) return;

  /* ---------- o que pode ser editado ---------- */
  // Textos soltos (uma linha = Enter não quebra linha)
  const EDITABLE = [
    [".hero .eyebrow", 1], [".hero h1", 1], [".hero .lead", 0], [".hero .st-title", 1],
    [".block-head .eyebrow", 1], [".block-head h2", 1], [".block-head .lead", 0],
    [".feat h3", 1], [".feat > p", 0], [".feat .more", 1],
    [".panel > .lead", 0], [".steps li > div", 0], [".panel .note", 0], ["#primeiros-passos > .wrap > .note", 0],
    [".rules h3", 1], [".rules li", 0],
    [".punish > div", 0],
    [".tier h3", 1], [".tier p", 0], [".shop-foot .note", 0],
    [".faq summary", 1], [".faq details p", 0],
    ["footer .legal h3", 1], ["footer .legal p", 0],
    // botões e menu
    [".hero-cta .btn", 1], [".shop-foot .btn", 1], [".top .nav a", 1], [".tab", 1], ["#home-search button", 1]
  ];
  // Listas onde dá para adicionar e remover itens
  const LISTS = [
    [".features", "cartão"], [".rules ol", "regra"], [".punish", "punição"], [".shop", "VIP"],
    [".faq", "pergunta"], ["#primeiros-passos .steps", "passo"],
    ["#p-java .steps", "passo"], ["#p-bedrock .steps", "passo"], ["#p-consoles .steps", "passo"]
  ];

  /* ---------- GitHub ---------- */
  const API = "https://api.github.com";
  const b64bytes = bytes => { let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); };
  const encText = s => b64bytes(new TextEncoder().encode(s));
  const decText = b64 => new TextDecoder().decode(Uint8Array.from(atob((b64 || "").replace(/\s/g, "")), c => c.charCodeAt(0)));
  async function gh(path, opts = {}) {
    let r;
    try {
      r = await fetch(API + path, { ...opts, cache: "no-store", headers: {
        Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
        Authorization: "Bearer " + GH.token, ...(opts.body ? { "Content-Type": "application/json" } : {}) } });
    } catch (e) { throw new Error("Sem conexão com o GitHub. Confira a internet e tente de novo."); }
    if (!r.ok) {
      let msg = ""; try { msg = (await r.json()).message || ""; } catch (e) {}
      throw new Error({
        401: "Chave inválida ou vencida. Entre de novo pela Área do editor da Wiki.",
        403: "A chave não tem permissão de escrita (public_repo).",
        404: "Arquivo ou repositório não encontrado no GitHub.",
        409: "O arquivo mudou no GitHub enquanto você editava. Recarregue a página e tente de novo."
      }[r.status] || ("Erro do GitHub " + r.status + (msg ? ": " + msg : "")));
    }
    return r.json();
  }
  const filePath = p => `/repos/${GH.repo}/contents/${p}`;

  /* ---------- estilos do editor ---------- */
  const style = document.createElement("style");
  style.textContent = `
  .ed-bar { position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; background: #1b1438; border-top: 2px solid #7c3aed;
    padding: .625rem max(16px, env(safe-area-inset-right, 0px)) calc(.625rem + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
    display: flex; flex-direction: column; gap: .4rem; font: 600 .9375rem "Atkinson Hyperlegible", system-ui, sans-serif; color: #f1eeff; }
  .ed-bar strong { font-family: "Chakra Petch", system-ui, sans-serif; margin-right: .25rem; }
  .ed-bar .grow { flex: 1; min-width: 8rem; color: #b2abd3; font-weight: 400; font-size: .875rem; }
  .ed-bar .grow.ok { color: #5fd8cb; } .ed-bar .grow.err { color: #ffb547; }
  .ed-bar button, .ed-bar a { padding: .4rem .75rem; border-radius: 6px; border: 1px solid #2e2853; background: #151229; color: #f1eeff; font-family: inherit; font-size: .875rem; font-weight: 700; cursor: pointer; text-decoration: none; }
  .ed-bar .acc { background: #7c3aed; border-color: #7c3aed; color: #fff; }
  .ed-st { display: inline-flex; flex-wrap: wrap; gap: .25rem; align-items: center; color: #b2abd3; font-weight: 400; }
  .ed-st button[aria-pressed="true"] { background: #5fd8cb; border-color: #5fd8cb; color: #06201d; }
  .ed-st button[data-st="manutencao"][aria-pressed="true"] { background: #ffb547; border-color: #ffb547; color: #2a1800; }
  .ed-st button[data-st="offline"][aria-pressed="true"] { background: #ff7a7a; border-color: #ff7a7a; color: #2a0505; }
  .ed-bar input { min-width: 0; flex: 1 1 14rem; background: #0b0a1a; color: #f1eeff; border: 1px solid #2e2853; border-radius: 6px; padding: .4rem .6rem; font-family: inherit; font-size: 1rem; }
  .ed-line { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; }
  body.ed-has-bar { padding-bottom: 8rem; }
  body.ed-on { padding-bottom: 10rem; }
  .ed-sel { outline: 2px solid #5fd8cb !important; outline-offset: 3px; }
  body.ed-on [data-ed] { outline: 1px dashed color-mix(in srgb, #b99bff 55%, transparent); outline-offset: 3px; border-radius: 3px; cursor: text; }
  body.ed-on .btn[aria-disabled="true"] { pointer-events: auto; cursor: text; }
  .ed-linkbox { display: inline-flex; align-items: center; gap: .35rem; font-weight: 400; color: #b2abd3; }
  .ed-linkbox input { min-width: 12rem; }
  body.ed-on [data-ed]:focus { outline: 2px solid #b99bff; background: color-mix(in srgb, #7c3aed 12%, transparent); }
  body.ed-on .ed-item { position: relative; }
  .ed-del { position: absolute; top: -.6rem; right: -.6rem; z-index: 5; width: 1.6rem; height: 1.6rem; border-radius: 50%; border: 0; background: #ff7a7a; color: #1b0505; font: 700 .875rem system-ui; cursor: pointer; line-height: 1; }
  li > .ed-del { top: 50%; transform: translateY(-50%); right: -.8rem; }
  .ed-add { display: block; margin: .75rem 0 0; padding: .45rem .9rem; border-radius: 6px; border: 1px dashed #b99bff; background: transparent; color: #b99bff; font: 700 .875rem system-ui; cursor: pointer; }
  .ed-href { position: absolute; left: .75rem; right: .75rem; bottom: -1.1rem; z-index: 5; display: flex; gap: .25rem; align-items: center; background: #1b1438; border: 1px solid #7c3aed; border-radius: 6px; padding: .2rem .4rem; font: 600 .75rem system-ui; color: #b99bff; }
  .ed-href input { flex: 1; min-width: 0; background: transparent; border: 0; color: #f1eeff; font: .8125rem system-ui; }
  body.ed-on .feat.ed-item { margin-bottom: 1.25rem; }
  .ed-rz { position: fixed; z-index: 45; width: 20px; height: 20px; border-radius: 50%; background: #7c3aed; border: 2px solid #fff; cursor: ew-resize; touch-action: none; box-shadow: 0 0 0 4px rgba(124,58,237,.35); }
  .ed-rz-label { position: fixed; z-index: 46; background: #0b0a1a; border: 1px solid #7c3aed; color: #f1eeff; font: 700 .75rem ui-monospace, monospace; padding: .1rem .4rem; border-radius: 4px; pointer-events: none; }`;
  style.className = "ed-ui";
  document.head.appendChild(style);

  /* ---------- barra ---------- */
  const bar = document.createElement("div");
  bar.className = "ed-bar ed-ui";
  bar.innerHTML = `<div class="ed-line"><strong>Modo editor</strong>
      <span class="ed-st" role="group" aria-label="Status do servidor no site">Status do Servidor:
        <button type="button" data-st="auto">Automático</button><button type="button" data-st="online">Online</button><button type="button" data-st="offline">Offline</button><button type="button" data-st="manutencao">Manutenção</button>
      </span>
      <button type="button" id="ed-desk" data-desk-label title="Para editar pelo celular vendo a página como no computador">Modo computador</button>
      <a href="wiki.html">Ir para a Wiki</a></div>
    <div class="ed-line" id="ed-dyn"><span class="grow" id="ed-msg">Clique em "Editar esta página" para mudar textos, tamanhos e listas.</span>
      <button type="button" class="acc" id="ed-start">Editar esta página</button></div>`;
  document.body.appendChild(bar); document.body.classList.add("ed-has-bar");
  const msg = (t, k) => { const m = bar.querySelector("#ed-msg"); m.textContent = t; m.className = "grow" + (k ? " " + k : ""); };

  let editing = false, dirty = false, savedRange = null;
  const isUi = el => el.classList && el.classList.contains("ed-ui");
  const kids = el => [...el.children].filter(c => !isUi(c) && !c.classList.contains("toast"));
  function pathOf(el) {
    const path = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) path.unshift(kids(n.parentElement).indexOf(n));
    return path;
  }
  function byPath(doc, path) {
    let n = doc.body;
    for (const i of path) { n = n && [...n.children][i]; }
    return n || null;
  }
  const listOf = el => el.closest("[data-ed-list]");

  /* ---------- limpeza do HTML editado ---------- */
  function sanitizeInto(src, dst, doc) {
    for (const n of [...src.childNodes]) {
      if (n.nodeType === 3) { dst.appendChild(doc.createTextNode(n.textContent)); continue; }
      if (n.nodeType !== 1 || isUi(n)) continue;
      const tag = n.tagName.toLowerCase();
      if (tag === "br") { dst.appendChild(doc.createElement("br")); continue; }
      if (tag === "div" || tag === "p") { if (dst.childNodes.length) dst.appendChild(doc.createElement("br")); sanitizeInto(n, dst, doc); continue; }
      const map = { strong: "b", b: "b", em: "i", i: "i", a: "a", code: "code", small: "small", span: "span" };
      if (!map[tag]) { sanitizeInto(n, dst, doc); continue; }
      const e = doc.createElement(map[tag]);
      if (tag === "a") {
        const h = (n.getAttribute("href") || "").trim();
        if (h && !/^\s*(javascript|data|vbscript):/i.test(h)) e.setAttribute("href", h);
        if (/^https?:/i.test(h)) { e.setAttribute("target", "_blank"); e.setAttribute("rel", "noopener"); }
      }
      if (tag === "span") { if (n.classList.contains("mono")) e.className = "mono"; if (n.dataset.cfg) e.setAttribute("data-cfg", n.dataset.cfg); }
      sanitizeInto(n, e, doc); dst.appendChild(e);
    }
    while (dst.lastChild && dst.lastChild.nodeName === "BR") dst.removeChild(dst.lastChild);
  }
  const cleanHtml = el => { const d = document.createElement("div"); sanitizeInto(el, d, document); return d.innerHTML; };
  function cleanClone(item) {
    const c = item.cloneNode(true);
    c.querySelectorAll(".ed-ui").forEach(x => x.remove());
    const all = [c, ...c.querySelectorAll("*")];
    for (const el of all) {
      if (el.hasAttribute("data-ed")) { el.innerHTML = cleanHtml(el); el.removeAttribute("data-ed"); el.removeAttribute("data-ed-changed"); }
      if (el.getAttribute("style") === "") el.removeAttribute("style");
      el.removeAttribute("contenteditable"); el.removeAttribute("spellcheck");
      el.classList.remove("ed-item", "ed-sel"); if (el.getAttribute("class") === "") el.removeAttribute("class");
      el.removeAttribute("data-ed-zoom"); el.removeAttribute("data-ed-href");
      if (el.tagName === "DETAILS") el.removeAttribute("open");
    }
    return c;
  }

  /* ---------- ligar / desligar edição ---------- */
  function makeEditable(el, single) {
    el.setAttribute("data-ed", single ? "1" : "0");
    el.setAttribute("contenteditable", "true");
    el.setAttribute("spellcheck", "true");
  }
  function decorateItem(list, item) {
    item.classList.add("ed-item");
    const del = document.createElement("button");
    del.type = "button"; del.className = "ed-del ed-ui"; del.textContent = "✕";
    del.title = "Remover este item"; del.setAttribute("contenteditable", "false");
    del.addEventListener("click", e => { e.preventDefault(); e.stopPropagation();
      if (kids(list).length <= 1) return msg("Precisa sobrar pelo menos um item nesta lista.", "err");
      item.remove(); dirty = true; msg("Item removido. Clique em Salvar para gravar.");
    });
    item.appendChild(del);
    if (item.matches("a.feat")) {
      const box = document.createElement("label");
      box.className = "ed-href ed-ui"; box.setAttribute("contenteditable", "false");
      box.innerHTML = `Link:<input type="text" spellcheck="false">`;
      const inp = box.querySelector("input"); inp.value = item.getAttribute("href") || "";
      inp.addEventListener("input", () => { item.setAttribute("href", inp.value.trim() || "wiki.html"); dirty = true; });
      inp.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); inp.focus(); });
      box.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); });
      item.appendChild(box);
    }
    EDITABLE.forEach(([sel, single]) => item.querySelectorAll(sel).forEach(el => makeEditable(el, single)));
    if (item.matches("li") && item.closest(".rules")) makeEditable(item, 0);
    if (item.matches(".punish > div")) makeEditable(item, 0);
  }
  function startEditing() {
    editing = true; document.body.classList.add("ed-on");
    document.querySelectorAll(".faq details").forEach(d => d.open = true);
    LISTS.forEach(([sel, name]) => document.querySelectorAll(sel).forEach(list => {
      list.setAttribute("data-ed-list", name);
      kids(list).forEach(item => decorateItem(list, item));
      const add = document.createElement("button");
      add.type = "button"; add.className = "ed-add ed-ui"; add.textContent = "+ Adicionar " + name;
      add.addEventListener("click", () => {
        const last = kids(list).at(-1); if (!last) return;
        const copy = cleanClone(last);
        copy.querySelectorAll("*").forEach(el => el.removeAttribute("id"));
        list.appendChild(copy);
        decorateItem(list, copy);
        let firstText = null;
        [copy, ...copy.querySelectorAll("[data-ed]")].filter(el => el.hasAttribute("data-ed")).forEach(el => {
          for (const n of [...el.childNodes]) if (!(n.nodeType === 1 && isUi(n))) n.remove();
          const tn = document.createTextNode(el.getAttribute("data-ed") === "1" ? "Novo título" : "Escreva aqui.");
          el.insertBefore(tn, el.firstChild); el.setAttribute("data-ed-changed", "1");
          if (!firstText) firstText = tn;
        });
        dirty = true;
        if (firstText) {
          firstText.parentElement.focus();
          const r = document.createRange(); r.selectNodeContents(firstText);
          const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(r);
        }
        msg("Item novo adicionado no fim da lista. Clique em Salvar para gravar.");
      });
      list.after(add);
    }));
    EDITABLE.forEach(([sel, single]) => document.querySelectorAll(sel).forEach(el => { if (!el.hasAttribute("data-ed")) makeEditable(el, single); }));
    bar.querySelector("#ed-dyn").innerHTML = `<strong>Editando</strong>
      <button type="button" id="ed-up" hidden title="Seleciona o bloco que está em volta (ex.: o cartão inteiro)">Selecionar o bloco de fora</button>
      <label class="ed-linkbox" id="ed-linkbox" hidden>Link do botão: <input type="text" id="ed-href" spellcheck="false" placeholder="#regras, wiki.html#captura ou https://…"></label>
      <button type="button" id="ed-b" title="Negrito">Negrito</button>
      <button type="button" id="ed-l" title="Link no texto selecionado">Link</button>
      <button type="button" id="ed-ul" title="Tirar link do texto selecionado">Tirar link</button>
      <input type="text" id="ed-url" placeholder="Cole o endereço e aperte Enter (https://… ou wiki.html#pagina)" hidden>
      <span class="grow" id="ed-msg">Clique em qualquer texto marcado para editar.</span>
      <button type="button" id="ed-cancel">Cancelar</button>
      <button type="button" class="acc" id="ed-save">Salvar</button>`;
    const keep = e => e.preventDefault();
    ["#ed-b", "#ed-l", "#ed-ul"].forEach(s => bar.querySelector(s).addEventListener("mousedown", keep));
    bar.querySelector("#ed-b").addEventListener("click", () => { document.execCommand("bold"); dirty = true; });
    bar.querySelector("#ed-ul").addEventListener("click", () => { document.execCommand("unlink"); dirty = true; });
    bar.querySelector("#ed-l").addEventListener("click", () => {
      const sel = document.getSelection();
      const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
      if (!sel.rangeCount || sel.isCollapsed || !node || !node.closest("[data-ed]")) return msg("Primeiro selecione o texto que vai virar link.", "err");
      savedRange = sel.getRangeAt(0).cloneRange();
      const u = bar.querySelector("#ed-url"); u.hidden = false; u.value = ""; u.focus();
    });
    bar.querySelector("#ed-url").addEventListener("keydown", e => {
      if (e.key === "Escape") { e.target.hidden = true; return; }
      if (e.key !== "Enter") return;
      e.preventDefault();
      let url = e.target.value.trim(); if (!url || !savedRange) return;
      if (!/^(https?:\/\/|#|[\w-]+\.html)/i.test(url)) url = "https://" + url;
      const sel = document.getSelection(); sel.removeAllRanges(); sel.addRange(savedRange);
      document.execCommand("createLink", false, url);
      e.target.hidden = true; savedRange = null; dirty = true; msg("Link colocado.", "ok");
    });
    bar.querySelector("#ed-cancel").addEventListener("click", () => { dirty = false; location.reload(); });
    bar.querySelector("#ed-save").addEventListener("click", save);
    bar.querySelector("#ed-up").addEventListener("click", () => { if (hzEl && hzEl.parentElement) selectEl(hzEl.parentElement); });
    bar.querySelector("#ed-href").addEventListener("input", e => {
      const a = linkTarget; if (!a || a.hasAttribute("data-link")) return;
      a.setAttribute("href", e.target.value.trim() || "#"); a.setAttribute("data-ed-href", "1"); dirty = true;
    });
    msg("Clique em qualquer texto marcado para editar, ou em qualquer coisa para mudar o tamanho com a bolinha.");
  }

  /* ---------- comportamento durante a edição ---------- */
  document.addEventListener("click", e => {
    if (!editing) return;
    const a = e.target.closest("a");
    if (a && !a.closest(".ed-ui") && a.closest("main")) e.preventDefault();
    if (e.target.closest(".faq summary")) e.preventDefault();
  }, true);
  document.addEventListener("keydown", e => {
    const el = e.target.closest && e.target.closest("[data-ed]");
    if (!editing || !el) return;
    if (e.key === "Enter") { e.preventDefault(); if (el.getAttribute("data-ed") === "0") document.execCommand("insertLineBreak"); }
    if (e.key === " " && el.matches("summary")) { e.preventDefault(); document.execCommand("insertText", false, " "); }
  }, true);
  document.addEventListener("keyup", e => { if (editing && e.key === " " && e.target.closest && e.target.closest("summary")) e.preventDefault(); }, true);
  document.addEventListener("paste", e => {
    if (!editing || !e.target.closest || !e.target.closest("[data-ed]")) return;
    e.preventDefault();
    const t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, t);
  }, true);
  document.addEventListener("input", e => {
    const el = editing && e.target.closest && e.target.closest("[data-ed]");
    if (!el) return;
    dirty = true; el.setAttribute("data-ed-changed", "1");
    // o menu existe duas vezes (computador e celular): o mesmo item muda nos dois
    if (el.matches(".top .nav a")) {
      const key = el.dataset.tab !== undefined ? `[data-tab="${el.dataset.tab}"]` : (el.classList.contains("wiki") ? ".wiki" : null);
      if (key) document.querySelectorAll(".top .nav a" + key).forEach(o => { if (o !== el) { o.innerHTML = el.innerHTML; o.setAttribute("data-ed-changed", "1"); } });
    }
  }, true);
  addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- bolinha: aumentar/diminuir o texto selecionado ---------- */
  const hz = document.createElement("div"); hz.className = "ed-rz ed-ui"; hz.hidden = true;
  hz.title = "Arraste para os lados para aumentar ou diminuir. Duplo clique volta ao tamanho normal.";
  const hzLabel = document.createElement("div"); hzLabel.className = "ed-rz-label ed-ui"; hzLabel.hidden = true;
  document.body.append(hz, hzLabel);
  let hzEl = null, hzDrag = null;
  function placeHz() {
    if (!editing || !hzEl || !hzEl.isConnected) { hz.hidden = true; return; }
    const r = hzEl.getBoundingClientRect();
    hz.style.left = (r.right - 10) + "px"; hz.style.top = (r.bottom - 10) + "px"; hz.hidden = false;
  }
  const outer = el => !el || el === document.body || el === document.documentElement || el.matches("main, header, footer, .ed-ui");
  let linkTarget = null;
  function showLinkBox(a) {
    const box = bar.querySelector("#ed-linkbox"); if (!box) return;
    const inp = box.querySelector("input");
    linkTarget = a && !a.closest(".ed-ui") ? a : null;
    box.hidden = !linkTarget;
    if (!linkTarget) return;
    if (linkTarget.hasAttribute("data-link")) { inp.value = "Discord/loja: mude em Links do site (Wiki)"; inp.disabled = true; }
    else { inp.disabled = false; inp.value = linkTarget.getAttribute("href") || ""; }
  }
  function selectEl(el) {
    if (outer(el)) return;
    if (hzEl && hzEl !== el) hzEl.classList.remove("ed-sel");
    hzEl = el; el.classList.add("ed-sel");
    const up = bar.querySelector("#ed-up"); if (up) up.hidden = outer(el.parentElement);
    showLinkBox(el.closest("a"));
    placeHz();
  }
  document.addEventListener("focusin", e => { const el = editing && e.target.closest && e.target.closest("[data-ed]"); if (el) selectEl(el); });
  document.addEventListener("pointerdown", e => {
    if (!editing || !e.target.closest || e.target.closest(".ed-ui")) return;
    selectEl(e.target.closest("[data-ed]") || e.target.closest("svg") || e.target);
  }, true);
  document.addEventListener("input", () => placeHz());
  addEventListener("scroll", placeHz, { passive: true }); addEventListener("resize", placeHz);
  hz.addEventListener("pointerdown", e => {
    if (!hzEl) return; e.preventDefault(); hz.setPointerCapture(e.pointerId);
    hzDrag = { x: e.clientX, start: Math.round((parseFloat(hzEl.style.zoom) || 1) * 100), pct: 0 };
    hzDrag.pct = hzDrag.start;
  });
  hz.addEventListener("pointermove", e => {
    if (!hzDrag) return;
    hzDrag.pct = Math.max(20, Math.min(300, Math.round((hzDrag.start + (e.clientX - hzDrag.x) / 2) / 5) * 5));
    hzEl.style.zoom = hzDrag.pct / 100; placeHz();
    hzLabel.textContent = hzDrag.pct + "%"; hzLabel.hidden = false;
    hzLabel.style.left = (parseFloat(hz.style.left) - 44) + "px"; hzLabel.style.top = (parseFloat(hz.style.top) - 26) + "px";
  });
  const hzEnd = () => {
    if (!hzDrag) return;
    if (hzDrag.pct === 100) hzEl.style.removeProperty("zoom");
    hzEl.setAttribute("data-ed-zoom", "1"); if (hzEl.hasAttribute("data-ed")) hzEl.setAttribute("data-ed-changed", "1");
    dirty = true; hzLabel.hidden = true;
    msg(hzDrag.pct === 100 ? "Tamanho normal." : `Tamanho ${hzDrag.pct}%. Clique em Salvar para gravar.`, "ok");
    hzDrag = null; placeHz();
  };
  hz.addEventListener("pointerup", hzEnd); hz.addEventListener("pointercancel", hzEnd);
  hz.addEventListener("dblclick", () => { if (!hzEl) return; hzEl.style.removeProperty("zoom"); hzEl.setAttribute("data-ed-zoom", "1"); if (hzEl.hasAttribute("data-ed")) hzEl.setAttribute("data-ed-changed", "1"); dirty = true; placeHz(); msg("Tamanho normal.", "ok"); });

  /* ---------- salvar ---------- */
  async function save() {
    const btn = bar.querySelector("#ed-save"); btn.disabled = true; msg("Salvando…");
    try {
      const d = await gh(filePath("index.html") + "?ref=" + encodeURIComponent(GH.branch));
      const doc = new DOMParser().parseFromString(decText(d.content), "text/html");
      // listas inteiras
      for (const list of document.querySelectorAll("[data-ed-list]")) {
        const target = byPath(doc, pathOf(list));
        if (!target || target.tagName !== list.tagName) throw new Error("A página no GitHub está diferente desta. Recarregue e edite de novo.");
        target.innerHTML = "\n" + kids(list).map(item => "        " + cleanClone(item).outerHTML).join("\n") + "\n      ";
      }
      // textos soltos
      for (const el of document.querySelectorAll("[data-ed]")) {
        if (listOf(el) || !el.hasAttribute("data-ed-changed")) continue;
        const target = byPath(doc, pathOf(el));
        if (!target || target.tagName !== el.tagName) throw new Error("A página no GitHub está diferente desta. Recarregue e edite de novo.");
        target.innerHTML = cleanHtml(el);
        const z = el.style.zoom;
        if (z && z !== "1") target.style.zoom = z;
        else { target.style.removeProperty("zoom"); if (!target.getAttribute("style")) target.removeAttribute("style"); }
      }
      // links de botões trocados
      for (const el of document.querySelectorAll("[data-ed-href]")) {
        if (listOf(el)) continue;
        const target = byPath(doc, pathOf(el));
        if (target && target.tagName === el.tagName) target.setAttribute("href", el.getAttribute("href"));
      }
      // tamanhos (bolinha) de qualquer elemento fora das listas
      for (const el of document.querySelectorAll("[data-ed-zoom]")) {
        if (listOf(el)) continue;
        const target = byPath(doc, pathOf(el));
        if (!target || target.tagName.toLowerCase() !== el.tagName.toLowerCase()) continue;
        const z = el.style.zoom;
        if (z && z !== "1") target.style.zoom = z;
        else { target.style.removeProperty("zoom"); if (!target.getAttribute("style")) target.removeAttribute("style"); }
      }
      const html = "<!doctype html>\n" + doc.documentElement.outerHTML + "\n";
      if (!/<main[\s>]/i.test(html) || !/<script/i.test(html)) throw new Error("Algo saiu errado ao montar a página. Nada foi salvo.");
      await gh(filePath("index.html"), { method: "PUT", body: JSON.stringify({ message: "Site: editar página inicial", content: encText(html), sha: d.sha, branch: GH.branch }) });
      dirty = false;
      msg("Salvo. O site público mostra a mudança em 1 a 2 minutos.", "ok");
    } catch (err) { msg(err.message, "err"); }
    finally { btn.disabled = false; }
  }

  bar.querySelector("#ed-start").addEventListener("click", startEditing);
  bar.querySelector("#ed-desk").addEventListener("click", () => { if (window.astralDesktop) window.astralDesktop.toggle(); });
  if (window.astralDesktop) window.astralDesktop.refresh();

  /* ---------- status do servidor (status.json) ---------- */
  const NAMES = { auto: "Automático", online: "Online", offline: "Offline", manutencao: "Em manutenção" };
  const markSt = mode => bar.querySelectorAll("[data-st]").forEach(b => b.setAttribute("aria-pressed", b.dataset.st === mode));
  fetch("status.json?t=" + Date.now(), { cache: "no-store" }).then(r => r.ok ? r.json() : {}).then(d => markSt(String(d.modo || "auto").toLowerCase())).catch(() => markSt("auto"));
  bar.querySelectorAll("[data-st]").forEach(b => b.addEventListener("click", async () => {
    const mode = b.dataset.st;
    msg("Salvando status…");
    try {
      let sha = null;
      try { sha = (await gh(filePath("status.json") + "?ref=" + encodeURIComponent(GH.branch))).sha; } catch (e) { if (!/não encontrado/i.test(e.message)) throw e; }
      const body = JSON.stringify({ modo: mode, atualizado: new Date().toISOString() }, null, 2) + "\n";
      await gh(filePath("status.json"), { method: "PUT", body: JSON.stringify({ message: "Site: status " + NAMES[mode], content: encText(body), branch: GH.branch, ...(sha ? { sha } : {}) }) });
      markSt(mode);
      if (window.showServerStatus) window.showServerStatus(mode);
      msg(`Status: ${NAMES[mode]}. Os visitantes veem em 1 a 2 minutos.`, "ok");
    } catch (e) { msg(e.message, "err"); }
  }));
})();
