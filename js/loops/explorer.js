// js/loops/explorer.js
// Loop explorer: a modal that takes a diagram and lets the user add loops one at a time,
// anywhere. Right-click (or long-press) a vertex or a line and choose what to generate
// there; left-click selects it and shows the same choices under the diagram. Every
// option is computed on the spot from the Feynman rules (insert.js): the diagram is
// turned into a graph, the move is applied and every particle assignment the Standard
// Model vertices allow is listed. Choosing one lays the diagram out again and
// recomputes its renormalization (renorm.js). Everything is drawn as SVG inside a
// shadow root so the page's stylesheet and the explorer's cannot interfere.

import { FV } from './engine.js';
import { toEngineIds, loopSupported } from './symbols.js';
import CSS from './explorer-css.js';
import { PDG } from './pdg.js';
import { menuFor, chordLoops } from './insert.js';
import { renormReport } from './renorm.js';

export { loopSupported };

const FONT_URL = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap';
const MAXLOOPS = 4;
const OPT_PAGE = 24;
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(c => SUPD[+c]).join('');
const txt = h => String(h).replace(/<span class="ov">(.)<\/span>/g, '$1̄').replace(/<\/?(sub|sup|b|i|span|a)[^>]*>/g, '');
const procHTML = (a, b) => a.map(FV.labHTML).join(' ') + ' <span class="arrow">→</span> ' + b.map(FV.labHTML).join(' ');
const Dtxt = D => (Number.isInteger(D) ? String(D) : D.toFixed(1)).replace('-', '−');

const TEMPLATE = `
<div class="lx-backdrop" part="backdrop">
  <div class="lx-panel" role="dialog" aria-modal="true" aria-label="Loop explorer">
    <button type="button" class="lx-close" aria-label="Close">×</button>
    <div class="stagehead"><div id="title"></div><div id="tabs"></div></div>
    <div id="stage-body" class="stage" style="display:grid;gap:14px">
      <div id="pending" class="pending" hidden></div>
      <div id="canvas" class="canvas"><div id="svgwrap" class="svgwrap"></div><div id="tip" class="tip" role="tooltip"></div></div>
      <div class="loopbar">
        <div id="lcount" class="lcount"></div>
        <div class="lsel">
          <div id="hint" class="hint">Right-click (or long-press) any vertex or line to generate a loop there. A left-click selects it.</div>
          <div id="selmenu" class="selmenu"></div>
        </div>
        <div class="btns">
          <button type="button" id="undo" class="btn">Remove last loop</button>
          <button type="button" id="reset" class="btn">Back to start</button>
        </div>
        <label class="sel-l">Gauge <select id="gauge"><option value="unitary">Unitary (physical states)</option><option value="feynman">'t Hooft–Feynman (Goldstones, EW ghosts)</option></select></label>
        <label class="chk"><input type="checkbox" id="ctbox"> Show counterterm diagrams</label>
        <p id="capnote" class="capnote"></p>
      </div>
      <section id="choices" class="choices" hidden>
        <div class="chead"><h3 id="ctitle"></h3><button type="button" class="btn" id="cclose">Close</button></div>
        <p id="cnote" class="rn"></p>
        <div id="cgrid" class="cgrid"></div>
        <button type="button" class="btn" id="cmore" hidden></button>
      </section>
      <div id="stats" class="stats"></div>
      <div id="ctrow" class="ctrow" hidden></div>
    </div>
    <section id="reno" class="reno">
      <h2>Renormalization</h2>
      <div id="rbody" class="rgrid"></div>
    </section>
    <div id="ctx" class="ctx" role="menu" hidden></div>
  </div>
</div>`;

const EXTRA_CSS = `
.lx-backdrop { position: fixed; inset: 0; z-index: 2500; background: rgba(8, 20, 32, .55); display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 24px 12px; }
.lx-panel { position: relative; width: min(1100px, 100%); background: var(--bg); color: var(--ink); border-radius: 10px; padding: 22px 20px 28px; display: grid; gap: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.lx-close { position: absolute; top: 8px; right: 12px; border: 0; background: none; font-size: 26px; line-height: 1; cursor: pointer; color: var(--muted); }
.lx-close:hover { color: var(--ink); }
.stagehead { padding-right: 32px; }
.canvas { position: relative; background: var(--raise); border: 1px solid var(--rule); border-radius: 8px; }
.svgwrap svg { width: 100%; height: auto; display: block; }
.hit, .hit-v { cursor: context-menu; }
.hint { font-size: 12.5px; color: var(--muted); }
.selmenu { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.selmenu:empty { display: none; }
.selmenu .what { font: 14px var(--math); margin-right: 4px; }
.ctx { position: fixed; z-index: 3000; min-width: 230px; background: var(--raise); border: 1px solid var(--rule); border-radius: 8px; box-shadow: 0 14px 34px rgba(8,20,32,.28); padding: 6px; display: grid; gap: 2px; }
.ctx .ch { font: 600 11px var(--mono); letter-spacing: .06em; text-transform: uppercase; color: var(--muted); padding: 6px 8px 4px; }
.ctx button { text-align: left; border: 0; background: none; padding: 8px 10px; border-radius: 5px; cursor: pointer; font-size: 13.5px; }
.ctx button:hover, .ctx button:focus-visible { background: var(--accent-soft); }
.ctx button.primary { color: var(--accent); font-weight: 600; }
.ctx .sep { height: 1px; background: var(--rule); margin: 4px 2px; }
.pending { padding: 9px 12px; border-radius: 8px; background: var(--accent-soft); border: 1px solid var(--accent); font-size: 13px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.choices { border: 1px solid var(--rule); background: var(--surface); border-radius: 8px; padding: 12px 14px; display: grid; gap: 8px; }
.chead { display: flex; align-items: center; gap: 10px; justify-content: space-between; }
.chead h3 { font: 500 17px/1.25 var(--serif); }
.cgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 230px), 1fr)); gap: 10px; }
.opt { border: 1px solid var(--rule); background: var(--raise); border-radius: 8px; padding: 6px; cursor: pointer; text-align: left; display: grid; gap: 4px; min-width: 0; }
.opt:hover, .opt:focus-visible { border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft); }
.opt svg { width: 100%; height: auto; display: block; pointer-events: none; }
.opt .oc { font: 13px/1.3 var(--math); overflow-wrap: anywhere; }
.opt .om { font: 11px var(--mono); color: var(--muted); }
.ctf svg { pointer-events: none; }
.subs { margin: 6px 0 0 16px; padding: 0; display: grid; gap: 3px; font-size: 12.5px; }
.subs li.div { color: var(--warn); }
.ln.goldstone { stroke: var(--c-higgs); stroke-dasharray: 2.5 3.5 7 3.5; }
.ctx[hidden], .pending[hidden], .choices[hidden], .ctrow[hidden], #cmore[hidden] { display: none; }
.opt { grid-template-columns: minmax(0, 1fr); overflow: hidden; }
.opt svg.fd, .ctf svg.fd { min-width: 0; max-width: 100%; overflow: hidden; }
.ctf { overflow: hidden; }
`;

let hostEl = null;

/** Opens the explorer for `initial` -> `final` (site symbols). Returns false if unsupported. */
export function openLoopExplorer(initialSymbols, finalSymbols) {
    const ini = toEngineIds(initialSymbols), fin = toEngineIds(finalSymbols);
    if (!ini || !fin) return false;
    return openLoopExplorerIds(ini, fin);
}

/**
 * Same, with engine ids, optionally starting from a ready-made diagram.
 * opts.target = { v } | { e }: open the "generate loop here" menu on that element at once.
 */
export function openLoopExplorerIds(ini, fin, diagram = null, opts = {}) {
    const res = diagram
        ? { bases: [diagram], kind: diagram.kind || 'tree', reason: '' }
        : FV.generate(ini, fin);
    if (!res.bases.length) return false;

    ensureFonts();
    closeLoopExplorer();
    hostEl = document.createElement('div');
    hostEl.className = 'loop-explorer-host';
    const root = hostEl.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${CSS}${EXTRA_CSS}</style>${TEMPLATE}`;
    document.body.appendChild(hostEl);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const app = createApp(root, ini, fin, res, opts);
    const close = () => {
        document.removeEventListener('keydown', onKey, true);
        document.body.style.overflow = previousOverflow;
        hostEl?.remove(); hostEl = null;
    };
    const onKey = (e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        if (app.dismiss()) return;
        close();
    };
    document.addEventListener('keydown', onKey, true);
    root.querySelector('.lx-close').addEventListener('click', close);
    root.querySelector('.lx-backdrop').addEventListener('mousedown', (e) => { if (e.target.classList.contains('lx-backdrop')) close(); });
    hostEl._app = app;
    hostEl._close = close;
    return true;
}

export function closeLoopExplorer() { if (hostEl && hostEl._close) hostEl._close(); }

function ensureFonts() {
    if (typeof document === 'undefined' || document.getElementById('loop-explorer-fonts')) return;
    const link = document.createElement('link');
    link.id = 'loop-explorer-fonts'; link.rel = 'stylesheet'; link.href = FONT_URL;
    document.head.appendChild(link);
}

function targetName(d, t) {
    if (t.v) {
        const v = FV.vert(d, t.v), info = v && FV.vinfo(d, v);
        return info ? FV.vname(info.legs) + ' vertex' : 'vertex';
    }
    const e = FV.edgeOf(d, t.e);
    if (!e) return 'line';
    const A = FV.vert(d, e.a), B = FV.vert(d, e.b);
    if (A.kind === 'ext' || B.kind === 'ext') return 'external ' + FV.labHTML((A.kind === 'ext' ? A : B).pid) + ' leg';
    return FV.labHTML(FV.flowId(e.p)) + ' line' + (e.a === e.b ? ' (closed on itself)' : '');
}

function createApp(root, ini, fin, res, opts) {
    const $ = s => root.querySelector(s);
    const S = { ini, fin, res, bi: 0, hist: [], sel: null, pending: null, gauge: 'unitary', ct: false, choice: null, menuOpen: false };
    const cur = () => S.hist[S.hist.length - 1];
    const full = () => FV.countLoops(cur()) >= MAXLOOPS;

    function setBase(i) {
        S.bi = i;
        const b = FV.cloneDiag(S.res.bases[i]);
        if (b.verts.some(v => v.kind === 'v' && v.x === undefined)) FV.layoutDiag(b);
        S.hist = [b]; S.sel = null; S.pending = null; hideChoices(); refresh();
    }
    function refresh() {
        const d = cur();
        $('#title').innerHTML = procHTML(S.ini, S.fin);
        const bases = S.res.bases;
        if (bases.length <= 1) $('#tabs').innerHTML = '<span class="kind">' + (S.res.kind === 'induced' ? 'Loop-induced · no tree-level diagram' : (FV.countLoops(S.hist[0]) ? 'Starting diagram · ' + FV.countLoops(S.hist[0]) + '-loop' : 'Tree level')) + '</span>';
        else if (bases.length <= 6) $('#tabs').innerHTML = '<div class="seg" role="tablist">' + bases.map((b, i) => '<button type="button" role="tab" aria-selected="' + (i === S.bi) + '" class="' + (i === S.bi ? 'on' : '') + '" data-b="' + i + '">' + b.label + '</button>').join('') + '</div>';
        else $('#tabs').innerHTML = '<label class="sel-l">Diagram <select id="bsel">' + bases.map((b, i) => '<option value="' + i + '"' + (i === S.bi ? ' selected' : '') + '>' + txt(b.label) + '</option>').join('') + '</select></label>';
        drawSVG(); bar(); stats(d); renorm(d); pendingBanner();
    }
    function highlight() {
        const h = { verts: [], edges: [] };
        [S.sel, S.pending].forEach(t => { if (!t) return; if (t.v) h.verts.push(t.v); if (t.e) h.edges.push(t.e); });
        return h;
    }
    function drawSVG() {
        $('#svgwrap').innerHTML = FV.renderSVG(cur(), { highlight: highlight() });
        $('#svgwrap').setAttribute('aria-label', 'Feynman diagram for ' + txt(procHTML(S.ini, S.fin)));
    }
    function bar() {
        const L = FV.countLoops(cur());
        $('#lcount').innerHTML = '<span class="ln-n">' + L + '</span><span class="ln-t">loop' + (L === 1 ? '' : 's') + '</span>';
        $('#undo').disabled = S.hist.length < 2;
        $('#reset').disabled = S.hist.length < 2;
        $('#capnote').textContent = full() ? MAXLOOPS + ' loops is the limit for this viewer; remove one to add another.' : '';
        $('#gauge').value = S.gauge;
        const sm = $('#selmenu');
        if (!S.sel) { sm.innerHTML = ''; return; }
        const items = menuItems(S.sel);
        sm.innerHTML = '<span class="what">' + targetName(cur(), S.sel) + ':</span>' + items.map((it, i) => '<button type="button" class="btn' + (it.primary ? ' primary' : '') + '" data-mi="' + i + '"' + (it.disabled ? ' disabled' : '') + '>' + it.label + '</button>').join('');
        sm._items = items;
    }
    function pendingBanner() {
        const el = $('#pending');
        if (!S.pending) { el.hidden = true; el.innerHTML = ''; return; }
        el.hidden = false;
        el.innerHTML = '<span>New loop line starts at the highlighted ' + targetName(cur(), S.pending) + '. Right-click (or click) the point where it should end and choose “Close the loop line here”.</span><button type="button" class="btn" data-cancel>Cancel</button>';
    }
    function stats(d) {
        const o = FV.orderOf(d), parts = [];
        if (o.e) parts.push('e' + sup(o.e)); if (o.g) parts.push('g' + sup(o.g)); if (o.gs) parts.push('g<sub>s</sub>' + sup(o.gs));
        if (o.y) parts.push('(m<sub>f</sub>/v)' + sup(o.y)); if (o.lam) parts.push('λ' + sup(o.lam));
        const nv = d.verts.filter(v => v.kind === 'v' && !v.ct).length, ni = d.edges.filter(e => FV.isInternal(d, e)).length;
        const sym = d.symmetry || 1, nfl = (d.fermionLoops || 0) + (d.ghostLoops || 0);
        $('#stats').innerHTML = '<div><span>Couplings</span><b class="m">' + (parts.join(' ') || '—') + '</b></div><div><span>Vertices</span><b>' + nv + '</b></div><div><span>Internal lines</span><b>' + ni + '</b></div><div><span>Loops</span><b>' + FV.countLoops(d) + '</b></div>'
            + '<div><span>Symmetry factor</span><b>' + (sym === 1 ? '1' : '1/' + sym) + '</b></div><div><span>Loop sign</span><b>' + (nfl ? '(−1)' + (nfl > 1 ? sup(nfl) : '') : '+1') + '</b></div>';
    }

    // ---------------------------------------------------------------- menus
    function slotOf(t) { return t.v ? { v: t.v } : { e: t.e }; }
    function menuItems(t) {
        const d = cur(), items = [];
        if (full()) return [{ label: MAXLOOPS + '-loop limit reached', disabled: true }];
        if (S.pending) {
            const same = (S.pending.v && S.pending.v === t.v) || (S.pending.e && S.pending.e === t.e && !t.v);
            items.push({ label: same ? 'Close the loop line here (self-energy on this line)' : 'Close the loop line here', primary: true, run: () => chordLoops(d, S.pending, slotOf(t), { model: S.gauge }), title: 'New propagator between the two points' });
            items.push({ label: 'Cancel the loop line', cancel: true });
        }
        menuFor(d, t, { model: S.gauge }).forEach(m => items.push({ label: m.label, run: m.run, start: m.start, title: m.label }));
        return items;
    }
    function openMenu(t, x, y) {
        S.sel = t; drawSVG(); bar();
        const items = menuItems(t), ctx = $('#ctx');
        ctx.innerHTML = '<div class="ch">' + txt(targetName(cur(), t)) + '</div>' + items.map((it, i) => (it.cancel ? '<div class="sep"></div>' : '') + '<button type="button" role="menuitem" class="' + (it.primary ? 'primary' : '') + '" data-ci="' + i + '"' + (it.disabled ? ' disabled' : '') + '>' + it.label + '</button>').join('');
        ctx._items = items;
        ctx.hidden = false; S.menuOpen = true;
        const w = ctx.offsetWidth, h = ctx.offsetHeight;
        ctx.style.left = Math.max(8, Math.min(x, window.innerWidth - w - 8)) + 'px';
        ctx.style.top = Math.max(8, Math.min(y, window.innerHeight - h - 8)) + 'px';
        const first = ctx.querySelector('button:not([disabled])'); if (first) first.focus();
    }
    function closeMenu() { $('#ctx').hidden = true; S.menuOpen = false; }
    function runItem(it) {
        closeMenu();
        if (!it || it.disabled) return;
        if (it.cancel) { S.pending = null; refresh(); return; }
        if (it.start) { S.pending = it.start; S.sel = null; hideChoices(); refresh(); return; }
        const t0 = performance.now();
        $('#cnote').textContent = 'Working…';
        const r = it.run();
        if (it.primary) S.pending = null;
        showChoices(it.title || it.label, r, performance.now() - t0);
        refresh();
    }

    // ---------------------------------------------------------------- choices
    function hideChoices() { $('#choices').hidden = true; S.choice = null; }
    function showChoices(title, r, ms) {
        S.choice = { title, list: r.diagrams || [], shown: OPT_PAGE, r };
        $('#choices').hidden = false;
        const n = S.choice.list.length;
        $('#ctitle').innerHTML = txt(title) + ' — ' + n + ' diagram' + (n === 1 ? '' : 's');
        const notes = [];
        if (!n) notes.push(r.note || 'The Standard Model vertices allow no loop here.');
        else notes.push('Every particle assignment the vertex table allows, computed in ' + Math.max(1, Math.round(ms)) + ' ms' + (S.gauge === 'feynman' ? ' in the \'t Hooft–Feynman gauge' : ' in unitary gauge') + '. Click one to insert it.');
        if (r.rejected) notes.push(r.rejected + ' assignment' + (r.rejected === 1 ? '' : 's') + ' dropped (colour conservation, vanishing mixing).');
        if (r.vanished) notes.push(r.vanished + ' photon/Z/gluon tadpole' + (r.vanished === 1 ? '' : 's') + ' left out: they vanish.');
        if (r.truncated) notes.push('The search stopped at its time limit; the list may be incomplete.');
        $('#cnote').textContent = notes.join(' ');
        drawChoices();
        $('#choices').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function drawChoices() {
        const c = S.choice; if (!c) return;
        const list = c.list.slice(0, c.shown);
        $('#cgrid').innerHTML = list.map((nd, i) => {
            if (!nd._laid) { FV.layoutDiag(nd); nd._laid = true; }
            const shape = nd.shape || '';
            const content = String(nd.label).split(' · loops of ')[1] || '';
            const D = nd.loops.length ? Math.max(...nd.loops.map(L => L.D !== undefined ? L.D : -9)) : null;
            return '<button type="button" class="opt" data-oi="' + i + '" title="' + txt(nd.label) + '">' + FV.renderSVG(nd, { thumb: true }) + '<span class="oc">' + shape + (content ? ' · ' + content : '') + '</span><span class="om">' + (nd.symmetry > 1 ? 'S = 1/' + nd.symmetry + ' · ' : '') + (D !== null && D > -9 ? 'D = ' + Dtxt(D) : '') + '</span></button>';
        }).join('');
        const more = $('#cmore');
        more.hidden = c.list.length <= c.shown;
        more.textContent = 'Show ' + Math.min(OPT_PAGE, c.list.length - c.shown) + ' more (' + (c.list.length - c.shown) + ' hidden)';
    }
    function apply(nd) {
        if (full()) return;
        const d = FV.cloneDiag(nd);
        d.label = nd.label;
        if (!nd._laid) FV.layoutDiag(d);
        S.hist.push(d); S.sel = null; S.pending = null; hideChoices(); refresh();
    }

    // ---------------------------------------------------------------- renormalization
    function renorm(d) {
        const R = renormReport(d);
        const seen = {};
        const eg = R.ext.filter(x => { const k = x.pid + x.factor; if (seen[k]) { seen[k].n++; return false; } seen[k] = x; x.n = 1; return true; });
        let h = '<div class="rcard"><h3>External legs</h3><p class="rn">Each external line contributes the LSZ residue factor; self-energies on external legs are amputated and enter only through these.</p>' + eg.map(x => '<div class="ri"><div class="rh">' + x.label + (x.n > 1 ? ' ×' + x.n : '') + '<span class="rf m">' + x.factor + ' = 1 + ½δ</span></div>' + x.exprs.map(e => '<div class="re m">' + e + '</div>').join('') + '</div>').join('') + '</div>';
        h += '<div class="rcard"><h3>Loop pieces and counterterms</h3>';
        if (!R.blobs.length) h += '<p class="rn">Tree level: nothing to renormalize yet. Right-click a vertex or line to add a loop; its counterterm appears here.</p>';
        else h += '<p class="rn">Symmetry factor ' + (R.symmetry === 1 ? '1' : '1/' + R.symmetry) + (R.sign ? '; overall sign ' + R.sign : '') + '.</p>';
        R.blobs.forEach(b => {
            h += '<div class="ri"><div class="rh"><b>' + b.id + '</b> ' + b.title + (b.sector ? '<span class="tag ' + b.sector.toLowerCase() + '">' + b.sector + '</span>' : '') + '</div>'
                + '<div class="re"><span class="k">divergence</span> D = ' + Dtxt(b.D) + ' · ' + b.verdict + '</div>'
                + (b.loopFactor ? '<div class="re"><span class="k">loop factor</span> ' + b.loopFactor + '</div>' : '')
                + (b.rule ? '<div class="re"><span class="k">counterterm</span> <span class="m">' + b.rule + '</span></div>' : '')
                + (b.exprs || []).map(e => '<div class="re m">' + e + '</div>').join('')
                + (b.subs && b.subs.length ? '<div class="re"><span class="k">one-loop subdiagrams</span></div><ul class="subs">' + b.subs.map(s => '<li class="' + (s.divergent ? 'div' : '') + '">' + s.text + '</li>').join('') + '</ul>' : '')
                + (b.note ? '<div class="re note">' + b.note + '</div>' : '') + '</div>';
        });
        h += '</div>';
        h += '<div class="rcard"><h3>Conventions</h3><ul class="conv"><li>Δ<sub>UV</sub> = 1/ε − γ<sub>E</sub> + ln 4π in d = 4 − 2ε; Δ<sub>IR</sub> likewise.</li><li>Superficial degree of divergence D = 4 − B − 3F/2 − Σ[g] for each one-particle-irreducible piece (B, F = boson and fermion legs; [g] = mass dimension of each coupling, 1 for HHH, HWW, HZZ and the R<sub>ξ</sub> scalar couplings).</li><li>QED and QCD constants are written out in full. Electroweak ones are given as on-shell conditions, as in Denner (1993).</li>'
            + '<li>Inputs (' + PDG.edition + ', <a href="' + PDG.url + '" target="_blank" rel="noopener">pdg.lbl.gov</a>): α = 1/' + PDG.alphaInv + ', α<sub>s</sub>(M<sub>Z</sub>) = ' + PDG.alphaS.toFixed(4) + ', s<sub>W</sub>² = ' + PDG.sw2 + ' (MS-bar), G<sub>F</sub> = ' + PDG.GF.toExponential(7) + ' GeV⁻² so v = (√2G<sub>F</sub>)<sup>−1/2</sup> = ' + PDG.vev.toFixed(2) + ' GeV, M<sub>W</sub> = ' + PDG.MW + ' GeV, M<sub>Z</sub> = ' + PDG.MZ + ' GeV, M<sub>H</sub> = ' + PDG.MH + ' GeV, m<sub>t</sub> = ' + PDG.mt + ' GeV; quark masses MS-bar (u, d, s at 2 GeV; c, b at their own mass), CKM magnitudes from the PDG global fit. The on-shell s<sub>W</sub>² = 1 − M<sub>W</sub>²/M<sub>Z</sub>² = ' + (1 - PDG.MW * PDG.MW / PDG.MZ / PDG.MZ).toFixed(4) + ' differs from the MS-bar value at one loop.</li>'
            + '<li>' + (R.gauge === 'feynman' ? 'W and Z in \'t Hooft–Feynman gauge (ξ = 1): propagators −i g<sub>μν</sub>/(k² − M²), with Goldstone bosons (masses M<sub>W</sub>, M<sub>Z</sub>) and electroweak ghosts.' : 'W and Z lines in unitary gauge (physical states only; no Goldstones or electroweak ghosts).') + ' Gluons in Feynman gauge with QCD ghosts.</li><li>Fermion vertices follow D<sub>μ</sub> = ∂<sub>μ</sub> − i g A<sub>μ</sub>. Overall signs of gauge self-couplings are convention-dependent.</li><li>Photon and Z tadpoles vanish by Lorentz invariance, gluon tadpoles by colour; Higgs tadpoles are cancelled by the tadpole counterterm δt.</li></ul></div>';
        $('#rbody').innerHTML = h;
        counterterms(R);
    }
    function counterterms(R) {
        const row = $('#ctrow');
        const list = R.blobs.flatMap(b => b.ctDiagrams);
        if (!S.ct || !R.blobs.length) { row.hidden = true; row.innerHTML = ''; return; }
        row.hidden = false;
        let h = '<h3>Counterterm diagrams</h3><div class="ctgrid">';
        if (!list.length) h += '<figure class="ctf"><div class="ctn">No divergent loop piece with a tree-level counterpart: this diagram needs no counterterm diagram.</div></figure>';
        list.forEach(c => {
            FV.layoutDiag(c.diagram);
            h += '<figure class="ctf">' + FV.renderSVG(c.diagram, { thumb: true }) + '<figcaption>' + c.caption + '</figcaption></figure>';
        });
        row.innerHTML = h + '</div>';
    }

    // ---------------------------------------------------------------- tooltips and events
    function showTip(html, ev) {
        const tip = $('#tip'), box = $('#canvas').getBoundingClientRect();
        tip.innerHTML = html; tip.classList.add('on');
        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = ev.clientX - box.left + 16, y = ev.clientY - box.top + 16;
        if (x + w > box.width - 8) x = ev.clientX - box.left - w - 16;
        if (y + h > box.height - 8) y = ev.clientY - box.top - h - 16;
        tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
    }
    const hideTip = () => $('#tip').classList.remove('on');
    const targetOf = (ev) => { const t = ev.target.closest && ev.target.closest('[data-v],[data-e]'); return t ? (t.dataset.v ? { v: t.dataset.v } : { e: t.dataset.e }) : null; };

    const wrap = $('#svgwrap');
    wrap.addEventListener('pointermove', ev => {
        if (S.menuOpen) return;
        const t = ev.target.closest && ev.target.closest('[data-v],[data-e]');
        if (!t) { hideTip(); return; }
        showTip(t.dataset.v ? FV.tipVertex(cur(), t.dataset.v) : FV.tipEdge(cur(), t.dataset.e), ev);
    });
    wrap.addEventListener('pointerleave', hideTip);
    wrap.addEventListener('contextmenu', ev => {
        const t = targetOf(ev);
        if (!t) return;
        ev.preventDefault(); hideTip();
        openMenu(t, ev.clientX, ev.clientY);
    });
    let press = null;
    wrap.addEventListener('pointerdown', ev => {
        if (ev.pointerType !== 'touch') return;
        const t = targetOf(ev);
        if (!t) return;
        press = setTimeout(() => { press = null; openMenu(t, ev.clientX, ev.clientY); }, 520);
    });
    ['pointerup', 'pointercancel', 'pointermove'].forEach(k => wrap.addEventListener(k, () => { if (press) { clearTimeout(press); press = null; } }));
    wrap.addEventListener('click', ev => {
        const t = targetOf(ev);
        if (!t) { S.sel = null; drawSVG(); bar(); return; }
        S.sel = t; drawSVG(); bar();
    });
    $('#ctx').addEventListener('click', ev => { const b = ev.target.closest('[data-ci]'); if (b) runItem($('#ctx')._items[+b.dataset.ci]); });
    root.addEventListener('mousedown', ev => { if (S.menuOpen && !ev.target.closest('.ctx')) closeMenu(); });
    $('#selmenu').addEventListener('click', ev => { const b = ev.target.closest('[data-mi]'); if (b) runItem($('#selmenu')._items[+b.dataset.mi]); });
    $('#pending').addEventListener('click', ev => { if (ev.target.closest('[data-cancel]')) { S.pending = null; refresh(); } });
    $('#cgrid').addEventListener('click', ev => { const b = ev.target.closest('[data-oi]'); if (b && S.choice) apply(S.choice.list[+b.dataset.oi]); });
    $('#cmore').addEventListener('click', () => { if (S.choice) { S.choice.shown += OPT_PAGE; drawChoices(); } });
    $('#cclose').addEventListener('click', hideChoices);
    $('#tabs').addEventListener('click', ev => { const b = ev.target.closest('[data-b]'); if (b) setBase(+b.dataset.b); });
    $('#tabs').addEventListener('change', ev => { if (ev.target.id === 'bsel') setBase(+ev.target.value); });
    $('#undo').addEventListener('click', () => { if (S.hist.length > 1) { S.hist.pop(); S.sel = null; S.pending = null; hideChoices(); refresh(); } });
    $('#reset').addEventListener('click', () => { S.hist = S.hist.slice(0, 1); S.sel = null; S.pending = null; hideChoices(); refresh(); });
    $('#ctbox').addEventListener('change', () => { S.ct = $('#ctbox').checked; renorm(cur()); });
    $('#gauge').addEventListener('change', () => { S.gauge = $('#gauge').value; hideChoices(); bar(); });

    setBase(0);
    if (opts.gauge) S.gauge = opts.gauge;
    if (opts.target) {
        // open the menu on the element the user right-clicked in the results list
        requestAnimationFrame(() => {
            const sel = opts.target.v ? '[data-v="' + opts.target.v + '"]' : '[data-e="' + opts.target.e + '"]';
            const el = root.querySelector(sel), r = el ? el.getBoundingClientRect() : { left: 100, top: 100, width: 0, height: 0 };
            openMenu(opts.target, r.left + r.width / 2, r.top + r.height / 2);
        });
    }
    return {
        state: S, refresh, setBase,
        dismiss: () => { if (S.menuOpen) { closeMenu(); return true; } if (S.pending) { S.pending = null; refresh(); return true; } return false; }
    };
}
