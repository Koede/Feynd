// js/loops/graph.js
// General Feynman-graph machinery, used for diagrams of any loop order and for
// inserting a loop at a chosen point of an existing diagram.
//
//   structure  S = { nodes: [{ ext, extIdx }], edges: [{ u, v }] }   (u === v is a self-loop)
//   labels     one particle id per edge, flowing u → v (null = still free)
//
// Everything is driven by the vertex table: a labelling is valid when every internal
// node's outgoing legs form a cubic or quartic Standard Model vertex. Topologies are
// grown loop by loop with moves that are complete for graphs whose internal vertices
// have three or four legs (a new propagator between any two points, a self-contracted
// quartic vertex, a tadpole), and duplicates are removed with a canonical form, which
// also gives the symmetry factor.

import { FV } from './engine.js';

const P = FV.P, anti = FV.anti, key = FV.key;
export const LOOP16 = 1 / (16 * Math.PI * Math.PI);

// ------------------------------------------------------------------ models

export function buildModel(name, maps) {
    const V = new Map(), Q4 = new Map();
    maps.forEach(([v, q]) => { v.forEach((i, k) => V.set(k, i)); q.forEach((i, k) => Q4.set(k, i)); });
    const idx = { 3: new Map(), 4: new Map() };
    const add = (legs) => {
        const n = legs.length, m = idx[n];
        for (let mask = 0; mask < (1 << n); mask++) {
            const S = [], R = [];
            legs.forEach((l, i) => ((mask >> i) & 1 ? S : R).push(l));
            const k = key(S);
            let e = m.get(k);
            if (!e) { e = new Map(); m.set(k, e); }
            const rk = key(R);
            if (!e.has(rk)) e.set(rk, R.slice().sort());
        }
    };
    V.forEach(i => add(i.legs)); Q4.forEach(i => add(i.legs));
    [3, 4].forEach(n => idx[n].forEach((e, k) => idx[n].set(k, [...e.values()])));
    const particles = new Set();
    V.forEach(i => i.legs.forEach(l => particles.add(l))); Q4.forEach(i => i.legs.forEach(l => particles.add(l)));
    return {
        name, V, Q4, idx, particles,
        info: legs => legs.length === 3 ? V.get(key(legs)) : legs.length === 4 ? Q4.get(key(legs)) : undefined,
        valid: legs => legs.length === 3 ? V.has(key(legs)) : legs.length === 4 ? Q4.has(key(legs)) : false
    };
}

const MODELS = {};
/** 'unitary': physical W, Z, H with QCD ghosts. 'feynman': adds Goldstones and electroweak ghosts. */
export function getModel(name = 'unitary') {
    if (name && typeof name === 'object') return name;
    if (MODELS[name]) return MODELS[name];
    if (name === 'feynman' && FV.VR) MODELS[name] = buildModel(name, [[FV.V, FV.Q4], [FV.VR, FV.Q4R]]);
    else MODELS[name] = buildModel('unitary', [[FV.V, FV.Q4]]);
    return MODELS[name];
}

// ------------------------------------------------------------------ helpers

function incidence(S) {
    const inc = S.nodes.map(() => []);
    S.edges.forEach((e, i) => {
        if (e.u === e.v) inc[e.u].push({ i, end: 'L' });
        else { inc[e.u].push({ i, end: 'u' }); inc[e.v].push({ i, end: 'v' }); }
    });
    return inc;
}
const degOf = (inc) => inc.map(l => l.reduce((a, x) => a + (x.end === 'L' ? 2 : 1), 0));

export function cloneS(S) { return { nodes: S.nodes.map(n => Object.assign({}, n)), edges: S.edges.map(e => Object.assign({}, e)) }; }

// ------------------------------------------------------------------ labelling

/**
 * Every assignment of particles to the free edges (labels[i] == null) that makes every
 * internal node a vertex of the model. Calls onSolution(labels) for each.
 * Returns { count, aborted }.
 */
export function labelAll(S, labels0, mdl, { limit = Infinity, deadline = Infinity, onSolution } = {}) {
    const N = S.nodes.length, E = S.edges, inc = incidence(S), deg = degOf(inc);
    const lab = labels0.slice();
    const internal = [];
    for (let x = 0; x < N; x++) if (!S.nodes[x].ext) internal.push(x);
    const legsAt = (x) => {
        const r = [];
        for (const { i, end } of inc[x]) {
            const p = lab[i];
            if (p == null) continue;
            if (end === 'u') r.push(p); else if (end === 'v') r.push(anti(p)); else r.push(p, anti(p));
        }
        return r;
    };
    const nFree = (x) => { let n = 0; for (const f of inc[x]) if (lab[f.i] == null) n++; return n; };
    const ok = (y) => {
        if (S.nodes[y].ext) return true;
        if (deg[y] !== 3 && deg[y] !== 4) return false;
        const opts = mdl.idx[deg[y]].get(key(legsAt(y)));
        if (!opts) return false;
        return nFree(y) ? true : opts.some(r => r.length === 0);
    };
    let count = 0, aborted = false;
    for (const x of internal) if (!ok(x)) return { count: 0, aborted: false };

    const rec = () => {
        if (aborted) return;
        if (count >= limit || ((count & 63) === 0 && Date.now() > deadline)) { aborted = true; return; }
        let best = -1, bf = 99;
        for (const x of internal) { const f = nFree(x); if (f > 0 && f < bf) { bf = f; best = x; if (f === 1) break; } }
        if (best < 0) { count++; onSolution && onSolution(lab.slice()); return; }
        const x = best, F = inc[x].filter(f => lab[f.i] == null);
        const need = F.reduce((a, f) => a + (f.end === 'L' ? 2 : 1), 0);
        const opts = mdl.idx[deg[x]].get(key(legsAt(x))) || [];
        for (const R of opts) if (R.length === need) assign(x, F, 0, R);
    };
    const assign = (x, F, j, pool) => {
        if (aborted) return;
        if (j === F.length) {
            for (const f of F) {
                const e = E[f.i];
                if (e.u !== x && !ok(e.u)) return;
                if (e.v !== x && !ok(e.v)) return;
            }
            rec();
            return;
        }
        const f = F[j], tried = new Set();
        for (let k = 0; k < pool.length; k++) {
            const q = pool[k];
            if (tried.has(q)) continue;
            tried.add(q);
            if (f.end === 'L') {
                const aq = anti(q);
                if (aq < q && pool.includes(aq)) continue;      // one orientation per self-loop
                const ka = pool.findIndex((z, ii) => ii !== k && z === aq);
                if (ka < 0) continue;
                lab[f.i] = q;
                assign(x, F, j + 1, pool.filter((_, ii) => ii !== k && ii !== ka));
            } else {
                lab[f.i] = f.end === 'u' ? q : anti(q);
                assign(x, F, j + 1, pool.slice(0, k).concat(pool.slice(k + 1)));
            }
            lab[f.i] = null;
        }
    };
    rec();
    return { count, aborted };
}

// ------------------------------------------------------------------ canonical form

/**
 * Canonical string of a (labelled) graph with numbered external nodes, and the number
 * of automorphisms that fix the external nodes (vertex permutations only).
 */
export function canon(S, labels) {
    const N = S.nodes.length;
    const lb = i => labels ? labels[i] : '';
    const an = p => labels ? anti(p) : '';
    const nb = S.nodes.map(() => []), selfL = S.nodes.map(() => []);
    S.edges.forEach((e, i) => {
        const p = lb(i);
        if (e.u === e.v) { const a = an(p); selfL[e.u].push(p < a ? p : a); }
        else { nb[e.u].push([e.v, p]); nb[e.v].push([e.u, an(p)]); }
    });
    selfL.forEach(l => l.sort());
    const internal = [];
    for (let x = 0; x < N; x++) if (!S.nodes[x].ext) internal.push(x);
    const col0 = S.nodes.map((n, x) => n.ext ? 'E' + n.extIdx : 'I' + nb[x].length + '/' + selfL[x].join(','));

    const refine = (col) => {
        let c = col, n0 = new Set(c).size;
        for (let it = 0; it < N + 2; it++) {
            const sig = c.map((cx, x) => cx + '[' + nb[x].map(([y, p]) => c[y] + '~' + p).sort().join(';') + ']');
            const u = [...new Set(sig)].sort(), m = new Map(u.map((s, i) => [s, 'c' + String(i).padStart(3, '0')]));
            const nc = sig.map(s => m.get(s));
            if (u.length === n0) return nc;
            c = nc; n0 = u.length;
        }
        return c;
    };
    const certOf = (col) => {
        const order = [...Array(N).keys()].sort((a, b) => {
            const ea = S.nodes[a].ext, eb = S.nodes[b].ext;
            if (ea !== eb) return ea ? -1 : 1;
            if (ea) return S.nodes[a].extIdx - S.nodes[b].extIdx;
            return col[a] < col[b] ? -1 : col[a] > col[b] ? 1 : 0;
        });
        const pos = new Array(N);
        order.forEach((x, i) => { pos[x] = i; });
        return S.edges.map((e, i) => {
            let a = pos[e.u], b = pos[e.v], p = lb(i);
            if (a > b) { const t = a; a = b; b = t; p = an(p); }
            else if (a === b) { const q = an(p); p = p < q ? p : q; }
            return a + '-' + b + ':' + p;
        }).sort().join(' ');
    };
    let best = null, nbest = 0, leaves = 0;
    const search = (col) => {
        if (leaves > 50000) return;
        col = refine(col);
        const groups = new Map();
        for (const x of internal) { const g = groups.get(col[x]); if (g) g.push(x); else groups.set(col[x], [x]); }
        let cell = null;
        for (const c of [...groups.keys()].sort()) if (groups.get(c).length > 1) { cell = groups.get(c); break; }
        if (!cell) {
            leaves++;
            const ct = certOf(col);
            if (best === null || ct < best) { best = ct; nbest = 1; } else if (ct === best) nbest++;
            return;
        }
        for (const x of cell) { const c2 = col.slice(); c2[x] = col[x] + '*'; search(c2); }
    };
    search(col0);
    return { key: best, aut: nbest };
}

/** Symmetry factor: vertex automorphisms × identical parallel lines × real self-loops. */
export function symmetryFactor(S, labels, aut) {
    let f = aut;
    const groups = new Map();
    S.edges.forEach((e, i) => {
        let a = e.u, b = e.v, p = labels[i];
        if (a === b) { const q = anti(p); p = p < q ? p : q; }
        else if (a > b) { const t = a; a = b; b = t; p = anti(p); }
        const k = a + '-' + b + ':' + p;
        groups.set(k, (groups.get(k) || 0) + 1);
        if (e.u === e.v && P[labels[i]].selfConj) f *= 2;
    });
    groups.forEach(n => { for (let i = 2; i <= n; i++) f *= i; });
    return f;
}

// ------------------------------------------------------------------ topologies

function addNode(T, o) { T.nodes.push(Object.assign({ ext: false }, o || {})); return T.nodes.length - 1; }

function treeTopologies(n) {
    let level = [{ nodes: [{ ext: true, extIdx: 0 }, { ext: true, extIdx: 1 }], edges: [{ u: 0, v: 1 }] }];
    for (let k = 2; k < n; k++) {
        const next = [];
        for (const T of level) {
            T.edges.forEach((e, i) => {
                const U = cloneS(T), w = addNode(U), x = addNode(U, { ext: true, extIdx: k });
                U.edges.splice(i, 1, { u: e.u, v: w }, { u: w, v: e.v });
                U.edges.push({ u: w, v: x });
                next.push(U);
            });
            const deg = degOf(incidence(T));
            T.nodes.forEach((nd, y) => {
                if (nd.ext || deg[y] !== 3) return;
                const U = cloneS(T), x = addNode(U, { ext: true, extIdx: k });
                U.edges.push({ u: y, v: x });
                next.push(U);
            });
        }
        level = next;
    }
    return level;
}

/** Point on a graph where a new line can attach: an edge (split) or a cubic vertex. */
function attach(U, slot, used) {
    if (slot.v !== undefined) return slot.v;
    // split edge slot.e; if it was split already, split the segment nearest its v end
    const i = used.get(slot.e) !== undefined ? used.get(slot.e) : slot.e;
    const e = U.edges[i], w = addNode(U);
    U.edges[i] = { u: e.u, v: w };
    U.edges.push({ u: w, v: e.v });
    used.set(slot.e, U.edges.length - 1);
    return w;
}

/** All graphs with one more loop, built from T by the three moves. */
export function addLoopMoves(T) {
    const out = [], inc = incidence(T), deg = degOf(inc);
    const slots = T.edges.map((_, i) => ({ e: i }));
    T.nodes.forEach((n, y) => { if (!n.ext && deg[y] === 3) slots.push({ v: y }); });
    for (let a = 0; a < slots.length; a++) for (let b = a; b < slots.length; b++) {
        if (a === b && slots[a].v !== undefined) continue;
        const U = cloneS(T), used = new Map();
        const x = attach(U, slots[a], used), y = attach(U, slots[b], used);
        U.edges.push({ u: x, v: y });
        out.push(U);
    }
    T.edges.forEach((_, i) => {        // self-contracted quartic vertex on a line
        const U = cloneS(T), x = attach(U, { e: i }, new Map());
        U.edges.push({ u: x, v: x });
        out.push(U);
    });
    slots.forEach(s => {               // tadpole: stem to a vertex with a self-loop
        const U = cloneS(T), x = attach(U, s, new Map()), h = addNode(U);
        U.edges.push({ u: x, v: h }, { u: h, v: h });
        out.push(U);
    });
    return out;
}

const TOPO = new Map();
/** Canonical topologies with n legs and exactly L loops (cached). */
export function topologies(n, L, deadline = Infinity) {
    const k = n + ':' + L;
    if (TOPO.has(k)) return TOPO.get(k);
    let res;
    if (L === 0) res = treeTopologies(n);
    else {
        const prev = topologies(n, L - 1, deadline);
        if (prev.truncated) { res = []; res.truncated = true; }
        else {
            const seen = new Map();
            for (const T of prev) {
                if (Date.now() > deadline) { res = [...seen.values()]; res.truncated = true; break; }
                for (const U of addLoopMoves(T)) {
                    const c = canon(U, null).key;
                    if (!seen.has(c)) seen.set(c, U);
                }
            }
            if (!res) res = [...seen.values()];
        }
    }
    if (!res.truncated) TOPO.set(k, res);
    return res;
}

// ------------------------------------------------------------------ structure analysis

/** Bridges of the internal graph (edge indices), counting parallel lines correctly. */
function bridges(S, isInt) {
    const N = S.nodes.length, adj = S.nodes.map(() => []);
    S.edges.forEach((e, i) => { if (!isInt[i] || e.u === e.v) return; adj[e.u].push([e.v, i]); adj[e.v].push([e.u, i]); });
    const disc = new Array(N).fill(-1), low = new Array(N).fill(0), out = new Set();
    let t = 0;
    const dfs = (x, pe) => {
        disc[x] = low[x] = t++;
        for (const [y, i] of adj[x]) {
            if (i === pe) continue;
            if (disc[y] < 0) { dfs(y, i); low[x] = Math.min(low[x], low[y]); if (low[y] > disc[x]) out.add(i); }
            else low[x] = Math.min(low[x], disc[y]);
        }
    };
    for (let x = 0; x < N; x++) if (!S.nodes[x].ext && disc[x] < 0) dfs(x, -1);
    return out;
}

const NPT = { 1: 'Tadpole', 2: 'Self-energy', 3: 'Vertex correction', 4: 'Box', 5: 'Pentagon', 6: 'Hexagon' };
const NPT_MULTI = { 1: 'tadpole', 2: 'self-energy', 3: 'vertex', 4: 'four-point', 5: 'five-point', 6: 'six-point' };
const LOOPWORD = ['tree', 'One-loop', 'Two-loop', 'Three-loop', 'Four-loop'];

/**
 * Loop structure of a labelled graph: its one-particle-irreducible pieces (blobs),
 * each with its legs, loop number and superficial degree of divergence, plus tadpoles
 * and corrections on external legs.
 */
export function analyze(S, labels, mdl) {
    const N = S.nodes.length, E = S.edges;
    const isInt = E.map(e => !S.nodes[e.u].ext && !S.nodes[e.v].ext);
    const br = bridges(S, isInt);
    const parent = [...Array(N).keys()];
    const find = x => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    E.forEach((e, i) => { if (isInt[i] && !br.has(i)) parent[find(e.u)] = find(e.v); });
    const blobsBy = new Map();
    E.forEach((e, i) => {
        if (!isInt[i] || br.has(i)) return;
        const r = find(e.u);
        if (!blobsBy.has(r)) blobsBy.set(r, { nodes: new Set(), edges: [] });
        const b = blobsBy.get(r); b.edges.push(i); b.nodes.add(e.u); b.nodes.add(e.v);
    });
    const outLeg = (i, x) => { const e = E[i]; return e.u === x ? labels[i] : anti(labels[i]); };
    const blobs = [...blobsBy.values()].map(b => {
        const legs = [], legEdges = [];
        E.forEach((e, i) => {
            if (b.edges.includes(i)) return;
            if (b.nodes.has(e.u)) { legs.push(outLeg(i, e.u)); legEdges.push(i); }
            if (b.nodes.has(e.v) && e.u !== e.v) { legs.push(outLeg(i, e.v)); legEdges.push(i); }
        });
        const loops = b.edges.length - b.nodes.size + 1;
        let dims = 0;
        const legsAtNode = x => { const r = []; E.forEach((e, i) => { if (e.u === x) r.push(labels[i]); if (e.v === x) r.push(anti(labels[i])); }); return r; };
        b.nodes.forEach(x => { const info = mdl.info(legsAtNode(x)); if (info && info.dim) dims += info.dim; });
        const nB = legs.filter(p => !P[p].fermion).length, nF = legs.filter(p => P[p].fermion).length;
        const D = 4 - nB - 1.5 * nF - dims;
        const parts = b.edges.map(i => labels[i]);
        const fermionLoop = parts.every(p => P[p].fermion), ghostLoop = parts.some(p => P[p].ghost);
        const quartic = [...b.nodes].some(x => legsAtNode(x).length === 4);
        const induced = legs.length === 3 ? !mdl.V.has(key(legs)) : legs.length === 4 ? !mdl.Q4.has(key(legs)) : false;
        return { nodes: [...b.nodes], edges: b.edges, legs, legEdges, loops, D, dims, fermionLoop, ghostLoop, quartic, induced, npoint: legs.length };
    });
    // tadpoles and external-leg corrections, from the bridges
    const adj = S.nodes.map(() => []);
    E.forEach((e, i) => { if (e.u !== e.v) { adj[e.u].push([e.v, i]); adj[e.v].push([e.u, i]); } });
    const side = (start, cut) => {
        const seen = new Set([start]), st = [start];
        while (st.length) { const x = st.pop(); for (const [y, i] of adj[x]) if (i !== cut && !seen.has(y)) { seen.add(y); st.push(y); } }
        return seen;
    };
    let tadpole = false, externalLeg = false;
    const blobOf = new Map(); blobs.forEach((b, k) => b.nodes.forEach(x => blobOf.set(x, k)));
    br.forEach(i => {
        const e = E[i];
        [e.u, e.v].forEach(s => {
            const part = side(s, i);
            const nExt = [...part].filter(x => S.nodes[x].ext).length;
            const hasLoop = [...part].some(x => blobOf.has(x));
            if (!hasLoop) return;
            if (nExt === 0) tadpole = true;
            else if (nExt === 1) externalLeg = true;
        });
    });
    // closed fermion and ghost loops
    const fparent = [...Array(N).keys()];
    const ff = x => { while (fparent[x] !== x) { fparent[x] = fparent[fparent[x]]; x = fparent[x]; } return x; };
    const isF = p => P[p].fermion, isG = p => P[p].ghost;
    let fermionLoops = 0, ghostLoops = 0;
    [[isF, 'f'], [isG, 'g']].forEach(([test, tag]) => {
        for (let x = 0; x < N; x++) fparent[x] = x;
        const touched = new Set();
        E.forEach((e, i) => { if (test(labels[i])) { fparent[ff(e.u)] = ff(e.v); touched.add(e.u); touched.add(e.v); } });
        const comps = new Map();
        touched.forEach(x => { const r = ff(x); if (!comps.has(r)) comps.set(r, false); if (S.nodes[x].ext) comps.set(r, true); });
        let closed = 0; comps.forEach(hasExt => { if (!hasExt) closed++; });
        if (tag === 'f') fermionLoops = closed; else ghostLoops = closed;
    });
    const L = E.length - N + 1 - 0; // ext nodes count as vertices of degree 1
    return { blobs, tadpole, externalLeg, fermionLoops, ghostLoops, loops: L, onePI: blobs.length === 1 && !br.size };
}

// Two-point functions between different particles that do not vanish identically:
// γ–Z mixing and flavour-changing fermion self-energies. Vector–scalar mixing such as
// Z–H vanishes (CP), and a vector cannot mix with a fermion.
export function mixingAllowed(legs) {
    const [a, b] = legs.map(FV.flowId);
    const A = P[legs[0]], B = P[legs[1]];
    if (A.fermion && B.fermion) return anti(legs[0]) !== legs[1] && A.isAnti !== B.isAnti && Math.abs(A.Q + B.Q) < 1e-9 && A.kind === B.kind;
    const neutralV = p => p === 'gamma' || p === 'Z';
    return neutralV(a) && neutralV(b) && a !== b;
}

// ------------------------------------------------------------------ planarity

/**
 * Whether the blob, with all its legs joined to a point at infinity, can be drawn
 * without crossings. One-loop blobs always can. Returns true/false, or null if the
 * search was too large.
 */
export function blobPlanar(S, blob) {
    if (blob.loops <= 1) return true;
    const nodes = blob.nodes.slice(), INF = -1;
    const darts = [];                       // [from, to, edgeTag]
    const rot = new Map(); nodes.forEach(x => rot.set(x, [])); rot.set(INF, []);
    const addDart = (a, b, tag) => { darts.push([a, b, tag]); rot.get(a).push(darts.length - 1); };
    blob.edges.forEach(i => { const e = S.edges[i]; addDart(e.u, e.v, 'e' + i); addDart(e.v, e.u, 'e' + i); });
    blob.legEdges.forEach((i, k) => {
        const e = S.edges[i], x = blob.nodes.includes(e.u) ? e.u : e.v;
        addDart(x, INF, 'l' + k); addDart(INF, x, 'l' + k);
    });
    const twin = darts.map((_, j) => j ^ 1);
    const V = nodes.length + 1, Ecount = darts.length / 2;
    const verts = [...rot.keys()];
    const perm = (a) => { if (a.length <= 1) return [a]; const r = []; a.forEach((x, i) => perm(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p)))); return r; };
    const choices = verts.map(x => { const ds = rot.get(x); return ds.length <= 2 ? [ds] : perm(ds.slice(1)).map(p => [ds[0]].concat(p)); });
    const total = choices.reduce((a, c) => a * c.length, 1);
    if (total > 200000) return null;
    const next = new Array(darts.length);
    const idx = new Array(verts.length).fill(0);
    for (let it = 0; it < total; it++) {
        let c = it;
        verts.forEach((x, k) => { const n = choices[k].length; idx[k] = c % n; c = Math.floor(c / n); });
        verts.forEach((x, k) => { const r = choices[k][idx[k]]; r.forEach((d, j) => { next[d] = r[(j + 1) % r.length]; }); });
        const seen = new Uint8Array(darts.length);
        let F = 0;
        for (let d0 = 0; d0 < darts.length; d0++) {
            if (seen[d0]) continue;
            F++;
            let d = d0, guard = 0;
            while (!seen[d] && guard++ < 4 * darts.length) { seen[d] = 1; d = next[twin[d]]; }
        }
        if (V - Ecount + F === 2) return true;
    }
    return false;
}

// ------------------------------------------------------------------ external order for drawing

/** Cyclic order of the external legs in some planar drawing, preferring the initial legs together. */
export function planarExternalOrder(S, nIn) {
    const ext = S.nodes.map((n, x) => n.ext ? x : -1).filter(x => x >= 0);
    const n = ext.length;
    if (n < 3) return null;
    // treat the whole internal graph as one blob with the external edges as legs
    const isInt = S.edges.map(e => !S.nodes[e.u].ext && !S.nodes[e.v].ext);
    const nodes = S.nodes.map((nd, x) => nd.ext ? -1 : x).filter(x => x >= 0);
    const legEdges = S.edges.map((e, i) => isInt[i] ? -1 : i).filter(i => i >= 0);
    const darts = [], rot = new Map();
    nodes.forEach(x => rot.set(x, []));
    const add = (a, b, tag) => { darts.push([a, b, tag]); if (rot.has(a)) rot.get(a).push(darts.length - 1); };
    S.edges.forEach((e, i) => { if (isInt[i]) { add(e.u, e.v, 'e' + i); add(e.v, e.u, 'e' + i); } });
    const legDart = new Map();
    legEdges.forEach(i => {
        const e = S.edges[i], x = S.nodes[e.u].ext ? e.v : e.u, ex = S.nodes[e.u].ext ? e.u : e.v;
        add(x, 'INF', 'l' + i); add('INF', x, 'l' + i);
        legDart.set(S.nodes[ex].extIdx, darts.length - 1);   // dart INF -> x
    });
    const twin = darts.map((_, j) => j ^ 1);
    const perm = (a) => { if (a.length <= 1) return [a]; const r = []; a.forEach((x, i) => perm(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p)))); return r; };
    const verts = [...rot.keys()];
    const choices = verts.map(x => { const ds = rot.get(x); return ds.length <= 2 ? [ds] : perm(ds.slice(1)).map(p => [ds[0]].concat(p)); });
    const inner = choices.reduce((a, c) => a * c.length, 1);
    // cyclic orders of the legs, fewest in/out transitions first
    const idxs = [...Array(n).keys()];
    const orders = perm(idxs.slice(1)).map(p => [0].concat(p));
    const trans = o => { let t = 0; for (let i = 0; i < n; i++) if ((o[i] < nIn) !== (o[(i + 1) % n] < nIn)) t++; return t; };
    orders.sort((a, b) => trans(a) - trans(b));
    if (orders.length * inner > 400000) return null;
    const V = nodes.length + 1, Ecount = darts.length / 2;
    const next = new Array(darts.length);
    for (const o of orders) {
        const infRot = o.map(k => legDart.get(k));
        infRot.forEach((d, j) => { next[d] = infRot[(j + 1) % infRot.length]; });
        for (let it = 0; it < inner; it++) {
            let c = it;
            verts.forEach((x, k) => { const r = choices[k][c % choices[k].length]; c = Math.floor(c / choices[k].length); r.forEach((d, j) => { next[d] = r[(j + 1) % r.length]; }); });
            const seen = new Uint8Array(darts.length);
            let F = 0;
            for (let d0 = 0; d0 < darts.length; d0++) {
                if (seen[d0]) continue;
                F++;
                let d = d0, g = 0;
                while (!seen[d] && g++ < 4 * darts.length) { seen[d] = 1; d = next[twin[d]]; }
            }
            if (V - Ecount + F === 2) return o;
        }
    }
    return null;
}

// ------------------------------------------------------------------ conversion

/** Structure of an engine diagram, with a map back to its vertex and edge ids. */
export function fromDiagram(d) {
    const idx = new Map(), S = { nodes: [], edges: [] }, labels = [], vid = [], eid = [];
    d.verts.forEach(v => { idx.set(v.id, S.nodes.length); vid.push(v.id); S.nodes.push(v.kind === 'ext' ? { ext: true, extIdx: v.extIdx } : { ext: false, ct: v.ct || null }); });
    d.edges.forEach(e => { S.edges.push({ u: idx.get(e.a), v: idx.get(e.b) }); labels.push(e.p); eid.push(e.id); });
    return { S, labels, vid, eid, idx };
}

function particleList(ids) {
    const uniq = [];
    ids.forEach(p => { const b = p === 'W-' ? 'W+' : FV.flowId(p); if (!uniq.includes(b)) uniq.push(b); });
    return uniq.map(b => b === 'W+' ? 'W<sup>±</sup>' : FV.labHTML(b)).join(', ');
}

/**
 * Engine diagram for a labelled structure, with loop records, name, symmetry factor,
 * coupling strength and an order of the external legs for drawing.
 * pos: optional [{x, y}] per node to seed the layout (kept for vertices that existed before).
 */
export function toDiagram(S, labels, ini, fin, mdl, opts = {}) {
    const d = FV.newDiag(), nIn = ini.length;
    d.initial = ini.slice(); d.final = fin.slice();
    const vids = S.nodes.map((n, x) => {
        const o = n.ext ? { kind: 'ext', side: n.extIdx < nIn ? 'in' : 'out', extIdx: n.extIdx, pid: n.extIdx < nIn ? ini[n.extIdx] : fin[n.extIdx - nIn] } : { kind: 'v' };
        if (opts.pos && opts.pos[x] && !n.ext) { o.x = opts.pos[x].x; o.y = opts.pos[x].y; }
        return FV.addVert(d, o).id;
    });
    const edges = S.edges.map((e, i) => {
        // external lines run from the vertex to the external point, as elsewhere in the engine
        if (S.nodes[e.u].ext && !S.nodes[e.v].ext) return FV.addEdge(d, vids[e.v], vids[e.u], anti(labels[i]));
        return FV.addEdge(d, vids[e.u], vids[e.v], labels[i]);
    });
    const A = analyze(S, labels, mdl);
    const c = canon(S, labels);
    const sym = symmetryFactor(S, labels, c.aut);
    A.blobs.forEach((b, k) => {
        const lid = 'L' + (k + 1);
        b.edges.forEach(i => edges[i].lids.push(lid));
        b.nodes.forEach(x => { const v = d.verts.find(q => q.id === vids[x]); v.lids.push(lid); });
        const L = {
            id: lid, verts: b.nodes.map(x => vids[x]), edges: b.edges.map(i => edges[i].id), fermionLoop: b.fermionLoop, ghostLoop: b.ghostLoop,
            attached: b.legs, npoint: b.npoint, D: b.D, quartic: b.quartic, generated: true, loops: b.loops, induced: b.induced
        };
        const ring = b.edges.map(i => labels[i]);
        if (b.loops === 1 && b.npoint === 2 && !b.quartic && b.edges.length === 2) {
            // self-energy: P is the particle entering the bubble
            const li = b.legEdges[0], e = S.edges[li], into = b.nodes.includes(e.v) ? labels[li] : anti(labels[li]);
            Object.assign(L, { type: 'se', P: into, bubble: ring.slice(), external: false, mixing: b.legs[0] !== anti(b.legs[1]) });
            if (L.mixing) L.generated = true; else delete L.generated;
        } else if (b.loops === 1 && b.npoint === 3 && !b.quartic && b.edges.length === 3) {
            Object.assign(L, { type: 'tri', tri: { pab: ring[0], pac: ring[1], pbc: ring[2] }, vertexKey: key(b.legs) });
            if (b.induced) L.generated = true; else delete L.generated;
        } else if (b.npoint === 1) Object.assign(L, { type: 'tadpole' });
        else Object.assign(L, { type: b.loops === 1 && b.npoint === 4 && !b.quartic ? 'box' : 'ngon' });
        d.loops.push(L);
    });
    d.nloops = A.loops;
    d.kind = A.loops ? 'loop' : 'tree';
    d.symmetry = sym;
    d.fermionLoops = A.fermionLoops; d.ghostLoops = A.ghostLoops;
    d.analysis = { tadpole: A.tadpole, externalLeg: A.externalLeg, onePI: A.onePI, blobs: A.blobs.map(b => ({ loops: b.loops, npoint: b.npoint, D: b.D, induced: b.induced, quartic: b.quartic, legs: b.legs })) };
    d.canon = c.key;
    // name
    const content = particleList(A.blobs.flatMap(b => b.edges.map(i => labels[i])));
    let shape, group;
    if (!A.blobs.length) { shape = 'Tree'; group = 'Tree'; }
    else if (A.tadpole) { shape = 'Tadpole'; group = 'Tadpoles'; }
    else if (A.externalLeg) { shape = 'External-leg correction'; group = 'External-leg corrections (amputated)'; }
    else if (A.blobs.length === 1) {
        const b = A.blobs[0];
        if (b.loops === 1) {
            shape = (NPT[b.npoint] || b.npoint + '-point') + (b.edges.length === 1 ? ' (seagull)' : b.quartic ? ' with a quartic vertex' : '');
            group = NPT[b.npoint] || b.npoint + '-point';
        } else {
            const planar = blobPlanar(S, b);
            const core = coreShape(S, b);
            shape = LOOPWORD[b.loops] + ' ' + (NPT_MULTI[b.npoint] || b.npoint + '-point') + ' · ' + core + (planar === false ? ', non-planar' : '');
            group = LOOPWORD[b.loops] + ' ' + (NPT_MULTI[b.npoint] || b.npoint + '-point') + (planar === false ? ' (non-planar)' : ' (planar)');
        }
    } else {
        const ls = A.blobs.map(b => b.loops).sort((a, b) => b - a);
        shape = 'Reducible: ' + ls.map(l => LOOPWORD[l].toLowerCase()).join(' × ') + ' pieces';
        group = 'Products of lower-loop pieces (one-particle reducible)';
    }
    d.label = shape + ' · loops of ' + content;
    d.shape = shape; d.group = group;
    let s = Math.pow(LOOP16, A.loops);
    S.nodes.forEach((n, x) => {
        if (n.ext) return;
        const legs = []; S.edges.forEach((e, i) => { if (e.u === x) legs.push(labels[i]); if (e.v === x) legs.push(anti(labels[i])); });
        const info = mdl.info(legs);
        s *= Math.max(info ? info.strength : 1, 1e-9);
    });
    d.strength = s / sym;
    // external order
    const o = A.loops <= 1 && !A.tadpole ? null : planarExternalOrder(S, nIn);
    if (o) {
        const n = o.length;
        let start = 0;
        for (let i = 0; i < n; i++) if (o[i] < nIn && !(o[(i - 1 + n) % n] < nIn)) { start = i; break; }
        const rot = o.slice(start).concat(o.slice(0, start));
        const pi = rot.filter(x => x < nIn), po = rot.filter(x => x >= nIn).reverse();
        d.verts.forEach(v => { if (v.kind === 'ext') { const arr = v.side === 'in' ? pi : po; v.slot = arr.indexOf(v.extIdx); v.nSide = arr.length; } });
    } else FV.orderExternals(d);
    return d;
}

/** 'theta' (two vertices joined by three lines) or 'figure-eight' for a two-loop core, else a count. */
function coreShape(S, b) {
    const deg = new Map();
    b.edges.forEach(i => { const e = S.edges[i]; deg.set(e.u, (deg.get(e.u) || 0) + 1); deg.set(e.v, (deg.get(e.v) || 0) + 1); });
    const branch = [...deg.entries()].filter(([, k]) => k >= 3);
    if (b.loops === 2) {
        if (branch.length === 1 && branch[0][1] === 4) return 'figure-eight';
        if (branch.length === 2) {
            // three paths between the branch points; count the vertices on each
            const [x, y] = branch.map(q => q[0]);
            const adj = new Map();
            b.edges.forEach(i => { const e = S.edges[i]; [[e.u, e.v], [e.v, e.u]].forEach(([a, c]) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push([c, i]); }); });
            const lens = [];
            const used = new Set();
            for (const [n0, i0] of adj.get(x)) {
                if (used.has(i0)) continue;
                used.add(i0);
                let cur = n0, len = 0, prevE = i0;
                while (cur !== y && cur !== x) {
                    const step = adj.get(cur).find(([, i]) => i !== prevE && !used.has(i));
                    if (!step) break;
                    used.add(step[1]); prevE = step[1]; cur = step[0]; len++;
                }
                lens.push(len);
            }
            lens.sort((a, c) => a - c);
            if (lens.length === 3) {
                if (lens[0] === 0 && lens[1] === 0 && lens[2] === 0) return 'sunset';
                if (lens[0] === 0) return 'theta, nested loop';
                return 'theta (' + lens.join(', ') + ')';
            }
        }
        if (branch.length === 2 || branch.length === 1) return 'two cycles';
    }
    return b.loops + ' loops';
}

// ------------------------------------------------------------------ full generation

/**
 * Every diagram with L loops for ini → fin (engine ids).
 * opts: { model, deadline, limit, tadpoles, externalLegs, onProgress(done, total) }
 * Returns { items, truncated, tadpoles, external, topologies, reason }.
 */
export function loopDiagrams(ini, fin, L, opts = {}) {
    const mdl = getModel(opts.model);
    const deadline = opts.deadline || Infinity, limit = opts.limit || 5000;
    const legs = ini.map(anti).concat(fin), n = legs.length;
    const res = { items: [], truncated: false, tadpoles: 0, external: 0, topologies: 0, reason: '' };
    if (n < 2) { res.reason = 'Too few particles.'; return res; }
    const topos = topologies(n, L, deadline);
    res.topologies = topos.length;
    if (topos.truncated) { res.truncated = true; res.reason = 'The topology count grew past the time limit.'; }
    const seen = new Set();
    let step = 0;
    for (const T of topos) {
        if (Date.now() > deadline || res.items.length >= limit) { res.truncated = true; break; }
        if (opts.onProgress && (++step % 25 === 0)) opts.onProgress(step, topos.length);
        const lab = T.edges.map(() => null);
        T.edges.forEach((e, i) => {
            if (T.nodes[e.u].ext) lab[i] = anti(legs[T.nodes[e.u].extIdx]);
            else if (T.nodes[e.v].ext) lab[i] = legs[T.nodes[e.v].extIdx];
        });
        if (T.edges.some((e, i) => T.nodes[e.u].ext && T.nodes[e.v].ext)) continue;
        const r = labelAll(T, lab, mdl, {
            deadline, limit: 200000,
            onSolution: (labels) => {
                const ck = canon(T, labels).key;
                if (seen.has(ck)) return;
                seen.add(ck);
                const A = analyze(T, labels, mdl);
                if (A.tadpole && !opts.tadpoles) { res.tadpoles++; return; }
                if (A.externalLeg && !opts.externalLegs) { res.external++; return; }
                if (res.items.length >= limit) return;
                // vector tadpoles vanish by Lorentz invariance; gluon ones by colour
                if (A.tadpole && hasVanishingTadpole(T, labels, A)) { res.tadpoles++; return; }
                const d = toDiagram(T, labels, ini, fin, mdl);
                res.items.push({ diagram: d, title: d.label, group: d.group, npoint: maxNpoint(A), D: A.blobs.length ? Math.max(...A.blobs.map(b => b.D)) : 0, strength: d.strength, symmetry: d.symmetry, ini, fin, loops: L });
            }
        });
        if (r.aborted) res.truncated = true;
    }
    res.items.sort((a, b) => b.strength - a.strength);
    return res;
}
const maxNpoint = A => A.blobs.reduce((a, b) => Math.max(a, b.npoint), 0);

/** A tadpole whose stem is a photon, Z or gluon is zero (Lorentz invariance or colour). */
export function hasVanishingTadpole(S, labels, A) {
    return A.blobs.some(b => b.npoint === 1 && ['gamma', 'Z', 'g'].includes(FV.flowId(b.legs[0])));
}
