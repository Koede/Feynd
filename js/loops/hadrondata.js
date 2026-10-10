// js/loops/hadrondata.js
// The full hadron catalogue of the rule-built pages: the light hadrons of js/hadrons.js
// plus every ground-state hadron that the eightfold view used to grey out, and the
// bottom ground states:
//   mesons 0⁻   η′, D⁰ D⁺ Dₛ⁺ (and conjugates), ηc, B⁺ B⁰ Bₛ⁰ B_c⁺ (and conjugates), ηb
//   mesons 1⁻   ρ, ω, K*, φ, D*, Dₛ*, J/ψ, B*, Bₛ*, Υ(1S)
//   baryons ½⁺  Λc⁺, Σc, Ξc, Ξc′, Ωc⁰, Ξcc⁺⁺, Ξcc⁺, Λb⁰, Σb±, Ξb, Ωb⁻
//   baryons 3/2⁺ Δ, Σ(1385), Ξ(1530), Σc(2520), Ξc(2645), Ωc(2770)⁰, Σb*⁺
// with their antibaryons. Masses, widths and mean lives are from the Particle Data
// Group, Review of Particle Physics 2026 (Summary Tables and Listings); Ξcc⁺ from the
// LHCb observation (2026). The light hadrons get their PDG lifetimes here too.
//
// js/hadrons.js itself is left unchanged because the classic page (classic.html) uses it.

import { PARTICLES, formatMass } from '../particles.js';
import { HADRONS as BASE, HADRON_PANEL as BASE_PANEL, isAntiQuark, quarkFlavour, quarkKey } from '../hadrons.js';

export { isAntiQuark, quarkFlavour, quarkKey };

const FLAVOURS = ['u', 'd', 's', 'c', 'b', 't'];
const BAR = q => (q.normalize('NFD').includes('̄') ? q.normalize('NFD').replace(/̄/g, '') : q + '̄').normalize('NFC');   // u -> ū, ū -> u

// lifetimes and widths of the light hadrons already in js/hadrons.js (PDG 2026)
const LIGHT = {
    'π⁺': { tau: 2.6033e-8, decays: 'μ⁺ν_μ 99.988 %' }, 'π⁻': { tau: 2.6033e-8, decays: 'μ⁻ν̄_μ 99.988 %' },
    'π⁰': { tau: 8.43e-17, decays: 'γγ 98.82 %, e⁺e⁻γ 1.17 %' },
    'K⁺': { tau: 1.2380e-8, decays: 'μ⁺ν_μ 63.6 %, π⁺π⁰ 20.7 %, π⁺π⁺π⁻ 5.6 %' }, 'K⁻': { tau: 1.2380e-8, decays: 'μ⁻ν̄_μ 63.6 %, π⁻π⁰ 20.7 %' },
    'K⁰': { note2: 'K⁰ and K̄⁰ mix; the decaying states are K_S (τ = 8.95 × 10⁻¹¹ s, ππ) and K_L (τ = 5.12 × 10⁻⁸ s).' },
    'K̄⁰': { note2: 'K⁰ and K̄⁰ mix; the decaying states are K_S (τ = 8.95 × 10⁻¹¹ s, ππ) and K_L (τ = 5.12 × 10⁻⁸ s).' },
    'η': { width: 1.31e-3, decays: 'γγ 39.4 %, 3π⁰ 32.6 %, π⁺π⁻π⁰ 22.9 %' },
    'p': { stable: true }, 'p̄': { stable: true },
    'n': { tau: 878.4, decays: 'p e⁻ ν̄_e 100 %' }, 'n̄': { tau: 878.4 },
    'Λ': { tau: 2.617e-10, decays: 'p π⁻ 64.1 %, n π⁰ 35.9 %' }, 'Λ̄': { tau: 2.617e-10 },
    'Σ⁺': { tau: 8.018e-11, decays: 'p π⁰ 51.6 %, n π⁺ 48.3 %' }, 'Σ̄⁻': { tau: 8.018e-11 },
    'Σ⁰': { tau: 7.4e-20, decays: 'Λ γ 100 %' }, 'Σ̄⁰': { tau: 7.4e-20 },
    'Σ⁻': { tau: 1.479e-10, decays: 'n π⁻ 99.85 %' }, 'Σ̄⁺': { tau: 1.479e-10 },
    'Ξ⁰': { tau: 2.90e-10, decays: 'Λ π⁰ 99.52 %' }, 'Ξ̄⁰': { tau: 2.90e-10 },
    'Ξ⁻': { tau: 1.639e-10, decays: 'Λ π⁻ 99.89 %' }, 'Ξ̄⁺': { tau: 1.639e-10 },
    'Ω⁻': { tau: 8.21e-11, decays: 'Λ K⁻ 67.7 %, Ξ⁰ π⁻ 24.3 %, Ξ⁻ π⁰ 8.55 %' }, 'Ω̄⁺': { tau: 8.21e-11 }
};

const EXT = {};
const strange = qs => (qs ? qs.reduce((a, q) => a + (quarkFlavour(q) === 's' ? (isAntiQuark(q) ? 1 : -1) : 0), 0) : 0) || 0;
const charge = qs => qs.reduce((a, q) => { const f = quarkFlavour(q), up = ['u', 'c', 't'].includes(f); const c = up ? 2 / 3 : -1 / 3; return a + (isAntiQuark(q) ? -c : c); }, 0);
const round3 = x => Math.round(x * 3) / 3;

/** A meson. quarks null: flavour superposition (mix lists the components). */
function meson(sym, name, quarks, m, o = {}) {
    const Q = o.Q !== undefined ? o.Q : round3(charge(quarks));
    EXT[sym] = Object.assign({ name, type: 'meson', group: 'meson', spin: o.jp === '1⁻' ? 1 : 0, Q, B: 0, S: strange(quarks), m, quarks: quarks || null, anti: o.anti || sym, label: sym }, o);
}
/** A baryon and its antibaryon. */
function baryon(sym, anti, name, quarks, m, o = {}) {
    const Q = round3(charge(quarks)), spin = o.jp === '3/2⁺' ? 1.5 : 0.5;
    EXT[sym] = Object.assign({ name, type: 'baryon', group: 'baryon', spin, Q, B: 1, S: strange(quarks), m, quarks, anti, label: sym }, o);
    const ao = Object.assign({}, o, { jp: o.jp === '3/2⁺' ? '3/2⁻' : '½⁻', decays: o.adecays || null });
    delete ao.adecays;
    EXT[anti] = Object.assign({ name: 'Anti-' + name, type: 'baryon', group: 'antibaryon', spin, Q: -Q, B: -1, S: -strange(quarks) || 0, m, quarks: quarks.map(BAR), anti: sym, label: anti }, ao);
}

// ------------------------------------------------------------------ light and strange mesons
meson('η′', 'Eta prime', null, 957.78, { Q: 0, jp: '0⁻', family: 'light', width: 0.188, mix: [['u', 'ū'], ['d', 'd̄'], ['s', 's̄']], note: '≈ (uū + dd̄ + ss̄)/√3, mostly the flavour singlet', decays: 'π⁺π⁻η 42.5 %, ρ⁰γ 29.5 %, π⁰π⁰η 22.4 %', ascii: ['etaprime', "eta'", 'eta958'] });
meson('ρ⁺', 'Rho +', ['u', 'd̄'], 775.11, { jp: '1⁻', family: 'light', width: 149.1, anti: 'ρ⁻', decays: 'ππ ≈ 100 %', ascii: ['rho+'] });
meson('ρ⁻', 'Rho −', ['d', 'ū'], 775.11, { jp: '1⁻', family: 'light', width: 149.1, anti: 'ρ⁺', decays: 'ππ ≈ 100 %', ascii: ['rho-'] });
meson('ρ⁰', 'Rho 0', null, 775.26, { jp: '1⁻', family: 'light', width: 147.4, Q: 0, mix: [['u', 'ū'], ['d', 'd̄']], note: '(uū − dd̄)/√2', decays: 'π⁺π⁻ ≈ 100 %', ascii: ['rho0', 'rho'] });
meson('ω', 'Omega meson', null, 782.66, { jp: '1⁻', family: 'light', width: 8.68, Q: 0, mix: [['u', 'ū'], ['d', 'd̄']], note: '(uū + dd̄)/√2', decays: 'π⁺π⁻π⁰ 89.2 %, π⁰γ 8.33 %, π⁺π⁻ 1.53 %', ascii: ['omega', 'omega782', 'omega0'] });
meson('φ', 'Phi', ['s', 's̄'], 1019.460, { jp: '1⁻', family: 'light', width: 4.249, note: 'nearly pure ss̄', decays: 'K⁺K⁻ 50.1 %, K_L K_S 33.6 %, ρπ + π⁺π⁻π⁰ 14.7 %', ascii: ['phi', 'phi1020'] });
meson('K*⁺', 'K-star +', ['u', 's̄'], 891.88, { jp: '1⁻', family: 'strange', width: 48.5, anti: 'K*⁻', decays: 'Kπ ≈ 100 %', ascii: ['k*+', 'kstar+'] });
meson('K*⁻', 'K-star −', ['s', 'ū'], 891.88, { jp: '1⁻', family: 'strange', width: 48.5, anti: 'K*⁺', decays: 'Kπ ≈ 100 %', ascii: ['k*-', 'kstar-'] });
meson('K*⁰', 'K-star 0', ['d', 's̄'], 895.56, { jp: '1⁻', family: 'strange', width: 47.1, anti: 'K̄*⁰', decays: 'Kπ ≈ 100 %', ascii: ['k*0', 'kstar0'] });
meson('K̄*⁰', 'Anti-K-star 0', ['s', 'd̄'], 895.56, { jp: '1⁻', family: 'strange', width: 47.1, anti: 'K*⁰', decays: 'Kπ ≈ 100 %', ascii: ['k*0bar', 'kstar0bar'] });
// ------------------------------------------------------------------ charm mesons
meson('D⁰', 'D zero', ['c', 'ū'], 1864.84, { jp: '0⁻', family: 'charm', tau: 410.3e-15, anti: 'D̄⁰', decays: 'K⁻π⁺ 3.94 %, K⁻π⁺π⁰ 14.4 %, K⁻π⁺π⁺π⁻ 8.2 %', ascii: ['d0'] });
meson('D̄⁰', 'Anti-D zero', ['u', 'c̄'], 1864.84, { jp: '0⁻', family: 'charm', tau: 410.3e-15, anti: 'D⁰', decays: 'K⁺π⁻ 3.94 %', ascii: ['d0bar', 'dbar0'] });
meson('D⁺', 'D plus', ['c', 'd̄'], 1869.66, { jp: '0⁻', family: 'charm', tau: 1033e-15, anti: 'D⁻', decays: 'K⁻π⁺π⁺ 9.31 %, K_S π⁺π⁰ 7.31 %', ascii: ['d+'] });
meson('D⁻', 'D minus', ['d', 'c̄'], 1869.66, { jp: '0⁻', family: 'charm', tau: 1033e-15, anti: 'D⁺', decays: 'K⁺π⁻π⁻ 9.31 %', ascii: ['d-'] });
meson('Dₛ⁺', 'D-sub-s plus', ['c', 's̄'], 1968.35, { jp: '0⁻', family: 'charm', tau: 501.2e-15, anti: 'Dₛ⁻', ascii: ['ds+', 'd_s+'] });
meson('Dₛ⁻', 'D-sub-s minus', ['s', 'c̄'], 1968.35, { jp: '0⁻', family: 'charm', tau: 501.2e-15, anti: 'Dₛ⁺', ascii: ['ds-', 'd_s-'] });
meson('D*⁰', 'D-star zero', ['c', 'ū'], 2006.86, { jp: '1⁻', family: 'charm', widthLimit: 2.1, anti: 'D̄*⁰', decays: 'D⁰π⁰ 64.7 %, D⁰γ 35.3 %', ascii: ['d*0', 'dstar0'] });
meson('D̄*⁰', 'Anti-D-star zero', ['u', 'c̄'], 2006.86, { jp: '1⁻', family: 'charm', widthLimit: 2.1, anti: 'D*⁰', decays: 'D̄⁰π⁰ 64.7 %, D̄⁰γ 35.3 %', ascii: ['d*0bar', 'dstar0bar'] });
meson('D*⁺', 'D-star plus', ['c', 'd̄'], 2010.27, { jp: '1⁻', family: 'charm', width: 0.0834, anti: 'D*⁻', decays: 'D⁰π⁺ 67.7 %, D⁺π⁰ 30.7 %, D⁺γ 1.6 %', ascii: ['d*+', 'dstar+'] });
meson('D*⁻', 'D-star minus', ['d', 'c̄'], 2010.27, { jp: '1⁻', family: 'charm', width: 0.0834, anti: 'D*⁺', decays: 'D̄⁰π⁻ 67.7 %, D⁻π⁰ 30.7 %, D⁻γ 1.6 %', ascii: ['d*-', 'dstar-'] });
meson('Dₛ*⁺', 'D-star-s plus', ['c', 's̄'], 2112.2, { jp: '1⁻', family: 'charm', widthLimit: 1.9, anti: 'Dₛ*⁻', decays: 'Dₛ⁺γ 93.6 %, Dₛ⁺π⁰ 5.77 %', ascii: ['ds*+', 'dsstar+'] });
meson('Dₛ*⁻', 'D-star-s minus', ['s', 'c̄'], 2112.2, { jp: '1⁻', family: 'charm', widthLimit: 1.9, anti: 'Dₛ*⁺', decays: 'Dₛ⁻γ 93.6 %, Dₛ⁻π⁰ 5.77 %', ascii: ['ds*-', 'dsstar-'] });
meson('ηc', 'Eta-c', ['c', 'c̄'], 2984.09, { jp: '0⁻', family: 'charm', width: 30.0, decays: 'hadrons (via gg); γγ 2.1 × 10⁻⁴', ascii: ['etac', 'eta_c'] });
meson('J/ψ', 'J/psi', ['c', 'c̄'], 3096.900, { jp: '1⁻', family: 'charm', width: 0.0926, decays: 'ggg 64.1 %, γgg 8.8 %, e⁺e⁻ 5.97 %, μ⁺μ⁻ 5.96 %', ascii: ['j/psi', 'jpsi', 'psi'] });
// ------------------------------------------------------------------ bottom mesons
meson('B⁺', 'B plus', ['u', 'b̄'], 5279.41, { jp: '0⁻', family: 'bottom', tau: 1.637e-12, anti: 'B⁻', ascii: ['b+'] });
meson('B⁻', 'B minus', ['b', 'ū'], 5279.41, { jp: '0⁻', family: 'bottom', tau: 1.637e-12, anti: 'B⁺', ascii: ['b-'] });
meson('B⁰', 'B zero', ['d', 'b̄'], 5279.72, { jp: '0⁻', family: 'bottom', tau: 1.5113e-12, anti: 'B̄⁰', ascii: ['b0'] });
meson('B̄⁰', 'Anti-B zero', ['b', 'd̄'], 5279.72, { jp: '0⁻', family: 'bottom', tau: 1.5113e-12, anti: 'B⁰', ascii: ['b0bar', 'bbar0'] });
meson('Bₛ⁰', 'B-sub-s zero', ['s', 'b̄'], 5366.93, { jp: '0⁻', family: 'bottom', tau: 1.515e-12, anti: 'B̄ₛ⁰', ascii: ['bs0', 'bs'] });
meson('B̄ₛ⁰', 'Anti-B-sub-s zero', ['b', 's̄'], 5366.93, { jp: '0⁻', family: 'bottom', tau: 1.515e-12, anti: 'Bₛ⁰', ascii: ['bs0bar', 'bsbar'] });
meson('B_c⁺', 'B-sub-c plus', ['c', 'b̄'], 6274.47, { jp: '0⁻', family: 'bottom', tau: 0.510e-12, anti: 'B_c⁻', ascii: ['bc+'] });
meson('B_c⁻', 'B-sub-c minus', ['b', 'c̄'], 6274.47, { jp: '0⁻', family: 'bottom', tau: 0.510e-12, anti: 'B_c⁺', ascii: ['bc-'] });
meson('B*⁺', 'B-star plus', ['u', 'b̄'], 5324.75, { jp: '1⁻', family: 'bottom', anti: 'B*⁻', decays: 'B⁺γ (seen)', ascii: ['b*+'] });
meson('B*⁻', 'B-star minus', ['b', 'ū'], 5324.75, { jp: '1⁻', family: 'bottom', anti: 'B*⁺', decays: 'B⁻γ (seen)', ascii: ['b*-'] });
meson('B*⁰', 'B-star zero', ['d', 'b̄'], 5324.75, { jp: '1⁻', family: 'bottom', anti: 'B̄*⁰', decays: 'B⁰γ (seen)', ascii: ['b*0'] });
meson('B̄*⁰', 'Anti-B-star zero', ['b', 'd̄'], 5324.75, { jp: '1⁻', family: 'bottom', anti: 'B*⁰', decays: 'B̄⁰γ (seen)', ascii: ['b*0bar'] });
meson('Bₛ*⁰', 'B-star-s zero', ['s', 'b̄'], 5415.4, { jp: '1⁻', family: 'bottom', anti: 'B̄ₛ*⁰', decays: 'Bₛ⁰γ (seen)', ascii: ['bs*0', 'bs*'] });
meson('B̄ₛ*⁰', 'Anti-B-star-s zero', ['b', 's̄'], 5415.4, { jp: '1⁻', family: 'bottom', anti: 'Bₛ*⁰', decays: 'B̄ₛ⁰γ (seen)', ascii: ['bs*0bar'] });
meson('ηb', 'Eta-b', ['b', 'b̄'], 9398.7, { jp: '0⁻', family: 'bottom', width: 10, decays: 'hadrons (via gg)', ascii: ['etab', 'eta_b'] });
meson('Υ', 'Upsilon(1S)', ['b', 'b̄'], 9460.40, { jp: '1⁻', family: 'bottom', width: 0.05402, decays: 'ggg 81.7 %, τ⁺τ⁻ 2.60 %, μ⁺μ⁻ 2.48 %, e⁺e⁻ 2.39 %', ascii: ['upsilon', 'upsilon1s', 'y1s'] });
// ------------------------------------------------------------------ 3/2⁺ decuplet
const DELTA = { jp: '3/2⁺', family: 'light', width: 117, decays: 'Nπ 99.4 %, Nγ 0.6 %', adecays: 'N̄π 99.4 %' };
baryon('Δ⁺⁺', 'Δ̄⁻⁻', 'Delta ++', ['u', 'u', 'u'], 1232, Object.assign({ ascii: ['delta++'] }, DELTA));
baryon('Δ⁺', 'Δ̄⁻', 'Delta +', ['u', 'u', 'd'], 1232, Object.assign({ ascii: ['delta+'] }, DELTA));
baryon('Δ⁰', 'Δ̄⁰', 'Delta 0', ['u', 'd', 'd'], 1232, Object.assign({ ascii: ['delta0'] }, DELTA));
baryon('Δ⁻', 'Δ̄⁺', 'Delta −', ['d', 'd', 'd'], 1232, Object.assign({ ascii: ['delta-'] }, DELTA));
baryon('Σ*⁺', 'Σ̄*⁻', 'Sigma-star +', ['u', 'u', 's'], 1382.83, { jp: '3/2⁺', family: 'strange', width: 36.2, decays: 'Λπ 87.0 %, Σπ 11.7 %', ascii: ['sigma*+', 'sigma1385+'] });
baryon('Σ*⁰', 'Σ̄*⁰', 'Sigma-star 0', ['u', 'd', 's'], 1383.8, { jp: '3/2⁺', family: 'strange', width: 44, decays: 'Λπ 87.0 %, Σπ 11.7 %', ascii: ['sigma*0', 'sigma13850'] });
baryon('Σ*⁻', 'Σ̄*⁺', 'Sigma-star −', ['d', 'd', 's'], 1387.2, { jp: '3/2⁺', family: 'strange', width: 39.4, decays: 'Λπ 87.0 %, Σπ 11.7 %', ascii: ['sigma*-', 'sigma1385-'] });
baryon('Ξ*⁰', 'Ξ̄*⁰', 'Xi-star 0', ['u', 's', 's'], 1531.80, { jp: '3/2⁺', family: 'strange', width: 9.1, decays: 'Ξπ 100 %', ascii: ['xi*0', 'xi15300'] });
baryon('Ξ*⁻', 'Ξ̄*⁺', 'Xi-star −', ['d', 's', 's'], 1535.0, { jp: '3/2⁺', family: 'strange', width: 9.9, decays: 'Ξπ 100 %', ascii: ['xi*-', 'xi1530-'] });
// ------------------------------------------------------------------ charmed baryons
baryon('Λc⁺', 'Λ̄c⁻', 'Lambda-c plus', ['u', 'd', 'c'], 2286.46, { jp: '½⁺', family: 'charm', tau: 202.6e-15, decays: 'p K⁻ π⁺ 6.37 %', ascii: ['lambdac+', 'lambda_c+', 'lc+'] });
baryon('Σc⁺⁺', 'Σ̄c⁻⁻', 'Sigma-c plus plus', ['u', 'u', 'c'], 2453.97, { jp: '½⁺', family: 'charm', width: 1.89, decays: 'Λc⁺π⁺ ≈ 100 %', ascii: ['sigmac++', 'sigma_c++'] });
baryon('Σc⁺', 'Σ̄c⁻', 'Sigma-c plus', ['u', 'd', 'c'], 2452.65, { jp: '½⁺', family: 'charm', width: 2.3, decays: 'Λc⁺π⁰ ≈ 100 %', ascii: ['sigmac+', 'sigma_c+'] });
baryon('Σc⁰', 'Σ̄c⁰', 'Sigma-c zero', ['d', 'd', 'c'], 2453.75, { jp: '½⁺', family: 'charm', width: 1.83, decays: 'Λc⁺π⁻ ≈ 100 %', ascii: ['sigmac0', 'sigma_c0'] });
baryon('Ξc⁺', 'Ξ̄c⁻', 'Xi-c plus', ['u', 's', 'c'], 2467.79, { jp: '½⁺', family: 'charm', tau: 453e-15, ascii: ['xic+', 'xi_c+'] });
baryon('Ξc⁰', 'Ξ̄c⁰', 'Xi-c zero', ['d', 's', 'c'], 2470.50, { jp: '½⁺', family: 'charm', tau: 150.0e-15, ascii: ['xic0', 'xi_c0'] });
baryon('Ξc′⁺', 'Ξ̄c′⁻', 'Xi-c-prime plus', ['u', 's', 'c'], 2578.3, { jp: '½⁺', family: 'charm', decays: 'Ξc⁺γ', ascii: ["xic'+", 'xicprime+'] });
baryon('Ξc′⁰', 'Ξ̄c′⁰', 'Xi-c-prime zero', ['d', 's', 'c'], 2578.8, { jp: '½⁺', family: 'charm', decays: 'Ξc⁰γ', ascii: ["xic'0", 'xicprime0'] });
baryon('Ωc⁰', 'Ω̄c⁰', 'Omega-c zero', ['s', 's', 'c'], 2695.3, { jp: '½⁺', family: 'charm', tau: 274e-15, ascii: ['omegac0', 'omega_c0'] });
baryon('Ξcc⁺⁺', 'Ξ̄cc⁻⁻', 'Xi-cc plus plus', ['u', 'c', 'c'], 3621.6, { jp: '½⁺', family: 'charm', tau: 256e-15, decays: 'Λc⁺K⁻π⁺π⁺ (reference mode), Ξc⁺π⁺', ascii: ['xicc++', 'xi_cc++'] });
baryon('Ξcc⁺', 'Ξ̄cc⁻', 'Xi-cc plus', ['d', 'c', 'c'], 3619.97, { jp: '½⁺', family: 'charm', cite: 'XICC', note: 'observed by LHCb in 2026', ascii: ['xicc+', 'xi_cc+'] });
baryon('Σc*⁺⁺', 'Σ̄c*⁻⁻', 'Sigma-c-star plus plus', ['u', 'u', 'c'], 2518.41, { jp: '3/2⁺', family: 'charm', width: 14.78, decays: 'Λc⁺π⁺ ≈ 100 %', ascii: ['sigmac*++', 'sigmac2520++'] });
baryon('Σc*⁺', 'Σ̄c*⁻', 'Sigma-c-star plus', ['u', 'd', 'c'], 2517.4, { jp: '3/2⁺', family: 'charm', width: 17.2, decays: 'Λc⁺π⁰ ≈ 100 %', ascii: ['sigmac*+', 'sigmac2520+'] });
baryon('Σc*⁰', 'Σ̄c*⁰', 'Sigma-c-star zero', ['d', 'd', 'c'], 2518.48, { jp: '3/2⁺', family: 'charm', width: 15.3, decays: 'Λc⁺π⁻ ≈ 100 %', ascii: ['sigmac*0', 'sigmac25200'] });
baryon('Ξc*⁺', 'Ξ̄c*⁻', 'Xi-c-star plus', ['u', 's', 'c'], 2645.17, { jp: '3/2⁺', family: 'charm', width: 2.14, decays: 'Ξc π', ascii: ['xic*+', 'xic2645+'] });
baryon('Ξc*⁰', 'Ξ̄c*⁰', 'Xi-c-star zero', ['d', 's', 'c'], 2646.24, { jp: '3/2⁺', family: 'charm', width: 2.35, decays: 'Ξc π', ascii: ['xic*0', 'xic26450'] });
baryon('Ωc*⁰', 'Ω̄c*⁰', 'Omega-c-star zero', ['s', 's', 'c'], 2766.0, { jp: '3/2⁺', family: 'charm', decays: 'Ωc⁰γ', ascii: ['omegac*0', 'omegac2770'] });
// ------------------------------------------------------------------ bottom baryons
baryon('Λb⁰', 'Λ̄b⁰', 'Lambda-b zero', ['u', 'd', 'b'], 5619.57, { jp: '½⁺', family: 'bottom', tau: 1.465e-12, ascii: ['lambdab0', 'lambda_b0', 'lambdab'] });
baryon('Σb⁺', 'Σ̄b⁻', 'Sigma-b plus', ['u', 'u', 'b'], 5810.56, { jp: '½⁺', family: 'bottom', width: 5.0, decays: 'Λb⁰π⁺', ascii: ['sigmab+'] });
baryon('Σb⁻', 'Σ̄b⁺', 'Sigma-b minus', ['d', 'd', 'b'], 5815.64, { jp: '½⁺', family: 'bottom', width: 5.3, decays: 'Λb⁰π⁻', ascii: ['sigmab-'] });
baryon('Σb*⁺', 'Σ̄b*⁻', 'Sigma-b-star plus', ['u', 'u', 'b'], 5830.32, { jp: '3/2⁺', family: 'bottom', width: 9.4, decays: 'Λb⁰π⁺', ascii: ['sigmab*+'] });
baryon('Ξb⁰', 'Ξ̄b⁰', 'Xi-b zero', ['u', 's', 'b'], 5791.7, { jp: '½⁺', family: 'bottom', tau: 1.472e-12, ascii: ['xib0'] });
baryon('Ξb⁻', 'Ξ̄b⁺', 'Xi-b minus', ['d', 's', 'b'], 5797.0, { jp: '½⁺', family: 'bottom', tau: 1.575e-12, ascii: ['xib-'] });
baryon('Ωb⁻', 'Ω̄b⁺', 'Omega-b minus', ['s', 's', 'b'], 6045.8, { jp: '½⁺', family: 'bottom', tau: 1.64e-12, ascii: ['omegab-'] });

// ------------------------------------------------------------------ assemble
const FAMILY_OF = h => {
    if (!h.quarks) return 'light';
    const fs = h.quarks.map(quarkFlavour);
    return fs.includes('b') ? 'bottom' : fs.includes('c') ? 'charm' : fs.includes('s') ? 'strange' : 'light';
};
Object.entries(BASE).forEach(([s, h]) => {
    if (!h.family) h.family = s === 'η' ? 'light' : FAMILY_OF(h);
    if (!h.jp) h.jp = h.group === 'meson' ? '0⁻' : h.group === 'baryon' ? (h.spin === 1.5 ? '3/2⁺' : '½⁺') : (h.spin === 1.5 ? '3/2⁻' : '½⁻');
    if (LIGHT[s]) Object.entries(LIGHT[s]).forEach(([k, v]) => { if (h[k] === undefined) h[k] = v; });
});
Object.entries(EXT).forEach(([symbol, h]) => {
    h.symbol = symbol;
    if (h.quarks) h.quarks = h.quarks.map(q => q.normalize('NFC'));
    if (h.mix) h.mix = h.mix.map(l => l.map(q => q.normalize('NFC')));
    h.Le = 0; h.Lmu = 0; h.Ltau = 0;
    h.color = 'singlet';
    h.panel = 'hadron';
    h.massLabel = h.massLabel || formatMass(h.m);
});

export const HADRONS = Object.assign({}, BASE, EXT);
export const ALL_PARTICLES = Object.assign({}, PARTICLES, HADRONS);
export const HADRON_PANEL = [
    { group: 'meson', title: 'Mesons', badge: '0⁻ · 1⁻', color: '#1f5e8e' },
    { group: 'baryon', title: 'Baryons', badge: '½⁺ · 3/2⁺', color: '#2b6b5c' },
    { group: 'antibaryon', title: 'Antibaryons', badge: '½⁻ · 3/2⁻', color: '#9b5e3b' }
];
void BASE_PANEL;
export const FAMILIES = [['light', 'Light (u, d)'], ['strange', 'Strange'], ['charm', 'Charm'], ['bottom', 'Bottom']];

/** Flavour components a hadron's quark lines can take (superpositions list several). */
export function quarkChoices(sym) {
    const h = HADRONS[sym];
    if (!h) return [];
    if (h.quarks) return [h.quarks];
    if (h.mix) return h.mix;
    if (sym === 'π⁰') return [['u', 'ū'], ['d', 'd̄']];
    if (sym === 'η') return [['u', 'ū'], ['d', 'd̄'], ['s', 's̄']];
    return [];
}

/** Typed-name aliases for every hadron (lower case). */
export const HADRON_ALIASES = {};
Object.entries(HADRONS).forEach(([s, h]) => (h.ascii || []).forEach(a => { HADRON_ALIASES[a.toLowerCase()] = s; }));

// ------------------------------------------------------------------ identification
const QUARK_INDEX = new Map();
Object.values(HADRONS).forEach(h => {
    if (!h.quarks) return;
    const k = quarkKey(h.quarks);
    if (!k) return;
    const ex = QUARK_INDEX.get(k);
    if (!ex) { QUARK_INDEX.set(k, { symbol: h.symbol, alternatives: [] }); return; }
    const inc = HADRONS[ex.symbol];
    const [w, l] = h.m < inc.m ? [h, inc] : [inc, h];
    QUARK_INDEX.set(k, { symbol: w.symbol, alternatives: ex.alternatives.concat([l.symbol]) });
});
const AMBIGUOUS = { 'u|u': ['π⁰', 'η', 'ρ⁰', 'ω', 'η′'], 'd|d': ['π⁰', 'η', 'ρ⁰', 'ω', 'η′'], 's|s': ['η', 'η′', 'φ'] };
/** Hadron with this valence content (lightest first, the rest as alternatives). */
export function identifyHadron(quarks) {
    if (!Array.isArray(quarks) || quarks.length < 2 || quarks.length > 3) return null;
    const key = quarkKey(quarks);
    if (!key) return null;
    const nq = quarks.filter(s => !isAntiQuark(s)).length, na = quarks.length - nq;
    const isMeson = nq === 1 && na === 1, isBaryon = quarks.length === 3 && (nq === 3 || na === 3);
    if (!isMeson && !isBaryon) return null;
    if (isMeson && AMBIGUOUS[key]) {
        const [q] = key.split('|');
        return { ambiguous: true, candidates: AMBIGUOUS[key].map(s => HADRONS[s]).filter(Boolean), genericLabel: q + ' ' + q + '̄' };
    }
    const hit = QUARK_INDEX.get(key);
    return hit ? { matched: true, symbol: hit.symbol, alternatives: hit.alternatives } : null;
}

/** ħ/Γ or τ in words, for notes. */
const HBAR = 6.582119569e-22; // MeV s
export function lifetimeText(h) {
    if (!h) return '';
    if (h.stable) return 'stable';
    if (h.tau) return 'τ = ' + sci(h.tau) + ' s';
    if (h.width) return 'Γ = ' + (h.width >= 1 ? h.width + ' MeV' : h.width >= 1e-3 ? +(h.width * 1000).toPrecision(4) + ' keV' : +(h.width * 1e6).toPrecision(3) + ' eV') + ' (τ = ħ/Γ ≈ ' + sci(HBAR / h.width) + ' s)';
    if (h.widthLimit) return 'Γ < ' + h.widthLimit + ' MeV';
    return '';
}
function sci(x) {
    const e = Math.floor(Math.log10(x)), m = x / Math.pow(10, e);
    const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
    if (e >= -1 && e <= 3) return String(+x.toPrecision(4));
    return (+m.toPrecision(3)) + ' × 10' + String(e).split('').map(c => SUP[c]).join('');
}
void FLAVOURS;
