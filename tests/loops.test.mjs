// tests/loops.test.mjs — the rule-built engine behind loops.html
import test from 'node:test';
import assert from 'node:assert/strict';
import { FV } from '../js/loops/engine.js';
import { toEngineIds, toEngineId, toSiteSymbol } from '../js/loops/symbols.js';
import { validateDiagram } from '../js/loops/validate.js';
import { hadronDiagram } from '../js/loops/hadronq.js';
import { buildRuleDiagrams, decayForbidden } from '../js/loops/build.js';
import { checkProcess, lightestHadronic } from '../js/loops/rules.js';
import { oneLoopDiagrams } from '../js/loops/oneloop.js';
import { colourSetup, solveColour, fixExternal, colourValid, colourForElementary, extVars } from '../js/loops/color.js';
import { extendedDiagrams } from '../js/loops/solve.js';
import { discover } from '../js/loops/discovery.js';
import { HADRONS } from '../js/hadrons.js';
import { MULTIPLETS, posOf } from '../js/loops/eightfold.js';
import { parseSpec, defaultColour, colourKindOf } from '../js/loops/colourui.js';

const ids = s => s.split(' ');

// ------------------------------------------------------------------ symbols
test('symbol adapter maps site symbols to engine ids and back', () => {
    assert.deepEqual(toEngineIds(['e⁻', 'e⁺', 'μ⁻', 'ν̄μ', 'νe', 'ū', 'd̄', 'γ', 'Z⁰', 'h', 'W⁺', 'W⁻', 'g', 'τ⁺', 't̄']),
        ['e-', 'e+', 'mu-', 'nubar_mu', 'nu_e', 'ubar', 'dbar', 'gamma', 'Z', 'H', 'W+', 'W-', 'g', 'tau+', 'tbar']);
    assert.equal(toEngineId('π⁺'), null);
    assert.equal(toSiteSymbol('nubar_mu'), 'ν̄μ');
});

// ------------------------------------------------------------- tree generator
test('tree counts match the textbook, including quartic vertices inside larger diagrams', () => {
    const count = (a, b) => FV.generate(ids(a), ids(b)).bases.length;
    assert.equal(count('g g', 'g g'), 4);
    assert.equal(count('u ubar', 'g g'), 3);
    assert.equal(count('e- e+', 'W- W+'), 4);
    assert.equal(count('g g', 'g g g'), 25);
    assert.equal(count('u ubar', 'g g g'), 16);
    assert.equal(count('gamma gamma', 'W+ W-'), 3);
});

test('audit: a sample of tree and loop diagrams obey the Feynman rules', () => {
    const all = FV.ORDER.filter(FV.isVisible);
    let seed = 11; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const pick = () => all[Math.floor(rnd() * all.length)];
    let checked = 0;
    for (let n = 0; n < 8000 && checked < 400; n++) {
        const shape = [[1, 2], [2, 2], [1, 3], [3, 2], [3, 1], [2, 3]][n % 6];
        const ini = Array.from({ length: shape[0] }, pick), fin = Array.from({ length: shape[1] }, pick);
        if (FV.checkConservation(ini, fin).length) continue;
        for (const b of FV.generate(ini, fin).bases.slice(0, 3)) {
            const d = FV.cloneDiag(b); FV.layoutDiag(d);
            assert.deepEqual(validateDiagram(d, ini, fin), [], ini + ' -> ' + fin);
            const s = FV.sites(d, FV.prefFor(ini, fin))[0];
            if (s) assert.deepEqual(validateDiagram(FV.applySite(d, s), ini, fin), [], 'loop on ' + ini + ' -> ' + fin);
            checked++;
        }
    }
    assert.ok(checked > 100);
});

test('planar external ordering: trees are drawn without crossings', () => {
    for (const [a, b] of [['e- e+', 'mu- mu+ gamma gamma'], ['g g', 'g g g'], ['e- e+', 'e- e+ e- e+']]) {
        for (const base of FV.generate(ids(a), ids(b)).bases.slice(0, 6)) {
            const d = FV.cloneDiag(base);
            assert.equal(FV.layoutDiag(d), 0, a + ' -> ' + b + ' ' + base.label);
        }
    }
});

// ------------------------------------------------------------------ one loop
test('one-loop generator reproduces the known loop-induced sets', () => {
    const hgg = oneLoopDiagrams(['H'], ids('gamma gamma'));
    // 9 charged fermions x 2 orientations, 2 W triangles, 1 W seagull bubble (unitary gauge)
    assert.equal(hgg.items.length, 21);
    assert.equal(hgg.items.filter(i => i.diagram.loops[0].quartic).length, 1);
    const ggh = oneLoopDiagrams(ids('g g'), ['H']);
    assert.equal(ggh.items.length, 12); // 6 quarks x 2 orientations
    for (const r of [hgg, ggh, oneLoopDiagrams(ids('gamma gamma'), ids('gamma gamma')), oneLoopDiagrams(ids('e- e+'), ids('mu- mu+'))])
        for (const it of r.items) assert.deepEqual(validateDiagram(it.diagram, it.ini, it.fin), []);
});

test('one-loop diagrams that vanish by colour (Tr Tᵃ = 0) are removed', () => {
    const r = buildRuleDiagrams(['g', 'g'], ['γ', 'γ'], { loops: true });
    assert.ok(r.loops.length > 0);
    assert.ok(r.loops.every(it => it.group.includes('Box')), 'only the quark boxes survive');
    assert.ok(r.loopDropped > 0);
});

// --------------------------------------------------------------------- rules
const verdict = (a, b, o) => checkProcess(a, b, o || {});
const failed = (a, b, o) => verdict(a, b, o).checks.filter(c => c.status === 'fail').map(c => c.id);
test('rules: Landau–Yang forbids Z ↔ two photons or two gluons', () => {
    assert.deepEqual(failed(['Z⁰'], ['γ', 'γ']), ['landau-yang']);
    assert.deepEqual(failed(['Z⁰'], ['g', 'g']), ['landau-yang']);
    assert.ok(failed(['g', 'g'], ['Z⁰']).includes('landau-yang'));
    assert.ok(verdict(['h'], ['γ', 'γ']).allowed);
    assert.ok(verdict(['h'], ['Z⁰', 'γ']).allowed);
});
test('rules: colour forbids a lone gluon with colourless particles', () => {
    assert.ok(failed(['Z⁰'], ['g', 'γ']).includes('colour'));
    assert.ok(failed(['h'], ['g', 'γ']).includes('colour'));
});
test('rules: C parity (Furry) forbids odd photons from C-even states', () => {
    assert.ok(failed(['π⁰'], ['γ', 'γ', 'γ']).includes('cparity'));
    assert.ok(failed(['h'], ['γ', 'γ', 'γ']).includes('cparity'));
    assert.ok(failed(['h'], ['g', 'g', 'γ']).includes('cparity'));
    assert.ok(verdict(['π⁰'], ['γ', 'γ']).allowed);
});
test('rules: P and CP forbid η → ππ; 0 → 0 + γ is forbidden', () => {
    assert.ok(failed(['η'], ['π⁺', 'π⁻']).includes('parity'));
    assert.ok(failed(['η'], ['π⁰', 'γ']).includes('zero-zero'));
    const k = verdict(['K⁺'], ['π⁺', 'π⁰']);
    assert.ok(k.allowed, 'weak decays may violate parity');
    assert.equal(k.checks.find(c => c.id === 'parity').status, 'note');
});
test('rules: strangeness — |ΔS| ≤ 1 per W and ΔS = ΔQ', () => {
    assert.ok(failed(['Ξ⁰'], ['p', 'π⁻']).includes('flavour'));
    assert.ok(failed(['Ω⁻'], ['K⁻', 'p', 'π⁻']).includes('flavour'));
    assert.ok(failed(['Σ⁺'], ['n', 'e⁺', 'νe']).includes('dsdq'));
    assert.ok(verdict(['Λ'], ['p', 'e⁻', 'ν̄e']).allowed);
    assert.ok(verdict(['Ω⁻'], ['Λ', 'K⁻']).allowed);
});
test('rules: lepton family, baryon number and isospin note', () => {
    assert.ok(failed(['μ⁻'], ['e⁻', 'γ']).includes('lepton'));
    assert.ok(failed(['p'], ['e⁺', 'π⁰']).includes('baryon'));
    const eta = verdict(['η'], ['π⁰', 'π⁰', 'π⁰']);
    assert.ok(eta.allowed);
    assert.equal(eta.checks.find(c => c.id === 'isospin').status, 'note');
});
test('rules: kinematics, including confinement thresholds and √s', () => {
    assert.match(decayForbidden(['νe'], ['e⁻', 'π⁺']), /massless/);
    assert.match(decayForbidden(['π⁰'], ['K⁺', 'K⁻']), /not above/);
    assert.ok(failed(['μ⁻'], ['νμ', 'd', 'ū']).includes('kinematics'), 'μ⁻ cannot make a π⁻');
    assert.ok(verdict(['τ⁻'], ['ντ', 'd', 'ū']).allowed);
    assert.ok(failed(['e⁻', 'e⁺'], ['γ']).includes('kinematics'));
    assert.ok(failed(['e⁻', 'e⁺'], ['μ⁻', 'μ⁺'], { sqrtS: 0.1 }).includes('kinematics'));
    assert.ok(verdict(['e⁻', 'e⁺'], ['Z⁰'], { sqrtS: 91.19 }).allowed);
    assert.equal(lightestHadronic({ u: -1, d: 1, s: 0, c: 0, b: 0 }, 0).syms[0], 'π⁻');
});

// -------------------------------------------------------------------- colour
function colourCount(a, b, specIn, specOut) {
    let ok = 0;
    for (const base of FV.generate(ids(a), ids(b)).bases) if (colourForElementary(base, specIn, specOut)) ok++;
    return ok;
}
test('colour: conservation by colour lines', () => {
    assert.equal(colourCount('u ubar', 'gamma', [{ q: 'r' }, { q: 'r' }], [null]), 1);          // r r̄ → γ
    assert.equal(colourCount('u ubar', 'g gamma', [{ q: 'r' }, { q: 'r' }], [{ c: 'r', a: 'g' }, null]), 0); // r r̄ cannot make r ḡ
    assert.equal(colourCount('u ubar', 'g gamma', [{ q: 'r' }, { q: 'g' }], [{ c: 'r', a: 'g' }, null]), 2);
    assert.equal(colourCount('u', 'u g', [{ q: 'r' }], [{ q: 'g' }, { c: 'r', a: 'g' }]), 1);
    assert.equal(colourCount('u', 'u g', [{ q: 'r' }], [{ q: 'g' }, { c: 'g', a: 'r' }]), 0);
    assert.equal(colourCount('u d', 'u d', [{ q: 'r' }, { q: 'g' }], [{ q: 'b' }, { q: 'r' }]), 0);
    assert.ok(colourCount('g g', 'g g', [{ c: 'r', a: 'g' }, { c: 'g', a: 'b' }], [{ c: 'r', a: 'b' }, { c: 'g', a: 'g' }]) > 0);
});
test('colour: explicit colours in the rules use the same line counting', () => {
    const c = (i, f) => checkProcess(['u', 'ū'], ['g', 'g'], { colours: { initial: i, final: f } }).checks.find(x => x.id === 'colour').status;
    assert.equal(c([{ q: 'r' }, { q: 'g' }], [null, null]), 'pass');
    assert.equal(c([{ q: 'r' }, { q: 'g' }], [{ c: 'r', a: 'b' }, { c: 'b', a: 'g' }]), 'pass');
    assert.equal(c([{ q: 'r' }, { q: 'g' }], [{ c: 'r', a: 'b' }, { c: 'g', a: 'g' }]), 'fail');
});
test('colour: hadrons stay singlets and honour chosen constituent colours', () => {
    const r = hadronDiagram(['Ω⁻'], ['Λ', 'K⁻'], { colours: { initial: [{ q: ['r', 'g', 'b'] }], final: [null, null] } });
    assert.ok(r && r.diagram.colour);
    const d = r.diagram, st = colourSetup(d), sol = d.colour.sol, m = d.hadronMeta;
    m.blocksR.forEach(b => {
        const cols = m.idsR.slice(b.from, b.to + 1).map(id => sol.colourOf[extVars(d, st, id).q]);
        if (cols.length === 3) assert.equal(new Set(cols).size, 3, 'baryon carries r, g and b');
        else assert.equal(cols[0], cols[1], 'meson carries a colour and its anticolour');
    });
    // a final colour arrangement the simple W diagram cannot reach is reached with a gluon
    const g = hadronDiagram(['Ω⁻'], ['Λ', 'K⁻'], { colours: { initial: [{ q: ['r', 'g', 'b'] }], final: [{ q: ['r', 'g', 'b'] }, { q: ['b', 'b'] }] } });
    assert.ok(g && g.diagram.edges.some(e => e.p === 'g'));
});

// ---------------------------------------------------------- hadrons at quark level
const HADRONIC = [
    [['Ω⁻'], ['Λ', 'K⁻'], 'W-'], [['Λ'], ['p', 'π⁻'], 'W-'], [['n'], ['p', 'e⁻', 'ν̄e'], 'W-'],
    [['π⁺'], ['μ⁺', 'νμ'], 'W+'], [['K⁺'], ['μ⁺', 'νμ'], 'W+'], [['π⁰'], ['γ', 'γ'], null],
    [['e⁻', 'e⁺'], ['π⁺', 'π⁻'], null], [['Σ⁺'], ['n', 'π⁺'], 'W-'], [['Ξ⁻'], ['Λ', 'π⁻'], 'W-'], [['Ω⁻'], ['Ξ⁰', 'π⁻'], 'W-']
];
test('hadron processes are drawn at quark level with real mediators', () => {
    for (const [a, b, w] of HADRONIC) {
        const hd = hadronDiagram(a, b);
        assert.ok(hd, a + ' -> ' + b);
        assert.deepEqual(validateDiagram(hd.diagram, null, null), [], a + ' -> ' + b);
        const internal = hd.diagram.edges.filter(e => !e.spectator && FV.isInternal(hd.diagram, e));
        assert.ok(internal.length >= 1);
        if (w) assert.ok(internal.some(e => e.p === 'W-' || e.p === 'W+'), 'W exchanged in ' + a + ' -> ' + b);
    }
});
test('catalogue quark content reproduces charge, baryon number and strangeness', () => {
    const qQ = { u: 2 / 3, d: -1 / 3, s: -1 / 3, c: 2 / 3 };
    for (const [sym, h] of Object.entries(HADRONS)) {
        if (!h.quarks) continue;
        let Q = 0, B = 0, S = 0;
        for (const q of h.quarks) {
            const anti = q.normalize('NFD').includes('̄'), f = q.normalize('NFD').replace(/̄/g, '');
            Q += (anti ? -1 : 1) * qQ[f]; B += (anti ? -1 : 1) / 3; if (f === 's') S += anti ? 1 : -1;
        }
        assert.ok(Math.abs(Q - h.Q) < 1e-9, sym + ' charge');
        assert.ok(Math.abs(B - h.B) < 1e-9, sym + ' baryon number');
        assert.equal(S, h.S, sym + ' strangeness');
    }
    assert.equal(HADRONS['Ω⁻'].spin, 1.5);
});

// --------------------------------------------------------------- whole builds
test('build: any number of initial particles, rules first, notes on every diagram', () => {
    const r = buildRuleDiagrams(['e⁻', 'e⁺', 'γ'], ['μ⁻', 'μ⁺']);
    assert.ok(r.rules.allowed && r.tree.length > 0);
    r.tree.forEach(it => assert.ok(Array.isArray(it.notes)));
    const z = buildRuleDiagrams(['Z⁰'], ['γ', 'γ'], { loops: true });
    assert.equal(z.rules.allowed, false);
    assert.equal(z.loops.length, 0);
    const pi = buildRuleDiagrams(['π⁺'], ['e⁺', 'νe']);
    assert.ok(pi.tree[0].notes.some(n => n.title === 'Helicity suppression'));
    const h = buildRuleDiagrams(['h'], ['γ', 'γ'], { loops: true });
    assert.equal(h.tree.length, 0);
    assert.ok(h.loops.length >= 20);
});
test('extra particles: e⁻ → e⁻ is completed by physical extra legs only', () => {
    const items = extendedDiagrams(['e⁻'], ['e⁻']);
    assert.ok(items.length > 0);
    for (const it of items) {
        assert.ok(checkProcess(it.initial, it.final).allowed);
        assert.ok(it.diagram.verts.some(v => v.extra));
        assert.ok(it.initial.length + it.final.length >= 4, 'a real electron cannot emit or absorb on its own');
    }
});
test('discovery: rule-built, kinematically screened, any initial count', () => {
    const mu = discover(['μ⁻'], { maxMultiplicity: 3 });
    assert.deepEqual(mu.groups.map(g => g.final.join(' ')), ['e⁻ ν̄e νμ']);
    const pi = discover(['π⁺'], { maxMultiplicity: 3 });
    assert.ok(pi.groups.some(g => g.final.join(' ') === 'μ⁺ νμ'));
    assert.ok(!pi.groups.some(g => g.final.some(s => ['u', 'd̄'].includes(s))), 'no free quarks below the pion mass');
    const three = discover(['e⁻', 'e⁺', 'γ'], { maxMultiplicity: 2, deadline: Date.now() + 20000 });
    assert.ok(three.groups.length > 0);
});

// ------------------------------------------------------------- eightfold, UI data
test('eightfold way: multiplet positions match the catalogue quantum numbers', () => {
    for (const k of ['ps', 'oct', 'anti']) for (const m of MULTIPLETS[k].members) {
        const h = HADRONS[m.sym];
        if (!h) continue;
        const [I3, Y, C] = posOf(m.q);
        assert.ok(Math.abs(Y - (h.B + h.S)) < 1e-9, m.sym + ' hypercharge');
        assert.ok(Math.abs(I3 + Y / 2 - h.Q) < 1e-9, m.sym + ' Gell-Mann–Nishijima');
        assert.equal(C, 0);
    }
    assert.equal(MULTIPLETS.oct.members.filter(m => HADRONS[m.sym]).length, 8);
});
test('colour specs: defaults and typed parsing keep hadrons colour singlets', () => {
    assert.deepEqual(defaultColour('Ω⁻'), { q: ['r', 'g', 'b'] });
    assert.deepEqual(parseSpec('K⁻', 'gb'), { q: ['g', 'g'] }, 'a meson’s antiquark follows its quark');
    assert.equal(parseSpec('p', 'rrg'), undefined, 'a baryon needs three different colours');
    assert.deepEqual(parseSpec('g', 'rb'), { c: 'r', a: 'b' });
    assert.equal(colourKindOf('e⁻'), null);
});
