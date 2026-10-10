// tests/hadrons.test.mjs — the full hadron catalogue (js/loops/hadrondata.js), its rules and decay diagrams.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { HADRONS, identifyHadron, quarkChoices } from '../js/loops/hadrondata.js';
import { HADRONS as BASE } from '../js/hadrons.js';
import { checkProcess } from '../js/loops/rules.js';
import { buildRuleDiagrams } from '../js/loops/build.js';
import { validateDiagram } from '../js/loops/validate.js';

const UP = ['u', 'c', 't'];
const qCharge = qs => qs.reduce((a, q) => { const f = q.normalize('NFD')[0], anti = q.normalize('NFD').includes('̄'); const c = UP.includes(f) ? 2 / 3 : -1 / 3; return a + (anti ? -c : c); }, 0);

test('catalogue: every eightfold member that has been observed is selectable', () => {
    const src = fs.readFileSync(new URL('../js/loops/eightfold.js', import.meta.url), 'utf8');
    const members = [...src.matchAll(/M\('([^']+)', \[[^\]]*\], (null|[\d.]+)/g)].map(m => [m[1], m[2]]);
    assert.ok(members.length > 60);
    members.forEach(([s, m]) => { if (m !== 'null') assert.ok(HADRONS[s], s + ' is observed but missing'); });
});

test('catalogue: charges match the quarks, antiparticles pair up, the classic table is untouched', () => {
    Object.entries(HADRONS).forEach(([s, h]) => {
        if (h.quarks) assert.ok(Math.abs(qCharge(h.quarks) - h.Q) < 1e-9, s + ' charge');
        assert.ok(HADRONS[h.anti], s + ' antiparticle ' + h.anti);
        assert.equal(HADRONS[h.anti].anti, s, s + ' anti of anti');
        assert.ok(Math.abs(HADRONS[h.anti].Q + h.Q) < 1e-9, s + ' opposite charge');
        assert.ok(h.m > 0, s + ' mass');
        assert.ok(quarkChoices(s).length > 0, s + ' has quark content');
    });
    assert.ok(!BASE['D⁰'] && Object.keys(HADRONS).length > 120);
});

test('identification by quark content prefers the ground state', () => {
    assert.equal(identifyHadron(['c', 'c̄']).symbol, 'ηc');
    assert.equal(identifyHadron(['u', 'd', 'c']).symbol, 'Λc⁺');
    assert.equal(identifyHadron(['b', 'ū']).symbol, 'B⁻');
});

test('selection rules for the new hadrons', () => {
    const ok = (i, f) => checkProcess(i, f, {}).allowed;
    const fails = (i, f) => checkProcess(i, f, {}).checks.filter(c => c.status === 'fail').map(c => c.id);
    assert.ok(ok(['D⁺'], ['K̄⁰', 'e⁺', 'νe']));
    assert.deepEqual(fails(['D⁺'], ['K⁰', 'e⁺', 'νe']), ['flavour']);          // c → s̄ is impossible with one W
    assert.deepEqual(fails(['B⁺'], ['D⁰', 'e⁺', 'νe']), ['flavour']);
    assert.ok(ok(['B̄ₛ⁰'], ['J/ψ', 'φ']));                                       // b → c c̄ s
    assert.ok(fails(['J/ψ'], ['γ', 'γ']).includes('cparity'));
    assert.ok(fails(['ρ⁰'], ['π⁰', 'π⁰']).includes('cparity'));
    assert.ok(ok(['ηc'], ['γ', 'γ']));
    const g = checkProcess(['ω'], ['π⁺', 'π⁻'], {}).checks.find(c => c.id === 'gparity');
    assert.equal(g.status, 'note');                                              // observed, isospin-violating
    assert.ok(ok(['Δ⁺⁺'], ['p', 'π⁺']) && ok(['D*⁺'], ['D⁰', 'π⁺']) && ok(['Σ⁰'], ['Λ', 'γ']));
});

test('quark-level decay diagrams: strong, electromagnetic and weak', () => {
    const cases = [
        [['Δ⁺⁺'], ['p', 'π⁺'], 'strong'], [['φ'], ['K⁺', 'K⁻'], 'strong'], [['D*⁺'], ['D⁰', 'π⁺'], 'strong'],
        [['Σ*⁺'], ['Λ', 'π⁺'], 'strong'], [['ω'], ['π⁰', 'γ'], 'electromagnetic'], [['D*⁰'], ['D⁰', 'γ'], 'electromagnetic'],
        [['J/ψ'], ['e⁻', 'e⁺'], 'electromagnetic'], [['D⁰'], ['K⁻', 'π⁺'], 'weak'], [['B⁻'], ['D⁰', 'π⁻'], 'weak'],
        [['Λb⁰'], ['Λc⁺', 'π⁻'], 'weak'], [['Ξcc⁺⁺'], ['Ξc⁺', 'π⁺'], 'weak'], [['B_c⁺'], ['J/ψ', 'π⁺'], 'weak']
    ];
    for (const [i, f, kind] of cases) {
        const r = buildRuleDiagrams(i, f, {});
        assert.ok(r.tree.length, i + ' → ' + f + ': ' + r.treeNote);
        const it = r.tree[0];
        assert.deepEqual(validateDiagram(it.diagram, it.ini, it.fin), [], i + ' → ' + f);
        const note = it.notes.find(n => n.title === 'Interaction');
        assert.ok(note && note.text.includes(kind), i + ' → ' + f + ' is ' + kind);
    }
});

test('synthesis routes: p → n is reached with added particles, ranked naturally', () => {
    const r = buildRuleDiagrams(['p'], ['n'], { extras: true });
    assert.ok(!r.rules.allowed && r.extended.length >= 6);
    const names = r.extended.map(it => it.initial.slice().sort().join(' ') + ' → ' + it.final.slice().sort().join(' '));
    for (const want of ['p γ → n π⁺', 'p π⁻ → n π⁰', 'e⁻ p → n νe']) assert.ok(names.includes(want), want);
    assert.ok(r.extended[0].rules && !r.extended[0].rules.needsWeak, 'a strong/EM route ranks first');
    assert.ok(r.extendedClosed.some(c => c.fin.includes('π⁺') || c.fin.includes('e⁺')), 'closed decay of a free proton is reported');
    const nb = buildRuleDiagrams(['n'], ['p'], { extras: true });
    assert.deepEqual(nb.extended[0].final.slice().sort(), ['e⁻', 'p', 'ν̄e']);   // β decay first
    for (const it of r.extended) assert.ok(it.diagram && it.added && (it.added.in.length + it.added.out.length) >= 1);
});
