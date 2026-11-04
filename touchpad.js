/* Rede Astral — mouse virtual (touchpad na tela) para editar pelo celular.
   Só carrega para quem está no modo editor. Liga/desliga com window.astralTouchpad.toggle().
   - 1 dedo arrastando no touchpad: move o cursor
   - toque rápido: clique
   - tocar e segurar (meio segundo) e depois arrastar: segura o clique e arrasta (soltar o dedo solta)
   - 2 dedos: rola a página (ou o quadro embaixo do cursor)
   - botões: Clique, Segurar (liga/desliga o clique segurado), – (esconder) */
(() => {
  if (window.astralTouchpad) return;
  const KEY = "astralTP";
  const css = document.createElement("style");
  css.className = "ed-ui";
  css.textContent = `
  .tp-panel { position: fixed; left: 0; top: 0; z-index: 2147483000; transform-origin: 0 0; width: 220px; touch-action: none; user-select: none; -webkit-user-select: none;
    background: rgba(21,18,41,.94); border: 1px solid #7c3aed; border-radius: 14px; box-shadow: 0 6px 24px rgba(0,0,0,.55); font: 700 13px system-ui, sans-serif; color: #f1eeff; }
  .tp-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; cursor: move; }
  .tp-head span { flex: 1; font-size: 12px; color: #b99bff; }
  .tp-head button, .tp-btns button { border: 1px solid #2e2853; background: #0b0a1a; color: #f1eeff; border-radius: 8px; font: 700 12px system-ui, sans-serif; padding: 6px 8px; touch-action: none; }
  .tp-pad { margin: 0 8px; height: 140px; border-radius: 10px; background: repeating-linear-gradient(45deg, #1f1a3b 0 8px, #1b1735 8px 16px); border: 1px solid #2e2853; touch-action: none; }
  .tp-pad.hold { border-color: #5fd8cb; box-shadow: inset 0 0 0 2px #5fd8cb; }
  .tp-btns { display: flex; gap: 6px; padding: 8px; }
  .tp-btns button { flex: 1; padding: 10px 6px; }
  .tp-btns button[aria-pressed="true"] { background: #5fd8cb; border-color: #5fd8cb; color: #06221f; }
  .tp-cursor { position: fixed; left: 0; top: 0; z-index: 2147483001; width: 18px; height: 26px; pointer-events: none; transform-origin: 0 0; filter: drop-shadow(0 1px 2px rgba(0,0,0,.7)); }
  .tp-cursor.hold path { fill: #5fd8cb; }`;
  const panel = document.createElement("div");
  panel.className = "tp-panel ed-ui"; panel.hidden = true; panel.setAttribute("contenteditable", "false");
  panel.innerHTML = `<div class="tp-head"><span>Mouse virtual</span><button type="button" data-a="min" title="Esconder">–</button></div>
    <div class="tp-pad" aria-label="Touchpad"></div>
    <div class="tp-btns"><button type="button" data-a="click">Clique</button><button type="button" data-a="hold" aria-pressed="false">Segurar</button></div>`;
  const cur = document.createElement("div");
  cur.className = "tp-cursor ed-ui"; cur.hidden = true;
  cur.innerHTML = `<svg viewBox="0 0 18 26" width="18" height="26"><path d="M1 1 L1 21 L6 16 L9.5 24 L13 22.5 L9.5 15 L16 15 Z" fill="#fff" stroke="#0b0a1a" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
  const pad = panel.querySelector(".tp-pad"), holdBtn = panel.querySelector('[data-a="hold"]');

  let on = false, x = 200, y = 200, k = 1, pos = null, hoverEl = null, hold = null;
  const vv = () => window.visualViewport || { offsetLeft: 0, offsetTop: 0, width: innerWidth, height: innerHeight };
  // quantos px da página cabem em 1 px da tela (no "Modo computador" a página fica encolhida)
  const ratio = () => Math.max(1, vv().width / Math.min(screen.width || vv().width, vv().width));

  function layout() {
    if (!on) return;
    const v = vv(); k = ratio();
    const w = 220 * k, h = panel.offsetHeight * k;
    if (!pos) pos = { rx: 1, ry: .55 };
    const left = v.offsetLeft + Math.max(0, Math.min(v.width - w, (v.width - w) * pos.rx));
    const top = v.offsetTop + Math.max(0, Math.min(v.height - h, (v.height - h) * pos.ry));
    panel.style.transform = `translate(${left}px, ${top}px) scale(${k})`;
    clampCursor();
  }
  function clampCursor() {
    const v = vv();
    x = Math.max(v.offsetLeft, Math.min(v.offsetLeft + v.width - 2, x));
    y = Math.max(v.offsetTop, Math.min(v.offsetTop + v.height - 2, y));
    cur.style.transform = `translate(${x}px, ${y}px) scale(${k})`;
  }
  const mine = n => n === cur || panel.contains(n);
  const targetAt = () => document.elementsFromPoint(x, y).find(n => !mine(n)) || null;

  function fire(el, type, extra) {
    if (!el) return true;
    const down = /down|move/.test(type) && !!hold;
    const o = Object.assign({ bubbles: true, cancelable: true, composed: true, view: window, clientX: x, clientY: y, screenX: x, screenY: y,
      button: 0, buttons: (type.endsWith("down") || down) ? 1 : 0, pointerId: 77, pointerType: "mouse", isPrimary: true, width: 1, height: 1, pressure: (type.endsWith("down") || down) ? .5 : 0 }, extra || {});
    const E = type.startsWith("pointer") ? PointerEvent : MouseEvent;
    return el.dispatchEvent(new E(type, o));
  }
  function caretAt() {
    if (document.caretRangeFromPoint) return document.caretRangeFromPoint(x, y);
    if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (!p) return null; const r = document.createRange(); r.setStart(p.offsetNode, p.offset); return r; }
    return null;
  }
  function focusAt(t) {
    const f = t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]');
    if (!f) { const a = document.activeElement; if (a && a !== document.body && !mine(a) && a.blur) a.blur(); return; }
    f.focus({ preventScroll: true });
    if (f.isContentEditable) { const r = caretAt(); if (r && f.contains(r.startContainer)) { const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }
  }
  function hover() {
    const t = targetAt();
    if (t !== hoverEl) {
      if (hoverEl) { fire(hoverEl, "pointerout", { relatedTarget: t }); fire(hoverEl, "mouseout", { relatedTarget: t }); }
      if (t) { fire(t, "pointerover", { relatedTarget: hoverEl }); fire(t, "mouseover", { relatedTarget: hoverEl }); }
      hoverEl = t;
    }
    if (hold) { fire(hold.el, "pointermove"); fire(hold.el, "mousemove"); if (hold.sel) extendSel(); }
    else if (t) { fire(t, "pointermove"); fire(t, "mousemove"); }
  }
  function click() {
    const t = targetAt(); if (!t) return;
    fire(t, "pointerdown"); fire(t, "mousedown");
    focusAt(t);
    fire(t, "pointerup"); fire(t, "mouseup");
    const lbl = t.closest && t.closest("label");
    if (typeof t.click === "function" && !lbl) t.click(); else fire(t, "click");
  }
  // segurar o clique: manda pointerdown e depois os movimentos para o mesmo elemento (como o mouse faz)
  function holdStart() {
    const t = targetAt(); if (!t || hold) return;
    const ed = t.closest && t.closest('[contenteditable="true"], textarea, input');
    const handle = t.closest && t.closest(".mv, .rz, .ed-mv, .ed-rz, .ed-grip, button");
    hold = { el: t, sel: null };
    fire(t, "pointerdown"); fire(t, "mousedown");
    if (ed && !handle) { focusAt(t); const r = caretAt(); if (r) hold.sel = { node: r.startContainer, off: r.startOffset }; }
    cur.classList.add("hold"); pad.classList.add("hold"); holdBtn.setAttribute("aria-pressed", "true");
  }
  function extendSel() {
    const r = caretAt(); if (!r) return;
    try { getSelection().setBaseAndExtent(hold.sel.node, hold.sel.off, r.startContainer, r.startOffset); } catch (e) {}
  }
  function holdEnd() {
    if (!hold) return; const el = hold.el; hold = null;
    fire(el, "pointerup"); fire(el, "mouseup");
    cur.classList.remove("hold"); pad.classList.remove("hold"); holdBtn.setAttribute("aria-pressed", "false");
  }
  function scrollUnder(dx, dy) {
    for (let n = targetAt(); n && n !== document.body && n !== document.documentElement; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if ((/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1)) {
        const before = n.scrollTop + n.scrollLeft; n.scrollBy(dx, dy); if (n.scrollTop + n.scrollLeft !== before) return;
      }
    }
    scrollBy(dx, dy);
  }

  /* ----- gestos no touchpad ----- */
  const pts = new Map();
  let g = null; // gesto atual
  pad.addEventListener("pointerdown", e => {
    e.preventDefault(); try { pad.setPointerCapture(e.pointerId); } catch (err) {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) {
      g = { t0: Date.now(), moved: 0, two: false, longHold: false };
      g.timer = setTimeout(() => { if (g && !g.two && g.moved < 8 * k && !hold) { g.longHold = true; holdStart(); if (navigator.vibrate) navigator.vibrate(15); } }, 450);
    } else if (g) { g.two = true; clearTimeout(g.timer); }
  });
  pad.addEventListener("pointermove", e => {
    const p = pts.get(e.pointerId); if (!p || !g) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    g.moved += Math.abs(dx) + Math.abs(dy);
    if (g.two || pts.size > 1) { scrollUnder(-dx * 2.2, -dy * 2.2); return; }
    const sp = 1.6 + Math.min(1.4, Math.hypot(dx, dy) / (12 * k)); // mais rápido = anda mais
    x += dx * sp; y += dy * sp; clampCursor(); hover();
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
    if (pts.size || !g) return;
    clearTimeout(g.timer);
    if (g.longHold) holdEnd();
    else if (!g.two && g.moved < 8 * k && Date.now() - g.t0 < 350) { if (hold) holdEnd(); else click(); }
    g = null;
  };
  pad.addEventListener("pointerup", up); pad.addEventListener("pointercancel", up);
  panel.addEventListener("click", e => {
    const b = e.target.closest("button[data-a]"); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (b.dataset.a === "click") click();
    if (b.dataset.a === "hold") hold ? holdEnd() : holdStart();
    if (b.dataset.a === "min") toggle(false);
  });
  // segurar o título "Mouse virtual" e arrastar move o touchpad de lugar
  const head = panel.querySelector(".tp-head");
  let mv = null;
  head.addEventListener("pointerdown", e => { if (e.target.closest("button")) return; e.preventDefault(); try { head.setPointerCapture(e.pointerId); } catch (err) {} mv = { x: e.clientX, y: e.clientY }; });
  head.addEventListener("pointermove", e => {
    if (!mv) return; const v = vv(), w = 220 * k, h = panel.offsetHeight * k;
    const m = (panel.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/) || []).slice(1).map(Number);
    const nl = (m[0] || 0) + e.clientX - mv.x - v.offsetLeft, nt = (m[1] || 0) + e.clientY - mv.y - v.offsetTop; mv = { x: e.clientX, y: e.clientY };
    pos = { rx: Math.max(0, Math.min(1, nl / Math.max(1, v.width - w))), ry: Math.max(0, Math.min(1, nt / Math.max(1, v.height - h))) };
    layout();
  });
  head.addEventListener("pointerup", () => { mv = null; try { localStorage.setItem(KEY + "pos", JSON.stringify(pos)); } catch (e) {} });
  // o teclado do celular não deve fechar quando toca no touchpad
  panel.addEventListener("mousedown", e => e.preventDefault());

  function toggle(force) {
    on = typeof force === "boolean" ? force : !on;
    panel.hidden = cur.hidden = !on;
    if (on) {
      if (!panel.isConnected) document.body.append(css, panel, cur);
      try { pos = JSON.parse(localStorage.getItem(KEY + "pos") || "null"); } catch (e) {}
      const v = vv(); x = v.offsetLeft + v.width / 2; y = v.offsetTop + v.height / 3;
      layout(); hover();
    } else holdEnd();
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
    document.querySelectorAll("[data-tp-label]").forEach(b => { b.textContent = on ? "Esconder mouse virtual" : "Mouse virtual"; b.setAttribute("aria-pressed", on); });
  }
  if (window.visualViewport) { visualViewport.addEventListener("resize", layout); visualViewport.addEventListener("scroll", layout); }
  addEventListener("resize", layout);
  window.astralTouchpad = { toggle, get on() { return on; } };
  document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-tp-label]"); if (b) { e.preventDefault(); toggle(); } }, true);
  let saved = "0"; try { saved = localStorage.getItem(KEY) || "0"; } catch (e) {}
  if (saved === "1") toggle(true);
})();
