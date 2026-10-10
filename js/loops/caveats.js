// js/loops/caveats.js
// Phenomenological caveats attached to individual diagrams. Each note says what the
// diagram leaves out or simplifies, and why, with a reference where one exists.

import { FV } from './engine.js';
import { CITE } from './cite.js';
import { HADRONS, lifetimeText } from './hadrondata.js';

const P = FV.P;
import { PDG } from './pdg.js';
const CKM = PDG.CKM;
const bare = id => FV.flowId(id).replace('bar', '');
const lab = FV.labHTML;

function internalEdges(d) { return d.edges.filter(e => !e.spectator && FV.isInternal(d, e)); }
function extPids(d, side) { return d.verts.filter(v => v.kind === 'ext' && !v.spectator && (!side || v.side === side)).map(v => v.pid); }

/**
 * d: the diagram; ctx: { initial, final } site symbols, { colourMode, sqrtS }.
 * Returns [{ title, text, cite }].
 */
export function diagramNotes(d, ctx = {}) {
    const notes = [];
    const add = (title, text, cite) => { if (!notes.some(n => n.title === title)) notes.push({ title, text, cite: cite || null }); };
    const initial = ctx.initial || [], final = ctx.final || [];
    const ie = internalEdges(d);
    const pIn = extPids(d, 'in'), pOut = extPids(d, 'out');
    const hadronic = !!d.hadronMeta;
    const parentMass = initial.length === 1 ? ((HADRONS[initial[0]] && HADRONS[initial[0]].m / 1000) || (FV.P[pIn[0]] ? FV.P[pIn[0]].m : 0)) : null;

    // ---------------------------------------------------------------- hadrons
    if (hadronic) {
        add('Valence quarks only', 'Each hadron is drawn as its valence quarks. The sea quarks and gluons inside it are not shown, and the overlap of the quarks with the hadron (decay constants, form factors) is non-perturbative QCD. The diagram shows how flavour and colour flow, not a calculable amplitude.');
        if (d.edges.some(e => e.spectator)) add('Spectator quarks', 'Spectators pass straight through. In a real decay they also exchange gluons with the active quarks, which shifts rates by large factors (final-state interactions).');
        const gl = ie.filter(e => e.p === 'g');
        if (gl.length) add('Quark pair from a gluon', 'The extra quark–antiquark pair is made by a gluon at low momentum transfer, where α_s is close to one. Perturbation theory does not hold there; this is the standard picture of hadron formation, not a controlled approximation.');
        const mixed = [...new Set(initial.concat(final).filter(s => HADRONS[s] && !HADRONS[s].quarks))];
        const MIXTXT = { 'π⁰': 'π⁰ = (uū − dd̄)/√2', 'η': 'η ≈ (uū + dd̄ − 2ss̄)/√6' };
        if (mixed.length) add('Flavour superposition', mixed.map(s => MIXTXT[s] || (s + ' ' + (HADRONS[s].note || ''))).join('; ') + '. Only one component is drawn; the amplitude adds the diagrams of every component with these weights.');
        if (initial.length === 1 && initial[0] === 'π⁰' && final.length === 2 && final.every(s => s === 'γ'))
            add('Axial anomaly', 'π⁰ → γγ is fixed by the axial (ABJ) anomaly of the quark triangle: Γ = α² m_π³ / (64 π³ f_π²) ≈ 7.8 eV with f_π ≈ 92 MeV, and matching the measured width needs N_c = 3 colours.', [CITE.ABJ, CITE.PRIMEX]);
        const lep = final.filter(s => /^[eμτ][⁺⁻]$/.test(s)), nu = final.filter(s => /^ν/.test(s));
        if (initial.length === 1 && ['π⁺', 'π⁻', 'K⁺', 'K⁻'].includes(initial[0]) && final.length === 2 && lep.length === 1 && nu.length === 1)
            add('Helicity suppression', 'The V − A current produces a right-handed ℓ⁺ (a left-handed ℓ⁻), while angular momentum in the decay of a spin-0 meson needs the opposite helicity. Only the lepton mass mixes the two, so the rate carries m_ℓ²(1 − m_ℓ²/M²)². That is why π⁺ → e⁺ν is 1.2 × 10⁻⁴ of π⁺ → μ⁺ν.', CITE.PIENU);
        const nonleptonic = initial.length === 1 && HADRONS[initial[0]] && !final.some(s => /^[eμτν]/.test(s)) && ie.some(e => e.p === 'W+' || e.p === 'W-');
        if (nonleptonic) add('ΔI = 1/2 rule', 'In non-leptonic strangeness-changing decays the ΔI = 1/2 amplitude is about 20 times the ΔI = 3/2 one (K → ππ). This single W diagram does not explain it; gluon (penguin) corrections and non-perturbative QCD do.', CITE.PDG);
        if (initial.length === 1 && HADRONS[initial[0]] && HADRONS[initial[0]].group !== 'meson' && ie.some(e => e.p === 'W+' || e.p === 'W-'))
            add('Parity violation', 'The weak vertex violates parity, so the daughter baryon is emitted with a preferred direction relative to the parent spin (the decay asymmetry measured in Λ → pπ⁻).', [CITE.LEEYANG, CITE.WU]);
    }

    // ------------------------------------------------- decaying hadron: interaction, lifetime, data
    if (initial.length === 1 && HADRONS[initial[0]] && final.length) {
        const h = HADRONS[initial[0]], life = lifetimeText(h);
        const hasW = ie.some(e => ['W+', 'W-', 'Z'].includes(e.p)) || pOut.some(p => /^nu/.test(p));
        const hasG = pOut.concat(ie.map(e => e.p)).some(p => p === 'gamma');
        const kind = hasW ? 'weak' : hasG ? 'electromagnetic' : 'strong';
        const why = kind === 'weak' ? 'a W changes the quark flavour, so the decay is slow' : kind === 'electromagnetic' ? 'a photon is emitted and flavour is unchanged' : 'flavour is conserved and the quark lines rearrange through gluons, so the decay is fast';
        add('Interaction', 'This is a ' + kind + ' decay: ' + why + '.' + (life ? ' ' + initial[0] + ': ' + life + '.' : '') + (h.note2 ? ' ' + h.note2 : ''), CITE.PDG);
        if (h.decays) add('Measured decays (PDG 2026)', initial[0] + ' → ' + h.decays + '.', CITE.PDG);
        // OZI rule: a quarkonium whose quark and antiquark both disappear
        const QFL = { 'φ': 's', 'J/ψ': 'c', 'ηc': 'c', 'Υ': 'b', 'ηb': 'b' }[initial[0]];
        if (QFL) {
            const keeps = final.some(f => HADRONS[f] && (HADRONS[f].quarks || []).some(q => q.normalize('NFD')[0] === QFL));
            const lep = final.every(f => !HADRONS[f]);
            if (!keeps && !lep) add('OZI suppression', 'The ' + QFL + ' and ' + QFL + '̄ of ' + initial[0] + ' annihilate, and the final hadrons are made from new quark pairs: the quark lines are disconnected. Such decays go through ' + (h.spin === 1 ? 'three gluons (C = −1)' : 'two gluons') + ' and are suppressed (Okubo–Zweig–Iizuka rule)' + (QFL === 's' ? ', which is why φ → KK̄ dominates over φ → πππ even though it has far less phase space.' : ', which is why ' + initial[0] + ' is so narrow (' + life + ').'), CITE.PDG);
            else if (!keeps && lep) add('Annihilation', 'The ' + QFL + QFL + '̄ pair annihilates into a virtual photon (or Z), and the rate measures the wave function at the origin (Van Royen–Weisskopf).', CITE.PDG);
        }
    }

    // ---------------------------------------------------------- free partons
    const colourless = s => !(P[s] && (P[s].kind === 'quark' || s === 'g'));
    const pidQuarkOrGluon = id => P[id] && (P[id].kind === 'quark' || id === 'g');
    if (!hadronic) {
        if (pOut.some(pidQuarkOrGluon) && pIn.every(colourless)) add('Parton level', 'Quarks and gluons are confined, so they are never observed alone. This final state appears as jets or hadrons; the kinematic threshold was checked against the lightest hadrons with the same flavour.', CITE.PDG);
        if (pIn.some(pidQuarkOrGluon)) add('Partons in the initial state', 'Free quarks and gluons are not available as beams. In practice they come from inside protons or other hadrons, with momentum fractions given by parton distribution functions.');
    }
    if (pIn.concat(pOut).some(id => FV.flowId(id) === 't')) add('Top quark', 'The top quark decays (Γ ≈ 1.4 GeV, lifetime ≈ 5 × 10⁻²⁵ s) before it can form hadrons, so it is seen only through its decay products.', CITE.PDG);
    if (pIn.concat(pOut).some(id => /^nu/.test(id))) add('Massless neutrinos', 'Neutrinos are treated as massless flavour states. They have small masses and oscillate between flavours, which this model leaves out; at the vertices lepton flavour is conserved.', [CITE.SK_OSC, CITE.SNO]);

    // ----------------------------------------------------------- weak vertices
    const W = ie.filter(e => e.p === 'W+' || e.p === 'W-' || e.p === 'Z');
    if (W.length && parentMass !== null && parentMass > 0 && parentMass < 0.3 * FV.C.MW)
        add('Virtual W or Z', 'Here the momentum through the ' + (W.some(e => e.p === 'Z') ? 'Z' : 'W') + ' is at most the parent mass (' + parentMass.toPrecision(3) + ' GeV), far below M_W = 80.4 GeV. The propagator is then ≈ 1/M_W², and the interaction is Fermi’s contact coupling G_F/√2 = g²/(8 M_W²).', CITE.FERMI);
    d.verts.forEach(v => {
        const info = FV.vinfo(d, v);
        if (!info || !info.legs.some(l => l === 'W+' || l === 'W-')) return;
        const qs = info.legs.filter(l => P[l].kind === 'quark').map(bare);
        if (qs.length !== 2) return;
        const up = qs.find(q => CKM[q]), dn = qs.find(q => !CKM[q]);
        if (!up || !dn) return;
        const V = CKM[up][dn];
        if (V < 0.5) add('CKM suppression (' + up + dn + ')', 'The W changes ' + up + ' ↔ ' + dn + ' with |V_' + up + dn + '| = ' + V + ', so this vertex suppresses the rate by |V|² ≈ ' + (V * V).toPrecision(2) + ' compared with a CKM-favoured transition.', [CITE.CABIBBO, CITE.KM]);
    });
    d.verts.forEach(v => {
        const info = FV.vinfo(d, v);
        if (!info || info.group !== 'Yukawa') return;
        const f = info.legs.find(l => P[l].fermion), m = P[f].m;
        if (m < 2) add('Small Yukawa coupling (' + FV.labText(FV.flowId(f)) + ')', 'The Higgs couples to ' + FV.labText(FV.flowId(f)) + ' with strength m/v = ' + (m / FV.C.VEV).toExponential(1) + ', tiny next to the gauge couplings, so this diagram is negligible beside the others for the same process.');
    });

    // ----------------------------------------------------------------- loops
    if (d.loops && d.loops.length) {
        const loopE = d.edges.filter(e => e.lids && e.lids.length);
        if (loopE.some(e => ['W+', 'W-', 'Z'].includes(e.p))) add('Unitary gauge', 'W and Z lines are in unitary gauge, which has no Goldstone or ghost lines. In R_ξ gauges those extra loops appear; only the sum over all diagrams is gauge independent.');
        if (loopE.some(e => e.p === 'g')) add('Feynman gauge and ghosts', 'Gluon lines are in Feynman gauge, where ghost loops are needed to cancel the unphysical gluon polarizations. The ghost diagrams are listed with the others.');
        d.loops.forEach(L => {
            if (L.type === 'se' && L.bubble && L.bubble[0] === L.bubble[1] && P[L.bubble[0]].selfConj) add('Symmetry factor', 'The two lines in this loop are identical self-conjugate bosons, so the diagram carries a symmetry factor ½.');
            if (L.external) add('External-leg correction', 'This loop sits on an external line. It is amputated in the S-matrix and enters only through the wave-function (LSZ) factor of that leg.');
            if (ctx.loopInduced) add('Loop-induced', 'There is no tree-level diagram for these external particles, so the process starts at one loop. The sum of the loops is finite.');
            const nG = L.attached ? L.attached.filter(p => p === 'g').length : 0;
            if (L.fermionLoop && L.attached && L.attached.every(p => p === 'gamma' || p === 'g') && nG !== 1 && nG <= 2 && L.attached.length % 2 === 1)
                add('Furry’s theorem', 'A fermion loop with an odd number of vector couplings (photons, or photons with a colour-singlet gluon pair) cancels against the same loop with the opposite orientation.', CITE.FURRY);
        });
        const proc = pIn.concat(['→']).concat(pOut).join(' ');
        if (ctx.loopInduced) {
            if (/^H → gamma gamma$/.test(proc)) add('Observed', 'H → γγ was one of the two discovery channels of the Higgs boson.', CITE.HGG);
            if (/^H → (Z gamma|gamma Z)$/.test(proc)) add('Observed', 'There is evidence for H → Zγ; the measured rate is μ = 2.2 ± 0.7 times the Standard Model prediction, 1.9σ above it.', CITE.HZG);
            if (pIn.concat(pOut).every(p => p === 'gamma') && pIn.length + pOut.length === 4) add('Observed', 'Light-by-light scattering has been seen in ultra-peripheral heavy-ion collisions.', CITE.LBL);
            const flavours = pIn.concat(pOut).filter(p => P[p].kind === 'quark').map(bare);
            if (new Set(flavours).size > 1 && !pIn.concat(pOut).some(p => p === 'W+' || p === 'W-')) add('GIM suppression', 'This is a flavour-changing neutral current. It cancels between the internal quarks of the other type, except for their mass differences (GIM mechanism): u, c, t loops for down-type transitions such as b → sγ, and d, s, b loops for up-type ones such as c → uγ. b → sγ is the classic observed case.', [CITE.GIM, CITE.CLEO_BSG]);
        }
    }

    // ------------------------------------------------- identical particles, gauge
    const finalIds = pOut.slice(), dupF = finalIds.filter((x, i) => finalIds.indexOf(x) !== i && P[x] && P[x].fermion);
    if (dupF.length) add('Identical fermions', 'Two identical fermions in the final state: diagrams that differ by swapping them enter with a relative minus sign (Fermi statistics).');
    if (pOut.filter(p => p === 'W+' || p === 'W-' || p === 'Z').length >= 2 && ie.some(e => ['gamma', 'Z'].includes(e.p)))
        add('Gauge cancellation', 'Each diagram for massive gauge-boson pair production grows with energy; only the sum of the t-channel and s-channel (γ, Z) diagrams stays finite. The cancellation is fixed by the gauge couplings.');
    if (pOut.length === 1 && pIn.length >= 2) add('Resonance', 'A single particle can only be produced at √s ≈ its mass. The rate follows a Breit–Wigner shape set by its width.');

    // ------------------------------------------------------------------- colour
    if (ctx.colourMode && d.colour && d.colour.sol) {
        add('One colour term', 'The colours shown are one term of the colour sum. A physical rate sums over all colour assignments with colour factors (T_F = ½, C_F = 4/3, C_A = 3).', CITE.COLOURFLOW);
        const sol = d.colour.sol;
        const diag = Object.values(sol.ev).some(v => v.x !== undefined && sol.colourOf[v.x] === sol.colourOf[v.y]);
        if (diag) add('Diagonal gluon', 'A gluon with matching colour and anticolour (such as rr̄) is shown in the colour-flow basis, where the colour-singlet part is subtracted at order 1/N_c. The physical diagonal gluons are combinations like (rr̄ − gḡ)/√2.', CITE.COLOURFLOW);
    }
    return notes;
}

/** Notes that apply to a whole list of diagrams for one process. */
export function processNotes(items) {
    const out = [];
    if (items.length > 1) out.push({ title: 'Interference', text: 'All diagrams with the same external particles add at the amplitude level. The rate is |Σ M|², so diagrams interfere; the list is not a sum of separate rates.' });
    return out;
}
