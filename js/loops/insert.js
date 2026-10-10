// js/loops/insert.js
// "Generate loop here": one more loop at a chosen point of an existing diagram,
// computed on the spot from the vertex table. Nothing is pre-built: the diagram is
// turned into a graph, the chosen move is applied, the new lines are left free, and
// every particle assignment the Standard Model vertices allow is found (labelAll).
// Results are deduplicated by graph isomorphism and come back as complete diagrams
// with their loop records, symmetry factor and strength, ready to be laid out again.
//
// Moves (each adds exactly one loop):
//   vertex      replace a vertex by every one-loop 1PI piece with the same legs
//               (triangle; bubble with a quartic vertex; box … for a quartic vertex)
//   selfEnergy  put every one-loop 1PI two-point piece on a line (bubble, seagull),
//               including mixing (γ–Z, flavour change) where the rest stays valid
//   tadpole     a stem from the point to a loop (only Higgs-type stems survive:
//               photon and Z tadpoles vanish by Lorentz invariance, gluon ones by colour)
//   chord       a new propagator between two different points; the lines on the
//               paths between them may change particle (e.g. e → ν when a W is added)

import { FV } from './engine.js';
import { getModel, fromDiagram, labelAll, canon, toDiagram, topologies, analyze, mixingAllowed, cloneS } from './graph.js';
import { colourValid } from './color.js';

const anti = FV.anti;

// one-loop 1PI pieces with k legs and no trees hanging off the loop (cached)
const RINGS = new Map();
function ringPieces(k) {
    if (RINGS.has(k)) return RINGS.get(k);
    const out = topologies(k, 1).filter(T => {
        const intE = T.edges.filter(e => !T.nodes[e.u].ext && !T.nodes[e.v].ext);
        const intN = T.nodes.filter(n => !n.ext).length;
        if (intE.length !== intN) return false;              // a single cycle
        const deg = new Map();
        intE.forEach(e => { deg.set(e.u, (deg.get(e.u) || 0) + (e.u === e.v ? 2 : 1)); if (e.u !== e.v) deg.set(e.v, (deg.get(e.v) || 0) + 1); });
        return [...deg.values()].every(x => x === 2) && deg.size === intN;
    });
    RINGS.set(k, out);
    return out;
}

function positions(d, base) {
    return base.vid.map(id => { const v = d.verts.find(q => q.id === id); return v && v.x !== undefined ? { x: v.x, y: v.y } : null; });
}

/** Label the free lines of S, dedupe, and build diagrams. filter(labels, S) may reject. */
function solve(d, S, labels, pos, opts, filter) {
    const mdl = getModel(opts.model || d.gauge || 'unitary');
    const seen = new Set(), out = [];
    let rejected = 0;
    const r = labelAll(S, labels, mdl, {
        deadline: opts.deadline || Date.now() + 8000, limit: 20000,
        onSolution: (lab) => {
            if (filter && !filter(lab)) { rejected++; return; }
            const ck = canon(S, lab).key;
            if (seen.has(ck)) return;
            seen.add(ck);
            const nd = toDiagram(S, lab, d.initial, d.final, mdl, { pos });
            nd.gauge = mdl.name;
            if (!colourValid(nd)) { rejected++; return; }
            out.push(nd);
        }
    });
    out.sort((a, b) => b.strength - a.strength);
    return { diagrams: out, truncated: r.aborted, rejected };
}

/** Node indices of a vertex and its incident lines in the graph form. */
function incidentEdges(S, x) {
    const r = [];
    S.edges.forEach((e, i) => { if (e.u === x || e.v === x) r.push(i); });
    return r;
}

// ------------------------------------------------------------------ moves

export function vertexLoops(d, vid, opts = {}) {
    const base = fromDiagram(d), x = base.idx.get(vid);
    const S0 = base.S;
    if (x === undefined || S0.nodes[x].ext || S0.nodes[x].ct) return { diagrams: [], note: 'Not an interaction vertex.' };
    const inc = incidentEdges(S0, x);
    if (inc.some(i => S0.edges[i].u === S0.edges[i].v)) return { diagrams: [], note: 'This vertex already closes a loop on itself; insert the loop on one of its lines instead.' };
    const k = inc.length, pos0 = positions(d, base), p = pos0[x];
    const all = { diagrams: [], truncated: false, rejected: 0 };
    for (const R of ringPieces(k)) {
        const S = cloneS(S0), labels = base.labels.slice(), pos = pos0.slice();
        // blob ext node j  ->  the j-th line of the vertex
        const map = new Map();
        R.nodes.forEach((n, j) => { if (!n.ext) { map.set(j, S.nodes.length); S.nodes.push({ ext: false }); pos.push(p ? { x: p.x + 18 * Math.cos(j * 2.1), y: p.y + 18 * Math.sin(j * 2.1) } : null); } });
        R.edges.forEach(e => {
            const ue = R.nodes[e.u].ext, ve = R.nodes[e.v].ext;
            if (!ue && !ve) { S.edges.push({ u: map.get(e.u), v: map.get(e.v) }); labels.push(null); return; }
            const extJ = ue ? R.nodes[e.u].extIdx : R.nodes[e.v].extIdx, inner = map.get(ue ? e.v : e.u);
            const ei = inc[extJ], old = S.edges[ei];
            if (old.u === x) old.u = inner; else old.v = inner;
        });
        // remove node x (it has no lines left): keep it as an isolated placeholder is not allowed, so drop it
        const keep = S.nodes.map((_, i) => i !== x);
        const remap = []; let c = 0;
        S.nodes.forEach((_, i) => { remap[i] = keep[i] ? c++ : -1; });
        const S2 = { nodes: S.nodes.filter((_, i) => keep[i]), edges: S.edges.map(e => ({ u: remap[e.u], v: remap[e.v] })) };
        const r = solve(d, S2, labels, pos.filter((_, i) => keep[i]), opts);
        all.diagrams.push(...r.diagrams); all.truncated = all.truncated || r.truncated; all.rejected += r.rejected;
    }
    dedupe(all);
    return all;
}

export function selfEnergyLoops(d, eid, opts = {}) {
    const base = fromDiagram(d), S0 = base.S;
    const ei = base.eid.indexOf(eid);
    if (ei < 0) return { diagrams: [] };
    const e0 = S0.edges[ei], p = base.labels[ei];
    if (e0.u === e0.v) return { diagrams: [], note: 'This line is itself a closed loop; insert on a line that joins two points.' };
    const pos0 = positions(d, base);
    const extU = S0.nodes[e0.u].ext, extV = S0.nodes[e0.v].ext;
    const all = { diagrams: [], truncated: false, rejected: 0 };
    // which outer halves may change: neither (plain), the v side, or the u side (mixing)
    const modes = [[false, false]];
    if (opts.mixing !== false) { if (!extV) modes.push([false, true]); if (!extU) modes.push([true, false]); }
    for (const R of ringPieces(2)) for (const [freeU, freeV] of modes) {
        const S = cloneS(S0), labels = base.labels.slice(), pos = pos0.slice();
        const pu = pos0[e0.u], pv = pos0[e0.v];
        const mid = pu && pv ? { x: (pu.x + pv.x) / 2, y: (pu.y + pv.y) / 2 } : null;
        const map = new Map();
        R.nodes.forEach((n, j) => { if (!n.ext) { map.set(j, S.nodes.length); S.nodes.push({ ext: false }); pos.push(mid ? { x: mid.x + (j % 2 ? 14 : -14), y: mid.y } : null); } });
        // remove the old line; blob leg 0 -> u side, leg 1 -> v side
        S.edges.splice(ei, 1); labels.splice(ei, 1);
        let legU = -1, legV = -1;
        R.edges.forEach(e => {
            const ue = R.nodes[e.u].ext, ve = R.nodes[e.v].ext;
            if (!ue && !ve) { S.edges.push({ u: map.get(e.u), v: map.get(e.v) }); labels.push(null); return; }
            const j = ue ? R.nodes[e.u].extIdx : R.nodes[e.v].extIdx, inner = map.get(ue ? e.v : e.u);
            if (j === 0) { S.edges.push({ u: e0.u, v: inner }); labels.push(freeU ? null : p); legU = S.edges.length - 1; }
            else { S.edges.push({ u: inner, v: e0.v }); labels.push(freeV ? null : p); legV = S.edges.length - 1; }
        });
        const r = solve(d, S, labels, pos, opts, (lab) => {
            const a = lab[legU], b = lab[legV];
            if ((freeU && a === p) || (freeV && b === p)) return false;      // the plain case is its own mode
            if (a === b) return true;
            return mixingAllowed([anti(a), b]);
        });
        all.diagrams.push(...r.diagrams); all.truncated = all.truncated || r.truncated; all.rejected += r.rejected;
    }
    dedupe(all);
    all.diagrams.forEach(nd => { nd.insertKind = nd.loops.some(L => L.mixing) ? 'mixing' : 'self-energy'; });
    return all;
}

export function tadpoleLoops(d, target, opts = {}) {
    const base = fromDiagram(d), S0 = base.S, pos0 = positions(d, base);
    const S = cloneS(S0), labels = base.labels.slice(), pos = pos0.slice();
    let x;
    if (target.v) {
        x = base.idx.get(target.v);
        if (x === undefined || S0.nodes[x].ext || incidentEdges(S0, x).length !== 3) return { diagrams: [], note: 'A tadpole can hang from a line or from a vertex with three lines.' };
    } else {
        const ei = base.eid.indexOf(target.e);
        if (ei < 0 || S0.edges[ei].u === S0.edges[ei].v) return { diagrams: [] };
        const e = S0.edges[ei], p = labels[ei];
        x = S.nodes.length; S.nodes.push({ ext: false });
        const pu = pos0[e.u], pv = pos0[e.v];
        pos.push(pu && pv ? { x: (pu.x + pv.x) / 2, y: (pu.y + pv.y) / 2 } : null);
        S.edges[ei] = { u: e.u, v: x }; S.edges.push({ u: x, v: e.v }); labels.push(p);
    }
    const h = S.nodes.length; S.nodes.push({ ext: false });
    const px = pos[x]; pos.push(px ? { x: px.x, y: px.y - 50 } : null);
    S.edges.push({ u: x, v: h }, { u: h, v: h }); labels.push(null, null);
    const stem = S.edges.length - 2;
    let vanished = 0;
    const r = solve(d, S, labels, pos, opts, (lab) => {
        const s = FV.flowId(lab[stem]);
        if (s === 'gamma' || s === 'Z' || s === 'g') { vanished++; return false; }
        return true;
    });
    r.vanished = vanished;
    if (!r.diagrams.length) r.note = vanished ? 'The only tadpoles here have a photon, Z or gluon stem, which vanish (Lorentz invariance; colour for the gluon).' : 'No Standard Model vertex allows a tadpole here.';
    return r;
}

/** All simple paths between two nodes through internal nodes; returns the set of line indices on them. */
function pathEdges(S, a, b, skip) {
    const adj = S.nodes.map(() => []);
    S.edges.forEach((e, i) => { if (i === skip || e.u === e.v) return; adj[e.u].push([e.v, i]); adj[e.v].push([e.u, i]); });
    const out = new Set(), used = new Set([a]), stack = [];
    let steps = 0;
    const dfs = (x) => {
        if (++steps > 200000) return;
        if (x === b) { stack.forEach(i => out.add(i)); return; }
        for (const [y, i] of adj[x]) {
            if (used.has(y) || (S.nodes[y].ext && y !== b)) continue;
            used.add(y); stack.push(i); dfs(y); stack.pop(); used.delete(y);
        }
    };
    dfs(a);
    return out;
}

/** slot: { v: vertexId } (a vertex with three lines) or { e: edgeId }. */
export function chordLoops(d, slotA, slotB, opts = {}) {
    if (slotA.e && slotB.e && slotA.e === slotB.e) return selfEnergyLoops(d, slotA.e, opts);
    if (slotA.v && slotB.v && slotA.v === slotB.v) return { diagrams: [], note: 'Pick two different points.' };
    const base = fromDiagram(d), S0 = base.S, pos0 = positions(d, base);
    const S = cloneS(S0), labels = base.labels.slice(), pos = pos0.slice();
    const at = (slot) => {
        if (slot.v) {
            const x = base.idx.get(slot.v);
            if (x === undefined || S.nodes[x].ext || incidentEdges(S, x).length !== 3) return -1;
            return x;
        }
        const ei = base.eid.indexOf(slot.e);
        if (ei < 0 || S.edges[ei].u === S.edges[ei].v) return -1;
        const e = S.edges[ei], w = S.nodes.length;
        S.nodes.push({ ext: false });
        const pu = pos[e.u], pv = pos[e.v];
        pos.push(pu && pv ? { x: (pu.x + pv.x) / 2, y: (pu.y + pv.y) / 2 } : null);
        S.edges[ei] = { u: e.u, v: w }; S.edges.push({ u: w, v: e.v }); labels.push(labels[ei]);
        return w;
    };
    const x = at(slotA), y = at(slotB);
    if (x < 0 || y < 0) return { diagrams: [], note: 'A new line can start on a line or on a vertex with three lines (a quartic vertex is already full).' };
    const chord = S.edges.length;
    S.edges.push({ u: x, v: y }); labels.push(null);
    // lines on the paths between the two points may change particle
    const free = pathEdges(S, x, y, chord);
    free.forEach(i => { const e = S.edges[i]; if (!S.nodes[e.u].ext && !S.nodes[e.v].ext) labels[i] = null; });
    const r = solve(d, S, labels, pos, opts);
    r.diagrams.forEach(nd => { nd.insertKind = 'chord'; });
    if (!r.diagrams.length) r.note = 'No Standard Model line can join these two points.';
    return r;
}

function dedupe(all) {
    const seen = new Set();
    all.diagrams = all.diagrams.filter(nd => { if (seen.has(nd.canon)) return false; seen.add(nd.canon); return true; });
    all.diagrams.sort((a, b) => b.strength - a.strength);
}

/** What the menu can offer at a vertex or line, with how many diagrams each gives. */
export function menuFor(d, target, opts = {}) {
    const items = [];
    if (target.v) {
        const v = d.verts.find(q => q.id === target.v);
        if (!v || v.kind !== 'v' || v.ct) return items;
        const nLines = d.edges.filter(e => e.a === v.id || e.b === v.id).length;
        items.push({ id: 'vertex', label: 'Vertex correction here', run: () => vertexLoops(d, target.v, opts) });
        if (nLines === 3) {
            items.push({ id: 'tadpole', label: 'Tadpole on this vertex', run: () => tadpoleLoops(d, target, opts) });
            items.push({ id: 'start', label: 'Start a loop line here…', start: { v: target.v } });
        }
    } else if (target.e) {
        const e = d.edges.find(q => q.id === target.e);
        if (!e) return items;
        const ext = FV.vert(d, e.a).kind === 'ext' || FV.vert(d, e.b).kind === 'ext';
        items.push({ id: 'se', label: ext ? 'Self-energy on this external leg' : 'Self-energy on this line', run: () => selfEnergyLoops(d, target.e, opts) });
        items.push({ id: 'tadpole', label: 'Tadpole on this line', run: () => tadpoleLoops(d, target, opts) });
        if (e.a !== e.b) items.push({ id: 'start', label: 'Start a loop line here…', start: { e: target.e } });
    }
    return items;
}

export { analyze };
