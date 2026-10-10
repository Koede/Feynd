// js/loops/build.js
// The page's search for a named final state: diagrams are constructed from the
// Feynman rules for exactly the particles listed, for any number of initial particles.
//   1. selection rules (rules.js) decide whether the process can happen at all;
//   2. elementary processes go to the tree generator and, if asked, the one-loop
//      generator; hadronic ones are rebuilt at quark level (hadronq.js);
//   3. every diagram must admit a colour assignment (the user's, in colour mode);
//   4. each diagram gets its phenomenological notes (caveats.js).
// Everything here is pure computation, so it runs the same in a worker.

import { FV } from './engine.js';
import { toEngineIds } from './symbols.js';
import { hadronDiagram, isHadronSymbol } from './hadronq.js';
import { loopDiagrams } from './graph.js';
import { extendedDiagrams } from './solve.js';
import { checkProcess } from './rules.js';
import { colourValid, colourForElementary } from './color.js';
import { diagramNotes, processNotes } from './caveats.js';
import { ALL_PARTICLES } from './hadrondata.js';

const MAX_TREE = 600;
const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const sup = n => n === 1 ? '' : String(n).split('').map(c => SUP[+c]).join('');

/** Coupling order of a diagram, e.g. 'e² g_s', and the interactions it uses. */
export function orderInfo(d) {
    const o = FV.orderOf(d), parts = [];
    if (o.e) parts.push('e' + sup(o.e));
    if (o.g) parts.push('g' + sup(o.g));
    if (o.gs) parts.push('g<sub>s</sub>' + sup(o.gs));
    if (o.y) parts.push('y' + sup(o.y));
    if (o.lam) parts.push('λ' + sup(o.lam));
    const groups = new Set();
    d.verts.forEach(v => { const i = FV.vinfo(d, v); if (i) groups.add(i.group === 'Yukawa' || i.group === 'Higgs' ? 'Higgs' : i.group); });
    return { order: parts.join(' ') || '—', interactions: [...groups].sort(), total: Object.values(o).reduce((a, b) => a + b, 0) };
}

const massOf = s => (ALL_PARTICLES[s] && ALL_PARTICLES[s].m) || 0;
const fmtM = m => m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 1 : 3) + ' GeV' : (m < 1 ? m.toPrecision(3) : m.toFixed(1)) + ' MeV';

/** Kept for the tests and older callers: the kinematic part of the rules as a sentence. */
export function decayForbidden(initial, final) {
    const r = checkProcess(initial, final, {});
    const k = r.checks.find(c => c.id === 'kinematics');
    return k && k.status === 'fail' ? k.detail : '';
}

function finishItem(it, ctx) {
    const oi = orderInfo(it.diagram);
    it.order = oi.order; it.interactions = oi.interactions; it.orderTotal = oi.total;
    it.notes = diagramNotes(it.diagram, ctx);
    return it;
}

/**
 * initial, final: site symbols.
 * opts: { loops, extras, colours: { initial, final } | null, sqrtS, deadline, onProgress,
 *         loopOrder (1 | 2), tadpoles, externalLegs, gauge ('unitary' | 'feynman') }
 */
export function buildRuleDiagrams(initial, final, opts = {}) {
    const { loops = false, extras = false, colours = null, sqrtS = null, onProgress } = opts;
    const deadline = opts.deadline || (Date.now() + 90000);
    const out = { tree: [], loops: [], extended: [], loopNote: '', treeNote: '', ini: [], fin: [], ok: false, initial, final, sectionNotes: [], colourMode: !!colours };
    const rules = checkProcess(initial, final, { sqrtS, colours });
    out.rules = rules;
    const ctx = { initial, final, colourMode: !!colours, sqrtS };
    const hadronic = initial.concat(final).some(isHadronSymbol);
    out.hadronic = hadronic;

    const mixing = rules.checks.find(c => c.id === 'kinematics' && c.status === 'note' && /mixing/.test(c.detail));
    if (rules.allowed && mixing) {
        out.treeNote = 'Particle–antiparticle mixing has no tree-level diagram: it is a second-order weak process through box diagrams with two W bosons (d s̄ → s d̄ via u, c, t loops), and in the Standard Model it is dominated by the charm and top quarks.';
    } else if (rules.allowed) {
        if (hadronic) {
            onProgress && onProgress('Building the quark-level diagram');
            const hd = hadronDiagram(initial, final, { colours, budgetMs: 8000, maxLegs: 8 });
            if (hd) {
                out.ini = hd.ini; out.fin = hd.fin;
                const it = { kind: 'hadron', diagram: hd.diagram, title: 'Quark level', group: hd.spectators ? hd.spectators + ' spectator' + (hd.spectators === 1 ? '' : 's') : 'no spectators', ini: hd.ini, fin: hd.fin, initial, final, noLoops: true, spectators: hd.spectators };
                out.tree.push(finishItem(it, ctx));
                out.treeHeading = 'Quark-level diagram';
                out.treeLede = 'The valence quarks of each hadron are grouped by a brace. The interaction among the active quarks, ' + hd.ini.map(FV.labHTML).join(' ') + ' <span class="arrow">→</span> ' + hd.fin.map(FV.labHTML).join(' ') + ', is built from the Standard Model vertices.';
                out.ok = true;
                if (loops) out.loopNote = 'Loop corrections are not drawn for hadronic processes: the hadron itself is a non-perturbative bound state, so a quark loop added to this picture would not be a controlled correction.';
            } else {
                out.treeNote = colours
                    ? 'No quark-level tree diagram with up to eight quark and lepton lines connects these hadrons with the colours chosen. Try other colours, or let the colours be chosen automatically.'
                    : 'No quark-level tree diagram with up to eight quark and lepton lines connects these particles.';
            }
        } else {
            const ini = toEngineIds(initial), fin = toEngineIds(final);
            out.ini = ini; out.fin = fin;
            onProgress && onProgress('Enumerating tree diagrams');
            const res = FV.generate(ini, fin);
            let dropped = 0;
            if (res.kind === 'tree') {
                for (const b of res.bases) {
                    if (out.tree.length >= MAX_TREE) { out.treeTruncated = true; break; }
                    let sol = null;
                    if (colours) { sol = colourForElementary(b, colours.initial, colours.final); if (!sol) { dropped++; continue; } }
                    else if (!colourValid(b)) { dropped++; continue; }
                    const d = FV.cloneDiag(b);
                    if (sol) d.colour = { sol };
                    out.tree.push(finishItem({ kind: 'tree', diagram: d, title: b.label, group: 'tree', ini, fin, initial, final }, ctx));
                }
                if (dropped) out.treeDropped = dropped;
                if (!out.tree.length) out.treeNote = colours ? 'All ' + dropped + ' tree diagrams are forbidden by colour conservation for the colours chosen.' : 'Every tree diagram vanishes by colour conservation.';
            } else out.treeNote = res.kind === 'induced' || /loop-induced/.test(res.reason) || res.reason.startsWith('No tree-level') ? 'There is no tree-level diagram for this process.' + (loops ? '' : ' Allow loop diagrams to see whether it starts at one loop.') : res.reason;
            if (out.tree.length) out.ok = true;

            const wantLoops = loops || (!out.tree.length && opts.autoLoops);
            if (wantLoops) {
                // loop-induced processes start at one loop, whatever order was asked for
                const L = out.tree.length ? Math.max(1, Math.min(3, opts.loopOrder || 1)) : 1;
                const gauge = opts.gauge === 'feynman' ? 'feynman' : 'unitary';
                out.loopOrder = L; out.gauge = gauge;
                out.loopTadpoles = !!opts.tadpoles; out.loopExternalShown = !!opts.externalLegs;
                onProgress && onProgress('Enumerating ' + (L === 1 ? 'one' : L === 2 ? 'two' : 'three') + '-loop diagrams' + (gauge === 'feynman' ? ' (’t Hooft–Feynman gauge)' : ''));
                const lr = loopDiagrams(ini, fin, L, {
                    model: gauge, deadline, limit: opts.loopLimit || (L === 1 ? 4000 : 3000),
                    tadpoles: !!opts.tadpoles, externalLegs: !!opts.externalLegs,
                    onProgress: (done, total) => onProgress && onProgress('Labelling ' + L + '-loop topologies: ' + done + ' / ' + total)
                });
                let ld = 0;
                for (const it of lr.items) {
                    let sol = null;
                    if (colours) { sol = colourForElementary(it.diagram, colours.initial, colours.final); if (!sol) { ld++; continue; } }
                    else if (!colourValid(it.diagram)) { ld++; continue; }
                    if (sol) it.diagram.colour = { sol };
                    it.diagram.gauge = gauge;
                    it.kind = 'loop'; it.initial = initial; it.final = final;
                    if (!out.tree.length) it.group = 'Loop-induced · ' + it.group;
                    out.loops.push(finishItem(it, Object.assign({}, ctx, { loopInduced: !out.tree.length })));
                }
                out.loopExternal = lr.external;
                out.loopTadpoleCount = lr.tadpoles;
                out.loopTruncated = lr.truncated;
                out.loopDropped = ld;
                out.loopTopologies = lr.topologies;
                if (!out.loops.length) out.loopNote = lr.reason || (ld ? 'Every ' + L + '-loop diagram vanishes by colour conservation.' : 'No ' + L + '-loop diagram connects these particles.');
                else out.ok = true;
            }
        }
    } else {
        const fails = rules.checks.filter(c => c.status === 'fail');
        out.treeNote = 'Forbidden: ' + fails.map(c => c.name.toLowerCase()).join(', ') + '. See the selection rules above.';
    }

    if (extras && !out.ok) {
        onProgress && onProgress('Searching synthesis routes: adding external particles that supply the missing quantum numbers');
        const routes = extendedDiagrams(initial, final, { sqrtS, deadline, loops, gauge: opts.gauge, buildRuleDiagrams });
        out.extended = routes.slice();
        out.extendedClosed = routes.closed || [];
        if (out.extended.length) out.ok = true;
    }
    out.sectionNotes = processNotes(out.tree.concat(out.loops));
    return out;
}

export { fmtM, massOf };
