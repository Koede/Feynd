// js/loopchannel.js
// Controller for loops.html: drop zones (with colours in Add Color mode), presets, the
// typed-process box, and the background worker that builds every diagram from the
// Feynman rules. index.html keeps its own controller (channel.js), unchanged.

import { renderParticlePanel } from './loopui.js';
import { initMassTooltips } from './directory.js';
import { identifyHadron, HADRONS } from './hadrons.js';
import { PARTICLES } from './particles.js';
import { FV } from './loops/engine.js';
import { toSiteSymbol } from './loops/symbols.js';
import { buildRuleDiagrams } from './loops/build.js';
import { discover } from './loops/discovery.js';
import { renderLoopResults, renderDiscovery, renderProgress, renderMessage } from './loops/results.js';
import { colourKindOf, defaultColour, colourEditor, colourBadge, parseSpec, specText } from './loops/colourui.js';
import './vacuum.js';   // the faint creation/annihilation background

// ------------------------------------------------------------------ state
const zones = { initial: [], final: [] };          // [{ sym, col }]
const els = {
    initial: document.getElementById('initialDropZone'),
    final: document.getElementById('finalDropZone'),
    results: document.getElementById('loopResults'),
    legacy: document.getElementById('channelGrid'),
    error: document.getElementById('errorDisplay'),
    mult: document.getElementById('maxMultiplicity'),
    loops: document.getElementById('allowLoops'),
    extras: document.getElementById('allowExtras'),
    loopOpts: document.getElementById('loopOpts'),
    loopOrder: document.getElementById('loopOrder'),
    loopGauge: document.getElementById('loopGauge'),
    loopTadpoles: document.getElementById('loopTadpoles'),
    loopExternal: document.getElementById('loopExternal'),
    colour: document.getElementById('addColour'),
    sqrtS: document.getElementById('sqrtS'),
    finals: document.getElementById('discoverFinals'),
    typed: document.getElementById('typedProcess'),
    typedGo: document.getElementById('typedGo'),
    initGroup: document.getElementById('initialStateGroup'),
    finGroup: document.getElementById('finalStateGroup')
};
let activeZone = 'initial';
const colourMode = () => !!(els.colour && els.colour.checked);

// ------------------------------------------------------------- preferences
const PREF_KEY = 'feynman-loops-prefs';
function savePrefs() {
    try {
        localStorage.setItem(PREF_KEY, JSON.stringify({ loops: els.loops.checked, extras: els.extras.checked, colour: els.colour.checked, mult: els.mult.value, finals: els.finals && els.finals.value, loopOrder: els.loopOrder && els.loopOrder.value, loopGauge: els.loopGauge && els.loopGauge.value, loopTadpoles: els.loopTadpoles && els.loopTadpoles.checked, loopExternal: els.loopExternal && els.loopExternal.checked }));
    } catch (e) { /* storage unavailable: the page works without it */ }
}
function loadPrefs() {
    try {
        const p = JSON.parse(localStorage.getItem(PREF_KEY) || 'null');
        if (!p) return;
        els.loops.checked = !!p.loops; els.extras.checked = !!p.extras; els.colour.checked = !!p.colour;
        if (p.mult) els.mult.value = p.mult;
        if (p.finals && els.finals) els.finals.value = p.finals;
        if (p.loopOrder && els.loopOrder) els.loopOrder.value = p.loopOrder;
        if (p.loopGauge && els.loopGauge) els.loopGauge.value = p.loopGauge;
        if (els.loopTadpoles) els.loopTadpoles.checked = !!p.loopTadpoles;
        if (els.loopExternal) els.loopExternal.checked = !!p.loopExternal;
    } catch (e) { /* ignore */ }
}
/** The loop options only make sense when loops are on. */
function syncLoopOpts() { if (els.loopOpts) els.loopOpts.hidden = !els.loops.checked; }
function loopOptions() {
    return {
        loopOrder: Number(els.loopOrder ? els.loopOrder.value : 1) || 1,
        gauge: els.loopGauge ? els.loopGauge.value : 'unitary',
        tadpoles: !!(els.loopTadpoles && els.loopTadpoles.checked),
        externalLegs: !!(els.loopExternal && els.loopExternal.checked)
    };
}

// -------------------------------------------------------------- drop zones
function chipFor(p, index, zone) {
    const chip = document.createElement('span');
    chip.className = 'particle-chip';
    const sym = document.createElement('span');
    sym.className = 'chip-symbol';
    sym.textContent = p.sym;
    chip.appendChild(sym);
    if (colourMode() && colourKindOf(p.sym)) {
        // final-state colours are chosen by the solver unless the user fixes them
        if (!p.col && zone === 'initial') p.col = defaultColour(p.sym);
        if (!p.col) {
            const auto = document.createElement('button');
            auto.type = 'button'; auto.className = 'cbtn auto'; auto.textContent = 'colour: auto';
            auto.title = 'The colours of this particle follow from the colour flow. Click to fix them yourself.';
            auto.addEventListener('click', (e) => { e.stopPropagation(); p.col = defaultColour(p.sym); refreshZones(); });
            chip.appendChild(auto);
        } else {
            const ed = colourEditor(p.sym, p.col, (spec) => { p.col = spec; if (els.typed) els.typed.value = typedText(); });
            ed.addEventListener('click', e => e.stopPropagation());
            chip.appendChild(ed);
            if (zone === 'final') {
                const back = document.createElement('button');
                back.type = 'button'; back.className = 'cbtn auto'; back.textContent = 'auto';
                back.title = 'Let the colour flow decide this particle’s colours';
                back.addEventListener('click', (e) => { e.stopPropagation(); p.col = null; refreshZones(); });
                chip.appendChild(back);
            }
        }
    }
    const x = document.createElement('button');
    x.type = 'button'; x.setAttribute('aria-label', 'Remove ' + p.sym); x.textContent = '×';
    x.addEventListener('click', (e) => { e.stopPropagation(); zones[zone].splice(index, 1); refreshZones(); clearError(); });
    chip.appendChild(x);
    return chip;
}
function renderZone(zone) {
    const el = els[zone];
    el.innerHTML = '';
    zones[zone].forEach((p, i) => el.appendChild(chipFor(p, i, zone)));
}

/** If the particles in a zone are the valence quarks of a known hadron, say so. */
function hadronHintFor(syms) {
    if (syms.length < 2 || syms.length > 3) return null;
    if (syms.some(s => HADRONS[s])) return null;
    const result = identifyHadron(syms);
    if (!result) return null;
    if (result.ambiguous) {
        const names = result.candidates.map(c => c.symbol);
        return { brace: `} ${result.genericLabel}`, text: names.length ? `could be ${names.join(' or ')}` : 'flavour mixture', uncertain: true };
    }
    const info = HADRONS[result.symbol];
    const also = result.alternatives.length ? ` · also ${result.alternatives.join(', ')}` : '';
    return { brace: `} ${result.symbol}`, text: `${info.name}${also}`, uncertain: false };
}
function renderHadronHint(groupEl, syms) {
    groupEl.querySelector('.hadron-hint')?.remove();
    const hint = hadronHintFor(syms);
    if (!hint) return;
    const el = document.createElement('div');
    el.className = 'hadron-hint' + (hint.uncertain ? ' uncertain' : '');
    el.innerHTML = '<span class="hint-brace"></span><span class="hint-text"></span>';
    el.querySelector('.hint-brace').textContent = hint.brace;
    el.querySelector('.hint-text').textContent = hint.text;
    groupEl.appendChild(el);
}
function refreshZones() {
    renderZone('initial'); renderZone('final');
    renderHadronHint(els.initGroup, zones.initial.map(p => p.sym));
    renderHadronHint(els.finGroup, zones.final.map(p => p.sym));
    if (els.typed && document.activeElement !== els.typed) els.typed.value = typedText();
}
function addParticle(sym, zone, col) {
    if (!sym || !(PARTICLES[sym] || HADRONS[sym])) return;
    zones[zone].push({ sym, col: col || (colourMode() && zone === 'initial' ? defaultColour(sym) : null) });
    refreshZones();
    clearError();
}
function clearError() { els.error.style.display = 'none'; }
function showError(msg) { els.error.style.display = 'block'; els.error.textContent = msg; }

function setActiveZone(zone) {
    activeZone = zone;
    els.initGroup.classList.toggle('active-group', zone === 'initial');
    els.finGroup.classList.toggle('active-group', zone === 'final');
}

// ------------------------------------------------------- typed processes
const ALIASES = {
    p: 'p', proton: 'p', n: 'n', neutron: 'n', pbar: 'p̄', antiproton: 'p̄', nbar: 'n̄', antineutron: 'n̄',
    'pi+': 'π⁺', 'pi-': 'π⁻', pi0: 'π⁰', 'k+': 'K⁺', 'k-': 'K⁻', k0: 'K⁰', k0bar: 'K̄⁰', kbar0: 'K̄⁰', eta: 'η',
    lambda: 'Λ', lambda0: 'Λ', lambdabar: 'Λ̄', 'sigma+': 'Σ⁺', sigma0: 'Σ⁰', 'sigma-': 'Σ⁻', 'sigmabar-': 'Σ̄⁻', sigmabar0: 'Σ̄⁰', 'sigmabar+': 'Σ̄⁺',
    xi0: 'Ξ⁰', 'xi-': 'Ξ⁻', xibar0: 'Ξ̄⁰', 'xibar+': 'Ξ̄⁺', 'omega-': 'Ω⁻', 'omegabar+': 'Ω̄⁺', h: 'h', higgs: 'h', z: 'Z⁰', z0: 'Z⁰'
};
function resolveSymbol(tok) {
    if (PARTICLES[tok] || HADRONS[tok]) return tok;
    const lower = tok.toLowerCase();
    if (ALIASES[lower]) return ALIASES[lower];
    const id = FV.parseParticle(tok);
    return id ? toSiteSymbol(id) : null;
}
function parseTyped(text) {
    const parts = text.split(/→|->|=>|>/);
    if (parts.length !== 2) return { error: 'Write the process as initial → final, for example: e- e+ -> mu- mu+  (or Omega- -> Lambda K-).' };
    const side = (s) => s.trim().split(/[\s,]+/).filter(Boolean).map(tok => {
        const [name, col] = tok.split(':');
        const sym = resolveSymbol(name);
        if (!sym) return { bad: name };
        let spec = null;
        if (col !== undefined) {
            spec = parseSpec(sym, col);
            if (spec === undefined) return { bad: tok + ' (colour)' };
        }
        return { sym, col: spec };
    });
    const ini = side(parts[0]), fin = side(parts[1]);
    const bad = ini.concat(fin).filter(x => x.bad).map(x => x.bad);
    if (bad.length) return { error: 'Not recognised: ' + bad.join(', ') + '. Use names like e-, mu+, nu_e, ubar, gamma, W+, g, H, p, pi+, K-, Lambda, Omega-. In Add Color mode add colours after a colon: u:r, ubar:g, g:rb, K-:gg, Omega-:rgb.' };
    return { ini, fin };
}
function typedText() {
    const one = (p) => p.sym + (colourMode() && p.col && colourKindOf(p.sym) ? ':' + specText(p.sym, p.col) : '');
    if (!zones.initial.length && !zones.final.length) return '';
    return zones.initial.map(one).join(' ') + ' → ' + zones.final.map(one).join(' ');
}

// ------------------------------------------------------------------ worker
let worker = null, jobId = 0, busy = false, partialGroups = [];
function makeWorker() {
    try {
        const inline = document.getElementById('fd-worker-src');
        if (inline && inline.textContent.trim()) return new Worker(URL.createObjectURL(new Blob([inline.textContent], { type: 'text/javascript' })));
        return new Worker(new URL('./loops/worker.js', import.meta.url), { type: 'module' });
    } catch (e) { return null; }
}
function stop(reason) {
    if (busy && worker) { worker.terminate(); worker = null; }
    if (busy) {
        busy = false;
        if (partialGroups.length) renderDiscovery(els.results, { groups: partialGroups, initial: zones.initial.map(p => p.sym), excluded: {}, screened: 0, note: 'Search stopped. These are the final states found so far.' }, { colourMode: colourMode() });
        else renderMessage(els.results, reason || 'Search stopped.');
    }
}
function runJob(msg, onResult) {
    stop();
    const id = ++jobId;
    busy = true; partialGroups = [];
    renderProgress(els.results, { text: 'Starting…' }, () => stop());
    if (!worker) worker = makeWorker();
    if (!worker) {
        // no worker available: compute here after the progress message has painted
        setTimeout(() => {
            try {
                const data = msg.type === 'build' ? buildRuleDiagrams(msg.initial, msg.final, msg.opts) : discover(msg.initial, msg.opts);
                busy = false; onResult(data);
            } catch (e) { busy = false; renderMessage(els.results, 'Something went wrong: ' + e.message); }
        }, 30);
        return;
    }
    worker.onmessage = (ev) => {
        const m = ev.data;
        if (!m || m.id !== id) return;
        if (m.type === 'progress') renderProgress(els.results, { text: m.text, done: m.done, total: m.total, partial: partialGroups.length ? partialGroups.length + ' final state' + (partialGroups.length === 1 ? '' : 's') + ' with diagrams so far' : undefined }, () => stop());
        else if (m.type === 'group') { partialGroups.push(m.group); renderProgress(els.results, { text: 'Searching…', partial: partialGroups.length + ' final state' + (partialGroups.length === 1 ? '' : 's') + ' with diagrams so far' }, () => stop()); }
        else if (m.type === 'result') { busy = false; onResult(m.data); }
        else if (m.type === 'error') { busy = false; renderMessage(els.results, 'Something went wrong while building diagrams: ' + m.message.split('\n')[0]); console.error(m.message); }
    };
    worker.onerror = (e) => { if (!busy) return; busy = false; worker = null; renderMessage(els.results, 'The background worker failed (' + (e.message || 'unknown error') + ').'); };
    worker.postMessage(Object.assign({ id }, msg));
}

// ----------------------------------------------------------------- generate
function generate() {
    clearError();
    const ini = zones.initial.map(p => p.sym), fin = zones.final.map(p => p.sym);
    if (!ini.length) { showError('Add initial particles'); renderMessage(els.results, ''); return; }
    const sv = els.sqrtS && els.sqrtS.value.trim() ? parseFloat(els.sqrtS.value) : null;
    if (sv !== null && !(sv > 0)) { showError('√s must be a positive number of GeV, or empty.'); return; }
    const colours = colourMode() ? { initial: zones.initial.map(p => colourKindOf(p.sym) ? (p.col || defaultColour(p.sym)) : null), final: zones.final.map(p => colourKindOf(p.sym) ? (p.col || null) : null) } : null;
    const view = { colourMode: colourMode() };
    if (fin.length) {
        runJob({ type: 'build', initial: ini, final: fin, opts: Object.assign({ loops: els.loops.checked, extras: els.extras.checked, colours, sqrtS: sv }, loopOptions()) },
            (data) => renderLoopResults(els.results, data, view));
    } else {
        runJob({ type: 'discover', initial: ini, opts: Object.assign({ maxMultiplicity: Number(els.mult.value || 3), loops: els.loops.checked, colours: colours ? { initial: colours.initial } : null, sqrtS: sv, finals: els.finals ? els.finals.value : undefined }, loopOptions(), { loopOrder: 1 }) },
            (data) => { data.initial = ini; renderDiscovery(els.results, data, view); });
    }
}

// ------------------------------------------------------------------ presets
const PRESETS = {
    'moller': { in: ['e⁻', 'e⁻'], out: ['e⁻', 'e⁻'] },
    'annihilation': { in: ['e⁻', 'e⁺'], out: ['μ⁻', 'μ⁺'] },
    'compton': { in: ['e⁻', 'γ'], out: ['e⁻', 'γ'] },
    'bhabha': { in: ['e⁻', 'e⁺'], out: ['e⁻', 'e⁺'] },
    'pair-production': { in: ['e⁻', 'e⁺'], out: ['γ', 'γ'] },
    'muon-decay': { in: ['μ⁻'], out: ['e⁻', 'ν̄e', 'νμ'] },
    'gluon4': { in: ['g', 'g'], out: ['g', 'g'] },
    'higgs-gg': { in: ['h'], out: ['γ', 'γ'] },
    'light-by-light': { in: ['γ', 'γ'], out: ['γ', 'γ'] },
    'pion-decay': { in: ['π⁺'], out: ['μ⁺', 'νμ'] },
    'pion-radiative': { in: ['π⁰'], out: ['γ', 'γ'] },
    'neutron-beta': { in: ['n'], out: ['p', 'e⁻', 'ν̄e'] },
    'kaon-decay': { in: ['K⁺'], out: ['μ⁺', 'νμ'] },
    'lambda-decay': { in: ['Λ'], out: ['p', 'π⁻'] },
    'omega-decay': { in: ['Ω⁻'], out: ['Λ', 'K⁻'] },
    'ee-to-pions': { in: ['e⁻', 'e⁺'], out: ['π⁺', 'π⁻'] },
    'pion-search': { in: ['π⁺'], out: [] }
};
function applyPreset(key) {
    const p = PRESETS[key];
    if (!p) return false;
    zones.initial = p.in.map(sym => ({ sym, col: colourMode() ? defaultColour(sym) : null }));
    zones.final = p.out.map(sym => ({ sym, col: null }));
    if (p.loops) els.loops.checked = true;
    refreshZones();
    generate();
    return true;
}

// ------------------------------------------------------------------- wiring
function bindParticleInputs() {
    document.querySelectorAll('.particle-icon').forEach(icon => {
        icon.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', icon.dataset.symbol || icon.textContent.trim());
            e.dataTransfer.effectAllowed = 'copy';
        });
    });
    document.querySelectorAll('.entry').forEach(entry => {
        entry.style.cursor = 'pointer';
        entry.addEventListener('click', () => {
            const icon = entry.querySelector('.particle-icon');
            if (icon) addParticle(icon.dataset.symbol || icon.textContent.trim(), activeZone);
        });
    });
}
['initial', 'final'].forEach(zone => {
    const el = els[zone];
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag-over'); });
    el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
    el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drag-over'); addParticle(e.dataTransfer.getData('text/plain'), zone); });
});
els.initGroup.addEventListener('click', () => setActiveZone('initial'));
els.finGroup.addEventListener('click', () => setActiveZone('final'));
document.querySelectorAll('.clear-zone').forEach(btn => btn.addEventListener('click', (e) => {
    e.stopPropagation();
    zones[btn.dataset.zone] = [];
    refreshZones(); clearError(); stop(); renderMessage(els.results, '');
}));
document.addEventListener('particle-pick', (e) => addParticle(e.detail.symbol, activeZone, e.detail.colour));
document.getElementById('generateBtn').addEventListener('click', generate);
[els.loops, els.extras, els.mult, els.finals, els.loopOrder, els.loopGauge, els.loopTadpoles, els.loopExternal].filter(Boolean).forEach(b => b.addEventListener('change', () => { syncLoopOpts(); savePrefs(); if (zones.initial.length) generate(); }));
els.colour.addEventListener('change', () => {
    document.body.classList.toggle('colour-mode', colourMode());
    if (colourMode()) zones.initial.forEach(p => { if (!p.col && colourKindOf(p.sym)) p.col = defaultColour(p.sym); });
    savePrefs(); refreshZones();
    if (zones.initial.length) generate();
});
function submitTyped() {
    const r = parseTyped(els.typed.value);
    if (r.error) { showError(r.error); return; }
    zones.initial = r.ini.map(x => ({ sym: x.sym, col: x.col || (colourMode() ? defaultColour(x.sym) : null) }));
    zones.final = r.fin.map(x => ({ sym: x.sym, col: x.col || null }));
    if (r.ini.concat(r.fin).some(x => x.col) && !colourMode()) { els.colour.checked = true; document.body.classList.add('colour-mode'); }
    refreshZones();
    generate();
}
els.typedGo.addEventListener('click', submitTyped);
els.typed.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); submitTyped(); } });
document.querySelectorAll('.preset-btn').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.preset)));

// -------------------------------------------------------------------- start
loadPrefs();
syncLoopOpts();
document.body.classList.toggle('colour-mode', colourMode());
renderParticlePanel(document.querySelector('.left-panel'));
bindParticleInputs();
initMassTooltips();
setActiveZone('initial');
refreshZones();
if (location.hash.length > 1) applyPreset(decodeURIComponent(location.hash.slice(1)));
