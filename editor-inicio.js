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
    [".rede-txt strong", 1], [".rede-txt small", 0], [".rede-cta", 1],
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
  .ed-mv { position: fixed; z-index: 60; background: #5fd8cb; color: #06221f; border: 0; border-radius: 6px; padding: .2rem .5rem; font: 700 .75rem system-ui; cursor: grab; touch-action: none; user-select: none; box-shadow: 0 2px 8px rgba(0,0,0,.45); }
  .ed-mv-ind { position: fixed; z-index: 59; background: #5fd8cb; border-radius: 3px; pointer-events: none; box-shadow: 0 0 0 3px rgba(95,216,203,.3); }
  .ed-mv-tip { position: fixed; z-index: 61; background: #0b0a1a; border: 1px solid #5fd8cb; color: #f1eeff; font: 700 .75rem system-ui; padding: .15rem .45rem; border-radius: 4px; pointer-events: none; white-space: nowrap; }
  .ed-mv-src { opacity: .35; }
  .ed-insmenu { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; }
  .ed-insmenu[hidden] { display: none; }
  .ed-insmenu label { padding: .4rem .75rem; border-radius: 6px; border: 1px solid #2e2853; background: #151229; color: #f1eeff; font-size: .875rem; font-weight: 700; cursor: pointer; }
  .ed-insmenu input[type=file] { display: none; }
  .ed-ef { display: inline-flex; flex-wrap: wrap; align-items: center; gap: .3rem .9rem; }
  .ed-ef[hidden], .ed-op[hidden] { display: none; }
  .ed-op { display: inline-flex; align-items: center; gap: .4rem; font-weight: 400; color: #b2abd3; }
  .ed-op input[type=checkbox] { width: auto; accent-color: #5fd8cb; }
  .ed-op input[type=color] { width: 2rem; height: 1.6rem; padding: 0 .1rem; border: 1px solid #2e2853; border-radius: 4px; background: #0b0a1a; cursor: pointer; flex: none; min-width: 0; }
  .ed-op input { width: 7.5rem; accent-color: #7c3aed; padding: 0; flex: none; min-width: 0; }
  .ed-op b { min-width: 2.6rem; color: #f1eeff; font-variant-numeric: tabular-nums; }
  #ed-rm.armed { background: #ff7a7a; border-color: #ff7a7a; color: #2a0505; }
  body.ed-on .site-yt iframe { pointer-events: none; }
  body.ed-on .site-media figcaption:empty::before { content: "Legenda (opcional): clique para escrever"; opacity: .5; }
  body.ed-on .site-media figcaption:empty { display: block; min-height: 1.2em; }
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
      <button type="button" data-tp-label title="Touchpad na tela com cursor de mouse, para editar pelo celular">Mouse virtual</button>
      <a href="wiki.html">Ir para a Wiki</a></div>
    <div class="ed-line" id="ed-dyn"><span class="grow" id="ed-msg">Clique em "Editar esta página" para mudar textos, tamanhos e listas.</span>
      <button type="button" class="acc" id="ed-start">Editar esta página</button></div>`;
  document.body.appendChild(bar); document.body.classList.add("ed-has-bar");
  { const t = document.createElement("script"); t.src = "touchpad.js?v=" + Date.now(); t.className = "ed-ui"; document.body.appendChild(t); }
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
  // cada elemento ganha um número fixo ao começar a editar; o salvar acha o mesmo elemento no
  // index.html do GitHub por esse número (assim dá para mover coisas de lugar)
  let ORIG = [];
  function tagIds() {
    ORIG = []; let n = 0;
    const walk = el => { for (const c of kids(el)) { c.setAttribute("data-ed-id", n); ORIG[n++] = pathOf(c); walk(c); } };
    walk(document.body);
  }

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
      el.removeAttribute("data-ed-zoom"); el.removeAttribute("data-ed-href"); el.removeAttribute("data-ed-id"); el.removeAttribute("data-ed-moved"); el.removeAttribute("data-ed-cls"); el.removeAttribute("data-ed-op");
      if (el.hasAttribute("data-ed-src")) { el.setAttribute("src", el.getAttribute("data-ed-src")); el.removeAttribute("data-ed-src"); }
      el.removeAttribute("data-ed-new"); el.classList.remove("ed-mv-src");
      el.removeAttribute("aria-current");
      if (el.tagName === "SECTION" && el.classList.contains("block")) { el.removeAttribute("hidden"); el.classList.remove("tab-page"); }
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
    tagIds();
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
      <button type="button" id="ed-ins" title="Coloca imagem, vídeo, texto ou título depois do que está selecionado">+ Inserir</button>
      <button type="button" id="ed-rm" hidden title="Apaga o que está selecionado (clique duas vezes)">Apagar</button>
      <button type="button" id="ed-fundo" hidden title="A imagem ou vídeo vira o fundo do balão onde está">Usar como fundo</button>
      <button type="button" id="ed-ef-btn" hidden aria-expanded="false" title="Opacidade, desfoque, sombra e brilho do que está selecionado">Efeitos</button>
      <span class="ed-ef" id="ed-ef" hidden>
        <label class="ed-op" title="Opacidade (duplo clique volta a 100%)">Opacidade <input type="range" data-ef="op" min="10" max="100" step="5" value="100"><b>100%</b></label>
        <label class="ed-op" title="Desfoque (duplo clique volta a 0%)">Desfoque <input type="range" data-ef="blur" min="0" max="100" step="5" value="0"><b>0%</b></label>
        <label class="ed-op" id="ed-ef-sombra" title="Sombra no texto (duplo clique volta a 0%)">Sombra <input type="range" data-ef="sombra" min="0" max="100" step="5" value="0"><b>0%</b><input type="color" id="ed-ef-cor" data-cor="sombra" value="#000000" title="Cor da sombra"></label>
        <label class="ed-op" id="ed-ef-brilho" title="Brilho em volta das letras (duplo clique volta a 0%)">Brilho <input type="range" data-ef="brilho" min="0" max="100" step="5" value="0"><b>0%</b><input type="color" id="ed-ef-cor2" data-cor="brilho" value="#b99bff" title="Cor do brilho"></label>
        <label class="ed-op" id="ed-ef-fundo" hidden title="Opacidade e desfoque valem só para a imagem/vídeo de fundo"><input type="checkbox"> só no fundo</label>
      </span>
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
    montarInserir();
    bar.querySelector("#ed-fundo").addEventListener("click", alternarFundo);
    const efBtn = bar.querySelector("#ed-ef-btn");
    efBtn.addEventListener("click", () => {
      const on = efBtn.getAttribute("aria-expanded") !== "true";
      efBtn.setAttribute("aria-expanded", on); efBtn.textContent = on ? "Fechar efeitos" : "Efeitos";
      bar.querySelector("#ed-ef").hidden = !on || !podeOpacidade(hzEl);
      if (on) mostrarEfeitos();
    });
    bar.querySelectorAll("#ed-ef input[data-ef]").forEach(inp => {
      const nome = { op: "Opacidade", blur: "Desfoque", sombra: "Sombra", brilho: "Brilho" }[inp.dataset.ef];
      inp.addEventListener("input", () => mudarEfeito(inp.dataset.ef, +inp.value));
      inp.addEventListener("change", () => msg(`${nome} ${inp.value}%. Clique em Salvar para gravar.`, "ok"));
      inp.closest("label").addEventListener("dblclick", () => { mudarEfeito(inp.dataset.ef, inp.dataset.ef === "op" ? 100 : 0); msg(nome + " normal.", "ok"); });
    });
    bar.querySelector("#ed-ef-fundo input").addEventListener("change", mostrarEfeitos);
    bar.querySelectorAll("#ed-ef input[data-cor]").forEach(cor => {
      const k = cor.dataset.cor;
      cor.addEventListener("click", e => e.stopPropagation());
      cor.addEventListener("input", () => {
        const sl = bar.querySelector(`#ed-ef input[data-ef="${k}"]`);
        mudarEfeito(k, +sl.value > 0 ? +sl.value : 50); // ainda em 0%: liga em 50%
      });
      cor.addEventListener("change", () => msg(`Cor ${k === "sombra" ? "da sombra" : "do brilho"} trocada. Clique em Salvar para gravar.`, "ok"));
    });
    bar.querySelector("#ed-save").addEventListener("click", save);
    bar.querySelector("#ed-up").addEventListener("click", () => { if (hzEl && hzEl.parentElement) selectEl(hzEl.parentElement); });
    bar.querySelector("#ed-href").addEventListener("input", e => {
      const a = linkTarget; if (!a || a.hasAttribute("data-link")) return;
      a.setAttribute("href", e.target.value.trim() || "#"); a.setAttribute("data-ed-href", "1"); dirty = true;
    });
    msg("Clique em qualquer coisa: texto marcado para escrever, bolinha para o tamanho, \"✥ Mover\" para mudar de lugar.");
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
    if (!editing || !hzEl || !hzEl.isConnected) { hz.hidden = true; mvH.hidden = true; return; }
    const r = hzEl.getBoundingClientRect();
    hz.style.left = (r.right - 10) + "px"; hz.style.top = (r.bottom - 10) + "px"; hz.hidden = false;
    if (!mvDrag) {
      const top = document.querySelector("header.top, .top"), hb = top ? top.getBoundingClientRect().bottom : 0;
      mvH.style.left = Math.max(4, r.left - 4) + "px"; mvH.style.top = (r.top - 26 < hb + 4 ? Math.max(hb + 4, r.top + 4) : r.top - 26) + "px";
    }
    mvH.hidden = false;
  }

  /* ---------- mover: arraste "✥ Mover" para cima/baixo ou para o lado de outra coisa ---------- */
  const mvH = document.createElement("button"); mvH.type = "button"; mvH.className = "ed-mv ed-ui"; mvH.hidden = true; mvH.textContent = "✥ Mover";
  mvH.title = "Segure e arraste para colocar antes ou depois de outra coisa";
  const mvInd = document.createElement("div"); mvInd.className = "ed-mv-ind ed-ui"; mvInd.hidden = true;
  const mvTip = document.createElement("div"); mvTip.className = "ed-mv-tip ed-ui"; mvTip.hidden = true;
  document.body.append(mvH, mvInd, mvTip);
  let mvDrag = null;
  const isWrapper = el => !el || el.matches("html, body, main, header, footer, script, style, .ed-ui") || !el.closest("main, header, footer");
  function mvTarget(x, y) {
    const M = mvDrag.el;
    const hit = document.elementsFromPoint(x, y).find(n => !(n.closest && n.closest(".ed-ui")));
    if (!hit || M.contains(hit)) return null;
    let t = hit;
    const ed = t.closest("[data-ed]"); if (ed && !ed.contains(M)) t = ed;
    while (t && !isWrapper(t) && getComputedStyle(t).display === "inline" && !t.hasAttribute("data-ed")) t = t.parentElement;
    if (!t || isWrapper(t) || t.contains(M)) return null;
    const ps = getComputedStyle(t.parentElement), ts = getComputedStyle(t);
    const horiz = /inline/.test(ts.display) || (/flex/.test(ps.display) && !/column/.test(ps.flexDirection)) || (/grid/.test(ps.display) && ps.gridTemplateColumns.trim().split(/\s+/).length > 1);
    const r = t.getBoundingClientRect();
    return { t, horiz, after: horiz ? x > r.left + r.width / 2 : y > r.top + r.height / 2, r };
  }
  function mvShow(d) {
    if (!d) { mvInd.hidden = mvTip.hidden = true; return; }
    const r = d.r;
    Object.assign(mvInd.style, d.horiz
      ? { left: (d.after ? r.right + 3 : r.left - 7) + "px", top: r.top + "px", width: "4px", height: Math.max(r.height, 20) + "px" }
      : { left: r.left + "px", top: (d.after ? r.bottom + 3 : r.top - 7) + "px", width: r.width + "px", height: "4px" });
    mvTip.textContent = d.horiz ? (d.after ? "Colocar à direita" : "Colocar à esquerda") : (d.after ? "Colocar embaixo" : "Colocar em cima");
    mvTip.style.left = Math.max(4, r.left) + "px"; mvTip.style.top = Math.max(4, (d.after && !d.horiz ? r.bottom + 10 : r.top - 28)) + "px";
    mvInd.hidden = mvTip.hidden = false;
  }
  mvH.addEventListener("pointerdown", e => {
    if (!hzEl) return; e.preventDefault(); try { mvH.setPointerCapture(e.pointerId); } catch (err) {}
    mvDrag = { el: hzEl, d: null }; hzEl.classList.add("ed-mv-src"); hz.hidden = true;
  });
  mvH.addEventListener("pointermove", e => {
    if (!mvDrag) return;
    if (e.clientY < 50) scrollBy(0, -14); else if (e.clientY > innerHeight - 120) scrollBy(0, 14);
    mvH.style.left = (e.clientX - 30) + "px"; mvH.style.top = (e.clientY - 12) + "px";
    mvDrag.d = mvTarget(e.clientX, e.clientY); mvShow(mvDrag.d);
  });
  const mvEnd = () => {
    if (!mvDrag) return; const { el, d } = mvDrag; mvDrag = null; mvShow(null); el.classList.remove("ed-mv-src");
    if (d) {
      d.t.parentElement.insertBefore(el, d.after ? d.t.nextSibling : d.t);
      el.setAttribute("data-ed-moved", "1"); dirty = true;
      if (el.matches(".top .nav a")) espelharMenu(el.closest(".nav"));
      if (window.astralAjustaMenu) window.astralAjustaMenu();
      msg("Movido. Clique em Salvar para gravar (Cancelar desfaz tudo).", "ok");
    }
    selectEl(el);
  };
  mvH.addEventListener("pointerup", mvEnd); mvH.addEventListener("pointercancel", mvEnd);
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
    const rm = bar.querySelector("#ed-rm"); if (rm) { rm.hidden = !podeApagar(el); rm.classList.remove("armed"); rm.textContent = "Apagar"; }
    mostrarFundo(el);
    const ef = bar.querySelector("#ed-ef");
    if (ef) {
      const pode = podeOpacidade(el), btn = bar.querySelector("#ed-ef-btn");
      btn.hidden = !pode;
      ef.hidden = !pode || btn.getAttribute("aria-expanded") !== "true";
      const m = midiaDe(el), temFundo = !!m && m.classList.contains("fundo") && m !== el;
      const box = bar.querySelector("#ed-ef-fundo"); box.hidden = !temFundo;
      if (!temFundo) box.querySelector("input").checked = false;
      mostrarEfeitos();
    }
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
    if (!hzEl) return; e.preventDefault(); try { hz.setPointerCapture(e.pointerId); } catch (err) {}
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

  /* imagem/vídeo como fundo do balão: acha a mídia do que está selecionado (ou do balão que tem mídia de fundo) */
  function midiaDe(el) {
    if (!el) return null;
    const m = el.closest(".site-media"); if (m) return m;
    for (let n = el, i = 0; n && i < 5 && !outer(n); n = n.parentElement, i++) {
      const f = n.querySelector(":scope > .site-media"); if (f) return f;
    }
    return null;
  }
  function mostrarFundo(el) {
    const b = bar.querySelector("#ed-fundo"); if (!b) return;
    const m = midiaDe(el);
    b.hidden = !m || !m.parentElement || outer(m.parentElement) || m.parentElement.matches("main > section, .wrap");
    if (!b.hidden) b.textContent = m.classList.contains("fundo") ? "Tirar do fundo" : "Usar como fundo";
  }
  /* opacidade e desfoque de qualquer elemento (ou só da imagem/vídeo de fundo do balão) */
  const podeOpacidade = el => !!el && !outer(el) && !el.closest(".ed-ui") && !el.matches(".top, .wrap");
  const BLUR_MAX = 20; // 100% = 20px
  function alvoEfeito() {
    const el = hzEl; if (!podeOpacidade(el)) return null;
    const box = bar.querySelector("#ed-ef-fundo input"), m = midiaDe(el);
    return box && box.checked && m && m.classList.contains("fundo") ? m : el;
  }
  const hexRgb = h => { const n = parseInt(String(h).replace("#", ""), 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const sombraCss = (v, cor) => { const [r, g, b] = hexRgb(cor || "#000000"); return `0 ${+(1 + v / 50).toFixed(1)}px ${+(v / 100 * 14).toFixed(1)}px rgba(${r}, ${g}, ${b}, ${(0.35 + 0.55 * v / 100).toFixed(2)})`; };
  const brilhoCss = (v, cor) => { const [r, g, b] = hexRgb(cor || "#b99bff"); const a = (0.45 + 0.5 * v / 100).toFixed(2);
    return `0 0 ${+(1 + v / 25).toFixed(1)}px rgba(${r}, ${g}, ${b}, ${a}), 0 0 ${+(3 + v / 6).toFixed(1)}px rgba(${r}, ${g}, ${b}, ${a})`; };
  // o valor fica guardado no elemento (data-sombra="50 #000000", data-brilho="40 #b99bff") para dar para ajustar depois
  const lerFx = (el, k, corPadrao) => { const [v, c] = (el.getAttribute("data-" + k) || "").split(" "); return { v: Math.max(0, Math.min(100, +v || 0)), c: /^#[0-9a-f]{6}$/i.test(c || "") ? c : corPadrao }; };
  function aplicarTextoFx(t, k, v, c) {
    if (v > 0) t.setAttribute("data-" + k, v + " " + c); else t.removeAttribute("data-" + k);
    const s = lerFx(t, "sombra", "#000000"), b = lerFx(t, "brilho", "#b99bff"), partes = [];
    if (b.v > 0) partes.push(brilhoCss(b.v, b.c));
    if (s.v > 0) partes.push(sombraCss(s.v, s.c));
    if (partes.length) t.style.textShadow = partes.join(", "); else t.style.removeProperty("text-shadow");
  }
  const lerBlur = el => { const m = (el.style.filter || "").match(/blur\(([\d.]+)px\)/); return m ? Math.round(parseFloat(m[1]) / BLUR_MAX * 100) : 0; };
  function mostrarEfeitos() {
    const t = alvoEfeito(); if (!t) return;
    const op = Math.round((parseFloat(t.style.opacity) || 1) * 100), bl = lerBlur(t), sb = lerFx(t, "sombra", "#000000"), br = lerFx(t, "brilho", "#b99bff");
    const q = k => bar.querySelector(`#ed-ef input[data-ef="${k}"]`);
    for (const [k, v] of [["op", op], ["blur", bl], ["sombra", sb.v], ["brilho", br.v]]) { q(k).value = v; q(k).nextElementSibling.textContent = v + "%"; }
    bar.querySelector("#ed-ef-cor").value = sb.c; bar.querySelector("#ed-ef-cor2").value = br.c;
    const midia = t.classList.contains("site-media");
    bar.querySelector("#ed-ef-sombra").hidden = midia; bar.querySelector("#ed-ef-brilho").hidden = midia;
  }
  function mudarEfeito(tipo, v) {
    const t = alvoEfeito(); if (!t) return;
    if (tipo === "op") {
      v = Math.max(10, Math.min(100, Math.round(v)));
      if (v >= 100) t.style.removeProperty("opacity"); else t.style.opacity = (v / 100).toString();
    } else if (tipo === "sombra" || tipo === "brilho") {
      v = Math.max(0, Math.min(100, Math.round(v)));
      aplicarTextoFx(t, tipo, v, bar.querySelector(tipo === "sombra" ? "#ed-ef-cor" : "#ed-ef-cor2").value);
    } else {
      v = Math.max(0, Math.min(100, Math.round(v)));
      if (v <= 0) t.style.removeProperty("filter"); else t.style.filter = `blur(${+(v / 100 * BLUR_MAX).toFixed(1)}px)`;
    }
    if (!t.getAttribute("style")) t.removeAttribute("style");
    t.setAttribute("data-ed-op", "1"); dirty = true; placeHz();
    mostrarEfeitos();
  }
  function alternarFundo() {
    const m = midiaDe(hzEl); if (!m) return;
    const on = !m.classList.contains("fundo");
    m.classList.toggle("fundo", on);
    const v = m.querySelector("video");
    if (v && on) { v.removeAttribute("controls"); v.muted = true; ["autoplay", "muted", "loop", "playsinline"].forEach(a => v.setAttribute(a, "")); v.play && v.play().catch(() => {}); }
    m.setAttribute("data-ed-cls", "1"); if (v) v.setAttribute("data-ed-cls", "1");
    dirty = true; placeHz(); mostrarFundo(hzEl);
    msg(on ? "Agora é o fundo do balão. Para desfazer, selecione o balão e clique em Tirar do fundo. Depois, Salvar." : "Voltou a ser imagem/vídeo normal. Clique em Salvar.", "ok");
  }

  /* o menu existe duas vezes (computador e celular): a ordem de um vale para o outro */
  const chaveLink = a => a.dataset.tab !== undefined ? "t:" + a.dataset.tab : a.classList.contains("wiki") ? "wiki" : "h:" + a.getAttribute("href");
  function espelharMenu(origem) {
    const ordem = [...origem.querySelectorAll(":scope > a")].map(chaveLink);
    document.querySelectorAll(".top nav.nav").forEach(nav => {
      if (nav === origem) return;
      const links = new Map([...nav.querySelectorAll(":scope > a")].map(a => [chaveLink(a), a]));
      for (const k of ordem) { const a = links.get(k); if (a) { nav.appendChild(a); a.setAttribute("data-ed-moved", "1"); } }
    });
  }

  /* ---------- inserir imagem, vídeo, texto, título / apagar ---------- */
  const apagados = [];
  const podeApagar = el => !!el && !outer(el) && !el.closest(".ed-ui") &&
    (el.matches("main > section.aba-extra") || !el.matches("main > section, .hero, .top, .top *, .wrap"));
  function alvoInsercao() {
    let el = hzEl && hzEl.isConnected && !outer(hzEl) && !hzEl.closest(".ed-ui") ? hzEl : null;
    if (el) {
      const ed = el.closest("[data-ed]"); if (ed) el = ed;
      while (el && el.parentElement && !outer(el.parentElement) && getComputedStyle(el).display === "inline") el = el.parentElement;
      if (el.matches("main > section")) { const w = el.querySelector(":scope > .wrap") || el; return { parent: w, before: null }; }
      if (el.closest(".top")) el = null;
    }
    if (el) return { parent: el.parentElement, before: el.nextSibling };
    const sec = [...document.querySelectorAll("main > section")].find(x => !x.hidden && x.offsetParent !== null);
    return { parent: sec ? (sec.querySelector(":scope > .wrap") || sec) : null, before: null };
  }
  function inserir(node, msgTxt) {
    const a = alvoInsercao();
    if (!a.parent) return msg("Clique primeiro onde quer colocar (o novo entra logo depois).", "err");
    a.parent.insertBefore(node, a.before);
    node.setAttribute("data-ed-new", "1"); node.setAttribute("data-ed-moved", "1");
    node.querySelectorAll("[data-ed]").forEach(x => makeEditable(x, x.getAttribute("data-ed") === "1"));
    if (node.hasAttribute("data-ed")) makeEditable(node, node.getAttribute("data-ed") === "1");
    dirty = true; selectEl(node);
    node.scrollIntoView({ block: "center", behavior: "smooth" });
    msg(msgTxt || "Colocado. Arraste com ✥ Mover, mude o tamanho com a bolinha e clique em Salvar.", "ok");
  }
  const slugify = t => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "arquivo";
  async function enviarArquivo(file) {
    if (file.size > 25 * 1024 * 1024) throw new Error("Arquivo maior que 25 MB. Para vídeo grande, suba no YouTube e use YouTube.");
    const ext = ((file.name.match(/\.[a-z0-9]+$/i) || [""])[0]).toLowerCase() || (file.type.startsWith("video") ? ".mp4" : ".png");
    const nome = slugify(file.name.replace(/\.[^.]+$/, "")) + "-" + Date.now().toString(36) + ext;
    msg("Enviando " + file.name + "…");
    await gh(filePath("midia/" + nome), { method: "PUT", body: JSON.stringify({ message: "Site: enviar " + nome, content: b64bytes(new Uint8Array(await file.arrayBuffer())), branch: GH.branch }) });
    return { url: URL.createObjectURL(file), caminho: "midia/" + nome };
  }
  function ytId(u) {
    const m = String(u).match(/^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:[^#]*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : null;
  }
  function montarInserir() {
    const linha = document.createElement("div");
    linha.className = "ed-line ed-insmenu"; linha.id = "ed-insmenu"; linha.hidden = true;
    linha.innerHTML = `<strong>Inserir:</strong>
      <label>Imagem<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-t="img"></label>
      <label>Vídeo .mp4<input type="file" accept="video/mp4,video/webm" data-t="vid"></label>
      <label title="Toca sozinho em loop, sem som, como um GIF">Animação (loop)<input type="file" accept="video/mp4,video/webm" data-t="anim"></label>
      <button type="button" data-t="yt">YouTube</button>
      <button type="button" data-t="txt">Texto</button>
      <button type="button" data-t="tit">Título</button>
      <button type="button" data-t="aba" title="Cria uma aba nova no menu do topo">Nova aba</button>
      <input type="text" id="ed-yt" placeholder="Cole o link do YouTube e aperte Enter" hidden>
      <input type="text" id="ed-aba" placeholder="Nome da nova aba e Enter" hidden>
      <button type="button" data-t="fechar">Fechar</button>`;
    bar.insertBefore(linha, bar.querySelector("#ed-dyn"));
    bar.querySelector("#ed-ins").addEventListener("click", () => { linha.hidden = !linha.hidden; });
    linha.querySelectorAll("input[type=file]").forEach(inp => inp.addEventListener("change", async () => {
      const f = inp.files[0]; inp.value = ""; if (!f) return;
      const t = inp.dataset.t;
      try {
        const up = await enviarArquivo(f);
        const fig = document.createElement("figure"); fig.className = "site-media";
        if (t === "img") fig.innerHTML = `<img alt=""><figcaption data-ed="0"></figcaption>`;
        else fig.innerHTML = t === "anim" ? `<video autoplay muted loop playsinline></video>` : `<video controls preload="metadata" playsinline></video><figcaption data-ed="0"></figcaption>`;
        const m = fig.querySelector("img, video"); m.setAttribute("src", up.url); m.setAttribute("data-ed-src", up.caminho);
        inserir(fig, f.name + " enviado e colocado. Clique em Salvar (o site público mostra em 1 a 2 minutos).");
      } catch (e) { msg(e.message, "err"); }
    }));
    const yt = linha.querySelector("#ed-yt"), aba = linha.querySelector("#ed-aba");
    aba.addEventListener("keydown", e => {
      if (e.key !== "Enter") return; e.preventDefault();
      const nome = aba.value.trim(); if (!nome) return;
      let id = slugify(nome), n = 2; while (document.getElementById(id)) id = slugify(nome) + "-" + n++;
      const main = document.querySelector("main"); if (!main) return;
      const sec = document.createElement("section");
      sec.className = "block aba-extra"; sec.id = id;
      sec.innerHTML = `<div class="wrap"><div class="block-head"><p class="eyebrow" data-ed="1"></p><h2 data-ed="1"></h2><p class="lead" data-ed="0">Escreva aqui o texto desta aba. Use + Inserir para colocar imagens, vídeos e mais textos.</p></div></div>`;
      sec.querySelector(".eyebrow").textContent = nome; sec.querySelector("h2").textContent = nome;
      main.appendChild(sec);
      for (const el of [sec]) { el.setAttribute("data-ed-new", "1"); el.setAttribute("data-ed-moved", "1"); }
      sec.querySelectorAll("[data-ed]").forEach(x => makeEditable(x, x.getAttribute("data-ed") === "1"));
      document.querySelectorAll(".top nav.nav").forEach(nav => {
        const a = document.createElement("a");
        a.href = "#" + id; a.dataset.tab = id; a.textContent = nome; a.setAttribute("data-ed", "1");
        a.setAttribute("data-ed-new", "1"); a.setAttribute("data-ed-moved", "1");
        nav.insertBefore(a, nav.querySelector("a.wiki"));
        makeEditable(a, true);
      });
      aba.value = ""; aba.hidden = true; dirty = true;
      location.hash = id;
      if (window.astralAjustaMenu) window.astralAjustaMenu();
      msg(`Aba "${nome}" criada no menu. Escreva, use + Inserir e clique em Salvar.`, "ok");
    });
    linha.addEventListener("click", e => {
      const b = e.target.closest("button[data-t]"); if (!b) return;
      const t = b.dataset.t;
      if (t === "fechar") { linha.hidden = true; return; }
      if (t === "yt") { yt.hidden = !yt.hidden; if (!yt.hidden) yt.focus(); return; }
      if (t === "aba") { aba.hidden = !aba.hidden; if (!aba.hidden) aba.focus(); return; }
      if (t === "txt") { const p = document.createElement("p"); p.className = "site-texto"; p.setAttribute("data-ed", "0"); p.textContent = "Escreva aqui."; inserir(p); }
      if (t === "tit") { const h = document.createElement("h3"); h.className = "site-titulo"; h.setAttribute("data-ed", "1"); h.textContent = "Novo título"; inserir(h); }
    });
    yt.addEventListener("keydown", e => {
      if (e.key !== "Enter") return; e.preventDefault();
      const id = ytId(yt.value.trim()); if (!id) return msg("Esse link não parece ser do YouTube.", "err");
      const d = document.createElement("div"); d.className = "site-yt" + (/shorts\//.test(yt.value) ? " vertical" : "");
      d.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="Vídeo do YouTube" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
      yt.value = ""; yt.hidden = true; inserir(d);
    });
    const rm = bar.querySelector("#ed-rm");
    let armado = 0;
    rm.addEventListener("click", () => {
      const el = hzEl; if (!podeApagar(el)) return;
      if (Date.now() - armado > 3000) { armado = Date.now(); rm.classList.add("armed"); rm.textContent = "Confirmar apagar"; return; }
      armado = 0; rm.classList.remove("armed"); rm.textContent = "Apagar";
      const naLista = el.parentElement && listOf(el.parentElement);
      if (!el.hasAttribute("data-ed-new") && !naLista) {
        el.querySelectorAll("[data-ed-moved]").forEach(x => x.removeAttribute("data-ed-moved"));
        const id = el.getAttribute("data-ed-id"); if (id != null) apagados.push(id);
      }
      if (el.matches("[data-ed-list]") && el.nextElementSibling && el.nextElementSibling.classList.contains("ed-add")) el.nextElementSibling.remove();
      const ehAba = el.matches("main > section.aba-extra");
      if (ehAba) document.querySelectorAll(`.top .nav a[data-tab="${el.id}"]`).forEach(a => {
        if (!a.hasAttribute("data-ed-new")) { const id = a.getAttribute("data-ed-id"); if (id != null) apagados.push(id); }
        a.remove();
      });
      el.remove(); hzEl = null; rm.hidden = true; placeHz(); dirty = true;
      if (ehAba) location.hash = "";
      msg("Apagado. Clique em Salvar para gravar (Cancelar desfaz tudo).", "ok");
    });
  }

  /* ---------- salvar ---------- */
  async function save() {
    const btn = bar.querySelector("#ed-save"); btn.disabled = true; msg("Salvando…");
    try {
      const d = await gh(filePath("index.html") + "?ref=" + encodeURIComponent(GH.branch));
      const doc = new DOMParser().parseFromString(decText(d.content), "text/html");
      const docEls = ORIG.map(pth => byPath(doc, pth));
      const docOf = el => { const id = el && el.getAttribute && el.getAttribute("data-ed-id"); return id == null ? null : docEls[+id] || null; };
      const same = (a, b) => a && b && a.tagName.toLowerCase() === b.tagName.toLowerCase();
      const DIFF = "A página no GitHub está diferente desta. Recarregue e edite de novo.";
      // coisas movidas (do fim para o começo, para cada uma achar a vizinha já no lugar)
      // coisas movidas e coisas novas (inseridas), do fim para o começo
      const novos = new Map(), docOf2 = el => docOf(el) || novos.get(el) || null;
      for (const el of [...document.querySelectorAll("[data-ed-moved]")].reverse()) {
        // dentro de algo novo: vai junto com ele (a cópia do novo já leva); se já existia, sai do lugar antigo
        if (el.parentElement && el.parentElement.closest("[data-ed-new]")) { const d0 = docOf(el); if (d0) d0.remove(); continue; }
        let dEl = docOf(el);
        if (!dEl && el.hasAttribute("data-ed-new")) { if (el.parentElement && listOf(el.parentElement)) continue; dEl = doc.importNode(cleanClone(el), true); novos.set(el, dEl); }
        if (!same(dEl, el)) throw new Error(DIFF);
        if (el.parentElement && listOf(el.parentElement)) { dEl.remove(); continue; }
        const dParent = docOf2(el.parentElement); if (!same(dParent, el.parentElement)) throw new Error(DIFF);
        let sib = el.nextElementSibling;
        while (sib && (isUi(sib) || sib.classList.contains("toast") || !docOf2(sib) || docOf2(sib).parentElement !== dParent)) sib = sib.nextElementSibling;
        dParent.insertBefore(dEl, sib ? docOf2(sib) : null);
      }
      // coisas apagadas
      for (const id of apagados) { const d = docEls[+id]; if (d) d.remove(); }
      // opacidade (qualquer elemento fora das listas)
      for (const el of document.querySelectorAll("[data-ed-op]")) {
        if (listOf(el) || el.closest("[data-ed-new]")) continue;
        const t = docOf(el); if (!same(t, el)) continue;
        const o = el.style.opacity, f = el.style.filter, sh = el.style.textShadow;
        if (o && o !== "1") t.style.opacity = o; else t.style.removeProperty("opacity");
        if (f) t.style.filter = f; else t.style.removeProperty("filter");
        if (sh) t.style.textShadow = sh; else t.style.removeProperty("text-shadow");
        for (const k of ["data-sombra", "data-brilho"]) { if (el.hasAttribute(k)) t.setAttribute(k, el.getAttribute(k)); else t.removeAttribute(k); }
        if (!t.getAttribute("style")) t.removeAttribute("style");
      }
      // fundo ligado/desligado: copia a classe e os atributos do vídeo
      for (const el of document.querySelectorAll("[data-ed-cls]")) {
        if (listOf(el) || el.closest("[data-ed-new]")) continue;
        const t = docOf(el); if (!same(t, el)) continue;
        const c = cleanClone(el);
        if (c.getAttribute("class")) t.setAttribute("class", c.getAttribute("class")); else t.removeAttribute("class");
        if (el.tagName === "VIDEO") ["controls", "autoplay", "muted", "loop", "playsinline"].forEach(a => { if (c.hasAttribute(a)) t.setAttribute(a, ""); else t.removeAttribute(a); });
      }
      // listas inteiras
      for (const list of document.querySelectorAll("[data-ed-list]")) {
        const target = docOf(list);
        if (!same(target, list)) throw new Error(DIFF);
        target.innerHTML = "\n" + kids(list).map(item => "        " + cleanClone(item).outerHTML).join("\n") + "\n      ";
      }
      // textos soltos
      for (const el of document.querySelectorAll("[data-ed]")) {
        if (listOf(el) || !el.hasAttribute("data-ed-changed") || el.closest("[data-ed-new]")) continue;
        const target = docOf(el);
        if (!same(target, el)) throw new Error(DIFF);
        target.innerHTML = cleanHtml(el);
        const z = el.style.zoom;
        if (z && z !== "1") target.style.zoom = z;
        else { target.style.removeProperty("zoom"); if (!target.getAttribute("style")) target.removeAttribute("style"); }
      }
      // links de botões trocados
      for (const el of document.querySelectorAll("[data-ed-href]")) {
        if (listOf(el) || el.closest("[data-ed-new]")) continue;
        const target = docOf(el);
        if (same(target, el)) target.setAttribute("href", el.getAttribute("href"));
      }
      // tamanhos (bolinha) de qualquer elemento fora das listas
      for (const el of document.querySelectorAll("[data-ed-zoom]")) {
        if (listOf(el)) continue;
        const target = docOf(el);
        if (!same(target, el)) continue;
        const z = el.style.zoom;
        if (z && z !== "1") target.style.zoom = z;
        else { target.style.removeProperty("zoom"); if (!target.getAttribute("style")) target.removeAttribute("style"); }
      }
      const html = "<!doctype html>\n" + doc.documentElement.outerHTML + "\n";
      if (!/<main[\s>]/i.test(html) || !/<script/i.test(html) || /blob:/i.test(html)) throw new Error("Algo saiu errado ao montar a página. Nada foi salvo.");
      await gh(filePath("index.html"), { method: "PUT", body: JSON.stringify({ message: "Site: editar página inicial", content: encText(html), sha: d.sha, branch: GH.branch }) });
      dirty = false;
      // a página no GitHub agora é igual a esta: zera as marcas e renumera, para poder salvar de novo sem recarregar
      document.querySelectorAll("[data-ed-moved], [data-ed-new], [data-ed-changed], [data-ed-href], [data-ed-zoom], [data-ed-cls], [data-ed-op]").forEach(el => {
        ["data-ed-moved", "data-ed-new", "data-ed-changed", "data-ed-href", "data-ed-zoom", "data-ed-cls", "data-ed-op"].forEach(k => el.removeAttribute(k));
      });
      apagados.length = 0;
      tagIds();
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
