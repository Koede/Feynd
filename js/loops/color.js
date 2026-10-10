// js/loops/color.js
// Colour flow for any diagram the engine builds.
//
// Every quark line carries one colour index and every gluon (or ghost) line carries two:
// a colour and an anticolour. In the double-line ('t Hooft) picture each index is a
// directed line, and at a vertex every incoming line continues as exactly one outgoing
// line:
//   q q̄ g      the quark's line continues into the gluon, and the gluon's other line
//              continues into the other quark (T^a_ij = colour-flow δ_il δ_kj)
//   q q̄ γ/Z/W/H the quark's line passes straight through
//   g g g, g g g g, ghost ghost g   the lines join the gluons in one cycle (single traces
//              of the generators)
// Solving for the colours is a union-find problem over these choices. A gluon whose two
// lines turn out to be the same line couples only through the U(1) piece that the
// 1/N_c subtraction removes (Tr Tᵃ = 0), so such assignments are rejected.

import { FV } from './engine.js';

export const COLS = ['r', 'g', 'b'];
export const HUE = { r: '#d62828', g: '#23944a', b: '#1d5fd1' };
export const ANTIHUE = { r: '#0097a7', g: '#b5179e', b: '#c99400' };   // cyan, magenta, yellow
export const PURE = { r: '#ff0000', g: '#00ff00', b: '#0000ff' };
export const PUREANTI = { r: '#00ffff', g: '#ff00ff', b: '#ffff00' };
export const NAME = { r: 'red', g: 'green', b: 'blue' };
export const ANTINAME = { r: 'antired (cyan)', g: 'antigreen (magenta)', b: 'antiblue (yellow)' };
export const LETTER = { r: 'r', g: 'g', b: 'b' };
export const ANTILETTER = { r: 'r̄', g: 'ḡ', b: 'b̄' };
const NEUTRAL = '#8b969e';

const P = () => FV.P;
export function colourKind(pid) {
    const p = P()[pid];
    if (!p) return null;
    if (p.kind === 'quark') return 'q';
    if (pid === 'g' || (p.ghost && !p.ewGhost)) return 'a';
    return null;
}

function perms(a) {
    if (a.length <= 1) return [a.slice()];
    const r = [];
    a.forEach((x, i) => perms(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => r.push([x].concat(p))));
    return r;
}

/** Colour variables and the line ends at every vertex. */
export function colourSetup(d) {
    const vars = [], ev = {}, ends = new Map();
    d.verts.forEach(v => ends.set(v.id, { ins: [], outs: [] }));
    d.edges.forEach(e => {
        const k = colourKind(e.p);
        if (!k) return;
        if (k === 'q') {
            const i = vars.length; vars.push({ eid: e.id, role: 'q' }); ev[e.id] = { q: i };
            const forward = !P()[e.p].isAnti;          // a quark's colour line runs with the fermion arrow
            const from = forward ? e.a : e.b, to = forward ? e.b : e.a;
            ends.get(from).outs.push({ v: i, eid: e.id, k: 'q' });
            ends.get(to).ins.push({ v: i, eid: e.id, k: 'q' });
        } else {
            const x = vars.length; vars.push({ eid: e.id, role: 'x' });
            const y = vars.length; vars.push({ eid: e.id, role: 'y' });
            ev[e.id] = { x, y };
            ends.get(e.a).outs.push({ v: x, eid: e.id, k: 'a' }); ends.get(e.b).ins.push({ v: x, eid: e.id, k: 'a' });
            ends.get(e.b).outs.push({ v: y, eid: e.id, k: 'a' }); ends.get(e.a).ins.push({ v: y, eid: e.id, k: 'a' });
        }
    });
    return { vars, ev, ends };
}

function pairingOptions(at) {
    const { ins, outs } = at;
    if (ins.length !== outs.length) return [];
    if (!ins.length) return [[]];
    const qIn = ins.filter(x => x.k === 'q'), qOut = outs.filter(x => x.k === 'q');
    const aEdges = [...new Set(ins.filter(x => x.k === 'a').map(x => x.eid))];
    if (!aEdges.length) return perms(qOut).map(pm => qIn.map((x, i) => [x.v, pm[i].v]));
    if (qIn.length === 1 && qOut.length === 1 && aEdges.length === 1) {
        const gIn = ins.find(x => x.k === 'a'), gOut = outs.find(x => x.k === 'a');
        return [[[qIn[0].v, gOut.v], [gIn.v, qOut[0].v]]];
    }
    if (!qIn.length) {
        const inOf = eid => ins.find(x => x.k === 'a' && x.eid === eid), outOf = eid => outs.find(x => x.k === 'a' && x.eid === eid);
        const [first, ...rest] = aEdges;
        return perms(rest).map(pm => {
            const order = [first].concat(pm);
            return order.map((eid, i) => [inOf(eid).v, outOf(order[(i + 1) % order.length]).v]);
        });
    }
    return [];
}

/**
 * Finds a colour assignment.
 *   fixed:  { varIndex: 'r'|'g'|'b' }
 *   groups: [{ kind: 'meson'|'baryon', vars: [...] }] colour-singlet hadrons
 *   prefer: optional { varIndex: colour } soft choices for free lines
 * Returns null when colour conservation forbids the diagram.
 */
export function solveColour(d, setup, { fixed = {}, groups = [], prefer = {}, maxNodes = 40000 } = {}) {
    const { vars, ev, ends } = setup;
    const n = vars.length;
    const internal = d.verts.filter(v => v.kind !== 'ext');
    const opts = internal.map(v => ({ vid: v.id, list: pairingOptions(ends.get(v.id)) }));
    if (opts.some(o => !o.list.length)) return null;
    opts.sort((a, b) => a.list.length - b.list.length);
    const adjoint = d.edges.filter(e => ev[e.id] && ev[e.id].x !== undefined).map(e => ev[e.id]);
    let nodes = 0, result = null;

    const find = (par, i) => { while (par[i] !== i) i = par[i]; return i; };
    function consistent(par) {
        const seen = {};
        for (const k in fixed) { const r = find(par, +k); if (seen[r] && seen[r] !== fixed[k]) return false; seen[r] = fixed[k]; }
        for (const g of adjoint) if (find(par, g.x) === find(par, g.y)) return false;
        return true;
    }
    function finish(par, chosen) {
        const root = i => find(par, i);
        const col = {};
        for (const k in fixed) col[root(+k)] = fixed[k];
        const groupRoots = [...new Set(groups.flatMap(g => g.vars.map(root)))].filter(r => !col[r]);
        const okGroups = () => groups.every(g => {
            const cs = g.vars.map(v => col[root(v)]);
            if (cs.some(c => !c)) return true;
            if (g.kind === 'meson') return cs[0] === cs[1];
            return new Set(cs).size === cs.length;
        });
        const assign = (i) => {
            if (!okGroups()) return false;
            if (i === groupRoots.length) return true;
            const r = groupRoots[i];
            for (const c of COLS) { col[r] = c; if (assign(i + 1)) return true; }
            delete col[r];
            return false;
        };
        if (!assign(0)) return null;
        // remaining free lines: honour preferences, otherwise spread the colours
        const roots = [...new Set(vars.map((_, i) => root(i)))];
        let spin = 0;
        roots.forEach(r => {
            if (col[r]) return;
            const pv = Object.keys(prefer).find(k => root(+k) === r);
            col[r] = pv !== undefined ? prefer[pv] : COLS[spin++ % 3];
        });
        const colourOf = vars.map((_, i) => col[root(i)]);
        return { colourOf, ev, pairs: chosen, root: vars.map((_, i) => root(i)) };
    }
    function dfs(i, par, chosen) {
        if (result || ++nodes > maxNodes) return;
        if (i === opts.length) { const r = finish(par, chosen); if (r) result = r; return; }
        for (const option of opts[i].list) {
            const p2 = par.slice();
            option.forEach(([a, b]) => { const ra = find(p2, a), rb = find(p2, b); if (ra !== rb) p2[ra] = rb; });
            if (!consistent(p2)) continue;
            dfs(i + 1, p2, Object.assign({}, chosen, { [opts[i].vid]: option }));
            if (result) return;
        }
    }
    dfs(0, Array.from({ length: n }, (_, i) => i), {});
    return result;
}

/** The variables an external leg exposes: { q } for a quark, { inbound, outbound } for a gluon. */
export function extVars(d, setup, extVid) {
    const v = d.verts.find(x => x.id === extVid), e = d.edges.find(x => x.a === extVid || x.b === extVid);
    if (!v || !e || !setup.ev[e.id]) return null;
    const ev = setup.ev[e.id];
    if (ev.q !== undefined) return { q: ev.q };
    const at = setup.ends.get(extVid);
    // inbound: the line leaving the external vertex into the diagram; outbound: arriving
    return { inbound: at.outs[0].v, outbound: at.ins[0].v };
}

/**
 * Fixed colours for an external leg from a user's choice.
 *   quark or antiquark: spec { q } (an antiquark's spec is its anticolour)
 *   gluon: spec { c, a } colour and anticolour
 */
export function fixExternal(fixed, d, setup, extVid, spec, isInitial) {
    const xv = extVars(d, setup, extVid);
    if (!xv || !spec) return fixed;
    if (xv.q !== undefined && spec.q) fixed[xv.q] = spec.q;
    else if (xv.inbound !== undefined && spec.c && spec.a) {
        // an incoming gluon brings its colour in; an outgoing gluon takes its colour out
        if (isInitial) { fixed[xv.inbound] = spec.c; fixed[xv.outbound] = spec.a; }
        else { fixed[xv.outbound] = spec.c; fixed[xv.inbound] = spec.a; }
    }
    return fixed;
}

/** What colour an external leg ended up with, in the user's terms. */
export function extColour(d, setup, sol, extVid, isInitial) {
    const xv = extVars(d, setup, extVid);
    if (!xv || !sol) return null;
    if (xv.q !== undefined) return { q: sol.colourOf[xv.q] };
    return isInitial ? { c: sol.colourOf[xv.inbound], a: sol.colourOf[xv.outbound] } : { c: sol.colourOf[xv.outbound], a: sol.colourOf[xv.inbound] };
}

// ------------------------------------------------------------------ drawing

const isExt = (d, id) => { const v = d.verts.find(x => x.id === id); return v && v.kind === 'ext'; };
const vtx = (d, id) => d.verts.find(x => x.id === id);

/** Styles for FV.renderSVG: quark lines in their colour, antiquarks in the anticolour, gluons two-tone. */
export function colourEdgeStyle(d, setup, sol) {
    return (e, kind) => {
        const ev = setup.ev[e.id];
        if (!ev) return { stroke: NEUTRAL };
        const A = vtx(d, e.a), B = vtx(d, e.b);
        if (ev.q !== undefined) {
            const c = sol.colourOf[ev.q], forward = !P()[e.p].isAnti;
            const tail = forward ? A : B, head = forward ? B : A;
            const quarkForward = head.x >= tail.x - 1;
            return { stroke: quarkForward ? HUE[c] : ANTIHUE[c], tag: quarkForward ? LETTER[c] : ANTILETTER[c], tagFill: quarkForward ? HUE[c] : ANTIHUE[c] };
        }
        const x = sol.colourOf[ev.x], y = sol.colourOf[ev.y];
        const fwd = B.x >= A.x;
        const c = fwd ? x : y, a = fwd ? y : x;
        return { stroke: HUE[c], stroke2: ANTIHUE[a], tag: '(' + LETTER[c] + ANTILETTER[a] + ')', tagFill: HUE[c] };
    };
}

/** Text describing the colour bookkeeping at one vertex, for the hover card. */
export function colourVertexNote(d, setup, sol, vid) {
    const pairs = sol.pairs[vid];
    if (!pairs || !pairs.length) return '';
    const who = (vi) => {
        const e = d.edges.find(x => x.id === setup.vars[vi].eid);
        return FV.labHTML(FV.flowId(e.p));
    };
    const items = pairs.map(([a, b]) => {
        const c = sol.colourOf[a];
        return '<span style="color:' + HUE[c] + ';font-weight:600">' + NAME[c] + '</span> line: ' + who(a) + ' → ' + who(b);
    });
    return '<div class="t-n"><b>Colour flow</b>: ' + items.join(' · ') + '. Each line keeps its colour through the vertex, so colour is conserved.</div>';
}

function r1(x) { return Math.round(x * 10) / 10; }
function offsetPts(pts, o) { return pts.map(p => ({ x: p.x + p.nx * o, y: p.y + p.ny * o, tx: p.tx, ty: p.ty })); }
function trimPts(pts, startTrim, endTrim) {
    let s = 0, i0 = 0, i1 = pts.length - 1;
    while (i0 < pts.length - 2 && s < startTrim) { s += Math.hypot(pts[i0 + 1].x - pts[i0].x, pts[i0 + 1].y - pts[i0].y); i0++; }
    s = 0;
    while (i1 > i0 + 1 && s < endTrim) { s += Math.hypot(pts[i1].x - pts[i1 - 1].x, pts[i1].y - pts[i1 - 1].y); i1--; }
    return pts.slice(i0, i1 + 1);
}
const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + r1(p.x) + ' ' + r1(p.y)).join('');

/**
 * The colour-flow (double-line) diagram: every colour index drawn as its own directed
 * line, joined through the vertices as the solver paired them.
 */
export function colourFlowSVG(d, setup, sol, opt = {}) {
    const geo = FV.edgeGeom(d), W = FV.W;
    let lines = '', joins = '', arrows = '', labels = '', grey = '';
    const endPt = {}; // `${var}@${vid}` -> point where the line meets the vertex
    const TRIM = 10, OFF = 4.2;
    d.edges.forEach(e => {
        const c = geo[e.id], ev = setup.ev[e.id];
        if (!ev) {
            grey += '<path d="' + pathOf(c.pts.filter((_, i) => i % 3 === 0 || i === c.pts.length - 1)) + '" fill="none" stroke="' + NEUTRAL + '" stroke-width="1.3" stroke-dasharray="5 4" opacity=".75"/>';
            return;
        }
        const strands = ev.q !== undefined
            ? [{ v: ev.q, off: 0, dir: P()[e.p].isAnti ? -1 : 1 }]
            : [{ v: ev.x, off: OFF, dir: 1 }, { v: ev.y, off: -OFF, dir: -1 }];
        strands.forEach(st => {
            let pts = offsetPts(c.pts, st.off);
            const ta = isExt(d, e.a) ? 0 : TRIM, tb = isExt(d, e.b) ? 0 : TRIM;
            pts = trimPts(pts, ta, tb);
            const from = st.dir > 0 ? e.a : e.b, to = st.dir > 0 ? e.b : e.a;
            const seq = st.dir > 0 ? pts : pts.slice().reverse();
            endPt[st.v + '@' + from] = seq[0];
            endPt[st.v + '@' + to] = seq[seq.length - 1];
            const col = HUE[sol.colourOf[st.v]];
            lines += '<path d="' + pathOf(seq.filter((_, i) => i % 2 === 0 || i === seq.length - 1)) + '" fill="none" stroke="' + col + '" stroke-width="2.1" stroke-linecap="round"/>';
            const m = seq[Math.floor(seq.length / 2)], m2 = seq[Math.min(seq.length - 1, Math.floor(seq.length / 2) + 2)];
            const ang = Math.atan2(m2.y - m.y, m2.x - m.x), ca = Math.cos(ang), sa = Math.sin(ang);
            const pt = (a, b) => r1(m.x + ca * a - sa * b) + ',' + r1(m.y + sa * a + ca * b);
            arrows += '<polygon points="' + pt(5, 0) + ' ' + pt(-3.5, 3.6) + ' ' + pt(-3.5, -3.6) + '" fill="' + col + '"/>';
        });
    });
    Object.entries(sol.pairs).forEach(([vid, pairs]) => {
        const V = vtx(d, vid);
        pairs.forEach(([a, b]) => {
            const p1 = endPt[a + '@' + vid], p2 = endPt[b + '@' + vid];
            if (!p1 || !p2) return;
            joins += '<path d="M' + r1(p1.x) + ' ' + r1(p1.y) + 'Q' + r1(V.x) + ' ' + r1(V.y) + ' ' + r1(p2.x) + ' ' + r1(p2.y) + '" fill="none" stroke="' + HUE[sol.colourOf[a]] + '" stroke-width="2.1" stroke-linecap="round"/>';
        });
    });
    d.verts.forEach(v => {
        if (v.kind !== 'ext') return;
        const left = v.side === 'in', e = d.edges.find(x => x.a === v.id || x.b === v.id);
        const xv = extVars(d, setup, v.id);
        let tag = '';
        if (xv && xv.q !== undefined) {
            const c = sol.colourOf[xv.q], anti = P()[v.pid] && P()[v.pid].isAnti;
            tag = ' <tspan fill="' + (anti ? ANTIHUE[c] : HUE[c]) + '" font-weight="700">' + (anti ? ANTILETTER[c] : LETTER[c]) + '</tspan>';
        } else if (xv && xv.inbound !== undefined) {
            const cc = left ? sol.colourOf[xv.inbound] : sol.colourOf[xv.outbound], aa = left ? sol.colourOf[xv.outbound] : sol.colourOf[xv.inbound];
            tag = ' <tspan fill="' + HUE[cc] + '" font-weight="700">' + LETTER[cc] + '</tspan><tspan fill="' + ANTIHUE[aa] + '" font-weight="700">' + ANTILETTER[aa] + '</tspan>';
        }
        labels += '<text class="lbl ext" x="' + (left ? v.x - 12 : v.x + 12) + '" y="' + r1(v.y) + '" text-anchor="' + (left ? 'end' : 'start') + '" dominant-baseline="central">' + FV.labSVG(v.pid) + tag + '</text>';
    });
    let y0 = 1e9, y1 = -1e9;
    Object.keys(geo).forEach(k => geo[k].pts.forEach(p => { if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }));
    d.verts.forEach(v => { if (v.y < y0) y0 = v.y; if (v.y > y1) y1 = v.y; });
    const top = Math.round(y0 - 54), bot = Math.round(y1 + 78), vbh = Math.max(270, bot - top), vt = Math.round((top + bot) / 2 - vbh / 2);
    const note = '<text x="' + (W / 2) + '" y="' + (vt + vbh - 20) + '" text-anchor="middle" font-size="11" fill="#6b7780">each line is one colour index; the arrow is its direction, so a line running backward in time is an anticolour</text>';
    const over = opt.overlay ? opt.overlay(d) : '';
    return '<svg class="fd cflow" viewBox="0 ' + vt + ' ' + W + ' ' + vbh + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Colour-flow diagram">' + grey + lines + joins + arrows + over + labels + note + '</svg>';
}

/** Additive colour chip: the constituents' colours blended, which sums to white for a singlet. */
export function singletChip(x, y, cols, antis) {
    const n = cols.length, r = 7.5, R = n === 3 ? 4.6 : 3.6;
    let s = '<g style="isolation:isolate"><circle cx="' + x + '" cy="' + y + '" r="' + (r + R + 2) + '" fill="#111"/>';
    cols.forEach((c, i) => {
        const a = -Math.PI / 2 + i * 2 * Math.PI / n, cx = x + R * Math.cos(a), cy = y + R * Math.sin(a);
        s += '<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r + '" fill="' + (antis[i] ? PUREANTI[c] : PURE[c]) + '" style="mix-blend-mode:screen"/>';
    });
    const names = cols.map((c, i) => antis[i] ? ANTILETTER[c] : LETTER[c]).join(' + ');
    return s + '<title>' + names + ' = white: a colour singlet</title></g>';
}

/** True when some colour assignment exists (with no colours fixed): rejects Tr Tᵃ = 0 diagrams. */
export function colourValid(d) {
    const st = colourSetup(d);
    if (!st.vars.length) return true;
    return !!solveColour(d, st, {});
}

/** Colour assignment honouring per-leg choices: specs aligned with d.initial / d.final. */
export function colourForElementary(d, specIn, specOut) {
    const st = colourSetup(d), fixed = {};
    const nIn = d.initial.length;
    d.verts.filter(v => v.kind === 'ext' && v.extIdx >= 0).forEach(v => {
        const spec = v.side === 'in' ? (specIn || [])[v.extIdx] : (specOut || [])[v.extIdx - nIn];
        fixExternal(fixed, d, st, v.id, spec, v.side === 'in');
    });
    return solveColour(d, st, { fixed });
}
