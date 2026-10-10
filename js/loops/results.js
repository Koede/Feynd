// js/loops/results.js
// Everything the page shows after a search, drawn as SVG inside one shadow root so the
// diagram styles never touch the host page:
//   the selection-rules panel, tree / quark-level diagrams, one-loop diagrams grouped by
//   topology, extended-state diagrams, and discovery results grouped by final state.
// Cards render lazily when they scroll into view; hovering a vertex or line shows its
// Feynman rule; in colour mode each card switches between the coloured diagram and the
// colour-flow (double-line) diagram.

import { FV } from './engine.js';
import CSS from './explorer-css.js';
import { openLoopExplorerIds } from './explorer.js';
import { braceOverlay } from './hadronq.js';
import { colourSetup, colourEdgeStyle, colourFlowSVG, colourVertexNote, extColour, HUE, ANTIHUE, LETTER, ANTILETTER } from './color.js';
import { citeHTML } from './cite.js';

const CARD_CSS = `
:host { display: block; background: transparent; font: 14px/1.5 var(--sans); color: var(--ink); }
a { color: var(--accent); }
.sec { margin: 18px 0 8px; }
.sec > h3 { font: 600 19px/1.25 var(--sans); margin: 0 0 4px; }
.sec > p.lede { color: var(--muted); font-size: 13px; margin: 0 0 10px; max-width: 75ch; }
.proc { font: 400 22px/1.3 var(--math); margin: 6px 0 10px; }
.proc .arrow, .arrow { color: var(--muted); padding: 0 3px; }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 330px), 1fr)); gap: 14px; }
.lcard { position: relative; background: rgba(255,255,255,.78); border: 1px dashed rgba(27,34,28,.22); border-radius: 14px; padding: 10px 12px 10px; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.lcard:hover { border-color: rgba(31,94,142,.5); }
.lch { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font: 15px/1.3 var(--math); }
.lch .ttl { min-width: 0; overflow-wrap: anywhere; }
.chips { margin-left: auto; display: flex; flex-wrap: wrap; gap: 4px; }
.chip { font: 600 10px/1 var(--sans); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--rule); border-radius: 999px; padding: 3px 7px; background: #fff; }
.chip.ord { text-transform: none; letter-spacing: 0; font: 500 12px/1 var(--math); color: var(--ink); }
.chip.qed { color: #b45309; border-color: #e8c9a6; } .chip.qcd { color: #1f7a45; border-color: #b9dcc7; } .chip.ew { color: #8e44ad; border-color: #dcc6e6; } .chip.higgs { color: #4d5964; }
.svgbox { min-height: 150px; border-radius: 10px; background: #fffdf8; }
.svgbox .fd { min-width: 0; width: 100%; height: auto; display: block; }
.vtabs { display: inline-flex; border: 1px solid var(--rule); border-radius: 999px; overflow: hidden; align-self: flex-start; }
.vtabs button { border: 0; background: transparent; padding: 3px 10px; font: 12px var(--sans); cursor: pointer; color: var(--muted); }
.vtabs button.on { background: var(--ink); color: #fff; }
details.notes { font-size: 12.5px; color: var(--ink); }
details.notes summary { cursor: pointer; color: var(--accent); font-weight: 600; list-style: none; }
details.notes summary::-webkit-details-marker { display: none; }
details.notes summary::before { content: '▸ '; }
details.notes[open] summary::before { content: '▾ '; }
details.notes ul { margin: 6px 0 0; padding-left: 16px; display: grid; gap: 6px; }
details.notes li b { font-weight: 600; }
.cite { display: block; color: var(--muted); font-size: 11.5px; margin-top: 2px; }
.acts { display: flex; flex-wrap: wrap; gap: 6px; }
.btn { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 4px 11px; cursor: pointer; font: 12px var(--sans); color: var(--ink); }
.btn:hover { border-color: var(--accent); }
.btn.primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.more { margin-top: 10px; }
.note { padding: 10px 12px; border: 1px dashed var(--rule); border-radius: 10px; color: var(--muted); font-size: 13px; background: rgba(255,255,255,.6); }
.rules { border: 1px dashed rgba(27,34,28,.22); border-radius: 14px; background: rgba(255,255,255,.7); padding: 8px 12px; }
.rules summary { cursor: pointer; font-weight: 600; list-style: none; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rules summary::-webkit-details-marker { display: none; }
.verdict { font: 700 11px/1 var(--sans); letter-spacing: .06em; text-transform: uppercase; padding: 4px 8px; border-radius: 999px; }
.verdict.ok { background: #e3f3e8; color: #1f7a45; } .verdict.no { background: #fde4e1; color: #a1281b; }
.rl { list-style: none; margin: 8px 0 2px; padding: 0; display: grid; gap: 6px; }
.rl li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 2px 6px; font-size: 13px; }
.rl .st { font-weight: 700; text-align: center; }
.rl .pass .st { color: #1f7a45; } .rl .fail .st { color: #b3261e; } .rl .note .st { color: #1f5e8e; } .rl .skip .st { color: #8b969e; }
.rl .fail { background: #fff3f1; border-radius: 8px; padding: 4px 0; }
.rl .nm { font-weight: 600; } .rl .dt { color: #3d4850; }
.filters { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; }
.fchip { border: 1px solid var(--rule); background: #fff; border-radius: 999px; padding: 3px 10px; font: 12px var(--sans); cursor: pointer; color: var(--muted); }
.fchip.on { background: var(--accent); border-color: var(--accent); color: #fff; }
details.grp { border: 1px dashed rgba(27,34,28,.2); border-radius: 12px; background: rgba(255,255,255,.55); margin: 8px 0; }
details.grp > summary { cursor: pointer; padding: 8px 12px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; list-style: none; font: 16px/1.3 var(--math); }
details.grp > summary::-webkit-details-marker { display: none; }
details.grp > summary::before { content: '▸'; color: var(--muted); font-family: var(--sans); }
details.grp[open] > summary::before { content: '▾'; }
details.grp > summary .cnt { margin-left: auto; font: 600 12px var(--sans); color: var(--muted); }
details.grp > .body { padding: 4px 12px 12px; }
.summary { font-size: 13px; color: var(--muted); margin: 4px 0 8px; }
.summary b { color: var(--ink); }
.progress { display: grid; gap: 8px; padding: 14px; border: 1px dashed var(--rule); border-radius: 14px; background: rgba(255,255,255,.7); }
.bar { height: 6px; border-radius: 3px; background: #e6e9e2; overflow: hidden; }
.bar i { display: block; height: 100%; background: var(--accent); width: 0; transition: width .2s; }
.bar.indet i { width: 30%; animation: slide 1.1s linear infinite; }
@keyframes slide { from { margin-left: -30%; } to { margin-left: 100%; } }
@media (prefers-reduced-motion: reduce) { .bar.indet i { animation: none; width: 100%; opacity: .4; } }
.toast { position: fixed; bottom: 18px; left: 50%; transform: translateX(-50%); background: #1b221c; color: #fff; padding: 6px 14px; border-radius: 999px; font-size: 13px; z-index: 3000; }
.tip { position: fixed; z-index: 2000; }
.modal { position: fixed; inset: 0; z-index: 1500; background: rgba(8, 20, 32, .55); display: flex; align-items: flex-start; justify-content: center; padding: 24px 12px; overflow-y: auto; }
.modal-panel { position: relative; width: min(1040px, 100%); background: #fffdf8; border-radius: 14px; padding: 16px 18px 18px; display: grid; gap: 10px; }
.modal-panel .fd { min-width: 0; width: 100%; height: auto; }
.modal-close { position: absolute; top: 6px; right: 10px; border: 0; background: none; font-size: 26px; cursor: pointer; color: var(--muted); }
.mt { font: 18px/1.3 var(--math); padding-right: 30px; }
.two { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); gap: 12px; }
.two figure { margin: 0; } .two figcaption { font-size: 12px; color: var(--muted); }
`;

let sheet = null;
function styleInto(root) {
    try {
        if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(CSS + CARD_CSS); }
        root.adoptedStyleSheets = [sheet];
    } catch (e) {
        if (!root.querySelector('style[data-fd]')) { const st = document.createElement('style'); st.dataset.fd = '1'; st.textContent = CSS + CARD_CSS; root.prepend(st); }
    }
}

const procHTML = (a, b) => a.map(FV.labHTML).join(' ') + ' <span class="arrow">→</span> ' + b.map(FV.labHTML).join(' ');
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const symProc = (a, b) => esc(a.join(' ')) + ' <span class="arrow">→</span> ' + esc(b.join(' '));

// --------------------------------------------------------------- drawing one item

function ensureLayout(d) {
    if (d.verts.some(v => v.x === undefined || v.y === undefined)) {
        const L = d.loops && d.loops[d.loops.length - 1];
        const cr = FV.layoutDiag(d);
        if (L && L.type === 'box' && L.crossed === undefined) L.crossed = cr > 0;
    }
}

function extTagFor(d, st, sol) {
    return (v) => {
        const c = extColour(d, st, sol, v.id, v.side === 'in');
        if (!c) return '';
        if (c.q) {
            const anti = FV.P[v.pid] && FV.P[v.pid].isAnti;
            return '<tspan dx="2" font-size="0.75em" font-style="normal" font-weight="700" fill="' + (anti ? ANTIHUE[c.q] : HUE[c.q]) + '">' + (anti ? ANTILETTER[c.q] : LETTER[c.q]) + '</tspan>';
        }
        return '<tspan dx="2" font-size="0.75em" font-style="normal" font-weight="700" fill="' + HUE[c.c] + '">' + LETTER[c.c] + '</tspan><tspan font-size="0.75em" font-style="normal" font-weight="700" fill="' + ANTIHUE[c.a] + '">' + ANTILETTER[c.a] + '</tspan>';
    };
}

/** mode: 'plain' | 'colour' | 'flow' */
function svgFor(item, mode) {
    item._svg = item._svg || {};
    if (item._svg[mode]) return item._svg[mode];
    const d = item.diagram;
    ensureLayout(d);
    const coloured = mode !== 'plain' && d.colour && d.colour.sol;
    const overlay = d.hadronMeta ? (dd) => braceOverlay(dd, !!coloured) : null;
    let svg;
    if (!coloured) svg = FV.renderSVG(d, { overlay });
    else {
        const st = colourSetup(d);
        svg = mode === 'colour'
            ? FV.renderSVG(d, { overlay, edgeStyle: colourEdgeStyle(d, st, d.colour.sol), extTag: extTagFor(d, st, d.colour.sol) })
            : colourFlowSVG(d, st, d.colour.sol, { overlay });
    }
    item._svg[mode] = svg;
    return svg;
}

function notesHTML(notes, open) {
    if (!notes || !notes.length) return '';
    return '<details class="notes"' + (open ? ' open' : '') + '><summary>Notes (' + notes.length + ')</summary><ul>'
        + notes.map(n => '<li><b>' + n.title + '.</b> ' + n.text + (n.cite ? '<span class="cite">' + citeHTML(n.cite) + '</span>' : '') + '</li>').join('') + '</ul></details>';
}

function chipsHTML(item) {
    const inter = (item.interactions || []).map(g => '<span class="chip ' + g.toLowerCase() + '">' + ({ EW: 'weak', QED: 'QED', QCD: 'QCD', Higgs: 'Higgs' }[g] || g) + '</span>').join('');
    const nl = item.diagram ? FV.countLoops(item.diagram) : 0;
    const loops = nl ? '<span class="chip">' + nl + '-loop</span>' : '';
    const sym = item.diagram && item.diagram.symmetry > 1 ? '<span class="chip" title="symmetry factor">S = 1/' + item.diagram.symmetry + '</span>' : '';
    const gauge = item.diagram && item.diagram.gauge === 'feynman' ? '<span class="chip" title="\'t Hooft–Feynman gauge">R<sub>ξ</sub></span>' : '';
    const extra = item.extra ? '<span class="chip">extra ' + (item.side === 'both' ? 'in + out' : item.side) + ': ' + item.extra + '</span>' : '';
    return '<span class="chips">' + (item.order ? '<span class="chip ord" title="coupling order">' + item.order + '</span>' : '') + inter + loops + sym + gauge + extra + '</span>';
}

function cardHTML(item, sec, idx, view) {
    const coloured = view.colourMode && item.diagram.colour && item.diagram.colour.sol;
    const head = item.kind === 'extended' ? procHTML(item.ini, item.fin) : (item.title || '');
    return '<figure class="lcard" data-sec="' + sec + '" data-i="' + idx + '">'
        + '<div class="lch"><span class="ttl">' + head + '</span>' + chipsHTML(item) + '</div>'
        + (coloured ? '<div class="vtabs" role="tablist"><button type="button" class="on" data-view="colour">Diagram</button><button type="button" data-view="flow">Colour flow</button></div>' : '')
        + '<div class="svgbox" data-mode="' + (coloured ? 'colour' : 'plain') + '"></div>'
        + notesHTML(item.notes, false)
        + '<div class="acts">' + (item.noLoops ? '' : '<button type="button" class="btn" data-act="loops" title="Open this diagram in the loop explorer. Tip: right-click any vertex or line of the diagram to generate a loop exactly there.">Add loops</button>')
        + '<button type="button" class="btn" data-act="open">Enlarge</button><button type="button" class="btn" data-act="copy" title="Copy the SVG markup">Copy SVG</button></div>'
        + '</figure>';
}

// ------------------------------------------------------------------- tooltips

function wireTips(root, itemOf, view) {
    if (!root.querySelector('.tip')) { const t = document.createElement('div'); t.className = 'tip'; t.setAttribute('role', 'tooltip'); root.appendChild(t); }
    root._itemOf = itemOf; root._view = view;
    if (root._tipsWired) return;
    root._tipsWired = true;
    const tipEl = () => root.querySelector('.tip');
    const hide = () => { const t = tipEl(); if (t) t.classList.remove('on'); };
    const over = (ev) => {
        const tip = tipEl();
        const t = ev.target.closest && ev.target.closest('[data-v],[data-e]');
        const it = t && root._itemOf(t);
        if (!tip || !t || !it) { hide(); return; }
        const d = it.diagram;
        let html = '';
        try {
            const e = t.dataset.e && d.edges.find(x => x.id === t.dataset.e);
            if (e && e.spectator) html = '<div class="t-h">' + FV.labHTML(e.p) + ' <span class="chip">spectator</span></div><div class="t-n">Passes through unchanged and stays bound in the hadron.</div>';
            else html = t.dataset.v ? FV.tipVertex(d, t.dataset.v) : FV.tipEdge(d, t.dataset.e);
            const box = t.closest('.svgbox');
            if (t.dataset.v && d.colour && d.colour.sol && box && box.dataset.mode !== 'plain') html += colourVertexNote(d, colourSetup(d), d.colour.sol, t.dataset.v);
        } catch (err) { html = ''; }
        if (!html) { hide(); return; }
        tip.innerHTML = html; tip.classList.add('on');
        const w = tip.offsetWidth, h = tip.offsetHeight;
        let x = ev.clientX + 16, y = ev.clientY + 16;
        if (x + w > window.innerWidth - 8) x = ev.clientX - w - 16;
        if (y + h > window.innerHeight - 8) y = ev.clientY - h - 16;
        tip.style.left = Math.max(8, x) + 'px'; tip.style.top = Math.max(8, y) + 'px';
    };
    root.addEventListener('pointermove', over);
    root.addEventListener('pointerdown', over);
    root.addEventListener('pointerleave', hide);
}

function toast(root, text) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = text;
    root.appendChild(t);
    setTimeout(() => t.remove(), 1600);
}

function copyText(root, text) {
    const done = () => toast(root, 'SVG copied');
    try {
        navigator.clipboard.writeText(text).then(done, () => fallbackCopy(root, text));
    } catch (e) { fallbackCopy(root, text); }
}
function fallbackCopy(root, text) {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.top = '-1000px';
    root.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(root, 'SVG copied'); } catch (e) { toast(root, 'Select the text and copy it'); }
    setTimeout(() => ta.remove(), 2000);
}

/** Full-size view: both colour views side by side in colour mode, plus every note. */
export function openDiagramModal(titleHTML, item, view = {}) {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = host.attachShadow({ mode: 'open' });
    styleInto(root);
    const coloured = view.colourMode && item.diagram.colour && item.diagram.colour.sol;
    const body = coloured
        ? '<div class="two"><figure><div class="svgbox" data-mode="colour">' + svgFor(item, 'colour') + '</div><figcaption>Coloured diagram: quarks in their colour, antiquarks in the anticolour, gluons in both.</figcaption></figure>'
          + '<figure><div class="svgbox" data-mode="flow">' + svgFor(item, 'flow') + '</div><figcaption>Colour flow (’t Hooft double-line notation).</figcaption></figure></div>'
        : '<div class="svgbox" data-mode="plain">' + svgFor(item, 'plain') + '</div>';
    root.innerHTML = '<div class="modal"><div class="modal-panel" role="dialog" aria-modal="true"><button type="button" class="modal-close" aria-label="Close">×</button><div class="mt">' + titleHTML + '</div>' + body + notesHTML(item.notes, true) + '</div></div>';
    wireTips(root, () => item, view);
    wireContext(root, () => item);
    const close = () => { document.removeEventListener('keydown', onKey, true); host.remove(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    document.addEventListener('keydown', onKey, true);
    root.querySelector('.modal-close').addEventListener('click', close);
    root.querySelector('.modal').addEventListener('mousedown', (e) => { if (e.target.classList.contains('modal')) close(); });
}

/** A single diagram in its own shadow root (kept for other callers). */
export function mountDiagram(host, svg, diagram) {
    const root = host.shadowRoot || host.attachShadow({ mode: 'open' });
    styleInto(root);
    root.innerHTML = '<div class="svgbox">' + svg + '</div>';
    wireTips(root, () => ({ diagram }), {});
    return root;
}

// ------------------------------------------------------------------ the page

// Right-click (or long-press) a vertex or line of a card: open the loop explorer with the
// "generate loop here" menu on that element.
function wireContext(root, itemOf) {
    root._ctxItemOf = itemOf;
    if (root._ctxWired) return;
    root._ctxWired = true;
    const open = (ev, t) => {
        const it = root._ctxItemOf(t);
        if (!it || it.noLoops || !it.ini || !it.fin) return false;
        ensureLayout(it.diagram);
        openLoopExplorerIds(it.ini, it.fin, it.diagram, { target: t.dataset.v ? { v: t.dataset.v } : { e: t.dataset.e }, gauge: it.diagram.gauge });
        return true;
    };
    root.addEventListener('contextmenu', (ev) => {
        const t = ev.target.closest && ev.target.closest('.svgbox [data-v], .svgbox [data-e]');
        if (t && open(ev, t)) ev.preventDefault();
    });
    let press = null;
    root.addEventListener('pointerdown', (ev) => {
        if (ev.pointerType !== 'touch') return;
        const t = ev.target.closest && ev.target.closest('.svgbox [data-v], .svgbox [data-e]');
        if (!t) return;
        press = setTimeout(() => { press = null; open(ev, t); }, 600);
    });
    ['pointerup', 'pointercancel', 'pointermove'].forEach(k => root.addEventListener(k, () => { if (press) { clearTimeout(press); press = null; } }));
}

// ShadowRoot has no onclick property, so swap a single listener instead
function onClick(root, fn) {
    if (root._click) root.removeEventListener('click', root._click);
    root._click = fn;
    root.addEventListener('click', fn);
}

function rootOf(container) {
    const root = container.shadowRoot || container.attachShadow({ mode: 'open' });
    styleInto(root);
    return root;
}

function rulesHTML(rules, open) {
    if (!rules) return '';
    const icon = { pass: '✓', fail: '✗', note: 'i', skip: '–' };
    const shown = rules.checks;
    const fails = shown.filter(c => c.status === 'fail').length, notes = shown.filter(c => c.status === 'note').length;
    return '<details class="rules"' + (open || fails ? ' open' : '') + '><summary><span class="verdict ' + (rules.allowed ? 'ok">Allowed' : 'no">Forbidden') + '</span> Selection rules: '
        + shown.filter(c => c.status === 'pass').length + ' satisfied' + (fails ? ', ' + fails + ' violated' : '') + (notes ? ', ' + notes + ' note' + (notes > 1 ? 's' : '') : '') + '</summary><ul class="rl">'
        + shown.map(c => '<li class="' + c.status + '"><span class="st">' + icon[c.status] + '</span><span><span class="nm">' + c.name + '</span> <span class="dt">' + c.detail + '</span>' + (c.cite ? '<span class="cite">' + citeHTML(c.cite) + '</span>' : '') + '</span></li>').join('') + '</ul></details>';
}

const PAGE = 24;

/**
 * The results of a named process. `data` comes from buildRuleDiagrams;
 * view: { colourMode }.
 */
export function renderLoopResults(container, data, view = {}) {
    const root = rootOf(container);
    if (!data) { root.innerHTML = ''; return; }
    view = Object.assign({ colourMode: !!data.colourMode }, view);
    const lists = { tree: data.tree || [], loops: data.loops || [], extended: data.extended || [] };
    const state = { shown: {}, filter: {}, observer: null };

    const filterOf = (sec) => state.filter[sec] || null;
    const visible = (sec, items) => { const f = filterOf(sec); return f ? items.filter(it => (it.interactions || []).includes(f)) : items; };

    const sectionCards = (sec, items, key) => {
        const n = state.shown[key] || PAGE;
        const list = items.slice(0, n);
        let h = '<div class="cards">' + list.map(it => cardHTML(it, sec, lists[sec].indexOf(it), view)).join('') + '</div>';
        if (items.length > n) h += '<button type="button" class="btn more" data-more="' + key + '">Show ' + Math.min(PAGE, items.length - n) + ' more (' + (items.length - n) + ' hidden)</button>';
        return h;
    };
    const filtersHTML = (sec, items) => {
        const kinds = [...new Set(items.flatMap(it => it.interactions || []))];
        if (kinds.length < 2 || items.length < 2) return '';
        const f = filterOf(sec);
        return '<div class="filters"><button type="button" class="fchip' + (!f ? ' on' : '') + '" data-filter="' + sec + '" data-v="">All</button>'
            + kinds.map(k => '<button type="button" class="fchip' + (f === k ? ' on' : '') + '" data-filter="' + sec + '" data-v="' + k + '">' + ({ EW: 'Weak', QED: 'QED', QCD: 'QCD', Higgs: 'Higgs' }[k] || k) + ' (' + items.filter(it => (it.interactions || []).includes(k)).length + ')</button>').join('') + '</div>';
    };

    const draw = () => {
        let h = '<div class="proc">' + symProc(data.initial || [], data.final || []) + '</div>' + rulesHTML(data.rules);
        if (lists.tree.length) {
            const n = lists.tree.length;
            h += '<section class="sec"><h3>' + (data.treeHeading || 'Tree-level diagrams') + '</h3><p class="lede">' + (data.treeLede || (n + ' diagram' + (n === 1 ? '' : 's') + ' built from the Standard Model vertices' + (data.treeDropped ? ' (' + data.treeDropped + ' more vanish by colour conservation)' : '') + '.')) + ' Hover a vertex or line for its Feynman rule.' + (data.sectionNotes && data.sectionNotes.length && n > 1 ? ' ' + data.sectionNotes.map(s => s.text).join(' ') : '') + '</p>'
                + filtersHTML('tree', lists.tree) + sectionCards('tree', visible('tree', lists.tree), 'tree') + '</section>';
        } else if (data.treeNote) h += '<section class="sec"><h3>' + (data.hadronic ? 'Quark-level diagram' : 'Tree-level diagrams') + '</h3><div class="note">' + data.treeNote + '</div></section>';
        if (lists.loops.length) {
            const groups = {};
            lists.loops.forEach(it => { (groups[it.group] = groups[it.group] || []).push(it); });
            const last = g => /External|Tadpole/.test(g) ? 2 : /reducible/.test(g) ? 1 : 0;
            const ordered = Object.entries(groups).sort((a, b) => last(a[0]) - last(b[0]) || (a[1][0].npoint || 0) - (b[1][0].npoint || 0) || (/non-planar/.test(a[0]) ? 1 : 0) - (/non-planar/.test(b[0]) ? 1 : 0));
            const L = data.loopOrder || 1, word = ['', 'One', 'Two', 'Three'][L] || L;
            const parts = [];
            parts.push(lists.loops.length + ' ' + word.toLowerCase() + '-loop diagram' + (lists.loops.length === 1 ? '' : 's') + (lists.tree.length ? (L === 1 ? ', every first-order correction to the process' : ', every correction at this order') : '; the process starts at one loop'));
            parts.push('built from ' + (data.loopTopologies || 'all') + ' graph topologies and every particle assignment the vertex table allows, ' + (data.gauge === 'feynman' ? 'in ’t Hooft–Feynman gauge (Goldstone bosons and electroweak ghosts included)' : 'in unitary gauge'));
            parts.push(data.loopTadpoles ? 'Higgs tadpoles are included (photon, Z and gluon tadpoles vanish)' : 'tadpoles are left out (they are cancelled by the tadpole counterterm)');
            parts.push(data.loopExternalShown ? 'self-energies on external legs are included' : 'self-energies on external legs are left out because the S-matrix amputates them');
            if (data.loopDropped) parts.push(data.loopDropped + ' more vanish by colour conservation');
            if (data.loopTruncated) parts.push('<b>the list stopped at the time or size limit</b>');
            h += '<section class="sec"><h3>' + word + '-loop diagrams</h3><p class="lede">' + parts.join('; ') + '. Right-click any vertex or line of a diagram to generate a further loop exactly there.</p>'
                + filtersHTML('loops', lists.loops)
                + ordered.map(([g, items], gi) => {
                    const vis = visible('loops', items);
                    if (!vis.length) return '';
                    return '<details class="grp"' + (gi === 0 ? ' open' : '') + ' data-grp="loops:' + esc(g) + '"><summary>' + esc(g) + '<span class="cnt">' + vis.length + '</span></summary><div class="body">' + sectionCards('loops', vis, 'loops:' + g) + '</div></details>';
                }).join('') + '</section>';
        } else if (data.loopNote) h += '<section class="sec"><h3>' + (['', 'One', 'Two', 'Three'][data.loopOrder || 1]) + '-loop diagrams</h3><div class="note">' + data.loopNote + '</div></section>';
        if (lists.extended.length) {
            h += '<section class="sec"><h3>With additional external particles</h3><p class="lede">Nothing connects the particles as given. These diagrams do, with the added legs highlighted; each one passed the same selection rules.</p>' + sectionCards('extended', lists.extended, 'extended') + '</section>';
        }
        root.innerHTML = h;
        lazy();
        wireTips(root, el => itemOf(el), view);
        wireContext(root, el => itemOf(el));
    };
    const itemOf = (el) => { const c = el.closest && el.closest('.lcard'); return c ? lists[c.dataset.sec][+c.dataset.i] : null; };
    const lazy = () => {
        if (state.observer) state.observer.disconnect();
        const fill = (box) => { if (box.dataset.done) return; const it = itemOf(box); if (!it) return; box.innerHTML = svgFor(it, box.dataset.mode); box.dataset.done = '1'; };
        if (typeof IntersectionObserver === 'undefined') { root.querySelectorAll('.svgbox').forEach(fill); return; }
        state.observer = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { state.observer.unobserve(e.target); fill(e.target); } }), { rootMargin: '300px' });
        root.querySelectorAll('.svgbox').forEach(b => state.observer.observe(b));
    };
    onClick(root, (ev) => {
        const t = ev.target;
        const more = t.closest && t.closest('[data-more]');
        if (more) { state.shown[more.dataset.more] = (state.shown[more.dataset.more] || PAGE) + PAGE; draw(); return; }
        const f = t.closest && t.closest('[data-filter]');
        if (f) { state.filter[f.dataset.filter] = f.dataset.v || null; draw(); return; }
        const vt = t.closest && t.closest('.vtabs button');
        if (vt) {
            const card = vt.closest('.lcard'), it = itemOf(card), box = card.querySelector('.svgbox');
            card.querySelectorAll('.vtabs button').forEach(b => b.classList.toggle('on', b === vt));
            box.dataset.mode = vt.dataset.view; box.innerHTML = svgFor(it, vt.dataset.view); box.dataset.done = '1';
            return;
        }
        const act = t.closest && t.closest('[data-act]');
        const it = itemOf(t);
        if (act && it) {
            ensureLayout(it.diagram);
            if (act.dataset.act === 'loops') openLoopExplorerIds(it.ini, it.fin, it.diagram);
            else if (act.dataset.act === 'open') openDiagramModal(procHTML(it.ini, it.fin) + ' · ' + (it.title || ''), it, view);
            else if (act.dataset.act === 'copy') { const box = act.closest('.lcard').querySelector('.svgbox'); copyText(root, svgFor(it, box.dataset.mode || 'plain')); }
        }
    });
    draw();
}

/** Progress while the worker searches. */
export function renderProgress(container, p, onStop) {
    const root = rootOf(container);
    let el = root.querySelector('.progress');
    if (!el) {
        root.innerHTML = '<div class="progress" role="status"><div class="ptext"></div><div class="bar"><i></i></div><div><button type="button" class="btn" data-stop>Stop</button></div></div><div class="partial"></div>';
        el = root.querySelector('.progress');
        root.querySelector('[data-stop]').addEventListener('click', () => onStop && onStop());
    }
    el.querySelector('.ptext').textContent = p.text || 'Working…';
    const bar = el.querySelector('.bar');
    if (p.total) { bar.classList.remove('indet'); bar.querySelector('i').style.width = Math.min(100, 100 * p.done / p.total).toFixed(1) + '%'; }
    else bar.classList.add('indet');
    if (p.partial !== undefined) root.querySelector('.partial').innerHTML = '<p class="summary">' + p.partial + '</p>';
}

const RULE_NAMES = { charge: 'charge', baryon: 'baryon number', lepton: 'lepton number', kinematics: 'kinematics', colour: 'colour', flavour: 'flavour (ΔS ≤ 1)', dsdq: 'ΔS = ΔQ', cparity: 'C parity', 'landau-yang': 'Landau–Yang', 'zero-zero': '0 → 0 + γ', parity: 'parity / CP', spin: 'angular momentum', 'no diagram': 'no diagram within the limits' };

/** Discovery results grouped by final state. */
export function renderDiscovery(container, data, view = {}) {
    const root = rootOf(container);
    const groups = data.groups || [];
    const ex = Object.entries(data.excluded || {}).sort((a, b) => b[1] - a[1]);
    let h = '<div class="proc">' + esc((data.initial || []).join(' ')) + ' <span class="arrow">→</span> anything</div>'
        + '<p class="summary"><b>' + groups.length + '</b> final state' + (groups.length === 1 ? '' : 's') + ' with diagrams, from <b>' + (data.screened || 0).toLocaleString() + '</b> screened'
        + (ex.length ? '. Excluded by: ' + ex.map(([k, n]) => esc(RULE_NAMES[k] || k) + ' ' + n.toLocaleString()).join(', ') : '') + (data.truncated ? '. <b>The search stopped at the time limit</b>; raise it by lowering the maximum multiplicity.' : '') + '.</p>';
    if (data.note) h += '<div class="note">' + data.note + '</div>';
    h += groups.map((g, gi) => '<details class="grp" data-g="' + gi + '"' + (gi < 3 ? ' open' : '') + '><summary>' + symProc(data.initial || [], g.final) + (g.loopInduced ? ' <span class="chip">loop-induced</span>' : '') + (g.hadronic ? ' <span class="chip">quark level</span>' : '') + '<span class="cnt">' + g.count + ' diagram' + (g.count === 1 ? '' : 's') + '</span></summary><div class="body"></div></details>').join('');
    root.innerHTML = h;
    const shown = {};
    const fillGroup = (det) => {
        const gi = +det.dataset.g, g = groups[gi], n = shown[gi] || 12;
        const body = det.querySelector('.body');
        body.innerHTML = rulesHTML(g.rules, false) + '<div class="cards" style="margin-top:8px">' + g.items.slice(0, n).map((it, i) => cardHTML(it, 'g' + gi, i, view)).join('') + '</div>'
            + (g.items.length > n ? '<button type="button" class="btn more" data-gmore="' + gi + '">Show ' + Math.min(12, g.items.length - n) + ' more (' + (g.items.length - n) + ' hidden)</button>' : '');
        body.querySelectorAll('.svgbox').forEach(b => { const it = g.items[+b.closest('.lcard').dataset.i]; b.innerHTML = svgFor(it, b.dataset.mode); });
    };
    const itemOf = (el) => { const c = el.closest && el.closest('.lcard'); if (!c) return null; const gi = +c.dataset.sec.slice(1); return groups[gi] && groups[gi].items[+c.dataset.i]; };
    root.querySelectorAll('details.grp').forEach(det => {
        if (det.open) fillGroup(det);
        det.addEventListener('toggle', () => { if (det.open && !det.querySelector('.lcard')) fillGroup(det); });
    });
    onClick(root, (ev) => {
        const t = ev.target;
        const gm = t.closest && t.closest('[data-gmore]');
        if (gm) { const gi = +gm.dataset.gmore; shown[gi] = (shown[gi] || 12) + 12; fillGroup(root.querySelector('details.grp[data-g="' + gi + '"]')); return; }
        const vt = t.closest && t.closest('.vtabs button');
        if (vt) { const card = vt.closest('.lcard'), it = itemOf(card), box = card.querySelector('.svgbox'); card.querySelectorAll('.vtabs button').forEach(b => b.classList.toggle('on', b === vt)); box.dataset.mode = vt.dataset.view; box.innerHTML = svgFor(it, vt.dataset.view); return; }
        const act = t.closest && t.closest('[data-act]');
        const it = itemOf(t);
        if (act && it) {
            ensureLayout(it.diagram);
            if (act.dataset.act === 'loops') openLoopExplorerIds(it.ini, it.fin, it.diagram);
            else if (act.dataset.act === 'open') openDiagramModal(procHTML(it.ini, it.fin) + ' · ' + (it.title || ''), it, view);
            else if (act.dataset.act === 'copy') { const box = act.closest('.lcard').querySelector('.svgbox'); copyText(root, svgFor(it, box.dataset.mode || 'plain')); }
        }
    });
    wireTips(root, el => itemOf(el), view);
    wireContext(root, el => itemOf(el));
}

export function renderMessage(container, html) {
    const root = rootOf(container);
    root.innerHTML = html ? '<div class="note">' + html + '</div>' : '';
}
