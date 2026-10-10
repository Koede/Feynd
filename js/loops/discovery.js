// js/loops/discovery.js
// "What can these particles turn into?" for any number of initial particles.
// Every multiset of final particles up to the chosen multiplicity is screened with the
// additive conservation laws first (cheap), then the full selection rules, and only
// then handed to the diagram builders. Results are grouped by final state.

import { FV } from './engine.js';
import { PARTICLES } from '../particles.js';
import { HADRONS } from '../hadrons.js';
import { props, checkProcess } from './rules.js';
import { buildRuleDiagrams } from './build.js';

const ELEMENTARY = Object.keys(PARTICLES);
const HADRON_LIST = Object.keys(HADRONS);

function* multisets(list, k, start = 0, acc = []) {
    if (acc.length === k) { yield acc.slice(); return; }
    for (let i = start; i < list.length; i++) { acc.push(list[i]); yield* multisets(list, k, i, acc); acc.pop(); }
}

/**
 * initial: site symbols. opts: { maxMultiplicity, finals: 'elementary'|'hadrons'|'both',
 * loops, colours, sqrtS, deadline, onProgress(done, total, note), onGroup(group) }
 */
export function discover(initial, opts = {}) {
    const { maxMultiplicity = 3, loops = false, colours = null, sqrtS = null, onProgress, onGroup } = opts;
    const deadline = opts.deadline || (Date.now() + 120000);
    const hadronIn = initial.some(s => HADRONS[s]);
    const finalsMode = opts.finals || (hadronIn ? 'both' : 'elementary');
    let pool = finalsMode === 'hadrons' ? HADRON_LIST.slice() : finalsMode === 'both' ? ELEMENTARY.concat(HADRON_LIST) : ELEMENTARY.slice();
    // weak bosons and the Higgs as final states only when they can be produced on shell
    const I = initial.map(props);
    const vec = p => [p.Q * 3, p.B * 3, p.Le, p.Lmu, p.Ltau].map(Math.round);
    const target = I.reduce((a, p) => a.map((x, i) => x + vec(p)[i]), [0, 0, 0, 0, 0]);
    const mIn = I.reduce((a, p) => a + p.m, 0);
    const budget = initial.length === 1 ? I[0].m : (sqrtS ? sqrtS * 1000 : Infinity);
    if (initial.length === 1 && budget === 0) return { groups: [], excluded: {}, note: 'A massless particle cannot decay. Add a second initial particle.' };
    pool = pool.filter(s => props(s).m < budget);
    const P = Object.fromEntries(pool.map(s => [s, props(s)]));

    const groups = [], excluded = {};
    const bump = (k) => { excluded[k] = (excluded[k] || 0) + 1; };
    let total = 0, done = 0, truncated = false;
    const minK = initial.length >= 2 ? 1 : 2;
    const sizes = [];
    for (let k = minK; k <= maxMultiplicity; k++) sizes.push(k);
    // rough count for the progress bar
    const nChoose = (n, k) => { let r = 1; for (let i = 0; i < k; i++) r = r * (n + k - 1 - i) / (i + 1); return Math.round(r); };
    sizes.forEach(k => { total += nChoose(pool.length, k); });

    outer:
    for (const k of sizes) {
        for (const fin of multisets(pool, k)) {
            done++;
            if (onProgress && done % 500 === 0) onProgress(done, total, 'Screening ' + k + '-particle final states');
            if (Date.now() > deadline) { truncated = true; break outer; }
            // the same state back again is not a decay
            if (initial.length === 1 && k === 1) continue;
            const v = fin.reduce((a, s) => a.map((x, i) => x + vec(P[s])[i]), [0, 0, 0, 0, 0]);
            if (v.some((x, i) => x !== target[i])) { bump(v[0] !== target[0] ? 'charge' : v[1] !== target[1] ? 'baryon' : 'lepton'); continue; }
            const mOut = fin.reduce((a, s) => a + P[s].m, 0);
            if (initial.length === 1 && mOut >= budget) { bump('kinematics'); continue; }
            if (sqrtS && mOut >= budget) { bump('kinematics'); continue; }
            const rules = checkProcess(initial, fin, { sqrtS, colours: colours ? { initial: colours.initial, final: fin.map(() => null) } : null });
            if (!rules.allowed) { bump(rules.checks.find(c => c.status === 'fail').id); continue; }
            const res = buildRuleDiagrams(initial, fin, { loops: false, autoLoops: loops, colours: colours ? { initial: colours.initial, final: fin.map(() => null) } : null, sqrtS, deadline: Math.min(deadline, Date.now() + 8000) });
            const items = res.tree.concat(res.loops);
            if (!items.length) { bump('no diagram'); continue; }
            const g = {
                final: fin, items, count: items.length, rules, loopInduced: !res.tree.length,
                hadronic: res.hadronic, best: items.reduce((a, it) => Math.max(a, it.diagram.strength || 0), 0),
                minOrder: Math.min(...items.map(it => it.orderTotal || 0)), ini: res.ini, fin: res.fin
            };
            groups.push(g);
            if (onGroup) onGroup(g);
        }
    }
    groups.sort((a, b) => a.final.length - b.final.length || a.loopInduced - b.loopInduced || a.minOrder - b.minOrder || b.best - a.best);
    return { groups, excluded, truncated, screened: done };
}
