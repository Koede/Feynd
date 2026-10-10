// tests/graph.test.mjs — the general loop generator (js/loops/graph.js) against textbook results.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FV } from '../js/loops/engine.js';
import { topologies, loopDiagrams, buildModel } from '../js/loops/graph.js';
import { oneLoopDiagrams } from '../js/loops/oneloop.js';

const sub = (pred) => {
    const V = new Map(), Q = new Map();
    FV.V.forEach((i, k) => { if (pred(i.legs)) V.set(k, i); });
    FV.Q4.forEach((i, k) => { if (pred(i.legs)) Q.set(k, i); });
    return buildModel('test', [[V, Q]]);
};
const QED = sub(l => l.length === 3 && l.includes('gamma') && l.includes('e-'));
const PHI4 = sub(l => l.length === 4 && l.every(x => x === 'H'));
const PHI3 = sub(l => l.length === 3 && l.every(x => x === 'H'));
const syms = r => r.items.map(it => it.diagram.symmetry).sort((a, b) => a - b);

test('topology counts', () => {
    assert.equal(topologies(4, 0).length, 4);      // s, t, u and the contact vertex
    assert.equal(topologies(2, 1).length, 3);      // bubble, seagull, tadpole
});

test('QED two-loop counts', () => {
    assert.equal(loopDiagrams(['gamma'], ['gamma'], 2, { model: QED }).items.length, 3);   // vacuum polarization
    assert.equal(loopDiagrams(['e-'], ['e-'], 2, { model: QED }).items.length, 3);         // electron self-energy
    // vertex: 7 + the two light-by-light (Furry) orientations, which cancel pairwise
    assert.equal(loopDiagrams(['e-'], ['e-', 'gamma'], 2, { model: QED }).items.length, 9);
});

test('phi^4 symmetry factors', () => {
    assert.deepEqual(syms(loopDiagrams(['H'], ['H'], 1, { model: PHI4, tadpoles: true })), [2]);
    assert.deepEqual(syms(loopDiagrams(['H'], ['H'], 2, { model: PHI4, tadpoles: true })), [4, 6]);
    assert.deepEqual(syms(loopDiagrams(['H', 'H'], ['H', 'H'], 1, { model: PHI4 })), [2, 2, 2]);
    const four = loopDiagrams(['H', 'H'], ['H', 'H'], 2, { model: PHI4 });
    assert.equal(four.items.length, 12);           // 3 bubble chains (S=4), 6 eyes and 3 seagull insertions (S=2)
    assert.equal(syms(four).filter(s => s === 4).length, 3);
});

test('phi^3 one loop', () => {
    assert.deepEqual(syms(loopDiagrams(['H'], ['H'], 1, { model: PHI3, tadpoles: true })), [2, 2]);
});

test('one loop: the general generator contains every ring diagram, plus seagulls', () => {
    for (const [i, f] of [[['H'], ['gamma', 'gamma']], [['g', 'g'], ['H']], [['gamma', 'gamma'], ['gamma', 'gamma']], [['e-', 'e+'], ['mu-', 'mu+']]]) {
        const a = oneLoopDiagrams(i, f, {}), b = loopDiagrams(i, f, 1, {});
        const extra = b.items.filter(it => /seagull/.test(it.title)).length;
        assert.equal(b.items.length, a.items.length + extra, i + ' -> ' + f);
    }
});

test('Feynman gauge adds Goldstone and ghost loops', () => {
    const u = loopDiagrams(['H'], ['gamma', 'gamma'], 1, {}).items.length;
    const r = loopDiagrams(['H'], ['gamma', 'gamma'], 1, { model: 'feynman' });
    assert.ok(r.items.length > u);
    assert.ok(r.items.some(it => it.diagram.edges.some(e => e.p === 'G+' || e.p === 'G-')));
    assert.ok(r.items.some(it => it.diagram.edges.some(e => FV.P[e.p].ewGhost)));
});

test('R_xi vertices conserve charge, ghost number and fermion number', () => {
    for (const M of [FV.VR, FV.Q4R]) M.forEach((i, k) => {
        const P = FV.P;
        assert.ok(Math.abs(i.legs.reduce((a, l) => a + P[l].Q, 0)) < 1e-9, k);
        assert.equal(i.legs.filter(l => P[l].ghost && !P[l].isAnti).length, i.legs.filter(l => P[l].ghost && P[l].isAnti).length, k);
        assert.equal(i.legs.filter(l => P[l].fermion && !P[l].isAnti).length, i.legs.filter(l => P[l].fermion && P[l].isAnti).length, k);
    });
    assert.ok(!FV.PALETTE.includes('G0') && !FV.PALETTE.includes('uP'));
});
