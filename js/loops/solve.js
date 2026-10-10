// js/loops/solve.js
// Synthesis routes: when nothing connects the particles as given, find the processes
// that do, by adding external particles on either side (absorbed from a beam or a
// target on the incoming side, emitted on the outgoing side). Works for any particles:
// elementary ones and every hadron in the catalogue.
//
//   1. The additive quantum numbers (3Q, 3B, L_e, L_μ, L_τ) give the deficit the extra
//      particles must carry: Σ(added in) − Σ(added out) = Σ(final) − Σ(initial).
//      Candidates with one or two extra particles (in, out, or one of each) are found
//      through a hash of quantum-number vectors, so no blind search is needed.
//   2. Each candidate process must pass every selection rule (rules.js), with √s if given.
//   3. The diagrams come from the same builder as a typed process (build.js): tree level,
//      quark level for hadrons, and loop-induced processes when loops are allowed.
// Routes are ranked by how few and how light the extra particles are; photons first.
// A decay that is closed only because the parent is too light (p → n e⁺ ν) is reported
// separately, since it happens wherever something else supplies the energy (a nucleus).

import { FV } from './engine.js';
import { checkProcess, props } from './rules.js';
import { PARTICLES } from '../particles.js';
import { HADRONS } from './hadrondata.js';
import { toEngineId } from './symbols.js';
import { buildRuleDiagrams as defaultBuilder } from './build.js';   // cyclic import, used only at call time

const MAX_ITEMS = 18;

// names of well-known routes (keys: sorted initial → sorted final)
const NAMED = {
    'e⁻ p → n νe': 'Electron capture',
    'p ν̄e → n e⁺': 'Inverse β decay (how Reines and Cowan first detected neutrinos, 1956)',
    'p π⁻ → n π⁰': 'Pion charge exchange',
    'p γ → n π⁺': 'Pion photoproduction',
    'μ⁻ p → n νμ': 'Muon capture',
    'n → p e⁻ ν̄e': 'Neutron β decay',
    'n νe → p e⁻': 'Neutrino absorption (inverse of β decay)',
    'p → n e⁺ νe': 'β⁺ decay (only inside nuclei)'
};
const key = (a, b) => a.slice().sort().join(' ') + ' → ' + b.slice().sort().join(' ');
const NAMED_K = Object.fromEntries(Object.entries(NAMED).map(([k, v]) => { const [a, b] = k.split(' → '); return [key(a.split(' '), b.split(' ')), v]; }));

function vec(sym) {
    const p = props(sym);
    return [Math.round(p.Q * 3), Math.round(p.B * 3), p.Le, p.Lmu, p.Ltau];
}
const vkey = v => v.join(',');
const add = (a, b, s = 1) => a.map((x, i) => x + s * b[i]);

/** How costly an extra particle is: photons and neutrinos are cheapest, then light leptons and pions. */
function cost(sym) {
    if (sym === 'γ') return 0;
    const p = props(sym);
    let c = 0.4 + Math.log10(1 + p.m / 50);
    if (p.neutrino) c = 0.3;
    if (p.weakBoson || sym === 'h') c += 3;
    if (p.colour) c += 4;                       // a free quark or gluon is only a parton
    if (p.hadron && !/^π|^K|^η$|^p$|^n$|^p̄$|^n̄$/.test(sym)) c += 1;
    return c;
}

/**
 * initial, final: site symbols.
 * opts: { sqrtS, deadline, loops, gauge, buildRuleDiagrams } (the builder is injected to avoid an import cycle)
 */
export function extendedDiagrams(initial, final, opts = {}) {
    const { sqrtS = null, loops = false, gauge } = opts;
    const buildRuleDiagrams = opts.buildRuleDiagrams || defaultBuilder;
    const conversion = initial.slice().sort().join(' ') !== final.slice().sort().join(' ');
    const deadline = Math.min(opts.deadline || Infinity, Date.now() + 25000);
    const partonic = initial.concat(final).some(s => props(s) && props(s).colour);
    // extras: every elementary particle and every hadron; free quarks and gluons only
    // when the process is already partonic
    const pool = Object.keys(PARTICLES).concat(Object.keys(HADRONS)).filter(s => { const p = props(s); return p && (partonic || !p.colour); });
    const V = new Map(pool.map(s => [s, vec(s)]));
    const D = add(final.reduce((a, s) => add(a, vec(s)), [0, 0, 0, 0, 0]), initial.reduce((a, s) => add(a, vec(s)), [0, 0, 0, 0, 0]), -1);
    const byVec = new Map();
    pool.forEach(s => { const k = vkey(V.get(s)); if (!byVec.has(k)) byVec.set(k, []); byVec.get(k).push(s); });
    const neg = v => v.map(x => -x);

    // candidates: { addIn: [], addOut: [] }
    const cands = [];
    const push = (addIn, addOut) => cands.push({ addIn, addOut, cost: addIn.concat(addOut).reduce((a, s) => a + cost(s), 0) + 2 * (addIn.length + addOut.length) });
    (byVec.get(vkey(D)) || []).forEach(x => push([x], []));                          // one in
    (byVec.get(vkey(neg(D))) || []).forEach(x => push([], [x]));                     // one out
    pool.forEach(x => {
        const vx = V.get(x);
        (byVec.get(vkey(add(vx, D, -1))) || []).forEach(y => push([x], [y]));       // x in, y out: vx − vy = D
        (byVec.get(vkey(add(D, vx, -1))) || []).forEach(y => { if (x <= y) push([x, y], []); });        // vx + vy = D
        (byVec.get(vkey(add(neg(D), vx, -1))) || []).forEach(y => { if (x <= y) push([], [x, y]); });   // −(vx + vy) = D
    });
    cands.sort((a, b) => a.cost - b.cost);

    // screen every candidate with the selection rules first (cheap), then refine the cost:
    // a route that needs the weak interaction, changes more flavour, or merges three
    // particles into one is less natural than a strong or electromagnetic 2 → 2 process
    const items = [], closed = [], seen = new Set(), ok = [];
    const t0 = Date.now();
    for (const c of cands.slice(0, 6000)) {
        if (Date.now() - t0 > 6000) break;
        const ini = initial.concat(c.addIn), fin = final.concat(c.addOut);
        if (ini.length + fin.length > 6) continue;
        // an added particle that is already on the other side only scatters: no conversion
        if (conversion && (c.addIn.some(x => final.includes(x) || c.addOut.includes(x)) || c.addOut.some(x => initial.includes(x)))) continue;
        const k = key(ini, fin);
        if (seen.has(k)) continue;
        seen.add(k);
        const rules = checkProcess(ini, fin, { sqrtS });
        if (!rules.allowed) {
            const fails = rules.checks.filter(x => x.status === 'fail');
            if (ini.length === 1 && fails.length === 1 && fails[0].id === 'kinematics' && closed.length < 3) closed.push({ ini, fin, why: fails[0].detail, name: NAMED_K[k] || '' });
            continue;
        }
        const dF = rules.dF || {};
        const flavourUnits = ['s', 'c', 'b', 't'].reduce((a, f) => a + Math.abs(dF[f] || 0), 0);
        const shape = (ini.length >= 3 && fin.length === 1) ? 2.5 : 0;
        const decay = ini.length === 1 ? -3.5 : 0;          // a spontaneous decay needs no beam or target
        ok.push({ c, ini, fin, k, rules, score: c.cost + (rules.needsWeak ? 2.5 : 0) + 1.5 * flavourUnits + shape + decay + (NAMED_K[k] ? -1 : 0) });
    }
    ok.sort((a, b) => a.score - b.score);
    for (const { c, ini, fin, k, rules } of ok) {
        if (Date.now() > deadline || items.length >= MAX_ITEMS) break;
        const res = buildRuleDiagrams(ini, fin, { loops: false, autoLoops: loops, gauge, sqrtS, extras: false, deadline: Math.min(deadline, Date.now() + 1500) });
        const it = res.tree[0] || res.loops[0];
        if (!it) continue;
        const d = it.diagram;
        // mark the added particles: elementary legs get a ring, added hadrons a highlighted brace
        const mark = (side, sym) => {
            const m = d.hadronMeta;
            if (m && HADRONS[sym]) {
                const blocks = side === 'in' ? m.blocksL : m.blocksR, names = side === 'in' ? m.inHad : m.outHad, ids = (side === 'in' ? m.idsL : m.idsR) || [];
                const b = blocks.find(x => !x.extra && names[x.gid] === sym);
                if (b) { b.extra = true; ids.slice(b.from, b.to + 1).forEach(id => { const v = d.verts.find(q => q.id === id); if (v) v.extra = true; }); }
                return;
            }
            const id = toEngineId(sym), v = d.verts.find(x => x.kind === 'ext' && x.side === side && !x.extra && x.pid === id);
            if (v) v.extra = true;
        };
        c.addIn.forEach(s => mark('in', s)); c.addOut.forEach(s => mark('out', s));
        items.push(Object.assign({}, it, {
            kind: 'extended', initial: ini, final: fin, added: { in: c.addIn, out: c.addOut },
            extra: c.addIn.concat(c.addOut).join(', '), side: c.addIn.length && c.addOut.length ? 'both' : c.addIn.length ? 'in' : 'out',
            routeName: NAMED_K[k] || '', loopRoute: !res.tree.length, rules
        }));
    }
    items.closed = closed;
    return items;
}

