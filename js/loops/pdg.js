// js/loops/pdg.js
// Single source for every Standard Model parameter the engine uses.
// Values: Particle Data Group, S. Navas et al. (PDG), Review of Particle Physics 2026
// (https://pdg.lbl.gov/2026/): Physical Constants table, Summary Tables (gauge and
// Higgs bosons, leptons, quarks) and the CKM review (global-fit magnitudes, Eq. 12.27).
// Units: GeV.

export const PDG = {
    edition: 'PDG 2026',
    url: 'https://pdg.lbl.gov/2026/',
    // physical constants table
    alphaInv: 137.035999177,         // 1/α (Thomson limit), CODATA via PDG
    GF: 1.1663785e-5,                // GeV⁻², Fermi constant
    sw2: 0.23122,                    // sin²θ̂_W(M_Z), MS-bar
    alphaS: 0.1180,                  // α_s(M_Z)
    // gauge and Higgs bosons
    MW: 80.3625, MWerr: 0.0077,      // excludes CDF (PDG footnote)
    MZ: 91.1879, MZerr: 0.0020,
    MH: 125.13, MHerr: 0.11,
    GZ: 2.4955, GW: 2.14,
    // leptons
    me: 0.51099895069e-3, mmu: 0.1056583755, mtau: 1.77693,
    // quarks: u, d, s MS-bar at 2 GeV; c, b MS-bar at their own mass; t from direct measurements
    mu: 2.16e-3, md: 4.70e-3, ms: 92.9e-3, mc: 1.2729, mb: 4.186, mt: 172.60,
    // CKM magnitudes, global fit
    CKM: {
        u: { d: 0.97431, s: 0.22517, b: 0.003763 },
        c: { d: 0.22503, s: 0.97345, b: 0.04189 },
        t: { d: 0.00863, s: 0.04117, b: 0.999115 }
    }
};
// Higgs vacuum expectation value from the Fermi constant: v = (√2 G_F)^(−1/2)
PDG.vev = 1 / Math.sqrt(Math.SQRT2 * PDG.GF);

export const PDG_CITE = 'S. Navas et al. (Particle Data Group), Review of Particle Physics 2026';
