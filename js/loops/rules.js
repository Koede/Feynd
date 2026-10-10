// js/loops/rules.js
// Process-level selection rules. Every rule is checked before any diagram is drawn.
//
// A rule fails only where the symmetry holds in nature. Where experiments have seen a
// symmetry broken (parity and CP in the weak interaction, isospin in η → 3π, flavour-
// changing neutral currents at one loop), the process is allowed and the check is
// reported as a note with the experiment that observed it.
//
// Symbols are the page's own ('e⁻', 'ū', 'π⁰', 'Ω⁻'). Masses are in MeV.

import { ALL_PARTICLES, HADRONS, isAntiQuark, quarkFlavour } from './hadrondata.js';
import { CITE } from './cite.js';

const FLAV = ['u', 'd', 's', 'c', 'b', 't'];
const fmtM = m => m >= 1000 ? (m / 1000).toFixed(m >= 10000 ? 1 : 3) + ' GeV' : (m < 1 ? m.toPrecision(3) : m.toFixed(1)) + ' MeV';
const frac = x => { const t = Math.round(x * 3); return t % 3 === 0 ? String(t / 3).replace('-', '−') : (t < 0 ? '−' : '') + Math.abs(t) + '/3'; };

// C and P of particles that are eigenstates (only the ones the page models)
const C_EIGEN = { 'γ': -1, 'π⁰': 1, 'η': 1, 'h': 1, 'η′': 1, 'ρ⁰': -1, 'ω': -1, 'φ': -1, 'ηc': 1, 'J/ψ': -1, 'ηb': 1, 'Υ': -1 };
const CP_EIGEN = { 'π⁰': -1, 'η': -1, 'h': 1, 'γ': 1, 'η′': -1, 'ρ⁰': 1, 'ω': 1, 'φ': 1, 'ηc': -1, 'J/ψ': 1, 'ηb': -1, 'Υ': 1 };
// G parity of the non-strange light mesons (G = C (−1)^I); conserved by the strong interaction
const G_PARITY = { 'π⁺': -1, 'π⁻': -1, 'π⁰': -1, 'η': 1, 'η′': 1, 'ρ⁺': 1, 'ρ⁻': 1, 'ρ⁰': 1, 'ω': -1, 'φ': -1 };

/** Quantum numbers of one particle symbol. */
export function props(sym) {
    const p = ALL_PARTICLES[sym];
    if (!p) return null;
    const flav = { u: 0, d: 0, s: 0, c: 0, b: 0, t: 0 };
    let colour = null;
    if (p.color === 'triplet') {
        const f = quarkFlavour(sym);
        flav[f] = isAntiQuark(sym) ? -1 : 1;
        colour = isAntiQuark(sym) ? '3b' : '3';
    } else if (p.color === 'octet') colour = '8';
    const hadron = Object.prototype.hasOwnProperty.call(HADRONS, sym);
    if (hadron && p.quarks) p.quarks.forEach(q => { const f = quarkFlavour(q); flav[f] += isAntiQuark(q) ? -1 : 1; });
    let P = null;
    if (hadron) P = p.group === 'meson' ? -1 : p.group === 'baryon' ? 1 : -1;
    else if (sym === 'γ' || sym === 'g') P = -1;
    else if (sym === 'h') P = 1;
    return {
        sym, name: p.name, Q: p.Q || 0, B: p.B || 0, Le: p.Le || 0, Lmu: p.Lmu || 0, Ltau: p.Ltau || 0,
        J: p.spin || 0, m: p.m || 0, flav, colour, hadron, group: p.group || null,
        neutrino: /^ν/.test(sym), weakBoson: sym === 'W⁺' || sym === 'W⁻' || sym === 'Z⁰',
        C: C_EIGEN[sym] !== undefined ? C_EIGEN[sym] : null, P, CP: CP_EIGEN[sym] !== undefined ? CP_EIGEN[sym] : null
    };
}

// ---------------------------------------------------------- hadronic thresholds
// Ground-state hadrons used only to find the lightest hadronic final state with given
// flavour (charm and bottom hadrons are not otherwise in the catalogue).
// (charm and bottom ground states are now part of the catalogue itself)
const EXTRA_HADRONS = [];
let THRESH_TABLE = null;
// Light flavours (u, d) can be netted: a uū pair can end up in a π⁰ or annihilate into
// gluons. s, c and b pairs need a hadron that contains them (η or a kaon pair for ss̄,
// ηc or open charm for cc̄, ηb or open bottom for bb̄), so those are counted as quarks
// and antiquarks separately.
const HEAVY = ['s', 'c', 'b'];
function contentVec(qs) {
    const v = { u: 0, d: 0, s: 0, sb: 0, c: 0, cb: 0, b: 0, bb: 0 };
    (qs || []).forEach(q => {
        const f = quarkFlavour(q), anti = isAntiQuark(q);
        if (HEAVY.includes(f)) v[anti ? f + 'b' : f]++;
        else if (f in v) v[f] += anti ? -1 : 1;
    });
    return v;
}
function thresholdTable() {
    if (THRESH_TABLE) return THRESH_TABLE;
    const rows = [];
    Object.entries(HADRONS).forEach(([sym, h]) => {
        if (h.quarks) rows.push({ sym, m: h.m, v: contentVec(h.quarks), B: h.B });
        else {
            rows.push({ sym, m: h.m, v: contentVec([]), B: 0 });
            if (sym === 'η') rows.push({ sym, m: h.m, v: contentVec(['s', 's̄']), B: 0 }); // the η has an ss̄ component
        }
    });
    EXTRA_HADRONS.forEach(([sym, q, m]) => {
        rows.push({ sym, m, v: contentVec(q), B: q.length === 3 ? 1 : 0 });
        const aq = q.map(x => isAntiQuark(x) ? x.normalize('NFD').replace(/̄/g, '') : x + '̄');
        rows.push({ sym: sym + '̄', m, v: contentVec(aq), B: q.length === 3 ? -1 : 0 });
    });
    THRESH_TABLE = rows;
    return rows;
}
const VK = ['u', 'd', 's', 'sb', 'c', 'cb', 'b', 'bb'];
const vkey = (v, B) => VK.map(f => v[f] || 0).join(',') + '|' + B;
const threshCache = new Map();
/** Lightest set of at most three hadrons with this quark content (see contentVec) and baryon number. */
export function lightestHadronic(v, B) {
    if (v && v.sb === undefined && (v.s || v.c || v.b)) {
        // net flavour vector given: split heavy flavours into quarks or antiquarks
        const w = { u: v.u || 0, d: v.d || 0, s: 0, sb: 0, c: 0, cb: 0, b: 0, bb: 0 };
        HEAVY.forEach(f => { if (v[f] > 0) w[f] = v[f]; else if (v[f] < 0) w[f + 'b'] = -v[f]; });
        v = w;
    }
    const k = vkey(v, B);
    if (threshCache.has(k)) return threshCache.get(k);
    const rows = thresholdTable(), zero = contentVec([]);
    const add = (a, b) => { const o = {}; VK.forEach(f => o[f] = (a[f] || 0) + (b[f] || 0)); return o; };
    let best = null;
    const test = (list) => {
        const sv = list.reduce((a, r) => add(a, r.v), zero), sB = list.reduce((a, r) => a + r.B, 0);
        if (vkey(sv, Math.round(sB * 3) / 3) !== k) return;
        const m = list.reduce((a, r) => a + r.m, 0);
        if (!best || m < best.m) best = { m, syms: list.map(r => r.sym) };
    };
    for (let i = 0; i < rows.length; i++) {
        test([rows[i]]);
        for (let j = i; j < rows.length; j++) {
            test([rows[i], rows[j]]);
            for (let l = j; l < rows.length; l++) test([rows[i], rows[j], rows[l]]);
        }
    }
    threshCache.set(k, best);
    return best;
}

// ------------------------------------------------------------------- the rules
function sum(list, f) { return list.reduce((a, p) => a + f(p), 0); }
const near = (a, b) => Math.abs(a - b) < 1e-9;

/**
 * initial, final: arrays of symbols. opts.sqrtS (GeV) enables scattering thresholds;
 * opts.colours (arrays aligned with initial/final) enables explicit colour bookkeeping.
 * Returns { allowed, checks, needsWeak, ... }.
 */
export function checkProcess(initial, final, opts = {}) {
    const I = initial.map(props), F = final.map(props);
    const checks = [];
    const add = (id, name, status, detail, cite) => checks.push({ id, name, status, detail, cite: cite || null });
    if (I.some(p => !p) || F.some(p => !p)) {
        add('model', 'Particles', 'fail', 'One of these particles is not in the model.');
        return { allowed: false, checks };
    }
    const all = I.concat(F);

    // ---- additive conservation laws
    const qi = sum(I, p => p.Q), qf = sum(F, p => p.Q);
    add('charge', 'Electric charge', near(qi, qf) ? 'pass' : 'fail', 'Q: ' + frac(qi) + ' → ' + frac(qf) + (near(qi, qf) ? '' : '. Charge is conserved exactly (an unbroken gauge symmetry).'));
    const bi = sum(I, p => p.B), bf = sum(F, p => p.B);
    add('baryon', 'Baryon number', near(bi, bf) ? 'pass' : 'fail', 'B: ' + frac(bi) + ' → ' + frac(bf) + (near(bi, bf) ? '' : '. No baryon-number violation has been observed; the best limit is on proton decay.'), near(bi, bf) ? null : CITE.SK_PDECAY);
    const fam = [['Le', 'Lₑ'], ['Lmu', 'L_μ'], ['Ltau', 'L_τ']];
    const famBad = fam.filter(([k]) => !near(sum(I, p => p[k]), sum(F, p => p[k])));
    const li = sum(I, p => p.Le + p.Lmu + p.Ltau), lf = sum(F, p => p.Le + p.Lmu + p.Ltau);
    if (!near(li, lf)) add('lepton', 'Lepton number', 'fail', 'L: ' + li + ' → ' + lf + '. Total lepton number is conserved in every observed process.', CITE.PDG);
    else if (famBad.length) add('lepton', 'Lepton family number', 'fail', famBad.map(([k, l]) => l + ': ' + sum(I, p => p[k]) + ' → ' + sum(F, p => p[k])).join(', ') + '. Charged-lepton flavour violation has never been observed. Neutrino oscillations do change lepton flavour, but only during propagation of massive neutrinos, which this model treats as massless.', [CITE.MEG2, CITE.SK_OSC]);
    else add('lepton', 'Lepton family numbers', 'pass', 'Lₑ, L_μ, L_τ each conserved');

    // ---- angular momentum: half-integer spins come in pairs
    const half = sum(all, p => Math.round(2 * p.J) % 2);
    add('spin', 'Angular momentum (fermion number)', half % 2 === 0 ? 'pass' : 'fail', half % 2 === 0 ? 'an even number of half-integer spins' : 'An odd number of half-integer-spin particles cannot conserve angular momentum.');

    // ---- colour
    const out = (list, sgn) => list.map(p => ({ p, sgn })); // sgn +1 final, −1 initial
    const legs = out(I, -1).concat(out(F, 1));
    let nq = 0, nqb = 0, ng = 0;
    legs.forEach(({ p, sgn }) => {
        if (p.colour === '3') sgn > 0 ? nq++ : nqb++;
        else if (p.colour === '3b') sgn > 0 ? nqb++ : nq++;
        else if (p.colour === '8') ng++;
    });
    const tri = ((nq - nqb) % 3 + 3) % 3;
    if (tri !== 0) add('colour', 'Colour', 'fail', 'The free quarks and antiquarks cannot form a colour singlet (quarks − antiquarks = ' + (nq - nqb) + ', not a multiple of 3). Colour is an exact gauge symmetry.');
    else if (ng === 1 && nq === 0 && nqb === 0) add('colour', 'Colour', 'fail', 'A single gluon with only colourless particles cannot conserve colour: one octet contains no singlet (Tr Tᵃ = 0), so the amplitude vanishes at every order.');
    else if (opts.colours) {
        const flow = colourFlowBalance(initial, final, opts.colours);
        add('colour', 'Colour (explicit)', flow.ok ? 'pass' : 'fail', flow.detail);
    } else add('colour', 'Colour', 'pass', ng + nq + nqb ? 'the coloured particles can combine into a singlet' : 'no free colour charges');

    // ---- kinematics
    const mi = sum(I, p => p.m), mfRaw = sum(F, p => p.m);
    const colourlessIn = I.every(p => !p.colour);
    let mf = mfRaw, hadNote = '';
    if (colourlessIn && F.some(p => p.colour)) {
        // coloured final partons hadronize: the lightest hadrons with their flavour set the threshold
        let cB = 0, tops = 0;
        const partonQuarks = [];
        F.filter(p => p.colour).forEach(p => { if (p.colour !== '8' && !p.flav.t) partonQuarks.push(p.sym); cB += p.B; if (p.flav.t) tops += p.m; });
        const cv = contentVec(partonQuarks);
        const hd = tops ? null : lightestHadronic(cv, Math.round(cB * 3) / 3);
        if (hd) {
            const partons = sum(F.filter(p => p.colour && !p.flav.t), p => p.m);
            if (hd.m > partons) { mf = mfRaw - partons + hd.m; hadNote = ' Quarks and gluons are confined, so the threshold uses the lightest hadrons with the same flavour: ' + hd.syms.join(' ') + ' (' + fmtM(hd.m) + ').'; }
        }
    }
    if (I.length === 1 && F.length === 1) {
        const same = Math.abs(I[0].m - F[0].m) < 1e-6 * Math.max(1, I[0].m);
        if (!same) add('kinematics', 'Kinematics', 'fail', 'One particle cannot turn into a single different particle: energy and momentum are conserved together only if the two masses are equal (here ' + fmtM(I[0].m) + ' and ' + fmtM(F[0].m) + ').');
        else if (I[0].sym !== F[0].sym) add('kinematics', 'Kinematics', 'note', 'Equal masses: this is particle–antiparticle mixing, which has been observed for neutral kaons (and B⁰, Bₛ, D⁰). It is a second-order weak transition through box diagrams, not a tree diagram.', CITE.KMIX);
        else add('kinematics', 'Kinematics', 'fail', 'The same particle in and out: no interaction.');
    } else if (I.length === 1) {
        const M = I[0].m;
        if (M === 0) add('kinematics', 'Kinematics', 'fail', 'A massless ' + I[0].sym + ' cannot decay; it only splits as a virtual line inside a larger process.');
        else if (mf >= M) add('kinematics', 'Kinematics', 'fail', 'm(' + I[0].sym + ') = ' + fmtM(M) + ' is not above the final-state mass of ' + fmtM(mf) + '.' + hadNote);
        else add('kinematics', 'Kinematics', 'pass', 'decay open: ' + fmtM(M) + ' > ' + fmtM(mf) + (hadNote ? hadNote : ''));
    } else if (F.length === 1) {
        const M = F[0].m;
        if (M <= mi) add('kinematics', 'Kinematics', 'fail', 'A single ' + F[0].sym + ' (' + fmtM(M) + ') cannot be produced on shell from particles totalling ' + fmtM(mi) + ': energy and momentum cannot both be conserved.');
        else add('kinematics', 'Kinematics', 'pass', 'resonant production needs √s = ' + fmtM(M) + ' (within the width)');
        if (opts.sqrtS && Math.abs(opts.sqrtS * 1000 - M) > Math.max(10, 0.05 * M)) checks[checks.length - 1] = { id: 'kinematics', name: 'Kinematics', status: 'fail', detail: 'A 2 → 1 process needs √s ≈ m(' + F[0].sym + ') = ' + fmtM(M) + '; you set √s = ' + fmtM(opts.sqrtS * 1000) + '.', cite: null };
    } else if (opts.sqrtS) {
        const s = opts.sqrtS * 1000;
        if (s < mi) add('kinematics', 'Kinematics', 'fail', '√s = ' + fmtM(s) + ' is below the initial rest masses (' + fmtM(mi) + ').');
        else if (s <= mf) add('kinematics', 'Kinematics', 'fail', '√s = ' + fmtM(s) + ' is below the final-state threshold of ' + fmtM(mf) + '.' + hadNote);
        else add('kinematics', 'Kinematics', 'pass', '√s = ' + fmtM(s) + ' > ' + fmtM(mf) + ' threshold' + hadNote);
    } else add('kinematics', 'Kinematics', 'skip', 'Threshold for scattering needs the collision energy; set √s to check it. Final-state mass ' + fmtM(mf) + '.' + hadNote);

    // ---- flavour
    const dF = {}; FLAV.forEach(f => { dF[f] = sum(F, p => p.flav[f]) - sum(I, p => p.flav[f]); });
    const dS = -dF.s, dC = dF.c, dBb = -dF.b, dT = dF.t;
    const flavourChange = FLAV.some(f => dF[f] !== 0);
    const hasNu = all.some(p => p.neutrino), hasWZ = all.some(p => p.weakBoson);
    const needsWeak = flavourChange || hasNu || hasWZ;
    const hadronDecay = I.length === 1 && I[0].hadron && !F.some(p => p.weakBoson || (p.colour && !p.hadron));
    if (!flavourChange) add('flavour', 'Flavour (S, C, B̃, T)', 'pass', 'conserved; strong and electromagnetic interactions can contribute');
    else {
        const parts = [['S', dS], ['C', dC], ['B̃', dBb], ['T', dT]].filter(x => x[1]).map(x => 'Δ' + x[0] + ' = ' + (x[1] > 0 ? '+' : '−') + Math.abs(x[1])).join(', ');
        // Can one W do it? A W changes one up-type quark into a down-type one (or back) on one
        // line, and either becomes a lepton pair (semileptonic) or makes a quark–antiquark pair
        // of the opposite up/down kinds. So the net change in quark number per flavour must be
        // ±(e_U − e_D) for a semileptonic process, or ±[(e_U − e_D) + (e_D′ − e_U′)] otherwise.
        const UPS = ['u', 'c', 't'], DNS = ['d', 's', 'b'];
        const chargedLep = F.filter(p => !p.neutrino && (p.Le || p.Lmu || p.Ltau)), nus = F.filter(p => p.neutrino);
        const semileptonic = chargedLep.length === 1 && nus.length === 1;
        const vecEq = v => FLAV.every(f => Math.abs((v[f] || 0) - dF[f]) < 1e-9);
        let oneW = false;
        for (const U of UPS) for (const D of DNS) for (const sg of [1, -1]) {
            if (semileptonic) { const v = {}; v[U] = sg; v[D] = (v[D] || 0) - sg; if (vecEq(v)) oneW = true; }
            else for (const U2 of UPS) for (const D2 of DNS) { const v = {}; v[U] = sg; v[D] = (v[D] || 0) - sg; v[D2] = (v[D2] || 0) + sg; v[U2] = (v[U2] || 0) - sg; if (vecEq(v)) oneW = true; }
        }
        const mixing11 = I.length === 1 && F.length === 1;
        if (hadronDecay && !hasWZ && !mixing11 && !oneW) {
            add('flavour', 'Flavour (one W per first-order weak process)', 'fail', parts + '. Strong and electromagnetic interactions conserve flavour; one W changes one quark line by one unit (c → s, b → c, s → u, …) and can create one quark–antiquark pair. This change needs two weak interactions' + (Math.abs(dS) >= 2 ? ' (ΔS = 2)' : '') + ', which has not been observed in a decay.', CITE.DS2);
        } else add('flavour', 'Flavour', 'note', parts + ': only the charged weak current changes flavour, through a W and the CKM matrix. Strangeness, charm and bottomness are conserved by the strong and electromagnetic interactions.', [CITE.CABIBBO, CITE.KM]);
        // ΔS = ΔQ, ΔC = ΔQ, ΔB̃ = ΔQ for semileptonic hadron decays with one flavour change:
        // at first order the heavier quark turns into the lighter one by emitting a W, so the
        // hadron's charge changes with its flavour quantum number
        const leptonPair = F.some(p => p.neutrino) && F.some(p => !p.neutrino && (p.Le || p.Lmu || p.Ltau));
        const changed = [['S', dS, 'strangeness', 'the s quark turns into a u quark'], ['C', dC, 'charm', 'the c quark turns into an s or d quark'], ['B̃', dBb, 'bottomness', 'the b quark turns into a c or u quark']].filter(x => x[1] !== 0);
        if (hadronDecay && leptonPair && changed.length === 1) {
            const [nm, dX, word, how] = changed[0];
            const dQh = sum(F.filter(p => p.hadron), p => p.Q) - I[0].Q;
            const id = nm === 'S' ? 'dsdq' : 'd' + (nm === 'C' ? 'c' : 'b') + 'dq';
            if (Math.abs(dX - dQh) > 1e-9) add(id, 'Δ' + nm + ' = ΔQ rule', 'fail', 'Δ' + nm + ' = ' + dX + ' but the hadronic charge changes by ' + dQh + '. At first order ' + how + ', so the hadron charge must change with the ' + word + '. Δ' + nm + ' = −ΔQ decays have not been observed.', nm === 'S' ? CITE.DSDQ : CITE.PDG);
            else add(id, 'Δ' + nm + ' = ΔQ rule', 'pass', 'Δ' + nm + ' = ΔQ = ' + dX);
        }
    }

    // ---- G parity: the strong interaction conserves it for non-strange light mesons
    if (!needsWeak && I.length === 1 && G_PARITY[I[0].sym] !== undefined && F.length >= 2 && F.every(p => G_PARITY[p.sym] !== undefined)) {
        const gi = G_PARITY[I[0].sym], gf = F.reduce((a, p) => a * G_PARITY[p.sym], 1);
        if (gi !== gf) add('gparity', 'G parity (isospin)', 'note', 'G: ' + sign(gi) + ' → ' + sign(gf) + '. The strong interaction conserves G parity, so this decay needs isospin breaking (the u–d mass difference or electromagnetism, e.g. ρ–ω mixing) and is suppressed. ' + (I[0].sym === 'ω' && F.length === 2 ? 'ω → π⁺π⁻ is observed with a branching fraction of 1.5 %.' : 'Rates of such decays are small; see the PDG listings.'), CITE.PDG);
        else add('gparity', 'G parity (isospin)', 'pass', 'G: ' + sign(gi) + ' → ' + sign(gf));
    }

    // ---- C parity (strong and electromagnetic only)
    const gluons = all.filter(p => p.sym === 'g');
    const cEligible = !needsWeak && all.every(p => p.C !== null || p.sym === 'g') && (gluons.length === 0 || (gluons.length === 2 && !all.some(p => p.colour && p.sym !== 'g')));
    if (cEligible && all.some(p => p.C !== null)) {
        // two gluons in a colour singlet (δᵃᵇ, symmetric) have C = +1
        const cOf = list => list.reduce((a, p) => a * (p.sym === 'g' ? 1 : p.C), 1);
        const ci = cOf(I), cf = cOf(F);
        const photonsOnly = all.every(p => p.sym === 'γ');
        if (ci !== cf) add('cparity', 'C parity', 'fail', 'C: ' + (ci > 0 ? '+' : '−') + ' → ' + (cf > 0 ? '+' : '−') + '. Strong and electromagnetic interactions conserve C (each photon has C = −1' + (gluons.length === 2 ? '; two gluons in a colour singlet have C = +1' : '') + ').' + (photonsOnly ? ' For photons alone this is Furry’s theorem.' : ''), photonsOnly ? CITE.FURRY : (all.some(p => p.sym === 'π⁰') ? [CITE.PI3G, CITE.PDG] : CITE.PDG));
        else add('cparity', 'C parity', 'pass', 'C: ' + (ci > 0 ? '+' : '−') + ' → ' + (cf > 0 ? '+' : '−'));
    }

    // ---- Landau–Yang: a massive spin-1 particle and two identical massless vectors
    const ly = (a, b) => a.length === 1 && a[0].J === 1 && a[0].m > 0 && b.length === 2 && b[0].sym === b[1].sym && (b[0].sym === 'γ' || b[0].sym === 'g');
    if (ly(I, F) || ly(F, I)) add('landau-yang', 'Landau–Yang theorem', 'fail', 'A massive spin-1 particle cannot couple to two identical on-shell massless spin-1 bosons: no two-photon (or two-gluon) state has J = 1 and the right symmetry. The observation of H → γγ is part of why the Higgs boson is known not to be spin 1.', [CITE.LY, CITE.HGG]);

    // ---- angular momentum: 0 → 0 + one photon
    if (I.length === 1 && F.length === 2 && I[0].J === 0) {
        const g = F.findIndex(p => p.sym === 'γ');
        if (g >= 0 && F[1 - g].J === 0) add('zero-zero', 'Angular momentum (0 → 0 + γ)', 'fail', 'A real photon carries helicity ±1, which a spin-0 → spin-0 transition cannot supply, so single-photon emission between spin-0 states is absolutely forbidden.', CITE.PDG);
    }

    // ---- parity and CP in two-body decays of a spin-0 meson into two spin-0 mesons
    if (I.length === 1 && F.length === 2 && I[0].J === 0 && I[0].P !== null && F.every(p => p.J === 0 && p.P !== null)) {
        const pf = F[0].P * F[1].P; // L = 0
        if (pf !== I[0].P) {
            if (needsWeak) add('parity', 'Parity', 'note', 'P: ' + sign(I[0].P) + ' → ' + sign(pf) + '. Allowed because the weak interaction violates parity; the same final states from one kaon were the τ–θ puzzle.', [CITE.LEEYANG, CITE.WU]);
            else {
                const cpI = I[0].CP, cpF = F.every(p => p.CP !== null || ['π⁺', 'π⁻'].includes(p.sym)) ? 1 : null;
                if (cpI !== null && cpF !== null && cpI !== cpF) add('parity', 'Parity and CP', 'fail', 'P: ' + sign(I[0].P) + ' → ' + sign(pf) + ' and CP: ' + sign(cpI) + ' → ' + sign(cpF) + '. Strong and electromagnetic interactions conserve P. CP violation has been seen in K, D and B mesons and, since 2025, in b baryons, but never in η decays.', [CITE.KLOE_ETA, CITE.CCFT, CITE.LHCB_BCPV]);
                else add('parity', 'Parity', 'fail', 'P: ' + sign(I[0].P) + ' → ' + sign(pf) + '. Strong and electromagnetic interactions conserve parity.', CITE.PDG);
            }
        } else add('parity', 'Parity', 'pass', 'P: ' + sign(I[0].P) + ' → ' + sign(pf));
    }

    // ---- isospin is broken in η → 3π: allowed, and noted
    if (initial.length === 1 && initial[0] === 'η' && final.length === 3 && final.every(s => /^π/.test(s))) add('isospin', 'Isospin (G parity)', 'note', 'η → 3π violates G parity, so it cannot go through the isospin-symmetric strong interaction. It is observed, driven by the u–d quark mass difference.', CITE.ETA3PI);

    const allowed = !checks.some(c => c.status === 'fail');
    return { allowed, checks, needsWeak, flavourChange, dF, colourlessIn };
}

function sign(x) { return x > 0 ? '+' : '−'; }

/**
 * Explicit colour bookkeeping. Every colour line starts and ends on an external leg,
 * so the colours flowing in must match the colours flowing out, one for one.
 */
export function colourFlowBalance(initial, final, colours) {
    const inflow = [], outflow = [];
    let freeIn = 0, freeOut = 0;
    const push = (sym, col, isFinal) => {
        const p = ALL_PARTICLES[sym];
        if (!p || HADRONS[sym]) return; // hadrons are colour singlets
        if (p.color === 'triplet') {
            const anti = isAntiQuark(sym);
            // a quark's colour line flows with it, an antiquark's against it
            const isIn = anti === isFinal;
            if (!col) { isIn ? freeIn++ : freeOut++; return; }
            (isIn ? inflow : outflow).push(col.q);
        } else if (p.color === 'octet') {
            if (!col) { freeIn++; freeOut++; return; }
            if (isFinal) { outflow.push(col.c); inflow.push(col.a); } else { inflow.push(col.c); outflow.push(col.a); }
        }
    };
    initial.forEach((s, i) => push(s, colours.initial[i], false));
    final.forEach((s, i) => push(s, colours.final[i], true));
    const NAME = { r: 'red', g: 'green', b: 'blue' };
    const show = l => l.length ? l.map(c => NAME[c]).join(', ') : 'none';
    // colours left over on either side must be supplied by the particles left on automatic
    let needIn = 0, needOut = 0;
    ['r', 'g', 'b'].forEach(c => {
        const d = outflow.filter(x => x === c).length - inflow.filter(x => x === c).length;
        if (d > 0) needIn += d; else needOut -= d;
    });
    const ok = needIn <= freeIn && needOut <= freeOut;
    const auto = freeIn || freeOut ? ' (particles on automatic take whatever colours balance the flow)' : '';
    return ok
        ? { ok: true, detail: 'colour lines balance: in ' + show(inflow) + ', out ' + show(outflow) + auto }
        : { ok: false, detail: 'Colour lines flowing in (' + show(inflow) + ') do not match those flowing out (' + show(outflow) + ')' + (freeIn || freeOut ? ', and the particles on automatic cannot make up the difference' : '') + '. Each colour line must run from one external leg to another, so this colour assignment is forbidden.' };
}
