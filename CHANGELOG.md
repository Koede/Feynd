# Changelog

## Parameters from the Particle Data Group (PDG 2026)

Every Standard Model number the code uses now comes from one module, `js/loops/pdg.js`. All values are from the Particle Data Group's *Review of Particle Physics*, 2026 edition (https://pdg.lbl.gov/2026/): the Physical Constants table, the Summary Tables and the CKM review.

**`js/loops/pdg.js` (new)**

- Constants:
  - α = 1/137.035999177
  - G_F = 1.1663785 × 10⁻⁵ GeV⁻²
  - sin²θ̂_W(M_Z) = 0.23122 (MS-bar)
  - α_s(M_Z) = 0.1180
- Bosons:
  - M_W = 80.3625 GeV (PDG average, which excludes CDF)
  - M_Z = 91.1879 GeV
  - M_H = 125.13 GeV
  - Γ_Z = 2.4955 GeV
  - Γ_W = 2.14 GeV
- Leptons:
  - m_e = 0.51099895069 MeV
  - m_μ = 105.6583755 MeV
  - m_τ = 1776.93 MeV
- Quarks:
  - m_u = 2.16 MeV, m_d = 4.70 MeV, m_s = 92.9 MeV (MS-bar at 2 GeV)
  - m_c = 1.2729 GeV, m_b = 4.186 GeV (MS-bar at their own mass)
  - m_t = 172.60 GeV (direct measurement)
- CKM magnitudes from the PDG global fit (Eq. 12.27): |V_ud| = 0.97431, |V_us| = 0.22517, |V_ub| = 0.003763, |V_cd| = 0.22503, |V_cs| = 0.97345, |V_cb| = 0.04189, |V_td| = 0.00863, |V_ts| = 0.04117, |V_tb| = 0.999115.
- The Higgs vacuum expectation value is now derived from the Fermi constant instead of being typed in: v = (√2 G_F)^(−1/2) = 246.22 GeV.

**Updated to read from it**

- `js/loops/engine.js`. Before → after:
  - α: 1/137.036 → 1/137.035999177
  - s_W²: 0.2312 → 0.23122
  - v: 246.22 → 246.2197 GeV (derived)
  - M_W: 80.38 → 80.3625 GeV
  - M_Z: 91.19 → 91.1879 GeV
  - M_H: 125.25 → 125.13 GeV
  - m_τ: 1.77686 → 1.77693 GeV
  - m_t: 172.5 → 172.60 GeV
  - m_b: 4.18 → 4.186 GeV
  - m_c: 1.27 → 1.2729 GeV
  - m_s: 93 → 92.9 MeV
  - m_d: 4.67 → 4.70 MeV
  - m_e, m_μ: full precision
  - CKM: 2024 fit → 2026 fit

  Every coupling built from these (e, g, g_s, Z couplings, Yukawas, HWW, HZZ, HHH, Goldstone and ghost couplings) follows automatically. The engine also exposes the module as `FV.PDG`.
- `js/loops/caveats.js`: CKM-suppression notes use the PDG 2026 matrix.
- `js/loops/explorer.js`: the conventions card prints the inputs from `pdg.js` with the edition and a link, including the on-shell s_W² = 1 − M_W²/M_Z² computed from the PDG masses.
- `js/particles.js` (shared with `index.html`):
  - uncertainties corrected to the PDG 2026 Summary Tables: m_u, m_d ± 0.07 MeV; m_s ± 0.7 MeV; m_c ± 0.0045 GeV;
  - m_b → 4.186 ± 0.006 GeV;
  - muon uncertainty typo fixed (0.00000023 → 0.0000023 MeV);
  - source comment added.
- `js/hadrons.js`: m_p = 938.27208943 MeV and m_n = 939.5654219 MeV, from the PDG 2026 baryon table. The other hadron masses already matched it.
- `js/loops/cite.js`: the PDG reference points to the 2026 edition.

Tests: 108 pass.

## Loop updates: generating loops dynamically using textbook combinatorics and renormalization rules

This change is the engine half of the loop rework: diagrams of any loop order are now
built from first principles instead of from a fixed one-loop "ring" template. The page
still uses the earlier one-loop list until the interface work lands (see *Still in
progress* at the end).

### New: `js/loops/graph.js` — general Feynman-graph engine

**Representation**
- A diagram is a graph with numbered external points, internal vertices of three or four lines, and one particle id per line, flowing from one end to the other. A self-loop (a line that starts and ends on the same vertex) is allowed.
- `fromDiagram(d)` converts an engine diagram into this form. `toDiagram(...)` converts it back, with loop records, a name, a symmetry factor, a coupling strength and an ordering of the external legs for drawing.

**Topologies** (`topologies(n, L)`, `addLoopMoves(T)`)
- Trees with n labelled legs and cubic or quartic vertices are built by adding one leg at a time, either on a line or on a cubic vertex.
- L-loop topologies are grown from (L−1)-loop ones with three moves:
  1. a new propagator between any two points (lines or cubic vertices, including two points on the same line);
  2. a self-contracted quartic vertex placed on a line (the seagull);
  3. a tadpole: a stem from any point to a vertex carrying a self-loop.
- These moves reach every connected graph with three- or four-line vertices. Removing a non-bridge line, or a whole tadpole, always gives a valid graph with one loop fewer, so each graph is the result of some move.
- Results are cached per (n, L). Counts:

  | Legs | Loops | Topologies |
  |---|---|---|
  | 3 | 1 | 14 |
  | 4 | 1 | 99 |
  | 3 | 2 | 217 |
  | 4 | 2 | 2214 |
  | 5 | 2 | 28365 |

**Particle assignment** (`labelAll`)
- Backtracking search over every free line.
- At each step it completes the most constrained vertex, using an index from each partial leg multiset to the vertex-table entries that complete it.
- Neighbouring vertices are checked for feasibility after every step.
- Nothing is pre-chosen: every labelling the Standard Model vertex table allows is found.

**Duplicates and symmetry factors** (`canon`, `symmetryFactor`)
- The canonical form comes from colour refinement plus individualization over internal vertices, with external legs held fixed and line labels oriented.
- Counting the leaves that reach the canonical certificate gives the automorphism group. The symmetry factor is then |Aut| × k! for each set of k identical parallel lines × 2 for each self-conjugate self-loop.

**Structure analysis** (`analyze`)
- Finds the bridges of the internal graph and the one-particle-irreducible pieces (blobs).
- For each blob it records:
  - legs, loop number and quartic vertices;
  - closed fermion or ghost loop;
  - the superficial degree of divergence D = 4 − B − 3F/2 − Σ[g]. Dimensionful couplings (HHH, HWW, HZZ and the R_ξ scalar couplings) lower D.
  - whether the blob is loop-induced (no tree-level vertex with the same legs).
- Flags tadpoles (a loop joined to the rest by a bridge with no external leg behind it) and external-leg corrections (a bridge with exactly one external leg behind it, which the S-matrix amputates).
- Counts closed fermion loops and ghost loops, each worth a factor (−1).
- `mixingAllowed`: γ–Z mixing and flavour-changing fermion self-energies are allowed two-point functions. Vector–scalar mixing (Z–H) vanishes by CP.

**Naming and grouping**
- One-loop pieces: self-energy, seagull self-energy, vertex correction, box, pentagon, hexagon, tadpole, and "with a quartic vertex".
- Multi-loop pieces are named by their core: sunset, theta with path lengths, nested loop, figure-eight.
- Planar versus non-planar is decided by an exact test (`blobPlanar`): the blob with its legs joined to a point at infinity, searched over rotation systems with Euler's formula. This identifies, for example, the crossed (non-planar) ladder.
- Products of lower-loop pieces are grouped as one-particle reducible.

**Layout**
- `planarExternalOrder` finds a planar embedding of the whole diagram with the legs on a circle, preferring orders that keep the initial particles together.
- That order gives the left/right slots of the external legs for multi-loop diagrams and tadpoles. Previously these fell back to the input order.

**Full lists** (`loopDiagrams(ini, fin, L, opts)`)
- Every L-loop diagram for a process.
- Options: `model` ('unitary' or 'feynman'), `tadpoles`, `externalLegs`, `limit`, `deadline`, `onProgress`.
- Photon, Z and gluon tadpoles are dropped, because they vanish identically: by Lorentz invariance for the photon and Z, and by colour (Tr Tᵃ = 0) for the gluon. Higgs tadpoles are kept on request.

**Models** (`getModel`, `buildModel`)
- `unitary`: physical W, Z, H; gluons in Feynman gauge with QCD ghosts. This is the page's existing convention.
- `feynman`: adds the 't Hooft–Feynman gauge content listed below.
- Custom sub-models can be built from any vertex subset; the tests use QED-only, φ³ and φ⁴.

### What the old one-loop generator missed (found by cross-checking the two)

- **Seagull self-energies.** A self-contracted quartic vertex on an internal line, such as a W loop on a γ or Z propagator via WWγγ / WWγZ / WWZZ, or a Higgs or Z loop on an H propagator via HHHH / HHZZ. e⁺e⁻ → μ⁺μ⁻ gains 8 (149 → 157), and Z → e⁺e⁻ gains 3 external-leg seagulls.
- **Tadpoles of every kind.** Previously these were never generated; now they are available as an option.
- **Higher loops.** Previously not possible. Two-loop examples:

  | Process | Two-loop diagrams |
  |---|---|
  | H → γγ | 1246 |
  | Z → e⁺e⁻ | 724 |
  | gg → H | 648 |
  | e⁺e⁻ → μ⁺μ⁻ | 14142 (about 10 s) |

  These counts exclude tadpoles and external-leg corrections.
- **A silent cap.** The old generator truncated branch combinations at 512 per ring grouping without reporting it. The new engine has no hidden caps; only the explicit `limit` and `deadline` stop it, and both report truncation.

### New: 't Hooft–Feynman gauge content (`js/loops/engine.js`)

**Particles**
- Goldstone bosons G⁰ (mass M_Z) and G± (mass M_W).
- Electroweak Faddeev–Popov ghosts u_γ, u_Z, u₊, u₋ (masses 0, M_Z, M_W, M_W) and their antighosts.
- All are marked `unphys`. Ghosts are additionally marked `ghost` and `ewGhost`.

**Vertex tables**
- The new vertices go in separate tables, `FV.VR` (69 cubic) and `FV.Q4R` (19 quartic), so the tree generator still works with physical states only.
- Contents:
  - VSS: γG⁺G⁻, ZG⁺G⁻, ZG⁰H, W±G∓H, W±G∓G⁰.
  - VVS: γW±G∓, ZW±G∓.
  - SSS and SSSS: HG⁰G⁰, HG⁺G⁻, G⁰⁴, (G⁺G⁻)², G⁺G⁻G⁰G⁰, HHG⁰G⁰, HHG⁺G⁻.
  - VVSS: WWG⁰G⁰, WWG⁺G⁻, ZZG⁰G⁰, ZZG⁺G⁻, γγG⁺G⁻, γZG⁺G⁻, γW±G∓H, γW±G∓G⁰, ZW±G∓H, ZW±G∓G⁰.
  - Fermion–Goldstone couplings proportional to the masses (f f̄ G⁰, and u d̄ G⁻ with CKM factors and leptons).
  - Ghost–gauge vertices (ū± u± γ/Z, ū± u_{γ,Z} W±, ū_{γ,Z} u± W∓).
  - Ghost–scalar vertices (ū_Z u_Z H, ū± u± H, ū± u± G⁰, ū_Z u± G∓, ū± u_Z G±, ū± u_γ G±).
- Couplings follow Denner, Fortsch. Phys. 41 (1993) 307, and Romão & Silva, Int. J. Mod. Phys. A 27 (2012) 1230025. Overall signs are convention dependent.

**Engine integration**
- `FV.vinfo` falls back to the R_ξ tables, so hover cards and coupling orders work for these vertices.
- `FV.kindOf` has a new `goldstone` line style: dash-dot, defined in `explorer-css.js`.
- `FV.isVisible` and `FV.PALETTE` exclude unphysical fields, so they never appear as selectable particles.

**Effect**
- H → γγ at one loop: 21 diagrams in unitary gauge, 44 in Feynman gauge.
- e⁺e⁻ → μ⁺μ⁻: 157 in unitary gauge, 388 in Feynman gauge.

### Changed

- `js/loops/color.js`: electroweak ghosts are colourless. Only gluons and QCD ghosts carry adjoint colour indices.

### Tests (`tests/graph.test.mjs`, 7 new, 108 total, all passing)

- Topology counts: 4 trees with 4 legs; 3 one-loop two-point topologies.
- QED two-loop counts:
  - vacuum polarization: 3;
  - electron self-energy: 3;
  - vertex: 9 (the textbook 7 plus the two light-by-light orientations that cancel by Furry's theorem).
- φ⁴ symmetry factors:
  - one-loop two-point: ½;
  - two-loop two-point: ¼ and ⅙;
  - one-loop four-point: three diagrams of ½ each;
  - two-loop four-point: 12 one-particle-irreducible diagrams (3 bubble chains with S = 4, 6 eyes and 3 seagull insertions with S = 2).
- φ³ one loop: bubble ½ and tadpole ½.
- Cross-check against the old one-loop generator: for H → γγ, gg → H, γγ → γγ and e⁺e⁻ → μ⁺μ⁻, new = old + seagulls exactly.
- The Feynman-gauge model produces Goldstone and electroweak-ghost loops.
- Every R_ξ vertex conserves charge, ghost number and fermion number; unphysical fields are kept off the palette.

### Still in progress (next commits)

- Switch the page's loop list to `loopDiagrams`, with a loop-order selector (1 or 2), toggles for tadpoles and external-leg corrections, and a gauge selector (unitary or Feynman–'t Hooft).
- A right-click (or long-press) **"Generate loop here"** menu on any vertex or line in the loop explorer:
  - vertex correction;
  - self-energy, including γ–Z and flavour mixing;
  - seagull;
  - tadpole;
  - "start a loop line here → close it there" between any two points.

  Each option is computed on the spot by `labelAll` on the modified graph. The diagram is then laid out again and its renormalization recomputed: per-blob divergence degree, counterterm, subdivergences of multi-loop pieces with their counterterm diagrams, LSZ factors, symmetry factor and fermion-loop sign.
- Self-loop rendering in the SVG renderer.
