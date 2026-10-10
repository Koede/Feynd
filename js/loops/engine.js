// js/loops/engine.js — loop engine (generated from the Feynman Viewer sources, DOM-free).
// Crossing-symmetric tree enumeration, loop insertion, renormalization data, layout and SVG rendering.
const FV = {};
(function () {
'use strict';
// ---- Standard Model inputs ------------------------------------------------
const ALPHA = 1 / 137.036, SW2 = 0.2312, VEV = 246.22, ALPHAS = 0.118;
const E = Math.sqrt(4 * Math.PI * ALPHA), SW = Math.sqrt(SW2), CW = Math.sqrt(1 - SW2);
const GW = E / SW, GS = Math.sqrt(4 * Math.PI * ALPHAS);
const MW = 80.38, MZ = 91.19, MH = 125.25;
FV.C = { ALPHA, SW2, VEV, ALPHAS, E, SW, CW, GW, GS, MW, MZ, MH };

// ---- number / charge formatting -------------------------------------------
const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
function fmt(x) {
  if (x === 0) return '0';
  const a = Math.abs(x);
  if (a < 0.001 || a >= 1e5) {
    const [m, ex] = x.toExponential(2).split('e');
    return m + '×10' + String(parseInt(ex, 10)).split('').map(c => SUP[c] || c).join('');
  }
  return String(parseFloat(x.toPrecision(4))).replace('-', '−');
}
function qs(q) {
  const a = Math.abs(q), s = q < 0 ? '−' : (q > 0 ? '+' : '');
  if (a < 1e-9) return '0';
  const t = Math.round(a * 3);
  return t % 3 === 0 ? s + (t / 3) : s + t + '/3';
}
FV.fmt = fmt; FV.qs = qs;

// ---- particles --------------------------------------------------------------
const P = FV.P = {}, ORDER = FV.ORDER = [];
function add(id, o) { o.id = id; P[id] = o; ORDER.push(id); }

const FERM = [
  ['e-', 'e+', 'e', '', '−', '+', -1, -0.5, 0.000511, 'lepton', 1, 'e'],
  ['mu-', 'mu+', 'μ', '', '−', '+', -1, -0.5, 0.10566, 'lepton', 2, 'mu'],
  ['tau-', 'tau+', 'τ', '', '−', '+', -1, -0.5, 1.77686, 'lepton', 3, 'tau'],
  ['nu_e', 'nubar_e', 'ν', 'e', '', '', 0, 0.5, 0, 'lepton', 1, 'e'],
  ['nu_mu', 'nubar_mu', 'ν', 'μ', '', '', 0, 0.5, 0, 'lepton', 2, 'mu'],
  ['nu_tau', 'nubar_tau', 'ν', 'τ', '', '', 0, 0.5, 0, 'lepton', 3, 'tau'],
  ['u', 'ubar', 'u', '', '', '', 2 / 3, 0.5, 0.00216, 'quark', 1, ''],
  ['d', 'dbar', 'd', '', '', '', -1 / 3, -0.5, 0.00467, 'quark', 1, ''],
  ['c', 'cbar', 'c', '', '', '', 2 / 3, 0.5, 1.27, 'quark', 2, ''],
  ['s', 'sbar', 's', '', '', '', -1 / 3, -0.5, 0.093, 'quark', 2, ''],
  ['t', 'tbar', 't', '', '', '', 2 / 3, 0.5, 172.5, 'quark', 3, ''],
  ['b', 'bbar', 'b', '', '', '', -1 / 3, -0.5, 4.18, 'quark', 3, '']
];
FERM.forEach(r => {
  const [id, aid, sym, sub, sup, asup, Q, T3, m, kind, gen, lf] = r;
  const q = kind === 'quark';
  add(id, { sym, sub, sup, Q, T3, m, kind, gen, lf, anti: aid, isAnti: false, bar: false, selfConj: false, fermion: true, B: q ? 1 / 3 : 0, L: q ? 0 : 1 });
  add(aid, { sym, sub, sup: asup, Q: -Q, T3, m, kind, gen, lf, anti: id, isAnti: true, bar: sup === '' && asup === '', selfConj: false, fermion: true, B: q ? -1 / 3 : 0, L: q ? 0 : -1 });
});
add('gamma', { sym: 'γ', sub: '', sup: '', Q: 0, m: 0, kind: 'gauge', anti: 'gamma', isAnti: false, selfConj: true, B: 0, L: 0 });
add('Z', { sym: 'Z', sub: '', sup: '', Q: 0, m: MZ, kind: 'gauge', anti: 'Z', isAnti: false, selfConj: true, B: 0, L: 0 });
add('W+', { sym: 'W', sub: '', sup: '+', Q: 1, m: MW, kind: 'gauge', anti: 'W-', isAnti: false, selfConj: false, B: 0, L: 0 });
add('W-', { sym: 'W', sub: '', sup: '−', Q: -1, m: MW, kind: 'gauge', anti: 'W+', isAnti: true, selfConj: false, B: 0, L: 0 });
add('g', { sym: 'g', sub: '', sup: '', Q: 0, m: 0, kind: 'gauge', anti: 'g', isAnti: false, selfConj: true, B: 0, L: 0 });
add('H', { sym: 'H', sub: '', sup: '', Q: 0, m: MH, kind: 'higgs', anti: 'H', isAnti: false, selfConj: true, B: 0, L: 0 });
add('eta', { sym: 'η', sub: '', sup: '', Q: 0, m: 0, kind: 'ghost', anti: 'etabar', isAnti: false, selfConj: false, B: 0, L: 0, ghost: true });
add('etabar', { sym: 'η', sub: '', sup: '', Q: 0, m: 0, kind: 'ghost', anti: 'eta', isAnti: true, bar: true, selfConj: false, B: 0, L: 0, ghost: true });

const anti = FV.anti = id => P[id].anti;
FV.isFermion = id => !!P[id].fermion;
FV.isGhost = id => !!P[id].ghost;
FV.isVisible = id => !P[id].ghost;
FV.PALETTE = ORDER.filter(id => !P[id].ghost);
// the particle (not antiparticle) that a line flowing along its arrow represents
FV.flowId = id => (P[id].isAnti && !P[id].selfConj && (P[id].fermion || P[id].ghost)) ? P[id].anti : id;

FV.labHTML = id => {
  const p = P[id];
  let s = p.bar ? '<span class="ov">' + p.sym + '</span>' : p.sym;
  if (p.sub) s += '<sub>' + p.sub + '</sub>';
  if (p.sup) s += '<sup>' + p.sup + '</sup>';
  return s;
};
FV.labText = id => {
  const p = P[id];
  return p.sym + (p.bar ? '̄' : '') + (p.sub || '') + (p.sup || '');
};
FV.labSVG = id => {
  const p = P[id];
  let s = p.bar ? '<tspan text-decoration="overline">' + p.sym + '</tspan>' : p.sym;
  if (p.sub) s += '<tspan dy="3.5" font-size="0.72em">' + p.sub + '</tspan>';
  if (p.sup) s += '<tspan dy="-5" font-size="0.72em">' + p.sup + '</tspan>';
  return s;
};

// ---- vertex tables ------------------------------------------------------------
// legs are written "all outgoing"; every table entry is closed under conjugation by construction.
const V = FV.V = new Map(), Q4 = FV.Q4 = new Map(), PART = FV.PART = new Map(), BYP = FV.BYP = new Map();
const key = FV.key = legs => legs.slice().sort().join('|');
const pk = (a, b) => a < b ? a + '|' + b : b + '|' + a;
function addV(legs, info) {
  const k = key(legs);
  if (V.has(k)) return;
  info.legs = legs.slice(); info.key = k; V.set(k, info);
  for (let i = 0; i < 3; i++) {
    const t = legs[i], o = legs.filter((_, j) => j !== i), kk = pk(o[0], o[1]);
    if (!PART.has(kk)) PART.set(kk, []);
    if (!PART.get(kk).includes(t)) PART.get(kk).push(t);
    if (!BYP.has(t)) BYP.set(t, []);
    const pr = o[0] < o[1] ? [o[0], o[1]] : [o[1], o[0]];
    if (!BYP.get(t).some(x => x[0] === pr[0] && x[1] === pr[1])) BYP.get(t).push(pr);
  }
}
const Q4PART = FV.Q4PART = new Map();
function addQ(legs, info) {
  info.legs = legs.slice(); info.key = key(legs); info.quartic = true; Q4.set(info.key, info);
  // index: any three legs -> the fourth, so trees can contain quartic vertices anywhere
  for (let i = 0; i < 4; i++) {
    const rest = legs.filter((_, j) => j !== i), k3 = key(rest);
    if (!Q4PART.has(k3)) Q4PART.set(k3, []);
    if (!Q4PART.get(k3).includes(legs[i])) Q4PART.get(k3).push(legs[i]);
  }
}
FV.partners4 = (a, b, c) => Q4PART.get(key([a, b, c])) || [];
FV.partners = (a, b) => PART.get(pk(a, b)) || [];

const CKM = {
  u: { d: 0.97435, s: 0.22501, b: 0.003732 },
  c: { d: 0.22487, s: 0.97349, b: 0.04183 },
  t: { d: 0.00858, s: 0.04111, b: 0.999118 }
};
const ups = ['u', 'c', 't'], downs = ['d', 's', 'b'];
const GAMMA_MU = 'γ<sup>μ</sup>';

FERM.forEach(r => {
  const id = r[0], f = P[id], fb = f.anti, Q = f.Q;
  if (Q !== 0) addV([id, fb, 'gamma'], {
    group: 'QED', rule: 'i e Q<sub>f</sub> ' + GAMMA_MU,
    params: [['e', fmt(E)], ['Q<sub>f</sub>', qs(Q)], ['e·Q<sub>f</sub>', fmt(E * Q)]], strength: E * Math.abs(Q), ord: { e: 1 }
  });
  if (f.kind === 'quark') addV([id, fb, 'g'], {
    group: 'QCD', rule: 'i g<sub>s</sub> T<sup>a</sup><sub>ij</sub> ' + GAMMA_MU,
    params: [['g<sub>s</sub>', fmt(GS)], ['α<sub>s</sub>', fmt(ALPHAS)]], strength: GS, ord: { gs: 1 }
  });
  const gv = f.T3 - 2 * Q * SW2, ga = f.T3, pre = E / (2 * SW * CW);
  addV([id, fb, 'Z'], {
    group: 'EW', rule: 'i (e / 2s<sub>W</sub>c<sub>W</sub>) ' + GAMMA_MU + '(g<sub>V</sub> − g<sub>A</sub>γ⁵)',
    params: [['e/(2s<sub>W</sub>c<sub>W</sub>)', fmt(pre)], ['g<sub>V</sub> = T³ − 2Q s<sub>W</sub>²', fmt(gv)], ['g<sub>A</sub> = T³', fmt(ga)]],
    strength: pre * Math.hypot(gv, ga), ord: { g: 1 }
  });
  if (f.m > 0) addV([id, fb, 'H'], {
    group: 'Yukawa', rule: '−i m<sub>f</sub> / v',
    params: [['m<sub>f</sub>', fmt(f.m) + ' GeV'], ['v', fmt(VEV) + ' GeV'], ['m<sub>f</sub>/v', fmt(f.m / VEV)]], strength: f.m / VEV, ord: { y: 1 }
  });
});

// charged current: up-type partner u, down-type partner d, legs (u, d̄, W⁻) and the conjugate
function addW(u, d, v, lepton) {
  const nm = lepton ? '' : 'V<sub>' + P[u].sym + P[d].sym + '</sub>';
  const rule = 'i (g/√2) ' + (lepton ? '' : nm + ' ') + GAMMA_MU + ' P<sub>L</sub>';
  const params = [['g = e/s<sub>W</sub>', fmt(GW)], ['g/√2', fmt(GW / Math.SQRT2)]];
  if (!lepton) params.push(['|' + nm + '|', fmt(v)]);
  const info = { group: 'EW', rule, params, strength: GW / Math.SQRT2 * v, ord: { g: 1 } };
  addV([u, anti(d), 'W-'], info);
  addV([anti(u), d, 'W+'], Object.assign({}, info, { rule: rule.replace(nm, lepton ? '' : nm.replace('V<sub>', 'V*<sub>')) }));
}
addW('nu_e', 'e-', 1, true); addW('nu_mu', 'mu-', 1, true); addW('nu_tau', 'tau-', 1, true);
ups.forEach(u => downs.forEach(d => addW(u, d, CKM[u][d], false)));

const BR3 = '[g<sup>μν</sup>(k₁−k₂)<sup>ρ</sup> + g<sup>νρ</sup>(k₂−k₃)<sup>μ</sup> + g<sup>ρμ</sup>(k₃−k₁)<sup>ν</sup>]';
addV(['W+', 'W-', 'gamma'], { group: 'EW', rule: 'i e ' + BR3, params: [['e', fmt(E)]], strength: E, ord: { e: 1 }, note: 'all momenta incoming; legs ordered W⁺(μ) W⁻(ν) γ(ρ)' });
addV(['W+', 'W-', 'Z'], { group: 'EW', rule: 'i g c<sub>W</sub> ' + BR3, params: [['g c<sub>W</sub> = e c<sub>W</sub>/s<sub>W</sub>', fmt(GW * CW)]], strength: GW * CW, ord: { g: 1 }, note: 'all momenta incoming; legs ordered W⁺(μ) W⁻(ν) Z(ρ)' });
addV(['g', 'g', 'g'], { group: 'QCD', rule: 'g<sub>s</sub> f<sup>abc</sup> ' + BR3, params: [['g<sub>s</sub>', fmt(GS)]], strength: GS, ord: { gs: 1 }, note: 'all momenta incoming' });
addV(['eta', 'etabar', 'g'], { group: 'QCD', rule: '−g<sub>s</sub> f<sup>abc</sup> p<sup>μ</sup>', params: [['g<sub>s</sub>', fmt(GS)]], strength: GS, ord: { gs: 1 }, note: 'p = outgoing ghost momentum' });
addV(['H', 'H', 'H'], { dim: 1, group: 'Higgs', rule: '−3i M<sub>H</sub>² / v', params: [['M<sub>H</sub>²/v', fmt(MH * MH / VEV) + ' GeV']], strength: 3 * MH * MH / VEV / 100, ord: { lam: 1 } });
addV(['H', 'W+', 'W-'], { dim: 1, group: 'Higgs', rule: 'i g M<sub>W</sub> g<sup>μν</sup>', params: [['g M<sub>W</sub> = 2M<sub>W</sub>²/v', fmt(2 * MW * MW / VEV) + ' GeV']], strength: 2 * MW * MW / VEV / 100, ord: { g: 1 } });
addV(['H', 'Z', 'Z'], { dim: 1, group: 'Higgs', rule: 'i (g M<sub>Z</sub>/c<sub>W</sub>) g<sup>μν</sup>', params: [['g M<sub>Z</sub>/c<sub>W</sub> = 2M<sub>Z</sub>²/v', fmt(2 * MZ * MZ / VEV) + ' GeV']], strength: 2 * MZ * MZ / VEV / 100, ord: { g: 1 } });

const BR4 = '[2g<sup>μν</sup>g<sup>ρσ</sup> − g<sup>μρ</sup>g<sup>νσ</sup> − g<sup>μσ</sup>g<sup>νρ</sup>]';
addQ(['g', 'g', 'g', 'g'], { group: 'QCD', rule: '−i g<sub>s</sub>² [f<sup>abe</sup>f<sup>cde</sup>(g<sup>μρ</sup>g<sup>νσ</sup>−g<sup>μσ</sup>g<sup>νρ</sup>) + 2 perms]', params: [['g<sub>s</sub>²', fmt(GS * GS)]], strength: GS * GS, ord: { gs: 2 } });
addQ(['W+', 'W-', 'W+', 'W-'], { group: 'EW', rule: 'i g² [2g<sup>μρ</sup>g<sup>νσ</sup> − g<sup>μν</sup>g<sup>ρσ</sup> − g<sup>μσ</sup>g<sup>νρ</sup>]', params: [['g²', fmt(GW * GW)]], strength: GW * GW, ord: { g: 2 } });
addQ(['W+', 'W-', 'gamma', 'gamma'], { group: 'EW', rule: '−i e² ' + BR4, params: [['e²', fmt(E * E)]], strength: E * E, ord: { e: 2 } });
addQ(['W+', 'W-', 'gamma', 'Z'], { group: 'EW', rule: '−i e g c<sub>W</sub> ' + BR4, params: [['e g c<sub>W</sub>', fmt(E * GW * CW)]], strength: E * GW * CW, ord: { e: 1, g: 1 } });
addQ(['W+', 'W-', 'Z', 'Z'], { group: 'EW', rule: '−i g² c<sub>W</sub>² ' + BR4, params: [['g² c<sub>W</sub>²', fmt(GW * GW * CW * CW)]], strength: GW * GW * CW * CW, ord: { g: 2 } });
addQ(['H', 'H', 'H', 'H'], { group: 'Higgs', rule: '−3i M<sub>H</sub>² / v²', params: [['M<sub>H</sub>²/v²', fmt(MH * MH / VEV / VEV)]], strength: 0.2, ord: { lam: 1 } });
addQ(['H', 'H', 'W+', 'W-'], { group: 'Higgs', rule: 'i (g²/2) g<sup>μν</sup>', params: [['g²/2', fmt(GW * GW / 2)]], strength: GW * GW / 2, ord: { g: 2 } });
addQ(['H', 'H', 'Z', 'Z'], { group: 'Higgs', rule: 'i (g²/2c<sub>W</sub>²) g<sup>μν</sup>', params: [['g²/2c<sub>W</sub>²', fmt(GW * GW / 2 / CW / CW)]], strength: GW * GW / 2 / CW / CW, ord: { g: 2 } });

// vertex display name: fermions first, then bosons
FV.vname = legs => {
  const rank = id => P[id].fermion ? (P[id].isAnti ? 1 : 0) : 2;
  return legs.slice().sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : 1)).map(FV.labHTML).join(' ');
};
FV.vgroupLabel = g => ({ QED: 'QED', QCD: 'QCD', EW: 'Electroweak', Yukawa: 'Yukawa', Higgs: 'Higgs self/gauge' }[g] || g);
})();
(function () {
'use strict';
const P = FV.P, anti = FV.anti, V = FV.V, Q4 = FV.Q4, key = FV.key;

// ---- parsing user input --------------------------------------------------------
const ALIAS = {};
function al(id, names) { names.forEach(n => ALIAS[n] = id); ALIAS[id.toLowerCase()] = id; }
FV.ORDER.forEach(id => ALIAS[id.toLowerCase()] = id);
al('e-', ['e', 'electron']); al('e+', ['positron']); al('mu-', ['mu', 'muon']); al('mu+', ['antimuon']);
al('tau-', ['tau']); al('tau+', ['antitau']);
al('nu_e', ['nue', 've', 'nu_e-']); al('nubar_e', ['anue', 'nuebar', 'nu_ebar', 'nue~', 'nu_e~', 'nubar_e', 'vebar']);
al('nu_mu', ['numu', 'vmu']); al('nubar_mu', ['anumu', 'numubar', 'nu_mubar', 'numu~', 'nu_mu~', 'vmubar']);
al('nu_tau', ['nutau', 'vtau']); al('nubar_tau', ['anutau', 'nutaubar', 'nu_taubar', 'nutau~', 'nu_tau~', 'vtaubar']);
['u', 'd', 'c', 's', 't', 'b'].forEach(q => al(q + 'bar', [q + '~', q + '-bar', 'anti' + q, 'anti-' + q, q + 'bar']));
al('gamma', ['photon', 'a', 'gam']); al('g', ['gluon']); al('Z', ['z0']); al('W+', ['w']); al('W-', []); al('H', ['higgs', 'h0']);
ALIAS['z'] = 'Z'; ALIAS['w+'] = 'W+'; ALIAS['w-'] = 'W-'; ALIAS['h'] = 'H';
ALIAS['w'] = 'W-'; ALIAS['t'] = 't'; ALIAS['a'] = 'gamma';

FV.parseParticle = function (tok) {
  let s = tok.trim(), bar = false;
  if (!s) return null;
  if (/[̄¯]/.test(s)) { bar = true; s = s.replace(/[̄¯]/g, ''); }
  s = s.toLowerCase().replace(/[−–—]/g, '-').replace(/⁻/g, '-').replace(/⁺/g, '+')
    .replace(/μ/g, 'mu').replace(/τ/g, 'tau').replace(/ν/g, 'nu').replace(/γ/g, 'gamma')
    .replace(/_?([emt]|mu|tau)\s*$/, m => m); // no-op, keeps pattern simple
  let id = ALIAS[s];
  if (!id) return null;
  if (bar) id = anti(id);
  return id;
};
FV.parseList = function (str) {
  const ids = [], bad = [];
  str.split(/[\s,;]+/).filter(Boolean).forEach(t => {
    const id = FV.parseParticle(t);
    if (id && FV.isVisible(id)) ids.push(id); else bad.push(t);
  });
  return { ids, bad };
};

// ---- conservation laws ---------------------------------------------------------
FV.checkConservation = function (ini, fin) {
  const sum = (ids, f) => ids.reduce((a, id) => a + f(P[id]), 0), msgs = [];
  const eq = (a, b) => Math.abs(a - b) < 1e-9;
  const qi = sum(ini, p => p.Q), qf = sum(fin, p => p.Q);
  if (!eq(qi, qf)) msgs.push('electric charge (' + FV.qs(qi) + ' → ' + FV.qs(qf) + ')');
  const bi = sum(ini, p => p.B), bf = sum(fin, p => p.B);
  if (!eq(bi, bf)) msgs.push('baryon number (' + FV.fmt(bi) + ' → ' + FV.fmt(bf) + ')');
  const lt = sum(ini, p => p.L), lf = sum(fin, p => p.L);
  if (!eq(lt, lf)) msgs.push('total lepton number (' + lt + ' → ' + lf + ')');
  return msgs;
};

// ---- enumeration of tree diagrams (all legs outgoing) ------------------------------
function enumerateTrees(legs) {
  const n = legs.length, memo = new Map();
  function nodes(set) {
    const k = set.join(',');
    if (memo.has(k)) return memo.get(k);
    let res = [];
    if (set.length === 1) res = [{ leaf: set[0], out: anti(legs[set[0]]) }];
    else {
      const first = set[0], rest = set.slice(1), m = rest.length;
      // cubic vertex: split into A (holding the first leg) and B
      for (let mask = 0; mask < (1 << m); mask++) {
        const A = [first], B = [];
        rest.forEach((r, i) => ((mask >> i) & 1 ? A : B).push(r));
        if (!B.length) continue;
        for (const na of nodes(A)) for (const nb of nodes(B))
          for (const third of FV.partners(anti(na.out), anti(nb.out))) res.push({ out: third, a: na, b: nb });
      }
      // quartic vertex: split into A (first leg), B, C with min(B) < min(C) so each split is counted once
      if (set.length >= 3) {
        const total = Math.pow(3, m);
        for (let code = 0; code < total; code++) {
          const A = [first], B = [], C = [];
          let c = code;
          for (let i = 0; i < m; i++) { const t = c % 3; c = (c - t) / 3; (t === 0 ? A : t === 1 ? B : C).push(rest[i]); }
          if (!B.length || !C.length || B[0] > C[0]) continue;
          for (const na of nodes(A)) for (const nb of nodes(B)) for (const nc of nodes(C))
            for (const fourth of FV.partners4(anti(na.out), anti(nb.out), anti(nc.out))) res.push({ out: fourth, a: na, b: nb, c: nc, quartic: true });
        }
      }
    }
    memo.set(k, res);
    return res;
  }
  const rootSet = []; for (let i = 1; i < n; i++) rootSet.push(i);
  return nodes(rootSet).filter(nd => nd.out === legs[0]);
}
FV.enumerateTrees = enumerateTrees;

// ---- graph helpers --------------------------------------------------------------------
function newDiag() { return { verts: [], edges: [], loops: [], nid: 0, ext: [], label: '', kind: 'tree' }; }
function addVert(d, o) { o.id = 'v' + (++d.nid); if (!o.lids) o.lids = []; d.verts.push(o); return o; }
function addEdge(d, a, b, p, o) { const e = Object.assign({ id: 'e' + (++d.nid), a, b, p, lids: [] }, o || {}); d.edges.push(e); return e; }
const vert = (d, id) => d.verts.find(v => v.id === id);
const edgeOf = (d, id) => d.edges.find(e => e.id === id);
const clone = d => JSON.parse(JSON.stringify(d));
function legsAt(d, vid) {
  const r = [];
  d.edges.forEach(e => { if (e.a === vid) r.push({ e, p: e.p }); if (e.b === vid) r.push({ e, p: anti(e.p) }); });
  return r;
}
FV.legsAt = legsAt; FV.vert = vert; FV.edgeOf = edgeOf; FV.cloneDiag = clone;
FV.newDiag = newDiag; FV.addVert = addVert; FV.addEdge = addEdge;
FV.vinfo = function (d, v) {
  if (v.ct || v.kind !== 'v') return null;
  const l = legsAt(d, v.id).map(x => x.p);
  return (l.length === 3 ? V.get(key(l)) : l.length === 4 ? Q4.get(key(l)) : null) || null;
};
FV.countLoops = d => d.edges.length - d.verts.length + 1;
FV.orderOf = function (d) {
  const o = {};
  d.verts.forEach(v => { const i = FV.vinfo(d, v); if (i) for (const k in i.ord) o[k] = (o[k] || 0) + i.ord[k]; });
  return o;
};
FV.isInternal = (d, e) => vert(d, e.a).kind === 'v' && vert(d, e.b).kind === 'v';

function buildTreeDiag(initial, final, root, contactLegs) {
  const d = newDiag(), ext = [];
  d.initial = initial; d.final = final;
  initial.forEach(p => ext.push({ side: 'in', pid: p, leg: anti(p) }));
  final.forEach(p => ext.push({ side: 'out', pid: p, leg: p }));
  const ev = ext.map((e, i) => addVert(d, { kind: 'ext', side: e.side, extIdx: i, pid: e.pid }));
  if (contactLegs) {
    const v = addVert(d, { kind: 'v' });
    ext.forEach((e, i) => addEdge(d, v.id, ev[i].id, e.leg));
    d.contact = true;
  } else {
    const build = node => {
      const v = addVert(d, { kind: 'v' });
      [node.a, node.b, node.c].filter(Boolean).forEach(ch => {
        if (ch.leaf !== undefined) addEdge(d, v.id, ev[ch.leaf].id, ext[ch.leaf].leg);
        else { const cv = build(ch); addEdge(d, cv.id, v.id, ch.out); }
      });
      return v;
    };
    const rv = build(root);
    addEdge(d, rv.id, ev[0].id, ext[0].leg);
  }
  return d;
}

// leaf sets across each internal edge (tree diagrams only)
function leafSides(d) {
  const sets = [];
  d.edges.forEach(e => {
    if (!FV.isInternal(d, e)) return;
    const seen = new Set([e.a]), st = [e.a], leaves = [];
    while (st.length) {
      const u = st.pop(), vv = vert(d, u);
      if (vv.kind === 'ext') { leaves.push(vv.extIdx); continue; }
      d.edges.forEach(f => {
        if (f.id === e.id) return;
        const o = f.a === u ? f.b : f.b === u ? f.a : null;
        if (o && !seen.has(o)) { seen.add(o); st.push(o); }
      });
    }
    sets.push({ eid: e.id, leaves });
  });
  return sets;
}
function perms(a) {
  if (a.length <= 1) return [a.slice()];
  const r = [];
  a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p))));
  return r;
}
// ---- external ordering ------------------------------------------------------------------
// A planar drawing puts the external legs on a circle in the order given by some
// embedding of the graph. Trees and one-loop graphs have few embeddings (one choice of
// child order per vertex), so every cyclic leaf order is generated directly and the
// first one whose initial legs form one contiguous arc is used: left side top to
// bottom, then the right side bottom to top.
const ORDER_CAP = 4096;
function adjacency(d) {
  const adj = new Map();
  d.verts.forEach(v => adj.set(v.id, []));
  d.edges.forEach(e => { adj.get(e.a).push({ e, o: e.b }); adj.get(e.b).push({ e, o: e.a }); });
  return adj;
}
function product(lists, cap) {
  let acc = [[]];
  for (const l of lists) {
    const next = [];
    for (const a of acc) for (const x of l) { next.push(a.concat(x)); if (next.length >= cap) break; }
    acc = next;
    if (!acc.length) break;
  }
  return acc;
}
function subtreeOrders(d, adj, vid, viaEdge, cap) {
  const v = vert(d, vid);
  if (v.kind === 'ext') return [[v.extIdx]];
  const kids = adj.get(vid).filter(x => x.e.id !== viaEdge);
  const childOrders = kids.map(k => subtreeOrders(d, adj, k.o, k.e.id, cap));
  const out = [];
  for (const pm of perms(kids.map((_, i) => i))) {
    for (const combo of product(pm.map(i => childOrders[i]), cap)) {
      out.push([].concat(...combo));
      if (out.length >= cap) return out;
    }
  }
  return out;
}
function cyclicOrders(d) {
  const adj = adjacency(d), L = FV.countLoops(d);
  if (L === 0) {
    const e0 = d.verts.find(v => v.kind === 'ext' && v.extIdx === 0) || d.verts.find(v => v.kind === 'ext');
    const first = adj.get(e0.id)[0];
    return subtreeOrders(d, adj, first.o, first.e.id, ORDER_CAP).map(seq => [e0.extIdx].concat(seq));
  }
  if (L !== 1) return null;
  // the cycle is the 2-core: strip degree-1 vertices repeatedly
  const deg = new Map(); adj.forEach((l, k) => deg.set(k, l.length));
  const removed = new Set(), st = [...deg.keys()].filter(k => deg.get(k) === 1);
  while (st.length) {
    const k = st.pop(); if (removed.has(k)) continue; removed.add(k);
    adj.get(k).forEach(x => { if (!removed.has(x.o)) { deg.set(x.o, deg.get(x.o) - 1); if (deg.get(x.o) === 1) st.push(x.o); } });
  }
  const core = [...adj.keys()].filter(k => !removed.has(k));
  if (!core.length) return null;
  const ring = [core[0]], usedE = new Set();
  let cur = core[0];
  for (let guard = 0; guard < core.length + 2; guard++) {
    const step = adj.get(cur).find(x => !removed.has(x.o) && !usedE.has(x.e.id));
    if (!step) break;
    usedE.add(step.e.id);
    if (step.o === core[0]) break;
    ring.push(step.o); cur = step.o;
  }
  const perVertex = ring.map(vid => {
    const branches = adj.get(vid).filter(x => removed.has(x.o));
    const bo = branches.map(b => subtreeOrders(d, adj, b.o, b.e.id, 256));
    const out = [];
    for (const pm of perms(branches.map((_, i) => i))) for (const combo of product(pm.map(i => bo[i]), 256)) out.push([].concat(...combo));
    return out.length ? out : [[]];
  });
  return product(perVertex, ORDER_CAP).map(parts => [].concat(...parts));
}
function transitions(seq, nIn) {
  let tr = 0;
  for (let i = 0; i < seq.length; i++) if ((seq[i] < nIn) !== (seq[(i + 1) % seq.length] < nIn)) tr++;
  return tr;
}
function splitSides(seq, nIn) {
  const n = seq.length;
  let start = 0;
  for (let i = 0; i < n; i++) if (seq[i] < nIn && !(seq[(i - 1 + n) % n] < nIn)) { start = i; break; }
  const rot = seq.slice(start).concat(seq.slice(0, start));
  const pi = rot.filter(x => x < nIn), po = rot.filter(x => x >= nIn).reverse();
  return { pi, po };
}
function orderExternals(d) {
  const nIn = d.initial.length, nOut = d.final.length;
  let best = null;
  const cyc = cyclicOrders(d);
  if (cyc && cyc.length) {
    let bestTr = Infinity;
    for (const seq of cyc) {
      const tr = transitions(seq, nIn);
      if (tr > bestTr) continue;
      const sides = splitSides(seq, nIn);
      if (d.orderOK && !d.orderOK(sides.pi, sides.po)) continue;
      if (tr < bestTr) { bestTr = tr; best = sides; }
      if (tr <= 2) break;
    }
  }
  if (!best) {
    const ins = [], outs = [];
    for (let i = 0; i < nIn; i++) ins.push(i);
    for (let i = 0; i < nOut; i++) outs.push(nIn + i);
    best = { pi: ins, po: outs };
    if (d.orderOK && nIn + nOut <= 7) {
      outer: for (const pi of perms(ins)) for (const po of perms(outs)) if (d.orderOK(pi, po)) { best = { pi, po }; break outer; }
    }
  }
  d.verts.forEach(v => {
    if (v.kind !== 'ext' || v.extIdx === undefined || v.extIdx < 0) return;
    const arr = v.side === 'in' ? best.pi : best.po;
    v.slot = arr.indexOf(v.extIdx); v.nSide = arr.length;
  });
}
FV.orderExternals = orderExternals;

function labelTree(d) {
  const nIn = d.initial.length, nOut = d.final.length;
  const ie = d.edges.filter(e => FV.isInternal(d, e));
  if (d.contact) return 'contact interaction';
  if (!ie.length) return legsAt(d, d.verts.find(v => v.kind === 'v').id).length === 4 ? 'contact interaction' : 'single vertex';
  const med = e => FV.labHTML(FV.flowId(e.p));
  if (nIn === 2 && nOut === 2 && ie.length === 1) {
    const s = leafSides(d)[0].leaves, inS = new Set(s);
    let ch;
    if ((inS.has(0) && inS.has(1)) || (!inS.has(0) && !inS.has(1))) ch = 's';
    else ch = (inS.has(0) === inS.has(nIn)) ? 't' : 'u';
    return ch + '-channel ' + med(ie[0]);
  }
  return 'via ' + ie.map(med).join(', ');
}
function strengthOf(d) {
  let s = 1;
  d.verts.forEach(v => { const i = FV.vinfo(d, v); if (i) s *= Math.max(i.strength, 1e-9); });
  return s;
}

// ---- triangles and bubbles ------------------------------------------------------------
const BASE = { gamma: 0, g: 0, eta: 1, Z: 2.2, 'W+': 2.4, 'W-': 2.4, H: 3.5 };
function partScore(p, pref) {
  const b = FV.flowId(p);
  let s = BASE[b] !== undefined ? BASE[b] : (P[b].kind === 'quark' ? 1.3 : 1.0);
  if (pref && pref.has(b)) s -= 0.7;
  return s;
}
const sigId = p => p === 'W-' ? 'W+' : FV.flowId(p);
function sigOf(ps) { return ps.map(sigId).sort().join('|'); }
function labelParts(ps) {
  const u = []; ps.forEach(p => { const b = sigId(p); if (!u.includes(b)) u.push(b); });
  return u.map(b => b === 'W+' ? 'W<sup>±</sup>' : FV.labHTML(b)).join(', ');
}
FV.triangleOptions = function (la, lb, lc, pref) {
  const out = [], seen = new Set();
  (FV.BYP.get(la) || []).forEach(([x, y]) => {
    [[x, y], [y, x]].forEach(([pab, pac], i) => {
      if (i === 1 && x === y) return;
      FV.partners(lb, anti(pab)).forEach(pbc => {
        if (!V.has(key([lc, anti(pac), anti(pbc)]))) return;
        const ps = [pab, pac, pbc], sg = sigOf(ps);
        if (seen.has(sg)) return;
        seen.add(sg);
        out.push({ pab, pac, pbc, score: ps.reduce((a, p) => a + partScore(p, pref), 0), label: labelParts(ps) });
      });
    });
  });
  return out.sort((a, b) => a.score - b.score);
};
FV.bubbleOptions = function (p, pref) {
  const out = [], seen = new Set();
  (FV.BYP.get(anti(p)) || []).forEach(([x, y]) => {
    const sg = sigOf([x, y]);
    if (seen.has(sg)) return;
    seen.add(sg);
    out.push({ x, y, score: partScore(x, pref) + partScore(y, pref), label: labelParts([x, y]) });
  });
  return out.sort((a, b) => a.score - b.score);
};

// ---- loop insertion ---------------------------------------------------------------------
function loopId(d) { return 'L' + (d.loops.length + 1); }
function insertSE(nd, eid, x, y) {
  const e = edgeOf(nd, eid), A = vert(nd, e.a), B = vert(nd, e.b), lid = loopId(nd);
  const ext = A.kind === 'ext' || B.kind === 'ext';
  const mk = t => addVert(nd, { kind: 'v', x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t, lids: e.lids.concat([lid]) });
  const s1 = mk(0.38), s2 = mk(0.62);
  const oldB = e.b; e.b = s1.id;
  addEdge(nd, s2.id, oldB, e.p, { lids: e.lids.slice() });
  const e1 = addEdge(nd, s1.id, s2.id, x, { lids: [lid] }), e2 = addEdge(nd, s1.id, s2.id, y, { lids: [lid] });
  nd.loops.push({ id: lid, type: 'se', P: e.p, bubble: [x, y], verts: [s1.id, s2.id], edges: [e1.id, e2.id], external: ext, fermionLoop: P[x].fermion && P[y].fermion, ghostLoop: P[x].ghost });
  return nd;
}
function insertTri(nd, vid, tri, virtual) {
  const v = vert(nd, vid), lid = loopId(nd), ls = legsAt(nd, vid);
  const mk = (l, dx) => {
    const o = vert(nd, l.e.a === vid ? l.e.b : l.e.a), t = 0.3;
    return addVert(nd, { kind: 'v', x: v.x + (o.x - v.x) * t, y: v.y + (o.y - v.y) * t, lids: v.lids.concat([lid]) });
  };
  const t = ls.map(mk);
  ls.forEach((l, i) => { if (l.e.a === vid) l.e.a = t[i].id; else l.e.b = t[i].id; });
  const e1 = addEdge(nd, t[0].id, t[1].id, tri.pab, { lids: [lid] });
  const e2 = addEdge(nd, t[0].id, t[2].id, tri.pac, { lids: [lid] });
  const e3 = addEdge(nd, t[1].id, t[2].id, tri.pbc, { lids: [lid] });
  nd.verts = nd.verts.filter(x => x.id !== vid);
  const ps = [tri.pab, tri.pac, tri.pbc];
  nd.loops.push({ id: lid, type: 'tri', tri, verts: t.map(x => x.id), edges: [e1.id, e2.id, e3.id], induced: !!virtual, fermionLoop: ps.every(p => P[p].fermion), ghostLoop: ps.some(p => P[p].ghost), vertexKey: key(ls.map(l => l.p)) });
  return nd;
}
function boxInfo(d, eid) {
  const x = edgeOf(d, eid);
  if (!['gamma', 'Z', 'g'].includes(x.p) || !FV.isInternal(d, x)) return null;
  const A = vert(d, x.a), B = vert(d, x.b);
  if (A.ct || B.ct || A.id === B.id) return null;
  const la = legsAt(d, A.id).filter(l => l.e.id !== eid), lb = legsAt(d, B.id).filter(l => l.e.id !== eid);
  if (legsAt(d, A.id).length !== 3 || legsAt(d, B.id).length !== 3) return null;
  const ok = l => l.length === 2 && P[l[0].p].fermion && l[1].p === anti(l[0].p);
  if (!ok(la) || !ok(lb)) return null;
  const ids = new Set(la.concat(lb).map(l => l.e.id));
  if (ids.size !== 4) return null;
  return { x, A, B, la, lb };
}
function insertBox(nd, eid, pairing) {
  const { x, A, B, la, lb } = boxInfo(nd, eid), lid = loopId(nd);
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 24, ny = dx / L * 24;
  const mk = (V0, s) => addVert(nd, { kind: 'v', x: V0.x + s * nx, y: V0.y + s * ny, lids: V0.lids.concat([lid]) });
  const A1 = mk(A, 1), A2 = mk(A, -1), B1 = mk(B, 1), B2 = mk(B, -1);
  const rer = (l, nv, old) => { if (l.e.a === old) l.e.a = nv.id; else l.e.b = nv.id; };
  rer(la[0], A1, A.id); rer(la[1], A2, A.id); rer(lb[0], B1, B.id); rer(lb[1], B2, B.id);
  const fa = addEdge(nd, A1.id, A2.id, la[1].p, { lids: [lid] });
  const fb = addEdge(nd, B1.id, B2.id, lb[1].p, { lids: [lid] });
  const xp = x.p;
  nd.edges = nd.edges.filter(e => e.id !== eid);
  const b1 = addEdge(nd, A1.id, pairing === 0 ? B1.id : B2.id, xp, { lids: [lid] });
  const b2 = addEdge(nd, A2.id, pairing === 0 ? B2.id : B1.id, xp, { lids: [lid] });
  nd.verts = nd.verts.filter(v => v.id !== A.id && v.id !== B.id);
  nd.loops.push({ id: lid, type: 'box', X: xp, pairing, verts: [A1.id, A2.id, B1.id, B2.id], edges: [fa.id, fb.id, b1.id, b2.id], fermionLoop: false });
  return nd;
}

FV.sites = function (d, pref) {
  const S = [], push = s => S.push(s);
  d.verts.forEach(v => {
    if (v.kind !== 'v' || v.ct) return;
    const ls = legsAt(d, v.id);
    if (ls.length !== 3) return;
    const info = FV.vinfo(d, v);
    FV.triangleOptions(ls[0].p, ls[1].p, ls[2].p, pref).slice(0, 3).forEach(t => push({
      kind: 'tri', group: 'Vertex corrections', vid: v.id, tri: t,
      label: FV.vname(info.legs) + ' vertex — loop of ' + t.label, targets: { verts: [v.id], edges: ls.map(l => l.e.id) }
    }));
  });
  d.edges.forEach(e => {
    if (!FV.isInternal(d, e)) return;
    FV.bubbleOptions(e.p, pref).slice(0, 3).forEach(o => push({
      kind: 'se', group: 'Propagator self-energies', eid: e.id, x: o.x, y: o.y,
      label: FV.labHTML(FV.flowId(e.p)) + ' propagator — loop of ' + o.label, targets: { verts: [], edges: [e.id] }
    }));
  });
  d.edges.forEach(e => {
    if (!boxInfo(d, e.id)) return;
    [0, 1].forEach(k => push({
      kind: 'box', group: 'Boxes', eid: e.id, pairing: k,
      label: 'Two-' + FV.labHTML(e.p) + ' exchange — ' + (k ? 'second' : 'first') + ' pairing', targets: { verts: [e.a, e.b], edges: [e.id] }
    }));
  });
  d.edges.forEach(e => {
    if (FV.isInternal(d, e) || !(P[e.p].fermion || P[e.p].kind === 'gauge' || P[e.p].kind === 'higgs')) return;
    FV.bubbleOptions(e.p, pref).slice(0, 1).forEach(o => push({
      kind: 'se', group: 'External-leg corrections', eid: e.id, x: o.x, y: o.y,
      label: 'external ' + FV.labHTML(vert(d, e.a).kind === 'ext' ? vert(d, e.a).pid : vert(d, e.b).pid) + ' leg — loop of ' + o.label, targets: { verts: [], edges: [e.id] }
    }));
  });
  return S;
};
FV.applySite = function (d, s) {
  const nd = clone(d);
  if (s.kind === 'se') insertSE(nd, s.eid, s.x, s.y);
  else if (s.kind === 'tri') insertTri(nd, s.vid, s.tri, false);
  else if (s.kind === 'box') insertBox(nd, s.eid, s.pairing);
  return nd;
};

// collapse a loop to its counterterm vertex (for the counterterm-diagram view)
FV.collapseLoop = function (d, lid) {
  const L = d.loops.find(l => l.id === lid);
  if (!L || L.type === 'box' || L.type === 'ngon' || L.induced || (L.D !== undefined && L.D < 0)) return null;
  const nd = clone(d);
  if (!L.edges.every(id => edgeOf(nd, id)) || !L.verts.every(id => vert(nd, id))) return null;
  const keep = vert(nd, L.verts[0]);
  nd.edges = nd.edges.filter(e => !L.edges.includes(e.id));
  L.verts.slice(1).forEach(id => nd.edges.forEach(e => { if (e.a === id) e.a = keep.id; if (e.b === id) e.b = keep.id; }));
  nd.verts = nd.verts.filter(v => !L.verts.slice(1).includes(v.id));
  const vs = L.verts.map(id => vert(d, id));
  keep.x = vs.reduce((a, v) => a + v.x, 0) / vs.length; keep.y = vs.reduce((a, v) => a + v.y, 0) / vs.length;
  keep.ct = { kind: L.type === 'se' ? 'prop' : 'vertex', loop: lid };
  nd.loops = nd.loops.filter(l => l.id !== lid);
  nd.isCT = lid; nd.ctLoop = clone(L);
  return nd;
};

// ---- top-level generation ------------------------------------------------------------------
FV.prefFor = function (ini, fin) {
  const s = new Set(['gamma', 'g']);
  ini.concat(fin).forEach(id => s.add(FV.flowId(id)));
  return s;
};
const MAXEXT = 8;
FV.generate = function (ini, fin) {
  const n = ini.length + fin.length, res = { bases: [], kind: 'none', reason: '' };
  if (ini.length < 1 || fin.length < 1) { res.reason = 'Give at least one initial and one final particle.'; return res; }
  if (n < 3) { res.reason = 'A process needs at least three external particles for an interaction vertex.'; return res; }
  if (n > MAXEXT) { res.reason = 'This viewer handles up to ' + MAXEXT + ' external particles. Start from a smaller process and add loops.'; return res; }
  const viol = FV.checkConservation(ini, fin);
  if (viol.length) { res.reason = 'Forbidden: this process violates ' + viol.join(' and ') + ' conservation.'; return res; }
  const legs = ini.map(anti).concat(fin);
  const diags = enumerateTrees(legs).map(r => buildTreeDiag(ini, fin, r, false));
  diags.forEach(d => { d.label = labelTree(d); d.strength = strengthOf(d); });
  diags.sort((a, b) => b.strength - a.strength);
  if (diags.length) {
    diags.forEach(orderExternals);
    res.bases = diags; res.kind = 'tree';
    return res;
  }
  if (n === 3) {
    const pref = FV.prefFor(ini, fin);
    const opts = FV.triangleOptions(legs[0], legs[1], legs[2], pref), seen = new Set();
    opts.forEach(t => {
      const sg = sigOf([t.pab, t.pac, t.pbc]);
      if (seen.has(sg)) return; seen.add(sg);
      const d = buildTreeDiag(ini, fin, null, true);
      d.contact = false;
      const v0 = d.verts.find(v => v.kind === 'v');
      v0.x = 0; v0.y = 0; d.verts.forEach(v => { if (v.kind === 'ext') { v.x = 0; v.y = 0; } });
      insertTri(d, v0.id, t, true);
      d.kind = 'induced'; d.label = 'one-loop: ' + t.label; d.strength = 1 / (1 + t.score);
      orderExternals(d);
      d.verts.forEach(v => { delete v.x; delete v.y; });
      res.bases.push(d);
    });
    if (res.bases.length) { res.kind = 'induced'; return res; }
  }
  res.reason = 'No tree-level diagram exists for this process in the supported Standard Model vertices' + (n === 3 ? ', and no one-loop triangle closes either.' : '. It may be loop-induced; loop-induced processes with more than three particles are not generated yet.');
  return res;
};
})();
(function () {
'use strict';
const P = FV.P, C = FV.C, fmt = FV.fmt, lab = FV.labHTML;
const UV = 'Δ<sub>UV</sub>', IR = 'Δ<sub>IR</sub>', LM = m => 'ln(μ²/' + m + '²)';
const AQ = 'α/4π', AS = 'α<sub>s</sub>/4π';
const EW_IDS = ['Z', 'W+', 'W-', 'H'];

function sectorOfLoop(d, L) {
  let parts = [], ctx = [];
  if (L.type === 'se') { parts = L.bubble; ctx = [L.P]; }
  else if (L.type === 'tri') { parts = [L.tri.pab, L.tri.pac, L.tri.pbc]; ctx = (L.vertexKey || '').split('|'); }
  else return 'Box';
  const all = parts.concat(ctx);
  if (all.some(p => EW_IDS.includes(p))) return 'EW';
  if (all.some(p => p === 'g' || P[p].ghost)) return 'QCD';
  return 'QED';
}
FV.sectorOfLoop = sectorOfLoop;

const nfTxt = '(5 − ⅔ n<sub>f</sub>)';
const MSB = 'with 1/ε̄ = 1/ε − γ<sub>E</sub> + ln 4π, d = 4 − 2ε (MS-bar, Feynman gauge)';
function qed2(f) {
  const Q2 = P[f].Q * P[f].Q, m = lab(f);
  return {
    d2: 'δ₂ = −(' + AQ + ') Q<sub>f</sub>² [' + UV + ' + 2' + IR + ' + 4 + 3 ' + LM('m<sub>f</sub>') + ']',
    dm: 'δm<sub>f</sub>/m<sub>f</sub> = −(3' + AQ.replace('α/4π', 'α/4π') + ') Q<sub>f</sub>² [' + UV + ' + 4/3 + ' + LM('m<sub>f</sub>') + ']',
    note: 'f = ' + m + ', Q<sub>f</sub>² = ' + fmt(Q2) + ', m<sub>f</sub> = ' + fmt(P[f].m) + ' GeV; on-shell scheme'
  };
}

FV.ctInfo = function (d, L) {
  const sec = sectorOfLoop(d, L), out = { sector: sec, exprs: [], note: '' };
  if (L.generated && (L.type === 'box' || L.type === 'ngon' || L.induced)) {
    const uniq = []; L.edges.map(id => FV.edgeOf(d, id)).filter(Boolean).forEach(e => { const b = e.p === 'W-' ? 'W+' : FV.flowId(e.p); if (!uniq.includes(b)) uniq.push(b); });
    out.title = ({ 2: 'Self-energy', 3: 'Vertex loop', 4: 'Box', 5: 'Pentagon', 6: 'Hexagon' }[L.npoint] || L.npoint + '-point loop') + ', loop of ' + uniq.map(b => b === 'W+' ? 'W<sup>±</sup>' : lab(b)).join(', ');
    out.loopFactor = L.fermionLoop ? '(−1) for the closed fermion loop × Tr[…], ∫ d⁴k/(2π)⁴' : (L.ghostLoop ? '(−1) for the ghost loop, ∫ d⁴k/(2π)⁴' : '∫ d⁴k/(2π)⁴');
    const D = L.D, Dt = Number.isInteger(D) ? String(D).replace('-', '−') : String(D).replace('-', '−');
    out.exprs.push('Superficial degree of divergence D = 4 − B − 3F/2 − Σ[g] = ' + Dt + ' (B, F = boson and fermion lines attached to the loop; [g] = mass dimension of each coupling on the loop, 1 for HHH, HWW, HZZ).');
    if (L.edges.some(id => { const e = FV.edgeOf(d, id); return e && ['W+', 'W-', 'Z'].includes(e.p); })) out.exprs.push('This counting holds in a renormalizable R<sub>ξ</sub> gauge. In unitary gauge the massive W and Z propagators do not fall off at large momentum, so single diagrams look more divergent; the sum is the same.');
    if (D < 0) { out.rule = 'no counterterm'; out.exprs.push('Convergent by power counting.'); }
    else if (L.induced) { out.rule = 'none'; out.exprs.push('There is no tree-level vertex with these external legs, so there is no counterterm to absorb a divergence: the sum of all such loops is finite (gauge invariance cancels the would-be divergence).'); }
    else { out.rule = 'tree-level vertex counterterm'; out.exprs.push('Divergent by power counting; the divergence is removed by the counterterm of the tree-level vertex with the same legs.'); }
    if (L.attached && L.attached.every(p => p === 'gamma' || p === 'g') && L.fermionLoop) out.note = 'Individual light-by-light type boxes are log divergent; the divergence cancels in the gauge-invariant sum over orderings.';
    return out;
  }
  if (L.type === 'box') {
    out.title = 'Box (' + (L.crossed ? 'crossed' : 'direct') + ') two-' + lab(L.X) + ' exchange';
    out.rule = 'no counterterm';
    out.exprs.push('UV-finite: four propagators, no divergent sub-structure at this order.');
    out.loopFactor = '∫ d⁴k/(2π)⁴ over four propagators; no closed fermion loop';
    return out;
  }
  if (L.type === 'se') {
    const Pn = L.P, pid = FV.flowId(Pn), pp = P[Pn];
    out.title = lab(pid) + ' self-energy, loop of ' + L.bubble.map(b => lab(FV.flowId(b))).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    if (L.fermionLoop) out.loopFactor = '(−1) for the closed fermion loop × Tr[…], ∫ d⁴k/(2π)⁴';
    else if (L.ghostLoop) out.loopFactor = '(−1) for the ghost loop, ∫ d⁴k/(2π)⁴';
    else if (L.bubble[0] === 'g' && L.bubble[1] === 'g') out.loopFactor = 'symmetry factor ½ (two identical gluon lines), ∫ d⁴k/(2π)⁴';
    else out.loopFactor = '∫ d⁴k/(2π)⁴';
    if (pp.fermion) {
      if (sec === 'QED') {
        const q = qed2(pid);
        out.rule = 'i[p̸ δ₂ − (δm<sub>f</sub> + m<sub>f</sub> δ₂)]';
        out.exprs.push(q.d2, q.dm); out.note = q.note;
      } else if (sec === 'QCD') {
        out.rule = 'i[p̸ δ₂ − (δm + m δ₂)]';
        out.exprs.push('δ₂ = −(' + AS + ') C<sub>F</sub> / ε̄ = −(' + AS + ')(4/3) / ε̄', 'δm/m = −3(' + AS + ') C<sub>F</sub> / ε̄ = −4(' + AS + ') / ε̄');
        out.note = MSB;
      } else {
        out.rule = 'i[p̸(δZ<sub>f</sub><sup>L</sup>P<sub>L</sub> + δZ<sub>f</sub><sup>R</sup>P<sub>R</sub>) − δm<sub>f</sub> − …]';
        out.exprs.push('on-shell conditions: δm<sub>f</sub> = ½ m<sub>f</sub> Re[Σ<sup>L</sup> + Σ<sup>R</sup> + 2Σ<sup>S</sup>](m<sub>f</sub>²)', 'δZ<sup>L,R</sup><sub>f</sub> fixed by unit residue of the renormalized propagator at p² = m<sub>f</sub>²');
      }
    } else if (pid === 'gamma') {
      out.rule = '−i (g<sup>μν</sup>q² − q<sup>μ</sup>q<sup>ν</sup>) δ₃';
      if (sec === 'QED') {
        const f = FV.flowId(L.bubble[0]), Nc = P[f].kind === 'quark' ? 3 : 1;
        out.exprs.push('δ₃ = −(α/3π) N<sub>c</sub> Q<sub>f</sub>² [' + UV + ' + ' + LM('m<sub>f</sub>') + ']');
        out.note = 'f = ' + lab(f) + ', N<sub>c</sub> = ' + Nc + ', Q<sub>f</sub>² = ' + fmt(P[f].Q * P[f].Q) + '; subtraction at q² = 0 (Π(0) = 0), so e is the Thomson-limit charge';
      } else {
        out.rule = 'i δZ<sub>AA</sub>-type terms';
        out.exprs.push('δZ<sub>AA</sub> = −∂Σ<sub>T</sub><sup>AA</sup>(k²)/∂k² |<sub>k²=0</sub>', 'δZ<sub>ZA</sub> = 2 Σ<sub>T</sub><sup>AZ</sup>(0)/M<sub>Z</sub>²');
      }
    } else if (pid === 'g') {
      out.rule = '−i δ<sup>ab</sup>(g<sup>μν</sup>k² − k<sup>μ</sup>k<sup>ν</sup>) δ₃';
      out.exprs.push('δ₃ = (' + AS + ')(5/3 C<sub>A</sub> − 4/3 T<sub>F</sub>n<sub>f</sub>)/ε̄ = (' + AS + ') ' + nfTxt + ' / ε̄');
      const b = L.bubble.map(FV.flowId);
      if (L.ghostLoop) out.exprs.push('this loop alone: (' + AS + ')(1/12)C<sub>A</sub>/ε̄ = (' + AS + ')(1/4)/ε̄');
      else if (b[0] === 'g') out.exprs.push('this loop alone: (' + AS + ')(19/12)C<sub>A</sub>/ε̄ = (' + AS + ')(19/4)/ε̄');
      else out.exprs.push('this quark loop alone: −(' + AS + ')(4/3)T<sub>F</sub>/ε̄ = −(' + AS + ')(2/3)/ε̄ per flavour');
      out.note = MSB;
    } else if (pid === 'Z' || pid === 'W+' || pid === 'W-') {
      const W = pid !== 'Z', M = W ? 'M<sub>W</sub>' : 'M<sub>Z</sub>', S = W ? 'W' : 'ZZ';
      out.rule = 'i[−g<sup>μν</sup>(k² − M²) δZ − g<sup>μν</sup>δM²] + i k<sup>μ</sup>k<sup>ν</sup>δZ';
      out.exprs.push('δM² = Re Σ<sub>T</sub><sup>' + S + '</sup>(' + M + '²)', 'δZ = −Re ∂Σ<sub>T</sub><sup>' + S + '</sup>(k²)/∂k² |<sub>k²=' + M + '²</sub>');
      out.note = 'on-shell scheme; unitary gauge';
    } else {
      out.rule = 'i[(k² − M<sub>H</sub>²) δZ<sub>H</sub> − δM<sub>H</sub>²]';
      out.exprs.push('δM<sub>H</sub>² = Re Σ<sup>H</sup>(M<sub>H</sub>²)', 'δZ<sub>H</sub> = −Re ∂Σ<sup>H</sup>(k²)/∂k² |<sub>k²=M<sub>H</sub>²</sub>');
      out.note = 'on-shell scheme';
    }
    return out;
  }
  // triangles
  const info = FV.V.get(L.vertexKey);
  const ps = [L.tri.pab, L.tri.pac, L.tri.pbc];
  out.title = (info ? FV.vname(info.legs) + ' vertex' : 'effective vertex') + ', loop of ' + ps.map(p => lab(FV.flowId(p))).filter((v, i, a) => a.indexOf(v) === i).join(', ');
  out.loopFactor = L.fermionLoop ? '(−1) for the closed fermion loop × Tr[…], ∫ d⁴k/(2π)⁴' : (L.ghostLoop ? '(−1) for the ghost loop, ∫ d⁴k/(2π)⁴' : '∫ d⁴k/(2π)⁴');
  if (L.induced) {
    out.rule = 'none (loop-induced)';
    out.exprs.push('No tree-level coupling exists, so the one-loop amplitude is finite and needs no coupling counterterm.', 'Gauge invariance cancels the would-be divergence; the result is unambiguous.');
    return out;
  }
  const g = info && info.group, hasFerm = info && info.legs.some(l => P[l].fermion);
  if (sec === 'QED' && g === 'QED') {
    const f = info.legs.find(l => P[l].fermion);
    out.rule = 'i e Q<sub>f</sub> γ<sup>μ</sup> δ₁';
    out.exprs.push('δ₁ = δ₂ (Ward identity)', qed2(FV.flowId(f)).d2, 'charge renormalization: δ<sub>e</sub> = −½ δ₃, so e₀ = Z<sub>e</sub> e with Z<sub>e</sub> = Z₃<sup>−1/2</sup>');
    out.note = qed2(FV.flowId(f)).note;
  } else if (sec === 'QCD' && g === 'QCD' && hasFerm) {
    out.rule = 'i g<sub>s</sub> T<sup>a</sup> γ<sup>μ</sup> δ₁<sup>F</sup>';
    out.exprs.push('δ₁<sup>F</sup> = −(' + AS + ')(C<sub>F</sub> + C<sub>A</sub>)/ε̄ = −(' + AS + ')(13/3)/ε̄',
      'abelian-type piece: −(' + AS + ')(C<sub>F</sub> − C<sub>A</sub>/2)/ε̄; non-abelian piece: −(' + AS + ')(3C<sub>A</sub>/2)/ε̄',
      'Z<sub>g</sub> = 1 − (' + AS + ')(β₀/2)/ε̄, β₀ = 11 − ⅔ n<sub>f</sub>');
    out.note = MSB;
  } else if (sec === 'QCD' && g === 'QCD' && info.legs.every(l => l === 'g')) {
    out.rule = 'g<sub>s</sub> f<sup>abc</sup>[…] δ₁';
    out.exprs.push('δ₁ = (' + AS + ')(2/3 C<sub>A</sub> − 4/3 T<sub>F</sub>n<sub>f</sub>)/ε̄ = (' + AS + ')(2 − ⅔ n<sub>f</sub>)/ε̄');
    out.note = MSB;
  } else if (sec === 'QCD' && info && info.legs.some(l => P[l].ghost)) {
    out.rule = '−g<sub>s</sub> f<sup>abc</sup> p<sup>μ</sup> δ̃₁';
    out.exprs.push('δ̃₁ = −(' + AS + ')(C<sub>A</sub>/2)/ε̄ = −(' + AS + ')(3/2)/ε̄');
    out.note = MSB;
  } else {
    out.rule = 'vertex counterterm from δZ<sub>e</sub>, δs<sub>W</sub> and field renormalizations';
    out.exprs.push('δZ<sub>e</sub> = −½ δZ<sub>AA</sub> − (s<sub>W</sub>/2c<sub>W</sub>) δZ<sub>ZA</sub>',
      'δs<sub>W</sub>/s<sub>W</sub> = (c<sub>W</sub>²/2s<sub>W</sub>²)(δM<sub>Z</sub>²/M<sub>Z</sub>² − δM<sub>W</sub>²/M<sub>W</sub>²)');
    if (info && info.legs.some(l => l === 'W+' || l === 'W-') && info.legs.some(l => P[l].fermion))
      out.exprs.push('W f f′: δ = δZ<sub>e</sub> − δs<sub>W</sub>/s<sub>W</sub> + ½δZ<sub>W</sub> + ½δZ<sub>f</sub><sup>L</sup> + ½δZ<sub>f′</sub><sup>L</sup>');
    out.note = 'on-shell scheme (Denner 1993); field renormalization constants as in the propagator cards';
  }
  return out;
};

// LSZ residue factors for each external leg
FV.extFactors = function (d) {
  const res = [];
  d.verts.filter(v => v.kind === 'ext').forEach(v => {
    const id = FV.flowId(v.pid), p = P[id];
    let f, e = [];
    if (p.fermion && p.Q !== 0) {
      f = '√Z₂'; e.push('δ₂ = −(' + AQ + ') Q<sub>f</sub>² [' + UV + ' + 2' + IR + ' + 4 + 3 ' + LM('m<sub>f</sub>') + ']');
      if (p.kind === 'quark') e.push('plus QCD: −(' + AS + ') C<sub>F</sub> [' + UV + ' + 2' + IR + ' + 4 + 3 ' + LM('m<sub>q</sub>') + ']');
    } else if (p.fermion) { f = '√Z<sub>ν</sub><sup>L</sup>'; e.push('δZ<sup>L</sup><sub>ν</sub> = −Re Σ<sup>L</sup>(0) (electroweak, on shell)'); }
    else if (id === 'gamma') { f = '√Z₃'; e.push('δ₃ = −(α/3π) Σ<sub>f</sub> N<sub>c</sub>Q<sub>f</sub>² [' + UV + ' + ' + LM('m<sub>f</sub>') + ']'); }
    else if (id === 'g') { f = '√Z₃'; e.push('δ₃ = (' + AS + ') ' + nfTxt + ' / ε̄ (MS-bar); the on-shell residue of a massless gluon is 1 in dimensional regularization'); }
    else if (id === 'Z' || id === 'W+') { f = '√Z<sub>' + (id === 'Z' ? 'ZZ' : 'W') + '</sub>'; e.push('δZ = −Re ∂Σ<sub>T</sub>(k²)/∂k² at k² = M²'); }
    else { f = '√Z<sub>H</sub>'; e.push('δZ<sub>H</sub> = −Re ∂Σ<sup>H</sup>(k²)/∂k² at k² = M<sub>H</sub>²'); }
    res.push({ side: v.side, pid: v.pid, label: lab(v.pid), factor: f, exprs: e });
  });
  return res;
};
})();
(function () {
'use strict';
const W = 760, H = 440;
FV.W = W; FV.H = H;
const vert = FV.vert;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function placeExternals(d) {
  d.verts.forEach(v => {
    if (v.kind !== 'ext') return;
    const n = v.nSide || 1, gap = n > 1 ? Math.min(150, (H - 150) / (n - 1)) : 0;
    const pad = d.extPad || 84;
    v.x = v.side === 'in' ? pad : W - pad;
    v.y = H / 2 + ((v.slot || 0) - (n - 1) / 2) * gap;
    v.fixed = true;
  });
}
function seedInternal(d) {
  const free = d.verts.filter(v => v.kind === 'v' && v.x === undefined);
  for (let pass = 0; pass < 8 && free.some(v => v.x === undefined); pass++) {
    free.forEach(v => {
      if (v.x !== undefined) return;
      const nb = [];
      d.edges.forEach(e => {
        const o = e.a === v.id ? e.b : e.b === v.id ? e.a : null;
        if (o) { const ov = vert(d, o); if (ov.x !== undefined) nb.push(ov); }
      });
      if (nb.length) { v.x = nb.reduce((s, q) => s + q.x, 0) / nb.length; v.y = nb.reduce((s, q) => s + q.y, 0) / nb.length; }
    });
  }
  free.forEach(v => { if (v.x === undefined) { v.x = W / 2; v.y = H / 2; } });
}
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2; t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return { d: Math.hypot(px - cx, py - cy), cx, cy };
}
function relax(d, iters, temp0) {
  const vs = d.verts, byId = {}; vs.forEach(v => byId[v.id] = v);
  const free = vs.filter(v => !v.fixed);
  for (let it = 0; it < iters; it++) {
    const temp = temp0 * (1 - it / iters) + 0.4;
    const dx = {}, dy = {}; vs.forEach(v => { dx[v.id] = 0; dy[v.id] = 0; });
    for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) {
      const a = vs[i], b = vs[j];
      let ux = a.x - b.x, uy = a.y - b.y, dd = Math.hypot(ux, uy);
      if (dd < 0.5) { ux = Math.random() - .5; uy = Math.random() - .5; dd = 0.5; }
      const f = 9000 / (dd * dd);
      dx[a.id] += ux / dd * f; dy[a.id] += uy / dd * f; dx[b.id] -= ux / dd * f; dy[b.id] -= uy / dd * f;
    }
    d.edges.forEach(e => {
      const a = byId[e.a], b = byId[e.b];
      const loopy = e.lids.length && a.kind === 'v' && b.kind === 'v';
      const L = loopy ? 86 : (a.kind === 'ext' || b.kind === 'ext') ? 120 : 104;
      const ux = b.x - a.x, uy = b.y - a.y, dd = Math.hypot(ux, uy) || 1, f = 0.12 * (dd - L);
      dx[a.id] += ux / dd * f; dy[a.id] += uy / dd * f; dx[b.id] -= ux / dd * f; dy[b.id] -= uy / dd * f;
    });
    // keep vertices clear of lines they are not attached to
    free.forEach(v => d.edges.forEach(e => {
      if (e.a === v.id || e.b === v.id) return;
      const a = byId[e.a], b = byId[e.b], s = distSeg(v.x, v.y, a.x, a.y, b.x, b.y);
      if (s.d < 38) {
        const ux = (v.x - s.cx) || (Math.random() - .5), uy = (v.y - s.cy) || (Math.random() - .5), l = Math.hypot(ux, uy) || 1, f = (38 - s.d) * 0.9;
        dx[v.id] += ux / l * f; dy[v.id] += uy / l * f;
      }
    }));
    free.forEach(v => {
      const m = Math.hypot(dx[v.id], dy[v.id]) || 1, s = Math.min(m, temp);
      v.x += dx[v.id] / m * s; v.y += dy[v.id] / m * s;
      v.x = Math.max(120, Math.min(W - 120, v.x)); v.y = Math.max(50, Math.min(H - 50, v.y));
    });
  }
}
function segX(p1, p2, p3, p4) {
  const o = (a, b, c) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const d1 = o(p3, p4, p1), d2 = o(p3, p4, p2), d3 = o(p1, p2, p3), d4 = o(p1, p2, p4);
  return d1 * d2 < -1e-6 && d3 * d4 < -1e-6;
}
FV.crossings = function (d) {
  let n = 0; const es = d.edges;
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
    if (segX(vert(d, a.a), vert(d, a.b), vert(d, b.a), vert(d, b.b))) n++;
  }
  return n;
};
function quality(d) {
  let pen = 0; const es = d.edges, isx = e => vert(d, e.a).kind === 'ext' || vert(d, e.b).kind === 'ext';
  for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
    const a = es[i], b = es[j];
    if (a.a === b.a || a.a === b.b || a.b === b.a || a.b === b.b) continue;
    if (segX(vert(d, a.a), vert(d, a.b), vert(d, b.a), vert(d, b.b))) pen += (isx(a) || isx(b)) ? 1500 : 1000;
  }
  const vs = d.verts;
  for (let i = 0; i < vs.length; i++) for (let j = i + 1; j < vs.length; j++) { const g = Math.hypot(vs[i].x - vs[j].x, vs[i].y - vs[j].y); if (g < 30) pen += (30 - g) * 8; }
  vs.forEach(v => d.edges.forEach(e => {
    if (e.a === v.id || e.b === v.id) return;
    const a = vert(d, e.a), b = vert(d, e.b), s = distSeg(v.x, v.y, a.x, a.y, b.x, b.y);
    if (s.d < 18) pen += (18 - s.d) * 20;
  }));
  return pen;
}
// returns the number of crossings left in the chosen layout
FV.layoutDiag = function (d) {
  placeExternals(d); seedInternal(d);
  const rand = rng(d.nid * 7919 + d.edges.length), base = d.verts.map(v => [v.x, v.y]);
  let best = null, bestQ = Infinity;
  for (let k = 0; k < 14; k++) {
    d.verts.forEach((v, i) => {
      if (v.fixed) return;
      v.x = base[i][0] + (k ? (rand() - .5) * 90 : 0); v.y = base[i][1] + (k ? (rand() - .5) * 90 : 0);
    });
    relax(d, 260, k ? 22 : 9);
    const q = quality(d);
    if (q < bestQ) { bestQ = q; best = d.verts.map(v => [v.x, v.y]); }
    if (bestQ < 1) break;
  }
  d.verts.forEach((v, i) => { v.x = best[i][0]; v.y = best[i][1]; });
  return FV.crossings(d);
};
})();
(function () {
'use strict';
const W = FV.W, H = FV.H, P = FV.P, vert = FV.vert;
const r1 = x => Math.round(x * 10) / 10;

function centerline(A, B, c) {
  const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const cx = (A.x + B.x) / 2 + nx * 2 * c, cy = (A.y + B.y) / 2 + ny * 2 * c, N = 90, raw = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, u = 1 - t;
    raw.push({ x: u * u * A.x + 2 * u * t * cx + t * t * B.x, y: u * u * A.y + 2 * u * t * cy + t * t * B.y });
  }
  const cum = [0];
  for (let i = 1; i <= N; i++) cum.push(cum[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
  const len = cum[N], M = Math.max(8, Math.ceil(len / 1.5)), pts = [];
  let j = 0;
  for (let i = 0; i <= M; i++) {
    const s = len * i / M;
    while (j < N - 1 && cum[j + 1] < s) j++;
    const f = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    pts.push({ x: raw[j].x + (raw[j + 1].x - raw[j].x) * f, y: raw[j].y + (raw[j + 1].y - raw[j].y) * f, s });
  }
  return { pts: setTangents(pts), len };
}
function setTangents(pts) {
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x, ty = b.y - a.y, l = Math.hypot(tx, ty) || 1;
    pts[i].tx = tx / l; pts[i].ty = ty / l; pts[i].nx = -ty / l; pts[i].ny = tx / l;
  }
  return pts;
}
function kindOf(pid) {
  const p = P[pid];
  if (p.fermion) return 'fermion';
  if (p.ghost) return 'ghost';
  return { gamma: 'photon', Z: 'zboson', 'W+': 'wboson', 'W-': 'wboson', g: 'gluon', H: 'higgs' }[pid];
}
FV.kindOf = kindOf;
function pathD(pts, step) {
  let d = '';
  for (let i = 0; i < pts.length; i += step) d += (i ? 'L' : 'M') + r1(pts[i].x) + ' ' + r1(pts[i].y);
  const l = pts[pts.length - 1];
  return d + 'L' + r1(l.x) + ' ' + r1(l.y);
}
function wavy(c) {
  const n = Math.max(2, Math.round(c.len / 14)), out = [];
  c.pts.forEach(p => {
    const o = 4.4 * Math.sin(2 * Math.PI * n * p.s / c.len);
    out.push({ x: p.x + p.nx * o, y: p.y + p.ny * o });
  });
  return out;
}
function coil(c) {
  const n = Math.max(3, Math.round(c.len / 15)), lam = c.len / n, d = 5.2, out = [];
  c.pts.forEach(p => {
    const phi = 2 * Math.PI * p.s / lam, w = Math.min(1, p.s / 14, (c.len - p.s) / 14);
    const a = -d * Math.sin(phi) * w, b = -d * Math.cos(phi) * w;
    out.push({ x: p.x + p.tx * a + p.nx * b, y: p.y + p.ny * b + p.ty * a });
  });
  return out;
}
function arrowAt(c, forward, f) {
  const p = c.pts[Math.floor(c.pts.length * f)], sg = forward ? 1 : -1;
  const tx = p.tx * sg, ty = p.ty * sg, nx = -ty, ny = tx;
  const pt = (a, b) => r1(p.x + tx * a + nx * b) + ',' + r1(p.y + ty * a + ny * b);
  return '<polygon class="arw" points="' + pt(6, 0) + ' ' + pt(-4, 4.6) + ' ' + pt(-4, -4.6) + '"/>';
}

// geometry for every edge: centerline, grouped by endpoints so parallel lines bow apart
function edgeGeom(d) {
  const groups = {};
  d.edges.forEach(e => { const k = e.a < e.b ? e.a + '|' + e.b : e.b + '|' + e.a; (groups[k] = groups[k] || []).push(e); });
  const geo = {};
  Object.keys(groups).forEach(k => {
    const es = groups[k], ca = k.split('|')[0], cb = k.split('|')[1], A = vert(d, ca), B = vert(d, cb);
    const chord = Math.hypot(B.x - A.x, B.y - A.y);
    es.forEach((e, i) => {
      const off = es.length === 1 ? 0 : (i - (es.length - 1) / 2) * 2 * Math.max(0.46 * chord, 18);
      let c = centerline(A, B, off);
      if (e.a !== ca) { c.pts.reverse(); c.pts.forEach((p, ii) => p.s = c.len - p.s); c.pts = setTangents(c.pts); }
      geo[e.id] = Object.assign(c, { off, flip: e.a !== ca });
    });
  });
  return geo;
}
FV.edgeGeom = edgeGeom;

FV.renderSVG = function (d, opt) {
  opt = opt || {};
  const geo = edgeGeom(d), hl = opt.highlight || { verts: [], edges: [] }, thumb = !!opt.thumb;
  const inner = d.verts.filter(v => v.kind === 'v');
  const cx = inner.length ? inner.reduce((s, v) => s + v.x, 0) / inner.length : W / 2, cy = inner.length ? inner.reduce((s, v) => s + v.y, 0) / inner.length : H / 2;
  let under = '', lines = '', marks = '', labels = '', hits = '';
  d.edges.forEach(e => {
    const c = geo[e.id], kind = kindOf(FV.flowId(e.p)), A = vert(d, e.a), B = vert(d, e.b);
    const isExt = A.kind === 'ext' || B.kind === 'ext', loopy = e.lids.length > 0 && !isExt;
    let dstr, extra = '';
    if (kind === 'photon' || kind === 'zboson' || kind === 'wboson') dstr = pathD(wavy(c), 2);
    else if (kind === 'gluon') dstr = pathD(coil(c), 1);
    else dstr = pathD(c.pts, 4);
    const st = opt.edgeStyle ? opt.edgeStyle(e, kind) : null;
    lines += '<path class="ln ' + kind + '"' + (st && st.stroke ? ' style="stroke:' + st.stroke + '"' : '') + ' d="' + dstr + '"/>';
    if (st && st.stroke2) lines += '<path class="ln ' + kind + ' two" style="stroke:' + st.stroke2 + ';stroke-dasharray:6 6" d="' + dstr + '"/>';
    if (kind === 'fermion' || kind === 'ghost') lines += arrowAt(c, !P[e.p].isAnti, 0.5).replace('<polygon class="arw"', '<polygon class="arw"' + (st && st.stroke ? ' style="fill:' + st.stroke + '"' : ''));
    if (hl.edges.includes(e.id)) under += '<path class="hl-edge" d="' + pathD(c.pts, 4) + '"/>';
    hits += '<path class="hit" data-e="' + e.id + '" d="' + pathD(c.pts, 6) + '"/>';
    if (c.len < 34 || thumb) return;
    const mid = c.pts[Math.floor(c.pts.length / 2)];
    const side = ((mid.x - cx) * mid.nx + (mid.y - cy) * mid.ny) >= 0 ? 1 : -1;
    // A charged boson is labelled by the charge it carries forward in time (left to right).
    let lid = kind === 'fermion' || kind === 'ghost' ? FV.flowId(e.p) : e.p;
    if (!(kind === 'fermion' || kind === 'ghost') && P[e.p].anti !== e.p && A.x > B.x + 6) lid = P[e.p].anti;
    if (isExt) return;
    const tag = st && st.tag ? '<tspan dx="2" font-size="0.78em" font-style="normal" font-weight="700" fill="' + st.tagFill + '">' + st.tag + '</tspan>' : '';
    labels += '<text class="lbl" x="' + r1(mid.x + mid.nx * side * 17) + '" y="' + r1(mid.y + mid.ny * side * 17) + '" text-anchor="middle" dominant-baseline="central">' + FV.labSVG(lid) + tag + '</text>';
  });
  d.verts.forEach(v => {
    if (v.kind === 'ext') {
      const left = v.side === 'in';
      if (v.extra && !thumb) under += '<circle class="xtra-ring" cx="' + (left ? v.x - 26 : v.x + 26) + '" cy="' + r1(v.y) + '" r="19"/>';
      if (!thumb) labels += '<text class="lbl ext' + (v.extra ? ' xtra' : '') + '" x="' + (left ? v.x - 12 : v.x + 12) + '" y="' + r1(v.y) + '" text-anchor="' + (left ? 'end' : 'start') + '" dominant-baseline="central">' + FV.labSVG(v.pid) + (opt.extTag ? opt.extTag(v) : '') + '</text>';
      return;
    }
    if (v.ct) marks += '<g class="ct" transform="translate(' + r1(v.x) + ' ' + r1(v.y) + ')"><circle r="7"/><path d="M-4.9 -4.9L4.9 4.9M-4.9 4.9L4.9 -4.9"/></g>';
    else marks += '<circle class="vx" cx="' + r1(v.x) + '" cy="' + r1(v.y) + '" r="3.8"/>';
    if (hl.verts.includes(v.id)) under += '<circle class="hl-vx" cx="' + r1(v.x) + '" cy="' + r1(v.y) + '" r="15"/>';
    hits += '<circle class="hit-v" data-v="' + v.id + '" cx="' + r1(v.x) + '" cy="' + r1(v.y) + '" r="13"/>';
  });
  let y0 = 1e9, y1 = -1e9;
  Object.keys(geo).forEach(k => geo[k].pts.forEach(p => { if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }));
  d.verts.forEach(v => { if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; });
  const top = Math.round(y0 - 54), bot = Math.round(y1 + (thumb ? 40 : 78)), vbh = Math.max(thumb ? 190 : 270, bot - top), vt = Math.round((top + bot) / 2 - vbh / 2), ay = vt + vbh - 22;
  const axis = thumb ? '' : '<g class="axis"><path d="M' + (W / 2 - 46) + ' ' + ay + 'L' + (W / 2 + 40) + ' ' + ay + '"/><path d="M' + (W / 2 + 40) + ' ' + ay + 'l-6 -3.5v7z"/><text x="' + (W / 2 - 54) + '" y="' + ay + '" text-anchor="end" dominant-baseline="central">time</text></g>';
  const over = opt.overlay ? opt.overlay(d) : '';
  return '<svg class="fd" viewBox="0 ' + vt + ' ' + W + ' ' + vbh + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Feynman diagram">' + axis + under + lines + over + marks + labels + hits + '</svg>';
};

// ---- hover content ------------------------------------------------------------------------------
const ELE = (cls, html) => '<div class="' + cls + '">' + html + '</div>';
function plist(params) {
  return '<table class="pt">' + params.map(p => '<tr><td>' + p[0] + '</td><td>=</td><td>' + p[1] + '</td></tr>').join('') + '</table>';
}
FV.tipVertex = function (d, vid) {
  const v = vert(d, vid);
  if (v.kind === 'ext') {
    const p = P[v.pid], inc = v.side === 'in';
    let w;
    if (p.fermion) w = inc ? (p.isAnti ? 'v̄(p)' : 'u(p)') : (p.isAnti ? 'v(p)' : 'ū(p)');
    else if (p.ghost) w = '1';
    else if (p.kind === 'higgs') w = '1';
    else w = inc ? 'ε<sub>μ</sub>(p)' : 'ε<sub>μ</sub>*(p)';
    return ELE('t-h', (inc ? 'Incoming ' : 'Outgoing ') + '<b>' + FV.labHTML(v.pid) + '</b>') + ELE('t-rule', 'wavefunction factor ' + w) +
      ELE('t-n', 'mass ' + FV.fmt(p.m) + ' GeV, charge ' + FV.qs(p.Q) + (p.fermion ? ', spin ½ (2 helicities)' : p.kind === 'higgs' ? ', spin 0' : p.m > 0 ? ', spin 1 (3 polarizations)' : ', spin 1 (2 polarizations)'));
  }
  const loops = d.loops.filter(L => L.verts.includes(vid) || v.lids.includes(L.id));
  const lt = loops.length ? ELE('t-n', 'belongs to loop' + (loops.length > 1 ? 's ' : ' ') + loops.map(L => L.id).join(', ')) : '';
  if (v.ct) {
    const src = d.ctLoop ? FV.ctInfo(d, d.ctLoop) : null;
    return ELE('t-h', '<b>Counterterm vertex</b> ⊗') + (src ? ELE('t-rule', src.rule) + src.exprs.map(x => ELE('t-n', x)).join('') : '');
  }
  const info = FV.vinfo(d, v);
  if (!info) return ELE('t-h', 'Vertex') + ELE('t-n', 'no tabulated coupling');
  return ELE('t-h', '<b>' + FV.vname(info.legs) + '</b><span class="chip">' + FV.vgroupLabel(info.group) + '</span>') +
    ELE('t-rule', info.rule) + plist(info.params) + (info.note ? ELE('t-n', info.note) : '') + lt;
};
FV.tipEdge = function (d, eid) {
  const e = FV.edgeOf(d, eid), A = vert(d, e.a), B = vert(d, e.b), id = FV.flowId(e.p), p = P[id], ext = A.kind === 'ext' || B.kind === 'ext';
  if (ext) return FV.tipVertex(d, A.kind === 'ext' ? A.id : B.id);
  const m = p.m, M = FV.fmt(m);
  let rule;
  if (p.fermion) rule = m > 0 ? 'i(p̸ + m) / (p² − m² + iε)' : 'i p̸ / (p² + iε)';
  else if (p.ghost) rule = 'i δ<sup>ab</sup> / (p² + iε)';
  else if (id === 'gamma') rule = '−i g<sub>μν</sub> / (q² + iε)';
  else if (id === 'g') rule = '−i g<sub>μν</sub> δ<sup>ab</sup> / (k² + iε)';
  else if (p.kind === 'higgs') rule = 'i / (q² − M<sub>H</sub>² + iε)';
  else rule = '−i (g<sub>μν</sub> − q<sub>μ</sub>q<sub>ν</sub>/M²) / (q² − M² + iε)';
  const lp = d.loops.find(L => L.edges.includes(eid) || e.lids.includes(L.id));
  const tag = lp ? ELE('t-n', 'inside loop ' + lp.id + ': carries the loop momentum k, with ∫ d⁴k/(2π)⁴' + (lp.fermionLoop && p.fermion ? ' and a factor (−1) for the closed fermion loop' : '')) : '';
  const gauge = (id === 'gamma' || id === 'g') ? 'Feynman gauge' : (p.kind === 'gauge' ? 'unitary gauge' : '');
  return ELE('t-h', '<b>' + FV.labHTML(id) + '</b> propagator' + (gauge ? '<span class="chip">' + gauge + '</span>' : '')) + ELE('t-rule', rule) +
    ELE('t-n', (m > 0 ? 'mass ' + M + ' GeV' : 'massless') + (p.fermion ? ', fermion-number arrow shown' : '')) + tag;
};
})();

export { FV };
export default FV;
