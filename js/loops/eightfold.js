// js/loops/eightfold.js
// The hadron catalogue as SU(4) flavour multiplets: the eightfold way (the u, d, s
// plane) with the charm layers above it. Axes are the quantum numbers themselves:
//   x  isospin I3          depth  hypercharge Y = B + S          up  charm C
// so the C = 0 layer is Gell-Mann's octet / decuplet / nonet. Drag to rotate; click a
// particle that the page models to add it to the active state. Members that are not
// in the catalogue (charm hadrons, the decuplet resonances, the vector mesons) are
// drawn hollow, with their measured mass, so the structure is complete.

import { HADRONS } from '../hadrons.js';

// quark weights (I3, Y, C)
const W = { u: [0.5, 1 / 3, 0], d: [-0.5, 1 / 3, 0], s: [0, -2 / 3, 0], c: [0, 1 / 3, 1] };
const neg = v => v.map(x => -x);
function weight(q) { // q like 'u', 'ū'
    const bare = q.normalize('NFD').replace(/̄/g, '');
    const w = W[bare];
    return /̄/.test(q.normalize('NFD')) ? neg(w) : w;
}
function posOf(quarks) {
    return quarks.reduce((a, q) => { const w = weight(q); return [a[0] + w[0], a[1] + w[1], a[2] + w[2]]; }, [0, 0, 0]);
}

// [symbol, quark content, mass MeV (PDG, rounded), name]; symbol in HADRONS -> selectable
const M = (sym, q, m, name, qlabel) => ({ sym, q, m, name, qlabel });
const MULTIPLETS = {
    ps: { title: 'Pseudoscalar mesons', jp: '0⁻', note: '16-plet of SU(4): the meson nonet in the C = 0 plane, D mesons above and below.', members: [
        M('K⁰', ['d', 's̄'], 498), M('K⁺', ['u', 's̄'], 494), M('π⁻', ['d', 'ū'], 140), M('π⁰', ['u', 'ū'], 135, null, '(uū − dd̄)/√2'), M('η', ['s', 's̄'], 548, null, '≈ (uū + dd̄ − 2ss̄)/√6'),
        M('π⁺', ['u', 'd̄'], 140), M('K⁻', ['s', 'ū'], 494), M('K̄⁰', ['s', 'd̄'], 498), M('η′', ['s', 's̄'], 958, 'Eta prime', '≈ (uū + dd̄ + ss̄)/√3'),
        M('D⁰', ['c', 'ū'], 1865, 'D zero'), M('D⁺', ['c', 'd̄'], 1870, 'D plus'), M('Dₛ⁺', ['c', 's̄'], 1968, 'D-sub-s plus'),
        M('D̄⁰', ['u', 'c̄'], 1865, 'Anti-D zero'), M('D⁻', ['d', 'c̄'], 1870, 'D minus'), M('Dₛ⁻', ['s', 'c̄'], 1968, 'D-sub-s minus'),
        M('ηc', ['c', 'c̄'], 2984, 'Eta-c')] },
    vec: { title: 'Vector mesons', jp: '1⁻', note: 'Same flavour structure as the pseudoscalars, with spins aligned. None of these are in the catalogue yet.', members: [
        M('K*⁰', ['d', 's̄'], 896, 'K-star zero'), M('K*⁺', ['u', 's̄'], 892, 'K-star plus'), M('ρ⁻', ['d', 'ū'], 775, 'Rho minus'), M('ρ⁰', ['u', 'ū'], 775, 'Rho zero', '(uū − dd̄)/√2'),
        M('ω', ['u', 'ū'], 783, 'Omega meson', '(uū + dd̄)/√2'), M('ρ⁺', ['u', 'd̄'], 775, 'Rho plus'), M('K*⁻', ['s', 'ū'], 892, 'K-star minus'), M('K̄*⁰', ['s', 'd̄'], 896, 'Anti-K-star zero'),
        M('φ', ['s', 's̄'], 1019, 'Phi'), M('D*⁰', ['c', 'ū'], 2007, 'D-star zero'), M('D*⁺', ['c', 'd̄'], 2010, 'D-star plus'), M('Dₛ*⁺', ['c', 's̄'], 2112, 'D-star-s plus'),
        M('D̄*⁰', ['u', 'c̄'], 2007, 'Anti-D-star zero'), M('D*⁻', ['d', 'c̄'], 2010, 'D-star minus'), M('Dₛ*⁻', ['s', 'c̄'], 2112, 'D-star-s minus'), M('J/ψ', ['c', 'c̄'], 3097, 'J/psi')] },
    oct: { title: 'Baryons', jp: '½⁺', note: '20′-plet of SU(4): the baryon octet at C = 0, singly and doubly charmed baryons above.', members: [
        M('n', ['u', 'd', 'd'], 940), M('p', ['u', 'u', 'd'], 938), M('Σ⁻', ['d', 'd', 's'], 1197), M('Σ⁰', ['u', 'd', 's'], 1193), M('Λ', ['u', 'd', 's'], 1116),
        M('Σ⁺', ['u', 'u', 's'], 1189), M('Ξ⁻', ['d', 's', 's'], 1322), M('Ξ⁰', ['u', 's', 's'], 1315),
        M('Σc⁰', ['d', 'd', 'c'], 2454, 'Sigma-c zero'), M('Σc⁺', ['u', 'd', 'c'], 2453, 'Sigma-c plus'), M('Λc⁺', ['u', 'd', 'c'], 2286, 'Lambda-c plus'), M('Σc⁺⁺', ['u', 'u', 'c'], 2454, 'Sigma-c plus plus'),
        M('Ξc⁰', ['d', 's', 'c'], 2470, 'Xi-c zero'), M('Ξc⁺', ['u', 's', 'c'], 2468, 'Xi-c plus'), M('Ξc′⁰', ['d', 's', 'c'], 2579, 'Xi-c-prime zero'), M('Ξc′⁺', ['u', 's', 'c'], 2578, 'Xi-c-prime plus'),
        M('Ωc⁰', ['s', 's', 'c'], 2695, 'Omega-c zero'), M('Ξcc⁺', ['d', 'c', 'c'], 3620, 'Xi-cc plus (LHCb 2026)'), M('Ξcc⁺⁺', ['u', 'c', 'c'], 3622, 'Xi-cc plus plus'), M('Ωcc⁺', ['s', 'c', 'c'], null, 'Omega-cc plus')] },
    dec: { title: 'Baryon resonances', jp: '3/2⁺', note: '20-plet of SU(4): the decuplet at C = 0, capped by the triply charmed Ωccc. Gell-Mann predicted the Ω⁻ from the gap in this triangle.', members: [
        M('Δ⁻', ['d', 'd', 'd'], 1232, 'Delta minus'), M('Δ⁰', ['u', 'd', 'd'], 1232, 'Delta zero'), M('Δ⁺', ['u', 'u', 'd'], 1232, 'Delta plus'), M('Δ⁺⁺', ['u', 'u', 'u'], 1232, 'Delta plus plus'),
        M('Σ*⁻', ['d', 'd', 's'], 1387, 'Sigma-star minus'), M('Σ*⁰', ['u', 'd', 's'], 1384, 'Sigma-star zero'), M('Σ*⁺', ['u', 'u', 's'], 1383, 'Sigma-star plus'),
        M('Ξ*⁻', ['d', 's', 's'], 1535, 'Xi-star minus'), M('Ξ*⁰', ['u', 's', 's'], 1532, 'Xi-star zero'), M('Ω⁻', ['s', 's', 's'], 1672),
        M('Σc*⁰', ['d', 'd', 'c'], 2518, 'Sigma-c-star zero'), M('Σc*⁺', ['u', 'd', 'c'], 2517, 'Sigma-c-star plus'), M('Σc*⁺⁺', ['u', 'u', 'c'], 2518, 'Sigma-c-star plus plus'),
        M('Ξc*⁰', ['d', 's', 'c'], 2646, 'Xi-c-star zero'), M('Ξc*⁺', ['u', 's', 'c'], 2645, 'Xi-c-star plus'), M('Ωc*⁰', ['s', 's', 'c'], 2766, 'Omega-c-star zero'),
        M('Ξcc*⁺', ['d', 'c', 'c'], null, 'Xi-cc-star plus'), M('Ξcc*⁺⁺', ['u', 'c', 'c'], null, 'Xi-cc-star plus plus'), M('Ωcc*⁺', ['s', 'c', 'c'], null, 'Omega-cc-star plus'), M('Ωccc⁺⁺', ['c', 'c', 'c'], null, 'Omega-ccc')] },
    anti: { title: 'Antibaryons', jp: '½⁻', note: 'The antibaryon octet: every additive quantum number reversed, so the hexagon is the baryon octet turned through 180°. Antifermions have the opposite intrinsic parity, so J^P = ½⁻ (Ω̄⁺: 3/2⁻).', members: [] }
};
// antibaryons mirror the octet (uds part) and use the catalogue's antiparticle symbols
MULTIPLETS.anti.members = MULTIPLETS.oct.members.filter(m => HADRONS[m.sym]).map(m => {
    const a = HADRONS[m.sym].anti;
    return M(a, m.q.map(q => q.normalize('NFD').includes('̄') ? q.normalize('NFD').replace(/̄/g, '') : q + '̄'), m.m);
});
MULTIPLETS.anti.members.push(Object.assign(M('Ω̄⁺', ['s̄', 's̄', 's̄'], 1672), { jp: '3/2⁻' }));

const ROOTS = [[1, 0, 0], [0.5, 1, 0], [-0.5, 1, 0], [-0.5, 0, 1], [0.5, 0, 1], [0, 1, 1]];
const COLORS = { ps: '#1f5e8e', vec: '#1f5e8e', oct: '#2b6b5c', dec: '#2b6b5c', anti: '#9b5e3b' };

function build(key) {
    const mul = MULTIPLETS[key];
    const pts = mul.members.map(m => {
        const p = posOf(m.q);
        return { ...m, I3: p[0], Y: p[1], C: p[2], live: !!HADRONS[m.sym], name: m.name || (HADRONS[m.sym] && HADRONS[m.sym].name) || m.sym };
    });
    // members sharing a site (pi0/eta/eta', Sigma0/Lambda, ...) are fanned out a little
    const sites = new Map();
    pts.forEach(p => { const k = [p.I3, p.Y, p.C].map(x => x.toFixed(3)).join(); if (!sites.has(k)) sites.set(k, []); sites.get(k).push(p); });
    sites.forEach(list => list.forEach((p, i) => { p.off = (i - (list.length - 1) / 2) * 0.26; p.shared = list.length > 1; }));
    const edges = [];
    const reps = [...sites.values()].map(l => l[0]);
    for (let i = 0; i < reps.length; i++) for (let j = i + 1; j < reps.length; j++) {
        const a = reps[i], b = reps[j];
        if (a.shared || b.shared) continue; // skip spokes to the centre
        const dv = [b.I3 - a.I3, b.Y - a.Y, b.C - a.C];
        if (ROOTS.some(r => r.every((x, k) => Math.abs(x - dv[k]) < 1e-6) || r.every((x, k) => Math.abs(x + dv[k]) < 1e-6))) edges.push([a, b]);
    }
    return { mul, pts, edges };
}

const fmtQ = q => q.join('');
const frac = x => { const t = Math.round(x * 6); if (t % 6 === 0) return String(t / 6).replace('-', '−'); if (t % 3 === 0) return (t / 3 < 0 ? '−' : '') + Math.abs(t / 3) + '/2'; if (t % 2 === 0) return (t < 0 ? '−' : '') + Math.abs(t / 2) + '/3'; return String(x); };

/**
 * Mounts the viewer into `host`. `onPick(symbol)` is called when a catalogued
 * hadron is clicked.
 */
export function mountEightfold(host, { onPick } = {}) {
    host.classList.add('ef');
    host.innerHTML = `
      <div class="ef-tabs" role="tablist">${Object.keys(MULTIPLETS).map((k, i) => `<button type="button" role="tab" class="ef-tab${i === 2 ? ' on' : ''}" data-k="${k}">${MULTIPLETS[k].title} <span>${MULTIPLETS[k].jp}</span></button>`).join('')}</div>
      <div class="ef-stage"><canvas class="ef-canvas" aria-label="Flavour multiplet, drag to rotate"></canvas><div class="ef-tip" role="tooltip"></div>
        <div class="ef-axes">drag to rotate · scroll to zoom · double-click to reset</div></div>
      <p class="ef-note"></p>
      <div class="ef-legend"><span><i class="dot live"></i>in the catalogue · click to add</span><span><i class="dot ghost"></i>known hadron, not modelled here</span><label class="ef-charm"><input type="checkbox" checked> charm layers (SU(4))</label></div>`;
    const canvas = host.querySelector('canvas'), tip = host.querySelector('.ef-tip'), note = host.querySelector('.ef-note');
    const ctx = canvas.getContext('2d');
    let model = build('oct'), key = 'oct', showCharm = true;
    const charmBox = host.querySelector('.ef-charm input');
    let yaw = -0.5, pitch = 0.62, zoom = 1, dragging = null, hover = null, auto = !matchMedia('(prefers-reduced-motion: reduce)').matches, flash = null;
    let screen = [];

    const setKey = (k) => {
        key = k; model = build(k);
        if (!showCharm) { model.pts = model.pts.filter(p => p.C === 0); model.edges = model.edges.filter(([a, b]) => a.C === 0 && b.C === 0); }
        fit();
        host.querySelectorAll('.ef-tab').forEach(b => b.classList.toggle('on', b.dataset.k === k));
        note.textContent = model.mul.note;
        draw();
    };
    charmBox.addEventListener('change', () => { showCharm = charmBox.checked; setKey(key); });
    host.querySelector('.ef-tabs').addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) setKey(b.dataset.k); });

    let centre = [0, 0, 0], radius = 2;
    function fit() {
        const ps = model.pts.map(p => [p.I3, p.C * 1.35, p.Y]);
        centre = [0, 1, 2].map(k => ps.reduce((a, q) => a + q[k], 0) / ps.length);
        radius = Math.max(1.2, ...ps.map(q => Math.hypot(q[0] - centre[0], q[1] - centre[1], q[2] - centre[2])));
    }
    function project(p) {
        // world: x = I3 (+ fan offset), y = C (up), z = Y, centred on the multiplet
        const x = p.I3 + (p.off || 0) - centre[0], y = p.C * 1.35 - centre[1], z = p.Y - centre[2];
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
        const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
        const w = canvas.clientWidth, h = canvas.clientHeight, s = zoom * Math.min(w, h) / (2.6 * radius), persp = 7 / (7 + z2);
        return { sx: w / 2 + x1 * s * persp, sy: h / 2 + 8 - y2 * s * persp, depth: z2, k: persp };
    }

    function draw() {
        const dpr = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
        if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        const col = COLORS[key];
        // C = 0 plane hint
        ctx.strokeStyle = 'rgba(31, 94, 142, .13)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let g = -1.5; g <= 1.51; g += 0.5) { const a = project({ I3: g, Y: -2.2, C: 0 }), b = project({ I3: g, Y: 1.4, C: 0 }); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }
        for (let g = -2; g <= 1.41; g += 1) { const a = project({ I3: -1.7, Y: g, C: 0 }), b = project({ I3: 1.7, Y: g, C: 0 }); ctx.moveTo(a.sx, a.sy); ctx.lineTo(b.sx, b.sy); }
        ctx.stroke();
        drawAxes();
        // edges
        model.edges.forEach(([a, b]) => {
            const A = project(a), B = project(b);
            const charm = a.C !== 0 || b.C !== 0;
            ctx.strokeStyle = charm ? 'rgba(90, 104, 114, .35)' : col; ctx.globalAlpha = charm ? 1 : 0.55; ctx.lineWidth = charm ? 1 : 1.6;
            ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke(); ctx.globalAlpha = 1;
        });
        // points, back to front
        screen = model.pts.map(p => ({ p, ...project(p) })).sort((a, b) => b.depth - a.depth);
        screen.forEach(s => {
            const r = (s.p.live ? 12 : 9) * s.k;
            ctx.beginPath(); ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
            if (s.p.live) { ctx.fillStyle = col; ctx.fill(); }
            else { ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.strokeStyle = '#9aa5ad'; ctx.lineWidth = 1.4; ctx.stroke(); }
            if (hover === s.p || flash === s.p) { ctx.strokeStyle = '#e0a400'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.sx, s.sy, r + 4, 0, Math.PI * 2); ctx.stroke(); }
            ctx.font = `${s.p.live ? 700 : 500} ${Math.round((s.p.live ? 14 : 11.5) * s.k)}px 'Segoe UI', system-ui, sans-serif`;
            ctx.fillStyle = s.p.live ? '#1b221c' : (hover === s.p ? '#3d4850' : 'rgba(110,122,131,.75)'); ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(s.p.sym, s.sx, s.sy - r - 3);
        });
    }

    // Quantum-number axes through the origin, with ticks and labels, rotating with the multiplet.
    function drawAxes() {
        const pts = model.pts;
        const lo = f => Math.min(0, ...pts.map(f)), hi = f => Math.max(0, ...pts.map(f));
        const axes = [
            { name: 'I₃', long: 'isospin', from: lo(p => p.I3) - 0.6, to: hi(p => p.I3) + 0.7, step: 0.5, at: t => ({ I3: t, Y: 0, C: 0 }) },
            { name: 'Y', long: 'hypercharge B + S', from: lo(p => p.Y) - 0.6, to: hi(p => p.Y) + 0.7, step: 1, at: t => ({ I3: 0, Y: t, C: 0 }) }
        ];
        if (pts.some(p => p.C !== 0)) axes.push({ name: 'C', long: 'charm', from: lo(p => p.C) - 0.4, to: hi(p => p.C) + 0.6, step: 1, at: t => ({ I3: 0, Y: 0, C: t }) });
        ctx.save();
        ctx.strokeStyle = '#5b6770'; ctx.fillStyle = '#5b6770'; ctx.lineWidth = 1.2;
        axes.forEach(ax => {
            const A = project(ax.at(ax.from)), B = project(ax.at(ax.to));
            ctx.beginPath(); ctx.moveTo(A.sx, A.sy); ctx.lineTo(B.sx, B.sy); ctx.stroke();
            const ang = Math.atan2(B.sy - A.sy, B.sx - A.sx);
            ctx.beginPath();
            ctx.moveTo(B.sx, B.sy);
            ctx.lineTo(B.sx - 9 * Math.cos(ang - 0.38), B.sy - 9 * Math.sin(ang - 0.38));
            ctx.lineTo(B.sx - 9 * Math.cos(ang + 0.38), B.sy - 9 * Math.sin(ang + 0.38));
            ctx.closePath(); ctx.fill();
            // ticks perpendicular to the axis on screen
            const nx = -Math.sin(ang), ny = Math.cos(ang);
            ctx.font = "11px 'Segoe UI', system-ui, sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            for (let t = Math.ceil(ax.from / ax.step) * ax.step; t <= ax.to - ax.step * 0.4; t += ax.step) {
                if (Math.abs(t) < 1e-9) continue;
                const T = project(ax.at(t));
                ctx.beginPath(); ctx.moveTo(T.sx - nx * 4, T.sy - ny * 4); ctx.lineTo(T.sx + nx * 4, T.sy + ny * 4); ctx.stroke();
                ctx.globalAlpha = 0.85;
                ctx.fillText(frac(t), T.sx + nx * 13, T.sy + ny * 13);
                ctx.globalAlpha = 1;
            }
            ctx.font = "italic 700 14px 'Segoe UI', system-ui, sans-serif";
            ctx.fillText(ax.name, B.sx + 16 * Math.cos(ang), B.sy + 16 * Math.sin(ang));
            ctx.font = "10px 'Segoe UI', system-ui, sans-serif"; ctx.globalAlpha = 0.8;
            ctx.fillText(ax.long, B.sx + 16 * Math.cos(ang), B.sy + 16 * Math.sin(ang) + 13);
            ctx.globalAlpha = 1;
        });
        const O = project({ I3: 0, Y: 0, C: 0 });
        ctx.beginPath(); ctx.arc(O.sx, O.sy, 2.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    function pick(ev) {
        const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
        let best = null, bd = 18;
        for (const s of screen) { const d = Math.hypot(s.sx - x, s.sy - y); if (d < bd + 0.01) { bd = d; best = s; } }
        return best;
    }
    function showTip(s, ev) {
        if (!s) { tip.classList.remove('on'); return; }
        const p = s.p, r = host.querySelector('.ef-stage').getBoundingClientRect();
        tip.innerHTML = `<b>${p.sym}</b> ${p.name}<br><span>${p.qlabel || fmtQ(p.q)}</span>`
            + `<br>I₃ ${frac(p.I3)} · Y ${frac(p.Y)} · C ${frac(p.C)} · J<sup>P</sup> ${p.jp || model.mul.jp}`
            + `<br>${p.m ? 'm ≈ ' + p.m + ' MeV' : 'not yet observed'}`
            + (p.live ? '<br><em>Click to add to the selected state</em>' : '');
        tip.classList.add('on');
        let tx = ev.clientX - r.left + 14, ty = ev.clientY - r.top + 14;
        if (tx + tip.offsetWidth > r.width - 4) tx = ev.clientX - r.left - tip.offsetWidth - 14;
        tip.style.left = Math.max(4, tx) + 'px'; tip.style.top = Math.max(4, ty) + 'px';
    }

    canvas.addEventListener('pointerdown', (ev) => { dragging = { x: ev.clientX, y: ev.clientY, yaw, pitch, moved: false }; auto = false; canvas.setPointerCapture(ev.pointerId); });
    canvas.addEventListener('pointermove', (ev) => {
        if (dragging) {
            const dx = ev.clientX - dragging.x, dy = ev.clientY - dragging.y;
            if (Math.abs(dx) + Math.abs(dy) > 3) dragging.moved = true;
            yaw = dragging.yaw + dx * 0.01; pitch = Math.max(-1.45, Math.min(1.45, dragging.pitch + dy * 0.01));
            draw(); return;
        }
        const s = pick(ev); hover = s ? s.p : null; canvas.style.cursor = s ? (s.p.live ? 'pointer' : 'help') : 'grab'; showTip(s, ev); draw();
    });
    canvas.addEventListener('pointerup', (ev) => {
        const wasDrag = dragging && dragging.moved; dragging = null;
        if (wasDrag) return;
        const s = pick(ev);
        if (s && s.p.live && onPick) { onPick(s.p.sym); flash = s.p; draw(); setTimeout(() => { flash = null; draw(); }, 350); }
    });
    canvas.addEventListener('pointerleave', () => { hover = null; tip.classList.remove('on'); draw(); });
    canvas.addEventListener('keydown', (ev) => {
        if (ev.key === 'ArrowLeft') yaw -= 0.15; else if (ev.key === 'ArrowRight') yaw += 0.15;
        else if (ev.key === 'ArrowUp') pitch = Math.max(-1.45, pitch - 0.15); else if (ev.key === 'ArrowDown') pitch = Math.min(1.45, pitch + 0.15); else return;
        auto = false; ev.preventDefault(); draw();
    });
    canvas.tabIndex = 0;
    canvas.addEventListener('wheel', (ev) => { ev.preventDefault(); zoom = Math.max(0.5, Math.min(3, zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1))); auto = false; draw(); }, { passive: false });
    canvas.addEventListener('dblclick', () => { yaw = -0.5; pitch = 0.62; zoom = 1; draw(); });

    let last = 0;
    const tick = (t) => {
        if (!host.isConnected) return;
        if (auto && host.offsetParent !== null && t - last > 33) { yaw += 0.006; last = t; draw(); }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(() => draw()).observe(canvas);
    setKey('oct');
    return { setKey, multiplets: MULTIPLETS };
}

export { MULTIPLETS, posOf };
