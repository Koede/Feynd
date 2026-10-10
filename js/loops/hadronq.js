// js/loops/hadronq.js
// Quark-level Feynman diagrams for processes that involve hadrons, built from the
// Feynman rules rather than drawn from a template.
//
// A hadron is replaced by its valence quarks. Quarks that pass through unchanged are
// spectators; the rest (the active quarks, plus every lepton and boson in the process)
// are handed to the same rule-based tree generator used for elementary processes, so
// the mediators come out of the vertex table: s -> u W-, W- -> d u-bar for Omega- ->
// Lambda K-, and so on. Spectators are drawn as straight lines, and the quarks that
// belong to one hadron are grouped by a brace carrying its name.
//
// The generator is asked for the largest set of spectators first, and the number of
// spectators is reduced only when no diagram exists. Extra quark pairs (the d d-bar of
// Sigma+ -> n pi+) therefore appear only when the rules require a gluon to make them.

import { HADRONS } from '../hadrons.js';
import { FV } from './engine.js';
import { toEngineId } from './symbols.js';
import { colourSetup, solveColour, fixExternal, extVars, singletChip, ANTIHUE, HUE } from './color.js';

const DEFAULT_BUDGET_MS = 2500, DEFAULT_MAX_LEGS = 8;

export const isHadronSymbol = s => Object.prototype.hasOwnProperty.call(HADRONS, s);

// pi0 and eta are flavour superpositions: any of the listed components can be used.
const NEUTRAL = {
    'π⁰': [['u', 'ū'], ['d', 'd̄']],
    'η': [['u', 'ū'], ['d', 'd̄'], ['s', 's̄']]
};

function quarkChoices(sym) {
    const h = HADRONS[sym];
    if (h.quarks) return [h.quarks];
    return NEUTRAL[sym] || [];
}

function product(lists) {
    return lists.reduce((acc, l) => acc.flatMap(a => l.map(x => a.concat([x]))), [[]]);
}

function subMultisets(common, k) {
    const keys = Object.keys(common), out = [];
    (function rec(i, left, cur) {
        if (i === keys.length) { if (left === 0) out.push({ ...cur }); return; }
        const key = keys[i];
        for (let n = Math.min(common[key], left); n >= 0; n--) { cur[key] = n; rec(i + 1, left - n, cur); }
        cur[key] = 0;
    })(0, k, {});
    return out;
}

function perms(a) {
    if (a.length <= 1) return [a.slice()];
    const r = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p))));
    return r;
}

/**
 * Every way to cut a top-to-bottom sequence of legs into hadron blocks.
 * items: [{ f }] where f is a quark flavour id or null for a non-quark leg.
 * needs: [{ gid, flavours: [...] }]. Returns arrays of {gid, from, to}.
 */
function cutBlocksAll(items, needs, cap = 24) {
    const out = [], used = new Set(), blocks = [];
    (function rec(i) {
        if (out.length >= cap) return;
        while (i < items.length && items[i].f === null) i++;
        if (i >= items.length) { if (used.size === needs.length) out.push(blocks.slice()); return; }
        for (let h = 0; h < needs.length; h++) {
            if (used.has(h)) continue;
            const n = needs[h].flavours.length;
            if (i + n > items.length) continue;
            const seg = items.slice(i, i + n);
            if (seg.some(s => s.f === null)) continue;
            if (seg.map(s => s.f).sort().join() !== needs[h].flavours.slice().sort().join()) continue;
            used.add(h); blocks.push({ gid: needs[h].gid, from: i, to: i + n - 1 });
            rec(i + n);
            used.delete(h); blocks.pop();
        }
    })(0);
    return out;
}

/** Brace path, opening toward dir (+1 right, -1 left), spine at x spanning y0..y1. */
function bracePath(x, y0, y1, dir) {
    const mid = (y0 + y1) / 2, depth = 8, cusp = depth * 1.6, f = n => Math.round(n * 10) / 10;
    return `M${f(x)} ${f(y0)}Q${f(x + dir * depth)} ${f(y0)} ${f(x + dir * depth)} ${f((y0 + mid) / 2)}`
        + `Q${f(x + dir * depth)} ${f(mid)} ${f(x + dir * cusp)} ${f(mid)}`
        + `Q${f(x + dir * depth)} ${f(mid)} ${f(x + dir * depth)} ${f((mid + y1) / 2)}`
        + `Q${f(x + dir * depth)} ${f(y1)} ${f(x)} ${f(y1)}`;
}

/**
 * Builds the quark-level diagram for initial -> final (site symbols).
 *   hint:    mediator symbol ('γ' or 'Z⁰') to prefer when several diagrams exist
 *   colours: { initial: [...], final: [...] } colour choices aligned with the symbols,
 *            or null to let the solver pick (hadrons always stay colour singlets)
 * Returns { diagram, ini, fin, spectators, strength } or null when the rules give no
 * diagram. The diagram carries d.colour = { sol } and d.hadronMeta for the braces.
 */
export function hadronDiagram(initial, final, opts = {}) {
    if (typeof opts === 'string' || opts === null) opts = { hint: opts };
    const { hint = null, colours = null, budgetMs = DEFAULT_BUDGET_MS, maxLegs = DEFAULT_MAX_LEGS } = opts;
    const hasHadron = initial.concat(final).some(isHadronSymbol);
    if (!hasHadron) return null;

    const otherIn = [], otherOut = [], otherInSpec = [], otherOutSpec = [];
    initial.forEach((s, i) => { if (!isHadronSymbol(s)) { otherIn.push(toEngineId(s)); otherInSpec.push(colours ? colours.initial[i] : null); } });
    final.forEach((s, i) => { if (!isHadronSymbol(s)) { otherOut.push(toEngineId(s)); otherOutSpec.push(colours ? colours.final[i] : null); } });
    if (otherIn.concat(otherOut).some(x => !x)) return null;

    const inIdx = initial.map((s, i) => i).filter(i => isHadronSymbol(initial[i]));
    const outIdx = final.map((s, i) => i).filter(i => isHadronSymbol(final[i]));
    const inHad = inIdx.map(i => initial[i]), outHad = outIdx.map(i => final[i]);
    const inHadSpec = inIdx.map(i => colours ? colours.initial[i] : null), outHadSpec = outIdx.map(i => colours ? colours.final[i] : null);
    const inOpts = inHad.map(quarkChoices), outOpts = outHad.map(quarkChoices);
    if (inOpts.some(o => !o.length) || outOpts.some(o => !o.length)) return null;

    let best = null;
    const budget = { until: Date.now() + budgetMs };
    const env = { inHad, outHad, otherIn, otherOut, hint, maxLegs, budget, inHadSpec, outHadSpec, otherInSpec, otherOutSpec };
    for (const inPick of product(inOpts)) for (const outPick of product(outOpts)) {
        if (Date.now() > budget.until && best) break;
        const cand = searchSpectators(env, inPick, outPick, best ? best.k : 0);
        if (cand && (!best || cand.k > best.k || (cand.k === best.k && cand.strength > best.strength))) best = cand;
    }
    return best;
}

function quarkIds(list) { return list.map(q => toEngineId(q)); }

function searchSpectators(env, inPick, outPick, minK) {
    const inQ = [], outQ = [];
    inPick.forEach((qs, gid) => quarkIds(qs).forEach(f => inQ.push({ f, gid })));
    outPick.forEach((qs, gid) => quarkIds(qs).forEach(f => outQ.push({ f, gid })));
    const cnt = (arr) => arr.reduce((m, q) => (m[q.f] = (m[q.f] || 0) + 1, m), {});
    const ci = cnt(inQ), co = cnt(outQ), common = {};
    Object.keys(ci).forEach(f => { if (co[f]) common[f] = Math.min(ci[f], co[f]); });
    const total = Object.values(common).reduce((a, b) => a + b, 0);
    const needs = (picks) => picks.map((qs, gid) => ({ gid, flavours: quarkIds(qs) }));
    const inNeeds = needs(inPick), outNeeds = needs(outPick);

    for (let k = total; k >= minK; k--) {
        let found = null;
        for (const S of subMultisets(common, k)) {
            if (found && Date.now() > env.budget.until) break;
            const specFlav = [];
            Object.keys(S).forEach(f => { for (let i = 0; i < S[f]; i++) specFlav.push(f); });
            const strip = (arr) => {
                const l = { ...S }, act = [];
                arr.forEach(q => { if (l[q.f] > 0) l[q.f]--; else act.push(q.f); });
                return act;
            };
            const ini = strip(inQ).concat(env.otherIn), fin = strip(outQ).concat(env.otherOut);
            if (ini.length < 1 || fin.length < 1 || ini.length + fin.length < 3 || ini.length + fin.length > env.maxLegs) continue;
            const res = FV.generate(ini, fin);
            if (!res.bases.length || res.kind !== 'tree') continue;
            const nActIn = ini.length - env.otherIn.length, nActOut = fin.length - env.otherOut.length;
            const ctx = { ini, fin, nActIn, nActOut, specFlav, inNeeds, outNeeds, inPick, outPick, env };
            const built = layoutWithSpectators(res.bases, ctx);
            if (built && (!found || built.strength > found.strength)) found = built;
        }
        if (found) { found.k = k; found.spectators = k; return found; }
    }
    return null;
}

/** Every way to put the spectators on the top or bottom edge, in order. */
function spectatorArrangements(specFlav) {
    const out = [], seen = new Set(), n = specFlav.length;
    for (let mask = 0; mask < (1 << n); mask++) {
        const top = [], bot = [];
        specFlav.forEach((f, i) => ((mask >> i) & 1 ? top : bot).push(f));
        for (const t of perms(top)) for (const b of perms(bot)) {
            const key = t.join() + '|' + b.join();
            if (!seen.has(key)) { seen.add(key); out.push({ T: t, B: b }); }
        }
    }
    return out;
}

/** All arrangements of spectators and hadron blocks compatible with the order (pi, po). */
function arrangements(ctx, pi, po, cap = 64) {
    const legF = (idx) => {
        const act = idx < ctx.ini.length ? (idx < ctx.nActIn) : ((idx - ctx.ini.length) < ctx.nActOut);
        return act ? ctx.ini.concat(ctx.fin)[idx] : null;
    };
    const item = (f) => ({ f });
    const out = [];
    for (const arr of spectatorArrangements(ctx.specFlav)) {
        const seqL = arr.T.map(item).concat(pi.map(i => item(legF(i))), arr.B.map(item));
        const cutsL = cutBlocksAll(seqL, ctx.inNeeds);
        if (!cutsL.length) continue;
        const seqR = arr.T.map(item).concat(po.map(i => item(legF(i))), arr.B.map(item));
        const cutsR = cutBlocksAll(seqR, ctx.outNeeds);
        for (const bl of cutsL) for (const br of cutsR) { out.push({ arr, blocksL: bl, blocksR: br }); if (out.length >= cap) return out; }
    }
    return out;
}

function layoutWithSpectators(bases, ctx) {
    const env = ctx.env;
    let order = bases.map((b, i) => i);
    if (env.hint) {
        const want = toEngineId(env.hint);
        const has = b => b.edges.some(e => FV.isInternal(b, e) && (e.p === want || FV.P[e.p].anti === want));
        order = order.filter(i => has(bases[i])).concat(order.filter(i => !has(bases[i])));
    }
    const PAD = 128, STEP = 46;
    for (const bi of order.slice(0, 12)) {
        if (Date.now() > env.budget.until) break;
        const d0 = FV.cloneDiag(bases[bi]);
        d0.extPad = PAD;
        d0.orderOK = (pi, po) => arrangements(ctx, pi, po, 1).length > 0;
        FV.orderExternals(d0);
        delete d0.orderOK;
        const bySlot = (side) => d0.verts.filter(v => v.kind === 'ext' && v.side === side).sort((a, b) => a.slot - b.slot).map(v => v.extIdx);
        const pi = bySlot('in'), po = bySlot('out');
        const choices = arrangements(ctx, pi, po);
        if (!choices.length) continue;
        FV.layoutDiag(d0);
        for (const choice of choices) {
            const d = FV.cloneDiag(d0);
            const ys = d.verts.map(v => v.y);
            const yTop = Math.min(...ys) - 56, yBot = Math.max(...ys) + 56;
            const { T, B } = choice.arr;
            const yT = T.map((f, j) => yTop - (T.length - 1 - j) * STEP);
            const yB = B.map((f, j) => yBot + j * STEP);
            let sid = 0;
            const idsT = [], idsB = [];
            const addSpec = (f, y, bucket) => {
                sid++;
                d.verts.push({ id: 'sa' + sid, kind: 'ext', side: 'in', pid: f, extIdx: -sid, x: PAD, y, fixed: true, spectator: true, lids: [] });
                d.verts.push({ id: 'sb' + sid, kind: 'ext', side: 'out', pid: f, extIdx: -sid - 100, x: FV.W - PAD, y, fixed: true, spectator: true, lids: [] });
                d.edges.push({ id: 'sp' + sid, a: 'sa' + sid, b: 'sb' + sid, p: f, lids: [], spectator: true });
                bucket.push(sid);
            };
            T.forEach((f, j) => addSpec(f, yT[j], idsT));
            B.forEach((f, j) => addSpec(f, yB[j], idsB));
            const extOf = (side, idx) => d.verts.find(v => v.kind === 'ext' && v.side === side && v.extIdx === idx);
            const idsL = idsT.map(k => 'sa' + k).concat(pi.map(i => extOf('in', i).id), idsB.map(k => 'sa' + k));
            const idsR = idsT.map(k => 'sb' + k).concat(po.map(i => extOf('out', i).id), idsB.map(k => 'sb' + k));
            const yL = yT.concat(pi.map(i => extOf('in', i).y), yB);
            const yR = yT.concat(po.map(i => extOf('out', i).y), yB);
            d.hadronMeta = { blocksL: choice.blocksL, blocksR: choice.blocksR, yL, yR, idsL, idsR, inHad: env.inHad, outHad: env.outHad, pad: PAD };
            const sol = colourFor(d, ctx);
            if (!sol) continue;
            d.colour = { sol };
            d.kind = 'hadron';
            d.label = 'Quark level';
            return { diagram: d, ini: ctx.ini, fin: ctx.fin, strength: bases[bi].strength || 0 };
        }
    }
    return null;
}

/**
 * Colour assignment for a hadron diagram: every hadron is a colour singlet, and the
 * user's colour choices (if any) are honoured. Constituents of the same flavour are
 * interchangeable, so each hadron's colours are tried in every matching order.
 */
function colourFor(d, ctx) {
    const env = ctx.env, setup = colourSetup(d), m = d.hadronMeta;
    const groups = [];
    const legGroups = [];   // { ids, flavours (engine ids), spec, side, hadron }
    m.blocksL.forEach(b => legGroups.push({ ids: m.idsL.slice(b.from, b.to + 1), spec: env.inHadSpec[b.gid], picks: quarkIds(ctx.inPick[b.gid]), side: 'in', had: env.inHad[b.gid] }));
    m.blocksR.forEach(b => legGroups.push({ ids: m.idsR.slice(b.from, b.to + 1), spec: env.outHadSpec[b.gid], picks: quarkIds(ctx.outPick[b.gid]), side: 'out', had: env.outHad[b.gid] }));
    legGroups.forEach(g => {
        const vars = g.ids.map(id => { const xv = extVars(d, setup, id); return xv ? xv.q : undefined; }).filter(v => v !== undefined);
        if (vars.length === g.ids.length) groups.push({ kind: vars.length === 2 ? 'meson' : 'baryon', vars });
    });
    // fixed colours of free (non-hadron) coloured particles
    const base = {};
    const nActIn = ctx.nActIn, nActOut = ctx.nActOut;
    d.verts.filter(v => v.kind === 'ext' && v.extIdx >= 0).forEach(v => {
        const i = v.extIdx, nIn = ctx.ini.length;
        if (v.side === 'in' && i >= nActIn) fixExternal(base, d, setup, v.id, env.otherInSpec[i - nActIn], true);
        if (v.side === 'out' && i - nIn >= nActOut) fixExternal(base, d, setup, v.id, env.otherOutSpec[i - nIn - nActOut], false);
    });
    // each hadron with chosen colours: try the constituent orders that match the legs' flavours
    const options = legGroups.map(g => {
        if (!g.spec || !g.spec.q) return [{}];
        const pidOf = id => d.verts.find(v => v.id === id).pid;
        const legsFl = g.ids.map(pidOf);
        const res = [];
        perms(g.picks.map((_, i) => i)).forEach(pm => {
            if (!pm.every((ci, li) => g.picks[ci] === legsFl[li])) return;
            const fx = {};
            pm.forEach((ci, li) => { const xv = extVars(d, setup, g.ids[li]); if (xv && xv.q !== undefined) fx[xv.q] = g.spec.q[ci]; });
            res.push(fx);
        });
        return res.length ? res : [];
    });
    if (options.some(o => !o.length)) return null;
    for (const combo of product(options)) {
        const fixed = Object.assign({}, base, ...combo);
        const sol = solveColour(d, setup, { fixed, groups });
        if (sol) return sol;
    }
    return null;
}

const BLUE = '#1f5e8e';
/** Braces with hadron names (and, in colour mode, the additive colour chip). */
export function braceOverlay(d, withColour = false) {
    const m = d.hadronMeta;
    if (!m) return '';
    let out = '';
    const sol = withColour && d.colour && d.colour.sol;
    const setup = sol ? colourSetup(d) : null;
    const draw = (blocks, ys, ids, names, side) => {
        for (const b of blocks) {
            const y0 = ys[b.from] - 17, y1 = ys[b.to] + 17, mid = (y0 + y1) / 2;
            const dir = side === 'L' ? -1 : 1;
            const x = side === 'L' ? m.pad - 38 : FV.W - m.pad + 38;
            const label = (HADRONS[names[b.gid]] && HADRONS[names[b.gid]].label) || names[b.gid];
            out += '<path d="' + bracePath(x, y0, y1, dir) + '" fill="none" stroke="' + BLUE + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>'
                + '<text class="hname" x="' + (x + dir * 24) + '" y="' + Math.round(mid) + '" text-anchor="' + (side === 'L' ? 'end' : 'start') + '" dominant-baseline="central" fill="' + BLUE + '">' + label + '</text>';
            if (sol) {
                const legs = ids.slice(b.from, b.to + 1);
                const cols = [], antis = [];
                legs.forEach(id => { const xv = extVars(d, setup, id); if (xv && xv.q !== undefined) { cols.push(sol.colourOf[xv.q]); antis.push(FV.P[d.verts.find(v => v.id === id).pid].isAnti); } });
                const cx = side === 'L' ? x + dir * 24 - 14 * String(label).length - 20 : x + dir * 24 + 14 * String(label).length + 20;
                out += singletChip(Math.round(cx), Math.round(mid), cols, antis);
            }
        }
    };
    draw(m.blocksL, m.yL, m.idsL || [], m.inHad, 'L');
    draw(m.blocksR, m.yR, m.idsR || [], m.outHad, 'R');
    return out;
}
