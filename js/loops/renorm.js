// js/loops/renorm.js
// Renormalization of an arbitrary diagram, recomputed whenever a loop is added.
//
// For every one-particle-irreducible piece (blob) of the diagram:
//   • its legs, loop number and superficial degree of divergence
//       D = 4 − B − 3F/2 − Σ[g]   (B, F: boson and fermion legs; [g]: coupling mass dimension)
//   • what removes the divergence: the counterterm of the tree-level propagator or vertex
//     with the same legs, nothing (convergent), or nothing because no tree-level vertex
//     exists (loop-induced, finite in the gauge-invariant sum);
//   • for one-loop pieces, the explicit counterterm constants (FV.ctInfo);
//   • for multi-loop pieces, the divergent one-loop subdiagrams (BPHZ forests): each is
//     cancelled by a diagram in which it is replaced by its one-loop counterterm ⊗, and
//     what is left is removed by the L-loop counterterm of the whole piece.
// Plus the LSZ factors of the external legs, the symmetry factor and the sign from
// closed fermion and ghost loops.

import { FV } from './engine.js';
import { getModel } from './graph.js';

const P = FV.P, anti = FV.anti, key = FV.key, lab = FV.labHTML;
const LOOPWORD = ['tree-level', 'one-loop', 'two-loop', 'three-loop', 'four-loop'];
const Dtxt = D => (Number.isInteger(D) ? String(D) : D.toFixed(1)).replace('-', '−');

function legsAtVertex(d, vid) { return FV.legsAt(d, vid).map(x => x.p); }

/** Simple cycles inside a set of edges (edge-id sets), capped. */
function simpleCycles(d, edgeIds, cap = 64) {
    const es = edgeIds.map(id => FV.edgeOf(d, id)).filter(Boolean);
    const adj = new Map();
    es.forEach(e => {
        if (e.a === e.b) return;
        [[e.a, e.b], [e.b, e.a]].forEach(([x, y]) => { if (!adj.has(x)) adj.set(x, []); adj.get(x).push([y, e.id]); });
    });
    const out = [], seen = new Set();
    es.filter(e => e.a === e.b).forEach(e => { out.push({ verts: [e.a], edges: [e.id] }); });
    const nodes = [...adj.keys()].sort();
    for (const s of nodes) {
        const path = [], pv = [s];
        const dfs = (x) => {
            if (out.length >= cap) return;
            for (const [y, eid] of adj.get(x) || []) {
                if (path.includes(eid)) continue;
                if (y === s && path.length >= 1) {
                    const cyc = path.concat([eid]);
                    if (cyc.length === 2 && cyc[0] === cyc[1]) continue;
                    const k = cyc.slice().sort().join(',');
                    if (!seen.has(k)) { seen.add(k); out.push({ verts: pv.slice(), edges: cyc }); }
                    continue;
                }
                if (pv.includes(y) || y < s) continue;
                path.push(eid); pv.push(y); dfs(y); path.pop(); pv.pop();
            }
        };
        dfs(s);
    }
    return out;
}

/** Legs (outgoing particles) of a sub-graph given by vertex and edge sets. */
function subLegs(d, verts, edges) {
    const legs = [], vs = new Set(verts), es = new Set(edges);
    d.edges.forEach(e => {
        if (es.has(e.id)) return;
        if (vs.has(e.a)) legs.push(e.p);
        if (vs.has(e.b)) legs.push(anti(e.p));
    });
    return legs;
}

function degree(d, verts, legs, mdl) {
    let dims = 0;
    verts.forEach(vid => { const info = mdl.info(legsAtVertex(d, vid)); if (info && info.dim) dims += info.dim; });
    const nB = legs.filter(p => !P[p].fermion).length, nF = legs.filter(p => P[p].fermion).length;
    return 4 - nB - 1.5 * nF - dims;
}

function treeCounterpart(legs, mdl) {
    if (legs.length === 2) return 'propagator';
    if (legs.length === 3 && mdl.V.has(key(legs))) return 'vertex';
    if (legs.length === 4 && mdl.Q4.has(key(legs))) return 'vertex';
    return null;
}

/** Replace a sub-graph by one counterterm vertex ⊗ (for the counterterm diagrams). */
export function contract(d, verts, edges, info) {
    const nd = FV.cloneDiag(d), keep = FV.vert(nd, verts[0]);
    nd.edges = nd.edges.filter(e => !edges.includes(e.id));
    verts.slice(1).forEach(id => nd.edges.forEach(e => { if (e.a === id) e.a = keep.id; if (e.b === id) e.b = keep.id; }));
    nd.verts = nd.verts.filter(v => !verts.slice(1).includes(v.id));
    const vs = verts.map(id => FV.vert(d, id)).filter(v => v && v.x !== undefined);
    if (vs.length) { keep.x = vs.reduce((a, v) => a + v.x, 0) / vs.length; keep.y = vs.reduce((a, v) => a + v.y, 0) / vs.length; }
    keep.ct = info;
    nd.loops = nd.loops.filter(L => !L.edges.some(id => edges.includes(id)));
    nd.edges.forEach(e => { e.lids = e.lids.filter(l => nd.loops.some(L => L.id === l)); });
    nd.nloops = FV.countLoops(nd);
    nd.isCT = true;
    return nd;
}

function particles(d, edgeIds) {
    const uniq = [];
    edgeIds.forEach(id => { const e = FV.edgeOf(d, id); if (!e) return; const b = e.p === 'W-' ? 'W+' : FV.flowId(e.p); if (!uniq.includes(b)) uniq.push(b); });
    return uniq.map(b => b === 'W+' ? 'W<sup>±</sup>' : lab(b)).join(', ');
}

/**
 * Structured renormalization report for a diagram.
 * Returns { blobs: [{ id, title, loops, legs, D, verdict, rule, exprs, note, loopFactor, subs: [...], ctDiagrams: [...] }], ext, symmetry, sign, gauge }
 */
export function renormReport(d) {
    const mdl = getModel(d.gauge || 'unitary');
    const out = { blobs: [], ext: FV.extFactors(d), symmetry: d.symmetry || 1, gauge: d.gauge || 'unitary' };
    const nF = d.fermionLoops || 0, nG = d.ghostLoops || 0;
    out.sign = nF + nG ? '(−1)' + (nF + nG > 1 ? '<sup>' + (nF + nG) + '</sup>' : '') + ' from ' + [nF ? nF + ' closed fermion loop' + (nF > 1 ? 's' : '') : '', nG ? nG + ' ghost loop' + (nG > 1 ? 's' : '') : ''].filter(Boolean).join(' and ') : '';
    (d.loops || []).forEach(L => {
        const legs = L.attached || subLegs(d, L.verts, L.edges);
        const loops = L.loops || 1;
        const D = L.D !== undefined ? L.D : degree(d, L.verts, legs, mdl);
        const tc = treeCounterpart(legs, mdl);
        const b = { id: L.id, loops, legs, D, subs: [], ctDiagrams: [] };
        const legTxt = legs.map(p => lab(p)).join(' ');
        if (L.type === 'tadpole') {
            b.title = 'Tadpole, loop of ' + particles(d, L.edges);
            b.verdict = 'tadpole counterterm';
            b.rule = 'i δt';
            b.exprs = ['A one-point Higgs function. With the usual condition that the renormalized vacuum expectation value stays v, the tadpole counterterm δt cancels the sum of all tadpoles, so these diagrams drop out of physical amplitudes.', 'In the Fleischer–Jegerlehner scheme (δt = 0) they are kept instead and shift the masses in a gauge-independent way.'];
            b.loopFactor = L.fermionLoop ? '(−1) × Tr[…], ∫ d⁴k/(2π)⁴' : '∫ d⁴k/(2π)⁴';
        } else if (loops === 1) {
            const c = FV.ctInfo(d, L);
            Object.assign(b, { title: c.title, rule: c.rule, exprs: c.exprs, note: c.note, loopFactor: c.loopFactor, sector: c.sector });
            b.verdict = D < 0 ? 'convergent' : L.induced ? 'finite (loop-induced)' : tc ? 'tree-level ' + tc + ' counterterm' : 'finite';
            if (L.type === 'ngon' && L.npoint === 2) b.title = 'Seagull self-energy (quartic vertex closed on itself), loop of ' + particles(d, L.edges);
            if (D >= 0 && !L.induced && tc) {
                const kind = legs.length === 2 ? 'prop' : 'vertex';
                b.ctDiagrams.push({ caption: 'Loop ' + L.id + ' replaced by its one-loop ' + (kind === 'prop' ? 'propagator' : 'vertex') + ' counterterm ⊗', diagram: contract(d, L.verts, L.edges, { kind, loop: L.id }) });
            }
        } else {
            b.title = LOOPWORD[loops].replace(/^./, c => c.toUpperCase()) + ' ' + (legs.length === 2 ? 'self-energy' : legs.length === 3 ? 'vertex' : legs.length + '-point') + ' piece, lines ' + particles(d, L.edges);
            b.loopFactor = '∫ d⁴k₁/(2π)⁴ … d⁴k' + loops + '/(2π)⁴' + (L.fermionLoop ? ', (−1) per closed fermion loop' : '');
            b.rule = D < 0 && !b.subs.length ? 'none' : (tc ? LOOPWORD[loops] + ' ' + tc + ' counterterm δ<sup>(' + loops + ')</sup>' : 'none');
            b.exprs = ['Overall superficial degree D = ' + Dtxt(D) + ' with legs ' + legTxt + '.'];
            // divergent one-loop subdiagrams
            // one-loop subdiagrams: cycles with no other line joining two of their vertices
            // (a cycle with such a chord is not a one-loop subgraph but the whole piece)
            const cycles = simpleCycles(d, L.edges).filter(cy => {
                const vs = new Set(cy.verts), es = new Set(cy.edges);
                return !d.edges.some(e => !es.has(e.id) && vs.has(e.a) && vs.has(e.b));
            });
            cycles.forEach(cy => {
                const sl = subLegs(d, cy.verts, cy.edges), sD = degree(d, cy.verts, sl, mdl), stc = treeCounterpart(sl, mdl);
                const div = sD >= 0 && stc;
                b.subs.push({ verts: cy.verts, edges: cy.edges, legs: sl, D: sD, divergent: !!div, kind: stc, text: 'loop of ' + particles(d, cy.edges) + ' with legs ' + sl.map(p => lab(p)).join(' ') + ': D = ' + Dtxt(sD) + (div ? ', divergent — a ' + stc + ' subdivergence' : sD >= 0 ? ', no tree-level counterpart, finite in the gauge-invariant sum' : ', convergent') });
                if (div && b.ctDiagrams.length < 6) b.ctDiagrams.push({ caption: 'Subdivergence (' + particles(d, cy.edges) + ') replaced by its one-loop ' + stc + ' counterterm ⊗', diagram: contract(d, cy.verts, cy.edges, { kind: stc === 'propagator' ? 'prop' : 'vertex', sub: true }) });
            });
            const nDiv = b.subs.filter(s => s.divergent).length;
            b.verdict = D >= 0 && tc ? 'overall divergent' + (nDiv ? ' with ' + nDiv + ' subdivergence' + (nDiv > 1 ? 's' : '') : '') : (nDiv ? 'overall convergent, ' + nDiv + ' subdivergence' + (nDiv > 1 ? 's' : '') : D >= 0 ? 'finite (loop-induced)' : 'convergent');
            b.exprs.push(nDiv
                ? 'BPHZ: add the ' + nDiv + ' counterterm diagram' + (nDiv > 1 ? 's' : '') + ' below, in which each divergent one-loop subdiagram is replaced by its one-loop counterterm. The non-local (log-of-momentum) divergences cancel; ' + (D >= 0 && tc ? 'the local divergence that remains is removed by the ' + LOOPWORD[loops] + ' counterterm of the ' + tc + '.' : 'no overall counterterm is needed.')
                : (D >= 0 && tc ? 'No divergent subdiagram: the overall divergence is local and removed by the ' + LOOPWORD[loops] + ' ' + tc + ' counterterm.' : 'Finite.'));
            if (d.gauge !== 'feynman' && L.edges.some(id => { const e = FV.edgeOf(d, id); return e && ['W+', 'W-', 'Z'].includes(e.p); })) b.note = 'Power counting assumes a renormalizable (R_ξ) gauge; in unitary gauge single diagrams look more divergent, the sum does not.';
        }
        out.blobs.push(b);
    });
    return out;
}
