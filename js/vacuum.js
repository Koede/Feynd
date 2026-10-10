// js/vacuum.js
// Page background: a faint, slow sea of virtual pair creation and annihilation.
// A fermion–antifermion pair appears at a point, the two lines bow apart and meet
// again where the pair annihilates; sometimes the annihilation emits a photon (or a
// gluon) that travels a little way and creates the next pair. Everything is drawn at
// very low opacity on a fixed canvas behind the page. With reduced motion requested,
// one still frame is drawn instead of the animation.

const INK = [27, 34, 28], PHOTON = [180, 83, 9], GLUON = [39, 174, 96], ZW = [142, 68, 173];
const BASE_ALPHA = 0.085;

function rgba(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a.toFixed(3) + ')'; }
const rand = (a, b) => a + Math.random() * (b - a);
const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

function bezier(ax, ay, cx, cy, bx, by, t) {
    const u = 1 - t;
    return [u * u * ax + 2 * u * t * cx + t * t * bx, u * u * ay + 2 * u * t * cy + t * t * by];
}

export function startVacuum() {
    if (typeof document === 'undefined' || document.getElementById('vacuum-sea')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'vacuum-sea';
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, { position: 'fixed', inset: '0', width: '100vw', height: '100vh', zIndex: '-1', pointerEvents: 'none' });
    document.body.prepend(canvas);
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const resize = () => {
        dpr = Math.min(2, window.devicePixelRatio || 1);
        W = window.innerWidth; H = window.innerHeight;
        canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const events = [];
    const target = () => Math.max(10, Math.min(46, Math.round(W * H / 52000)));

    // a pair bubble from (x, y) along angle th (time runs mostly left to right)
    function pair(x, y, th, born) {
        const L = rand(46, 130), h = L * rand(0.22, 0.38);
        const bx = x + Math.cos(th) * L, by = y + Math.sin(th) * L;
        const nx = -Math.sin(th), ny = Math.cos(th), mx = (x + bx) / 2, my = (y + by) / 2;
        return { kind: 'pair', x, y, bx, by, c1: [mx + nx * h * 2, my + ny * h * 2], c2: [mx - nx * h * 2, my - ny * h * 2], th, L,
            born, grow: rand(2600, 4200), hold: rand(500, 1200), fade: rand(1600, 2600), alpha: BASE_ALPHA * rand(0.7, 1.15), heavy: Math.random() < 0.12 };
    }
    // a boson line leaving an annihilation point
    function boson(x, y, th, born) {
        const r = Math.random(), col = r < 0.62 ? PHOTON : r < 0.88 ? GLUON : ZW;
        const L = rand(40, 110);
        return { kind: 'boson', col, gluon: col === GLUON, x, y, bx: x + Math.cos(th) * L, by: y + Math.sin(th) * L, th, L,
            born, grow: rand(1500, 2600), hold: rand(300, 700), fade: rand(1200, 2000), alpha: BASE_ALPHA * rand(0.8, 1.2) };
    }
    const spawn = (now, x, y) => {
        const th = rand(-0.55, 0.55) + (Math.random() < 0.18 ? Math.PI : 0);
        events.push(pair(x === undefined ? rand(-40, W) : x, y === undefined ? rand(-20, H + 20) : y, th, now));
    };

    function drawPair(e, p, a) {
        ctx.lineWidth = e.heavy ? 1.5 : 1.15;
        ctx.strokeStyle = rgba(INK, a);
        for (const c of [e.c1, e.c2]) {
            ctx.beginPath();
            ctx.moveTo(e.x, e.y);
            const n = 26;
            for (let i = 1; i <= Math.ceil(n * p); i++) { const [qx, qy] = bezier(e.x, e.y, c[0], c[1], e.bx, e.by, Math.min(p, i / n)); ctx.lineTo(qx, qy); }
            ctx.stroke();
        }
        // arrows: the particle runs forward on one arc, the antiparticle backward on the other
        if (p > 0.55) {
            ctx.fillStyle = rgba(INK, a * 0.9);
            [[e.c1, 1], [e.c2, -1]].forEach(([c, dir]) => {
                const [px, py] = bezier(e.x, e.y, c[0], c[1], e.bx, e.by, 0.5);
                const [qx, qy] = bezier(e.x, e.y, c[0], c[1], e.bx, e.by, 0.52);
                let tx = qx - px, ty = qy - py; const l = Math.hypot(tx, ty) || 1; tx = tx / l * dir; ty = ty / l * dir;
                ctx.beginPath();
                ctx.moveTo(px + tx * 3.5, py + ty * 3.5);
                ctx.lineTo(px - tx * 2.5 - ty * 2.6, py - ty * 2.5 + tx * 2.6);
                ctx.lineTo(px - tx * 2.5 + ty * 2.6, py - ty * 2.5 - tx * 2.6);
                ctx.fill();
            });
        }
        ctx.fillStyle = rgba(INK, a * 1.6);
        ctx.beginPath(); ctx.arc(e.x, e.y, 1.6, 0, Math.PI * 2); ctx.fill();
        if (p >= 1) { ctx.beginPath(); ctx.arc(e.bx, e.by, 1.6, 0, Math.PI * 2); ctx.fill(); }
    }
    function drawBoson(e, p, a) {
        const dx = e.bx - e.x, dy = e.by - e.y, L = Math.hypot(dx, dy) || 1, tx = dx / L, ty = dy / L, nx = -ty, ny = tx;
        ctx.lineWidth = 1.1;
        ctx.strokeStyle = rgba(e.col, a);
        ctx.beginPath();
        const len = L * p, step = 1.5;
        for (let s = 0; s <= len; s += step) {
            let ox, oy;
            if (e.gluon) { const ph = s / 9 * Math.PI * 2, w = 3.6; ox = tx * (-w * Math.sin(ph)) + nx * (-w * Math.cos(ph)); oy = ty * (-w * Math.sin(ph)) + ny * (-w * Math.cos(ph)); }
            else { const o = 3 * Math.sin(s / 7 * Math.PI * 2); ox = nx * o; oy = ny * o; }
            const X = e.x + tx * s + ox, Y = e.y + ty * s + oy;
            if (s === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y);
        }
        ctx.stroke();
    }

    function frame(now, still) {
        ctx.clearRect(0, 0, W, H);
        for (let i = events.length - 1; i >= 0; i--) {
            const e = events[i], t = now - e.born;
            const life = e.grow + e.hold + e.fade;
            if (t > life) {
                events.splice(i, 1);
                continue;
            }
            const p = ease(t / e.grow);
            const fadeIn = Math.min(1, t / 500), fadeOut = t > e.grow + e.hold ? 1 - (t - e.grow - e.hold) / e.fade : 1;
            const a = e.alpha * fadeIn * Math.max(0, fadeOut);
            if (e.kind === 'pair') drawPair(e, p, a); else drawBoson(e, p, a);
            // chain: the end of one process starts the next
            if (!still && !e.chained && t > e.grow) {
                e.chained = true;
                if (e.kind === 'pair' && Math.random() < 0.55) events.push(boson(e.bx, e.by, e.th + rand(-0.6, 0.6), now));
                else if (e.kind === 'boson') events.push(pair(e.bx, e.by, e.th + rand(-0.4, 0.4), now));
            }
        }
        if (!still) {
            const n = events.filter(e => e.kind === 'pair').length;
            if (n < target() && Math.random() < 0.08) spawn(now);
            // keep the sea from drifting off one edge
            for (let i = events.length - 1; i >= 0; i--) { const e = events[i]; if (e.x > W + 160 || e.x < -200 || e.y < -200 || e.y > H + 200) events.splice(i, 1); }
        }
    }

    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
        const now = 100000;
        for (let i = 0; i < target(); i++) { spawn(now); const e = events[events.length - 1]; e.born = now - e.grow - 10; }
        for (let i = 0; i < 8; i++) { const e = boson(rand(0, W), rand(0, H), rand(-0.5, 0.5), now); e.born = now - e.grow - 10; events.push(e); }
        frame(now, true);
        window.addEventListener('resize', () => frame(now, true));
        return;
    }
    // start with a populated sea, at staggered ages
    const t0 = performance.now();
    for (let i = 0; i < target(); i++) { spawn(t0); events[events.length - 1].born = t0 - rand(0, 4000); }
    let last = 0, raf = 0;
    const loop = (now) => {
        raf = requestAnimationFrame(loop);
        if (now - last < 33) return;          // about 30 frames per second is plenty for this
        last = now;
        frame(now, false);
    };
    const run = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const pause = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
    document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); else run(); });
    run();
}

startVacuum();
