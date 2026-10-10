// tests/insert.test.mjs — "Generate loop here" (insert.js) and the renormalization report (renorm.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { FV } from '../js/loops/engine.js';
import { vertexLoops, selfEnergyLoops, tadpoleLoops, chordLoops, menuFor } from '../js/loops/insert.js';
import { renormReport } from '../js/loops/renorm.js';
import { validateDiagram } from '../js/loops/validate.js';

const strip = s => String(s).replace(/<[^>]+>/g, '');
function base() {
    const d = FV.cloneDiag(FV.generate(['e-', 'e+'], ['mu-', 'mu+']).bases.find(b => b.edges.some(e => e.p === 'gamma')));
    FV.layoutDiag(d);
    return d;
}
const allValid = (r, d) => r.diagrams.forEach(nd => {
    assert.deepEqual(validateDiagram(nd, d.initial, d.final), [], strip(nd.label));
    assert.equal(FV.countLoops(nd), FV.countLoops(d) + 1);
});

test('vertex correction at e e γ: W ν, e γ, e Z, e H loops', () => {
    const d = base(), v = d.verts.find(x => x.kind === 'v' && FV.legsAt(d, x.id).some(l => l.p === 'e-' || l.p === 'e+'));
    const r = vertexLoops(d, v.id);
    assert.equal(r.diagrams.length, 4);
    allValid(r, d);
});

test('self-energy on the photon: fermion bubbles, W bubble, W seagull and γ–Z mixing', () => {
    const d = base(), e = d.edges.find(x => x.p === 'gamma');
    const r = selfEnergyLoops(d, e.id);
    allValid(r, d);
    assert.ok(r.diagrams.some(nd => /seagull/.test(nd.label)));
    assert.ok(r.diagrams.some(nd => nd.edges.some(x => x.p === 'Z')), 'γ–Z mixing');
    assert.ok(r.diagrams.some(nd => nd.edges.some(x => x.p === 't' || x.p === 'tbar')), 'top bubble');
});

test('tadpoles: none on a photon line, Higgs-stem ones on an electron leg', () => {
    const d = base();
    assert.equal(tadpoleLoops(d, { e: d.edges.find(x => x.p === 'gamma').id }).diagrams.length, 0);
    const leg = d.edges.find(x => !FV.isInternal(d, x) && (x.p === 'e-' || x.p === 'e+'));
    const r = tadpoleLoops(d, { e: leg.id });
    assert.ok(r.diagrams.length > 5);
    allValid(r, d);
    r.diagrams.forEach(nd => assert.ok(nd.loops.some(L => L.type === 'tadpole')));
});

test('a new line between the electron and muon legs makes boxes, relabelling the path', () => {
    const d = base();
    const eLeg = d.edges.find(x => !FV.isInternal(d, x) && x.p === 'e+'), mLeg = d.edges.find(x => !FV.isInternal(d, x) && x.p === 'mu-');
    const r = chordLoops(d, { e: eLeg.id }, { e: mLeg.id });
    assert.ok(r.diagrams.length >= 6);
    allValid(r, d);
    assert.ok(r.diagrams.some(nd => nd.edges.some(x => x.p === 'Z') && nd.edges.some(x => x.p === 'gamma')), 'γZ box from relabelling');
});

test('menus offer what the point allows', () => {
    const d = base();
    const cubic = d.verts.find(x => x.kind === 'v');
    assert.deepEqual(menuFor(d, { v: cubic.id }).map(m => m.id), ['vertex', 'tadpole', 'start']);
    assert.deepEqual(menuFor(d, { e: d.edges.find(x => x.p === 'gamma').id }).map(m => m.id), ['se', 'tadpole', 'start']);
});

test('two loops: renormalization lists the one-loop subdivergence and its counterterm diagram', () => {
    const d = base(), v = d.verts.find(x => x.kind === 'v' && FV.legsAt(d, x.id).some(l => l.p === 'e-' || l.p === 'e+'));
    const one = vertexLoops(d, v.id).diagrams.find(nd => /e−, γ/.test(strip(nd.label)));
    FV.layoutDiag(one);
    const ph = one.edges.find(x => x.p === 'gamma' && x.lids.length);
    const two = selfEnergyLoops(one, ph.id).diagrams.find(nd => !nd.loops.some(L => L.mixing) && nd.edges.filter(x => x.p === 'mu-' || x.p === 'mu+').length > 2) || selfEnergyLoops(one, ph.id).diagrams[0];
    assert.equal(FV.countLoops(two), 2);
    FV.layoutDiag(two);
    const R = renormReport(two);
    const subs = R.blobs.flatMap(b => b.subs.filter(s => s.divergent));
    assert.ok(subs.length >= 1);
    assert.ok(R.blobs.flatMap(b => b.ctDiagrams).length >= 1);
});

test('Feynman gauge: the vertex correction gains Goldstone loops', () => {
    const d = base(), v = d.verts.find(x => x.kind === 'v' && FV.legsAt(d, x.id).some(l => l.p === 'e-' || l.p === 'e+'));
    const u = vertexLoops(d, v.id).diagrams.length, f = vertexLoops(d, v.id, { model: 'feynman' });
    assert.ok(f.diagrams.length > u);
    assert.ok(f.diagrams.some(nd => nd.edges.some(x => x.p === 'G+' || x.p === 'G-' || x.p === 'G0')));
});

test('drawings: no crossing unless between identical lines or forced by the graph', async () => {
    const { loopDiagrams } = await import('../js/loops/graph.js');
    for (const [i, f] of [[['e-', 'e+'], ['e-', 'e+']], [['e-', 'e-'], ['e-', 'e-']], [['u', 'ubar'], ['g', 'g']]]) {
        for (const it of loopDiagrams(i, f, 1, { limit: 120 }).items) {
            const d = it.diagram; FV.layoutDiag(d);
            const bad = FV.crossingsDrawn(d).filter(([a, b]) => !FV.sameLine(d, a, b)).length;
            assert.ok(d.needsCross ? bad <= 1 : bad === 0, i + ' -> ' + f + ' ' + strip(d.label));
        }
    }
});
