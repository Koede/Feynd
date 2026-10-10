// js/loops/cite.js
// References used by the selection rules and the per-diagram notes. Each entry is a
// short label plus a link, so a rule can say which experiment or paper backs it.

export const CITE = {
    PDG: { text: 'Particle Data Group, Review of Particle Physics, 2026 edition (S. Navas et al., Phys. Rev. D 110, 030001 (2024) and 2026 update)', url: 'https://pdg.lbl.gov/2026/' },
    SK_PDECAY: { text: 'Super-Kamiokande, Phys. Rev. D 102, 112011 (2020): τ(p → e⁺π⁰) > 2.4 × 10³⁴ yr', url: 'https://arxiv.org/abs/2010.16098' },
    MEG2: { text: 'MEG II, arXiv:2504.15711 (2025): B(μ⁺ → e⁺γ) < 1.5 × 10⁻¹³ (90% CL)', url: 'https://arxiv.org/abs/2504.15711' },
    SK_OSC: { text: 'Super-Kamiokande, Phys. Rev. Lett. 81, 1562 (1998): atmospheric neutrino oscillation', url: 'https://doi.org/10.1103/PhysRevLett.81.1562' },
    SNO: { text: 'SNO, Phys. Rev. Lett. 89, 011301 (2002): solar neutrino flavour change', url: 'https://doi.org/10.1103/PhysRevLett.89.011301' },
    GIM: { text: 'S. L. Glashow, J. Iliopoulos, L. Maiani, Phys. Rev. D 2, 1285 (1970)', url: 'https://doi.org/10.1103/PhysRevD.2.1285' },
    CLEO_BSG: { text: 'CLEO, Phys. Rev. Lett. 74, 2885 (1995): first observation of inclusive b → sγ', url: 'https://doi.org/10.1103/PhysRevLett.74.2885' },
    CABIBBO: { text: 'N. Cabibbo, Phys. Rev. Lett. 10, 531 (1963)', url: 'https://doi.org/10.1103/PhysRevLett.10.531' },
    KM: { text: 'M. Kobayashi, T. Maskawa, Prog. Theor. Phys. 49, 652 (1973)', url: 'https://doi.org/10.1143/PTP.49.652' },
    DS2: { text: 'ΔS = 2 hyperon decays unobserved: B(Ξ⁰ → pπ⁻) < 8 × 10⁻⁶, B(Ξ⁻ → nπ⁻) < 1.9 × 10⁻⁵, B(Ω⁻ → Λπ⁻) < 2.9 × 10⁻⁶ (90% CL), PDG; see arXiv:2304.02559', url: 'https://arxiv.org/abs/2304.02559' },
    DSDQ: { text: 'ΔS = −ΔQ semileptonic decays unobserved; e.g. BESIII search for Ξ⁰ → Σ⁻e⁺νₑ, arXiv:2208.09221; limits in PDG', url: 'https://arxiv.org/abs/2208.09221' },
    FURRY: { text: 'W. H. Furry, Phys. Rev. 51, 125 (1937)', url: 'https://doi.org/10.1103/PhysRev.51.125' },
    PI3G: { text: 'J. McDonough et al., Phys. Rev. D 38, 2121 (1988): B(π⁰ → 3γ) < 3.1 × 10⁻⁸ (90% CL)', url: 'https://doi.org/10.1103/PhysRevD.38.2121' },
    LY: { text: 'L. D. Landau, Dokl. Akad. Nauk SSSR 60, 207 (1948); C. N. Yang, Phys. Rev. 77, 242 (1950)', url: 'https://doi.org/10.1103/PhysRev.77.242' },
    HGG: { text: 'ATLAS, Phys. Lett. B 716, 1 (2012); CMS, Phys. Lett. B 716, 30 (2012): H → γγ observed', url: 'https://doi.org/10.1016/j.physletb.2012.08.020' },
    HZG: { text: 'ATLAS and CMS, Phys. Rev. Lett. 132, 021803 (2024): evidence for H → Zγ', url: 'https://arxiv.org/abs/2309.03501' },
    LBL: { text: 'ATLAS, Nature Phys. 13, 852 (2017): evidence for light-by-light scattering', url: 'https://arxiv.org/abs/1702.01625' },
    WU: { text: 'C. S. Wu et al., Phys. Rev. 105, 1413 (1957): parity violation in β decay', url: 'https://doi.org/10.1103/PhysRev.105.1413' },
    LEEYANG: { text: 'T. D. Lee, C. N. Yang, Phys. Rev. 104, 254 (1956)', url: 'https://doi.org/10.1103/PhysRev.104.254' },
    CCFT: { text: 'J. H. Christenson, J. W. Cronin, V. L. Fitch, R. Turlay, Phys. Rev. Lett. 13, 138 (1964): CP violation in K_L → π⁺π⁻', url: 'https://doi.org/10.1103/PhysRevLett.13.138' },
    KLOE_ETA: { text: 'KLOE-2, JHEP 10 (2020) 047: B(η → π⁺π⁻) < 4.4 × 10⁻⁶ (90% CL)', url: 'https://arxiv.org/abs/2006.14710' },
    PIENU: { text: 'PIENU, Phys. Rev. Lett. 115, 071801 (2015): Γ(π → eν)/Γ(π → μν) = (1.2344 ± 0.0030) × 10⁻⁴, SM 1.2352 × 10⁻⁴', url: 'https://arxiv.org/abs/1506.05845' },
    ABJ: { text: 'S. L. Adler, Phys. Rev. 177, 2426 (1969); J. S. Bell, R. Jackiw, Nuovo Cim. A 60, 47 (1969)', url: 'https://doi.org/10.1103/PhysRev.177.2426' },
    OMEGA: { text: 'V. E. Barnes et al., Phys. Rev. Lett. 12, 204 (1964): discovery of the Ω⁻', url: 'https://doi.org/10.1103/PhysRevLett.12.204' },
    GELLMANN: { text: 'M. Gell-Mann, Phys. Rev. 125, 1067 (1962); Y. Ne’eman, Nucl. Phys. 26, 222 (1961)', url: 'https://doi.org/10.1103/PhysRev.125.1067' },
    THOOFT: { text: 'G. ’t Hooft, Nucl. Phys. B 72, 461 (1974): double-line (colour-flow) notation', url: 'https://doi.org/10.1016/0550-3213(74)90154-0' },
    COLOURFLOW: { text: 'F. Maltoni, K. Paul, T. Stelzer, S. Willenbrock, Phys. Rev. D 67, 014026 (2003): colour-flow decomposition', url: 'https://arxiv.org/abs/hep-ph/0209271' },
    FERMI: { text: 'E. Fermi, Z. Phys. 88, 161 (1934)', url: 'https://doi.org/10.1007/BF01351864' },
    LHCB_BCPV: { text: 'LHCb, Nature 643, 1223 (2025): CP violation observed in Λb⁰ → pK⁻π⁺π⁻, the first in baryons', url: 'https://doi.org/10.1038/s41586-025-09119-3' },
    PRIMEX: { text: 'PrimEx-II, Science 368, 506 (2020): Γ(π⁰ → γγ) = 7.80 ± 0.12 eV', url: 'https://doi.org/10.1126/science.aay6641' },
    XICC: { text: 'LHCb, arXiv:2603.28456 (2026): observation of Ξcc⁺, m = 3619.97 ± 0.83 ± 0.26 MeV', url: 'https://arxiv.org/abs/2603.28456' },
    KMIX: { text: 'K⁰–K̄⁰ mixing: M. Gell-Mann, A. Pais, Phys. Rev. 97, 1387 (1955); K. Lande et al., Phys. Rev. 103, 1901 (1956)', url: 'https://doi.org/10.1103/PhysRev.97.1387' },
    PESKIN: { text: 'M. E. Peskin, D. V. Schroeder, An Introduction to Quantum Field Theory (1995), §10.1: superficial degree of divergence', url: null },
    ETA3PI: { text: 'η → 3π proceeds through isospin breaking (m_u ≠ m_d): B(η → 3π⁰) ≈ 32.6%, B(η → π⁺π⁻π⁰) ≈ 23.0%, PDG', url: 'https://pdg.lbl.gov' }
};

export function citeHTML(c) {
    if (!c) return '';
    const list = Array.isArray(c) ? c : [c];
    return list.map(x => x.url ? `<a href="${x.url}" target="_blank" rel="noopener">${x.text}</a>` : x.text).join('; ');
}
