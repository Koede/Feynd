// js/loops/validate.js
// Physics audit of a generated diagram. Every check is a property a real Feynman
// diagram must have, tested from the graph itself rather than from how it was built.
//
//   structure    connected; every endpoint exists; external legs have one line;
//                internal vertices are 3- or 4-point (counterterm marks excepted)
//   vertices     each vertex is in the tabulated interaction list and its legs
//                conserve electric charge, baryon number and lepton number
//   fermion flow every fermion line enters and leaves a vertex consistently (the
//                tabulated vertices guarantee this; checked again from the arrows)
//   externals    the open legs are exactly the requested initial and final states
//   loops        E - V + 1 matches the number of inserted loops

import { FV } from './engine.js';

const P = () => FV.P;

function sum(ids, f) { return ids.reduce((a, id) => a + f(P()[id]), 0); }
const near = (a, b) => Math.abs(a - b) < 1e-9;

export function validateDiagram(d0, ini, fin) {
    const bad = [];
    // Spectator quarks of a hadron diagram are checked on their own: one straight line,
    // the same flavour at both ends. The interaction itself is the rest of the graph.
    const specEdges = d0.edges.filter(e => e.spectator);
    for (const e of specEdges) {
        const a = d0.verts.find(v => v.id === e.a), b = d0.verts.find(v => v.id === e.b);
        if (!a || !b || a.pid !== e.p || b.pid !== e.p) bad.push(`spectator ${e.id} changes flavour`);
    }
    const d = specEdges.length ? { ...d0, verts: d0.verts.filter(v => !v.spectator), edges: d0.edges.filter(e => !e.spectator) } : d0;
    const vid = new Map(d.verts.map(v => [v.id, v]));
    for (const e of d.edges) {
        if (!vid.has(e.a) || !vid.has(e.b)) bad.push(`edge ${e.id} has a missing endpoint`);
        if (e.a === e.b && (!vid.has(e.a) || vid.get(e.a).kind !== 'v')) bad.push(`edge ${e.id} is a self-loop on an external point`);
        if (!P()[e.p]) bad.push(`edge ${e.id} carries unknown particle ${e.p}`);
    }
    if (bad.length) return bad;

    // connectivity
    const seen = new Set([d.verts[0].id]), stack = [d.verts[0].id];
    while (stack.length) {
        const x = stack.pop();
        for (const e of d.edges) {
            const y = e.a === x ? e.b : e.b === x ? e.a : null;
            if (y && !seen.has(y)) { seen.add(y); stack.push(y); }
        }
    }
    if (seen.size !== d.verts.length) bad.push('diagram is not connected');

    // vertices
    for (const v of d.verts) {
        const legs = FV.legsAt(d, v.id);
        if (v.kind === 'ext') {
            if (legs.length !== 1) bad.push(`external vertex ${v.id} has ${legs.length} lines`);
            continue;
        }
        const ids = legs.map(l => l.p);
        if (v.ct) { // counterterm mark: it stands in for a collapsed loop and keeps the legs of the vertex it replaced
            if (!near(sum(ids, p => p.Q), 0)) bad.push(`counterterm ${v.id} violates charge`);
            if (!near(sum(ids, p => p.B), 0)) bad.push(`counterterm ${v.id} violates baryon number`);
            if (!near(sum(ids, p => p.L), 0)) bad.push(`counterterm ${v.id} violates lepton number`);
            continue;
        }
        if (ids.length !== 3 && ids.length !== 4) { bad.push(`vertex ${v.id} has ${ids.length} legs`); continue; }
        if (!near(sum(ids, p => p.Q), 0)) bad.push(`vertex ${v.id} (${ids.join(' ')}) violates charge`);
        if (!near(sum(ids, p => p.B), 0)) bad.push(`vertex ${v.id} (${ids.join(' ')}) violates baryon number`);
        if (!near(sum(ids, p => p.L), 0)) bad.push(`vertex ${v.id} (${ids.join(' ')}) violates lepton number`);
        if (!FV.vinfo(d, v)) bad.push(`vertex ${v.id} (${ids.join(' ')}) is not a Standard Model interaction`);
        // fermion number: legs are all-outgoing, so fermions and antifermions must pair up
        const nf = ids.filter(id => P()[id].fermion && !P()[id].isAnti).length;
        const na = ids.filter(id => P()[id].fermion && P()[id].isAnti).length;
        if (nf !== na) bad.push(`vertex ${v.id} (${ids.join(' ')}) breaks fermion flow`);
    }

    // externals
    if (ini && fin) {
        const have = d.verts.filter(v => v.kind === 'ext').map(v => v.side + ':' + v.pid).sort().join(',');
        const want = ini.map(p => 'in:' + p).concat(fin.map(p => 'out:' + p)).sort().join(',');
        if (have !== want) bad.push(`external legs ${have} do not match the request ${want}`);
    }

    // loops
    const L = FV.countLoops(d);
    const declared = d.nloops !== undefined ? d.nloops : (d.loops || []).length;
    if (L !== declared) bad.push(`graph has ${L} loops but ${declared} were inserted`);
    return bad;
}
