// js/loops/oneloop.js
// Every one-loop Feynman diagram for a process, built from the vertex table.
//
// A one-loop diagram is a closed ring of k ≥ 2 propagators. Each vertex on the ring is
// a cubic vertex with one branch or a quartic vertex with two, and each branch is a tree
// that ends on some of the external legs. So the generator
//   1. splits the external legs into blocks (one block per branch),
//   2. arranges the blocks around the ring,
//   3. takes every tree for each block (the same rule as the tree generator), and
//   4. runs round the ring choosing loop particles so that every vertex is in the table
//      and the ring closes on the particle it started with.
// Diagrams that are the same graph (a rotation or a reflection of the ring) are kept
// once. Tadpoles (k = 1) are not generated, and self-energies on external legs are
// set apart, because the S-matrix amputates them (they enter through the LSZ factors).

import { FV } from './engine.js';

const P = FV.P, anti = FV.anti, key = FV.key;
const ALL = FV.ORDER.slice();          // includes the QCD ghosts, needed in gluon loops
const LOOP16 = 1 / (16 * Math.PI * Math.PI);

function perms(a) {
    if (a.length <= 1) return [a.slice()];
    const r = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p))));
    return r;
}

/** All trees whose leaves are exactly `set`, ending in one line ('out') toward the rest. */
function makeNodes(legs) {
    const memo = new Map();
    const nodes = (set) => {
        const k = set.join(',');
        if (memo.has(k)) return memo.get(k);
        let res = [];
        if (set.length === 1) res = [{ leaf: set[0], out: anti(legs[set[0]]), sig: 'L' + set[0] }];
        else {
            const first = set[0], rest = set.slice(1), m = rest.length;
            for (let mask = 0; mask < (1 << m); mask++) {
                const A = [first], B = [];
                rest.forEach((r, i) => ((mask >> i) & 1 ? A : B).push(r));
                if (!B.length) continue;
                for (const na of nodes(A)) for (const nb of nodes(B))
                    for (const t of FV.partners(anti(na.out), anti(nb.out))) res.push({ out: t, kids: [na, nb], sig: '(' + [na.sig, nb.sig].sort().join(',') + ')' + t });
            }
            if (set.length >= 3) {
                const total = Math.pow(3, m);
                for (let code = 0; code < total; code++) {
                    const A = [first], B = [], C = [];
                    let c = code;
                    for (let i = 0; i < m; i++) { const t = c % 3; c = (c - t) / 3; (t === 0 ? A : t === 1 ? B : C).push(rest[i]); }
                    if (!B.length || !C.length || B[0] > C[0]) continue;
                    for (const na of nodes(A)) for (const nb of nodes(B)) for (const nc of nodes(C))
                        for (const t of FV.partners4(anti(na.out), anti(nb.out), anti(nc.out))) res.push({ out: t, kids: [na, nb, nc], sig: '(' + [na.sig, nb.sig, nc.sig].sort().join(',') + ')' + t });
                }
            }
        }
        memo.set(k, res);
        return res;
    };
    return nodes;
}

/** Set partitions of [0..n−1] (restricted growth strings). */
function partitions(n) {
    const out = [], a = new Array(n).fill(0);
    (function rec(i, max) {
        if (i === n) {
            const blocks = [];
            a.forEach((b, j) => { (blocks[b] = blocks[b] || []).push(j); });
            out.push(blocks);
            return;
        }
        for (let b = 0; b <= max + 1; b++) { a[i] = b; rec(i + 1, Math.max(max, b)); }
    })(1, 0);
    return out;
}

/** Ways to cut a sequence of m blocks into ring vertices of one or two blocks each. */
function groupings(m) {
    const out = [];
    (function rec(i, cur) {
        if (i === m) { out.push(cur.slice()); return; }
        cur.push([i]); rec(i + 1, cur); cur.pop();
        if (i + 1 < m) { cur.push([i, i + 1]); rec(i + 2, cur); cur.pop(); }
    })(0, []);
    return out;
}

function nodeCombos(lists, cap) {
    let acc = [[]];
    for (const l of lists) {
        const next = [];
        for (const a of acc) for (const x of l) { next.push(a.concat([x])); if (next.length >= cap) break; }
        acc = next;
    }
    return acc;
}

const NAMES = { 2: 'Self-energy', 3: 'Vertex correction', 4: 'Box', 5: 'Pentagon', 6: 'Hexagon' };

/**
 * ini, fin: engine ids. Returns { items, truncated, external, reason }.
 * Each item: { diagram, title, group, npoint, D }.
 */
export function oneLoopDiagrams(ini, fin, { deadline = Infinity, limit = 4000, includeExternal = false, maxLegs = 6, onProgress } = {}) {
    const legs = ini.map(anti).concat(fin), n = legs.length;
    const res = { items: [], truncated: false, external: 0, reason: '' };
    if (n < 2) { res.reason = 'Too few particles.'; return res; }
    if (n > maxLegs) { res.reason = 'One-loop diagrams are generated for up to ' + maxLegs + ' external particles.'; return res; }
    const nodes = makeNodes(legs), seen = new Set();
    const parts = partitions(n).filter(b => b.length >= 2 || n === 1);
    let step = 0;
    for (const blocks of parts) {
        if (Date.now() > deadline || res.items.length >= limit) { res.truncated = true; break; }
        if (onProgress && (++step % 20 === 0)) onProgress(step, parts.length);
        const m = blocks.length;
        const nodeLists = blocks.map(b => nodes(b));
        if (nodeLists.some(l => !l.length)) continue;
        const others = blocks.map((_, i) => i).slice(1);
        for (const order of perms(others)) {
            const seq = [0].concat(order);
            for (const grp of groupings(m)) {
                if (grp.length < 2) continue;
                const ring = grp.map(g => g.map(i => seq[i]));    // block indices at each ring vertex
                const lists = ring.flat().map(bi => nodeLists[bi]);
                for (const combo of nodeCombos(lists, 512)) {
                    let c = 0;
                    const branches = ring.map(g => g.map(() => combo[c++]));
                    closeRing(branches, legs, ini, fin, seen, res, includeExternal);
                    if (res.items.length >= limit) { res.truncated = true; break; }
                }
                if (Date.now() > deadline) { res.truncated = true; break; }
            }
            if (res.truncated) break;
        }
    }
    res.items.sort((a, b) => b.strength - a.strength);
    return res;
}

function closeRing(branches, legs, ini, fin, seen, res, includeExternal) {
    const k = branches.length;
    const out = (X) => anti(X.out);   // outgoing leg at the ring vertex, toward the branch
    const next = (lin, br) => br.length === 1 ? FV.partners(anti(lin), out(br[0])) : FV.partners4(anti(lin), out(br[0]), out(br[1]));
    for (const guess of ALL) {
        // ring particle on the edge from the last vertex into vertex 0
        const walk = (j, lin, acc) => {
            if (j === k) { if (lin === guess) emit(branches, acc, legs, ini, fin, seen, res, includeExternal); return; }
            for (const l of next(lin, branches[j])) walk(j + 1, l, acc.concat([l]));
        };
        walk(0, guess, []);
    }
}

function ringSignature(branches, ring) {
    const k = branches.length;
    const desc = branches.map(br => br.map(b => b.sig).sort().join('+'));
    const variants = [];
    for (let r = 0; r < k; r++) {
        const f = [], b = [];
        for (let j = 0; j < k; j++) {
            const i = (r + j) % k;
            f.push(desc[i], ring[i]);
            const ib = (r - j + k) % k;
            b.push(desc[ib], anti(ring[(ib - 1 + k) % k]));
        }
        variants.push(f.join('|'), b.join('|'));
    }
    return variants.sort()[0];
}

function emit(branches, ring, legs, ini, fin, seen, res, includeExternal) {
    const sig = ringSignature(branches, ring);
    if (seen.has(sig)) return;
    seen.add(sig);
    const k = branches.length, flat = branches.flat();
    const externalLeg = k === 2 && branches.every(b => b.length === 1) && branches.some(b => b[0].leaf !== undefined);
    if (externalLeg && !includeExternal) { res.external++; return; }

    const d = FV.newDiag(), lid = 'L1', nIn = ini.length;
    d.initial = ini.slice(); d.final = fin.slice();
    const ev = legs.map((_, i) => FV.addVert(d, { kind: 'ext', side: i < nIn ? 'in' : 'out', extIdx: i, pid: i < nIn ? ini[i] : fin[i - nIn] }));
    const ringV = branches.map(() => FV.addVert(d, { kind: 'v', lids: [lid] }));
    const attachBranch = (node, ringId) => {
        if (node.leaf !== undefined) { FV.addEdge(d, ringId, ev[node.leaf].id, legs[node.leaf]); return; }
        const v = FV.addVert(d, { kind: 'v' });
        node.kids.forEach(ch => attachChild(ch, v.id));
        FV.addEdge(d, v.id, ringId, node.out);
    };
    const attachChild = (node, parentId) => {
        if (node.leaf !== undefined) { FV.addEdge(d, parentId, ev[node.leaf].id, legs[node.leaf]); return; }
        const v = FV.addVert(d, { kind: 'v' });
        node.kids.forEach(ch => attachChild(ch, v.id));
        FV.addEdge(d, v.id, parentId, node.out);
    };
    branches.forEach((br, j) => br.forEach(b => attachBranch(b, ringV[j].id)));
    const ringE = ring.map((l, j) => FV.addEdge(d, ringV[j].id, ringV[(j + 1) % k].id, l, { lids: [lid] }));

    const attached = flat.map(b => anti(b.out)); // computed after the ring edges exist (vinfo needs them)
    const nB = attached.filter(p => !P[p].fermion).length, nF = attached.filter(p => P[p].fermion).length;
    // couplings with mass dimension on the ring (HHH, HWW, HZZ) lower the degree of divergence
    const dims = ringV.reduce((a, v) => { const i = FV.vinfo(d, v); return a + (i && i.dim ? i.dim : 0); }, 0);
    const D = 4 - nB - 1.5 * nF - dims;
    const npoint = flat.length;
    const quartic = branches.some(b => b.length === 2);
    const fermionLoop = ring.every(p => P[p].fermion), ghostLoop = ring.some(p => P[p].ghost);
    const vk = key(attached);
    const treeVertex = npoint === 3 ? FV.V.has(vk) : npoint === 4 ? FV.Q4.has(vk) : npoint === 2;
    const L = { id: lid, verts: ringV.map(v => v.id), edges: ringE.map(e => e.id), fermionLoop, ghostLoop, attached, npoint, D, quartic, generated: true };
    if (npoint === 2 && !quartic) Object.assign(L, { type: 'se', P: flat[0].out, bubble: ring.slice(), external: externalLeg });
    else if (npoint === 3 && !quartic) Object.assign(L, { type: 'tri', tri: { pab: ring[0], pac: anti(ring[2]), pbc: ring[1] }, vertexKey: vk, induced: !treeVertex });
    else Object.assign(L, { type: npoint === 4 && !quartic ? 'box' : 'ngon', induced: !treeVertex });
    d.loops.push(L);

    const uniq = [];
    ring.forEach(p => { const b = p === 'W-' ? 'W+' : FV.flowId(p); if (!uniq.includes(b)) uniq.push(b); });
    const content = uniq.map(b => b === 'W+' ? 'W<sup>±</sup>' : FV.labHTML(b)).join(', ');
    const shape = (NAMES[npoint] || npoint + '-point') + (quartic ? ' with a quartic vertex' : '');
    d.kind = 'loop';
    d.label = shape + ' · loop of ' + content;
    let s = LOOP16;
    d.verts.forEach(v => { const i = FV.vinfo(d, v); if (i) s *= Math.max(i.strength, 1e-9); });
    d.strength = s;
    FV.orderExternals(d);
    res.items.push({ diagram: d, title: d.label, group: externalLeg ? 'External-leg corrections (amputated)' : shape.replace(' with a quartic vertex', ''), npoint, D, strength: s, ini, fin });
}

/** Superficial degree of divergence, in words. */
export function divergenceText(L) {
    if (L.D === undefined) return '';
    const D = L.D;
    const base = 'Superficial degree of divergence D = 4 − B − 3F/2 − Σ[g] = ' + (Number.isInteger(D) ? D : D.toFixed(1)) + '. ';
    if (D < 0) return base + 'Convergent: no counterterm.';
    if (L.induced) return base + 'There is no tree-level vertex with these legs, so gauge invariance makes the sum of all such loops finite.';
    return base + (D === 0 ? 'Logarithmically' : D === 1 ? 'Linearly' : 'Quadratically') + ' divergent by power counting; the counterterm of the tree-level ' + (L.npoint === 2 ? 'propagator' : 'vertex') + ' removes it.';
}
