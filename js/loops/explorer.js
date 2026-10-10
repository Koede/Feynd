// js/loops/explorer.js
// Loop explorer: a modal that takes an elementary process, shows its tree diagrams,
// lets the user hover vertices for the coupling, add loops one at a time, and read the
// renormalization factors. Everything is drawn as SVG inside a shadow root so the
// page's own stylesheet and the explorer's cannot interfere with each other.

import { FV } from './engine.js';
import { toEngineIds, loopSupported } from './symbols.js';
import CSS from './explorer-css.js';
import { PDG } from './pdg.js';

export { loopSupported };

const FONT_URL = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=STIX+Two+Text:ital,wght@0,400;0,600;1,400&display=swap';
const MAXLOOPS = 4;
const SUPD = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => String(n).split('').map(c => SUPD[+c]).join('');
const txt = h => h.replace(/<span class="ov">(.)<\/span>/g, '$1̄').replace(/<\/?(sub|sup|b|i|span)[^>]*>/g, '');
const procHTML = (a, b) => a.map(FV.labHTML).join(' ') + ' <span class="arrow">→</span> ' + b.map(FV.labHTML).join(' ');

const TEMPLATE = `
<div class="lx-backdrop" part="backdrop">
  <div class="lx-panel" role="dialog" aria-modal="true" aria-label="Loop explorer">
    <button type="button" class="lx-close" aria-label="Close">×</button>
    <div class="stagehead"><div id="title"></div><div id="tabs"></div></div>
    <div id="empty" class="empty" hidden><p id="empty-msg"></p></div>
    <div id="stage-body" class="stage" style="display:grid;gap:14px">
      <div id="canvas" class="canvas"><div id="svgwrap" class="svgwrap"></div><div id="tip" class="tip" role="tooltip"></div></div>
      <div class="loopbar">
        <div id="lcount" class="lcount"></div>
        <div class="lsel"><label class="sel-l" for="site">Insert the next loop at</label><select id="site"></select></div>
        <div class="btns">
          <button type="button" id="add" class="btn primary">Add loop</button>
          <button type="button" id="undo" class="btn">Remove last</button>
          <button type="button" id="reset" class="btn">Back to start</button>
        </div>
        <label class="chk"><input type="checkbox" id="ctbox"> Show counterterm diagrams</label>
        <p id="capnote" class="capnote"></p>
      </div>
      <div id="stats" class="stats"></div>
      <div id="ctrow" class="ctrow" hidden></div>
    </div>
    <section id="reno" class="reno" hidden>
      <h2>Renormalization</h2>
      <div id="rbody" class="rgrid"></div>
    </section>
  </div>
</div>`;

const EXTRA_CSS = `
.lx-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(8, 20, 32, .55); display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; padding: 24px 12px; }
.lx-panel { position: relative; width: min(1100px, 100%); background: var(--bg); color: var(--ink); border-radius: 10px; padding: 22px 20px 28px; display: grid; gap: 14px; box-shadow: 0 20px 60px rgba(0,0,0,.4); }
.lx-close { position: absolute; top: 8px; right: 12px; border: 0; background: none; font-size: 26px; line-height: 1; cursor: pointer; color: var(--muted); }
.lx-close:hover { color: var(--ink); }
.stagehead { padding-right: 32px; }
`;

let hostEl = null;

/** Opens the explorer for `initial` -> `final` (site symbols). Returns false if unsupported. */
export function openLoopExplorer(initialSymbols, finalSymbols) {
    const ini = toEngineIds(initialSymbols), fin = toEngineIds(finalSymbols);
    if (!ini || !fin) return false;
    return openLoopExplorerIds(ini, fin);
}

/** Same, with engine ids, optionally starting from a ready-made diagram. */
export function openLoopExplorerIds(ini, fin, diagram = null) {
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

    const app = createApp(root, ini, fin, res);
    const close = () => {
        document.removeEventListener('keydown', onKey, true);
        document.body.style.overflow = previousOverflow;
        hostEl?.remove(); hostEl = null;
    };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
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

function createApp(root, ini, fin, res) {
    const $ = s => root.querySelector(s);
    const S = { ini, fin, res, bi: 0, hist: [], si: 0, sites: [], ct: false, pref: FV.prefFor(ini, fin) };
    const cur = () => S.hist[S.hist.length - 1];

    function setBase(i) {
        S.bi = i;
        const b = FV.cloneDiag(S.res.bases[i]); FV.layoutDiag(b);
        if (b.loops && b.loops.length) { const L = b.loops[b.loops.length - 1]; if (L.type === 'box') L.crossed = L.crossed || false; }
        S.hist = [b]; S.si = 0; refresh();
    }
    function refresh() {
        const d = cur();
        $('#reno').hidden = false;
        $('#title').innerHTML = procHTML(S.ini, S.fin);
        const bases = S.res.bases;
        if (bases.length <= 1) $('#tabs').innerHTML = '<span class="kind">' + (S.res.kind === 'induced' ? 'Loop-induced · no tree-level diagram' : (FV.countLoops(cur()) ? 'Starting diagram · ' + FV.countLoops(cur()) + '-loop' : 'Tree level · single diagram')) + '</span>';
        else if (bases.length <= 6) $('#tabs').innerHTML = '<div class="seg" role="tablist">' + bases.map((b, i) => '<button type="button" role="tab" aria-selected="' + (i === S.bi) + '" class="' + (i === S.bi ? 'on' : '') + '" data-b="' + i + '">' + b.label + '</button>').join('') + '</div>';
        else $('#tabs').innerHTML = '<label class="sel-l">Diagram <select id="bsel">' + bases.map((b, i) => '<option value="' + i + '"' + (i === S.bi ? ' selected' : '') + '>' + txt(b.label) + '</option>').join('') + '</select></label>';
        S.sites = FV.sites(d, S.pref);
        if (S.si >= S.sites.length) S.si = 0;
        drawSVG(); buildSites(); stats(d); renorm(d); counterterms(d);
    }
    function drawSVG() {
        const d = cur(), s = S.sites[S.si];
        $('#svgwrap').innerHTML = FV.renderSVG(d, { highlight: s ? s.targets : { verts: [], edges: [] } });
        $('#svgwrap').setAttribute('aria-label', 'Feynman diagram for ' + txt(procHTML(S.ini, S.fin)));
    }
    function buildSites() {
        const d = cur(), L = FV.countLoops(d), full = L >= MAXLOOPS, groups = {};
        S.sites.forEach((s, i) => (groups[s.group] = groups[s.group] || []).push([s, i]));
        $('#site').innerHTML = Object.keys(groups).map(g => '<optgroup label="' + g + '">' + groups[g].map(([s, i]) => '<option value="' + i + '"' + (i === S.si ? ' selected' : '') + '>' + txt(s.label) + '</option>').join('') + '</optgroup>').join('');
        $('#site').disabled = full || !S.sites.length;
        $('#add').disabled = full || !S.sites.length;
        $('#undo').disabled = S.hist.length < 2;
        $('#reset').disabled = S.hist.length < 2;
        $('#lcount').innerHTML = '<span class="ln-n">' + L + '</span><span class="ln-t">loop' + (L === 1 ? '' : 's') + '</span>';
        $('#capnote').textContent = full ? 'Four loops is the limit for this viewer.' : '';
    }
    function stats(d) {
        const o = FV.orderOf(d), parts = [];
        if (o.e) parts.push('e' + sup(o.e)); if (o.g) parts.push('g' + sup(o.g)); if (o.gs) parts.push('g<sub>s</sub>' + sup(o.gs));
        if (o.y) parts.push('(m<sub>f</sub>/v)' + sup(o.y)); if (o.lam) parts.push('λ' + sup(o.lam));
        const nv = d.verts.filter(v => v.kind === 'v' && !v.ct).length, ni = d.edges.filter(e => FV.isInternal(d, e)).length;
        $('#stats').innerHTML = '<div><span>Couplings</span><b class="m">' + (parts.join(' ') || '—') + '</b></div><div><span>Vertices</span><b>' + nv + '</b></div><div><span>Internal lines</span><b>' + ni + '</b></div><div><span>Loops</span><b>' + FV.countLoops(d) + '</b></div>';
    }
    function renorm(d) {
        const ext = FV.extFactors(d), seen = {};
        const eg = ext.filter(x => { const k = x.pid + x.factor; if (seen[k]) { seen[k].n++; return false; } seen[k] = x; x.n = 1; return true; });
        let h = '<div class="rcard"><h3>External legs</h3><p class="rn">Each external line contributes the LSZ residue factor.</p>' + eg.map(x => '<div class="ri"><div class="rh">' + x.label + (x.n > 1 ? ' ×' + x.n : '') + '<span class="rf m">' + x.factor + ' = 1 + ½δ</span></div>' + x.exprs.map(e => '<div class="re m">' + e + '</div>').join('') + '</div>').join('') + '</div>';
        h += '<div class="rcard"><h3>Loop counterterms</h3>';
        if (!d.loops.length) h += '<p class="rn">This is the tree-level diagram, so there is nothing to subtract yet. Add a loop and its counterterm appears here.</p>';
        d.loops.forEach(L => {
            const c = FV.ctInfo(d, L);
            h += '<div class="ri"><div class="rh"><b>' + L.id + '</b> ' + c.title + '<span class="tag ' + c.sector.toLowerCase() + '">' + c.sector + '</span></div>' +
                '<div class="re"><span class="k">loop factor</span> ' + c.loopFactor + '</div>' +
                '<div class="re"><span class="k">counterterm</span> <span class="m">' + c.rule + '</span></div>' +
                c.exprs.map(e => '<div class="re m">' + e + '</div>').join('') + (c.note ? '<div class="re note">' + c.note + '</div>' : '') + '</div>';
        });
        h += '</div>';
        h += '<div class="rcard"><h3>Conventions</h3><ul class="conv"><li>Δ<sub>UV</sub> = 1/ε − γ<sub>E</sub> + ln 4π in d = 4 − 2ε; Δ<sub>IR</sub> likewise.</li><li>QED and QCD constants are written out in full. Electroweak ones are given as on-shell conditions, as in Denner (1993).</li><li>Inputs (' + PDG.edition + ', <a href="' + PDG.url + '" target="_blank" rel="noopener">pdg.lbl.gov</a>): α = 1/' + PDG.alphaInv + ', α<sub>s</sub>(M<sub>Z</sub>) = ' + PDG.alphaS.toFixed(4) + ', s<sub>W</sub>² = ' + PDG.sw2 + ' (MS-bar), G<sub>F</sub> = ' + PDG.GF.toExponential(7) + ' GeV⁻² so v = (√2G<sub>F</sub>)<sup>−1/2</sup> = ' + PDG.vev.toFixed(2) + ' GeV, M<sub>W</sub> = ' + PDG.MW + ' GeV, M<sub>Z</sub> = ' + PDG.MZ + ' GeV, M<sub>H</sub> = ' + PDG.MH + ' GeV, m<sub>t</sub> = ' + PDG.mt + ' GeV; quark masses MS-bar (u, d, s at 2 GeV; c, b at their own mass), CKM magnitudes from the PDG global fit. s<sub>W</sub>² is the MS-bar value used in the Z couplings; the on-shell value 1 − M<sub>W</sub>²/M<sub>Z</sub>² = ' + (1 - PDG.MW * PDG.MW / PDG.MZ / PDG.MZ).toFixed(4) + ' differs from it at one loop, so tree-level relations such as M<sub>W</sub> = M<sub>Z</sub>c<sub>W</sub> hold only to that accuracy.</li><li>W and Z lines are in unitary gauge; gluons in Feynman gauge with ghosts.</li><li>Fermion vertices follow D<sub>μ</sub> = ∂<sub>μ</sub> − i g A<sub>μ</sub>. Overall signs of gauge self-couplings are convention-dependent.</li><li>Quartic contact terms and tadpoles are not generated at loop level.</li></ul></div>';
        $('#rbody').innerHTML = h;
    }
    function counterterms(d) {
        const row = $('#ctrow');
        if (!S.ct || !d.loops.length) { row.hidden = true; row.innerHTML = ''; return; }
        row.hidden = false;
        let h = '<h3>Counterterm diagrams</h3><div class="ctgrid">';
        d.loops.forEach(L => {
            if (L.type === 'box') { h += '<figure class="ctf"><div class="ctn">Box ' + L.id + ': UV-finite, no counterterm diagram.</div></figure>'; return; }
            const c = FV.collapseLoop(d, L.id);
            if (!c) { h += '<figure class="ctf"><div class="ctn">' + L.id + ' is nested inside another loop. Collapse the inner loop first.</div></figure>'; return; }
            FV.layoutDiag(c);
            h += '<figure class="ctf">' + FV.renderSVG(c, { thumb: true }) + '<figcaption>Loop ' + L.id + ' replaced by its ⊗ counterterm</figcaption></figure>';
        });
        row.innerHTML = h + '</div>';
    }

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

    const wrap = $('#svgwrap');
    const over = ev => {
        const t = ev.target.closest && ev.target.closest('[data-v],[data-e]');
        if (!t || !S.hist.length) { hideTip(); return; }
        showTip(t.dataset.v ? FV.tipVertex(cur(), t.dataset.v) : FV.tipEdge(cur(), t.dataset.e), ev);
    };
    wrap.addEventListener('pointermove', over);
    wrap.addEventListener('pointerdown', over);
    wrap.addEventListener('pointerleave', hideTip);
    wrap.addEventListener('click', ev => {
        const t = ev.target.closest && ev.target.closest('[data-v],[data-e]');
        if (!t) return;
        const i = S.sites.findIndex(s => t.dataset.v ? s.vid === t.dataset.v || (s.kind === 'box' && s.targets.verts.includes(t.dataset.v)) : s.eid === t.dataset.e);
        if (i >= 0) { S.si = i; $('#site').value = String(i); drawSVG(); }
    });
    $('#tabs').addEventListener('click', ev => { const b = ev.target.closest('[data-b]'); if (b) setBase(+b.dataset.b); });
    $('#tabs').addEventListener('change', ev => { if (ev.target.id === 'bsel') setBase(+ev.target.value); });
    $('#site').addEventListener('change', () => { S.si = +$('#site').value; drawSVG(); });
    $('#add').addEventListener('click', () => {
        const s = S.sites[S.si]; if (!s) return;
        const nd = FV.applySite(cur(), s), cr = FV.layoutDiag(nd), L = nd.loops[nd.loops.length - 1];
        if (L.type === 'box') L.crossed = cr > 0;
        S.hist.push(nd); S.si = 0; refresh();
    });
    $('#undo').addEventListener('click', () => { if (S.hist.length > 1) { S.hist.pop(); S.si = 0; refresh(); } });
    $('#reset').addEventListener('click', () => { S.hist = S.hist.slice(0, 1); S.si = 0; refresh(); });
    $('#ctbox').addEventListener('change', () => { S.ct = $('#ctbox').checked; counterterms(cur()); });

    setBase(0);
    return { state: S, refresh, setBase };
}
