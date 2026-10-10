// js/loops/colourui.js
// Colour pickers for "Add Color" mode.
//   quark          three buttons: red, green, blue
//   antiquark      three buttons: antired (cyan), antigreen (magenta), antiblue (yellow)
//   gluon          a colour and an anticolour
//   meson          the quark's colour and the antiquark's anticolour. A meson is a colour
//                  singlet, so the two are linked: the antiquark carries the anticolour
//                  that cancels the quark's colour (rr̄, gḡ or bb̄ - one term of the sum)
//   baryon         one colour per quark, always a permutation of red, green, blue
//                  (the antisymmetric ε_ijk singlet); antibaryons the same with anticolours

import { PARTICLES } from '../particles.js';
import { HADRONS, isAntiQuark } from './hadrondata.js';
import { HUE, ANTIHUE, NAME, ANTINAME, LETTER, ANTILETTER, COLS } from './color.js';

export function colourKindOf(sym) {
    const p = PARTICLES[sym];
    if (p && p.color === 'triplet') return isAntiQuark(sym) ? 'antiquark' : 'quark';
    if (p && p.color === 'octet') return 'gluon';
    const h = HADRONS[sym];
    if (!h) return null;
    if (h.group === 'meson') return 'meson';
    return h.group === 'antibaryon' ? 'antibaryon' : 'baryon';
}

export function constituents(sym) {
    const h = HADRONS[sym];
    if (!h) return [];
    if (h.quarks) return h.quarks.slice();
    return h.group === 'meson' ? ['q', 'q̄'] : [];   // flavour superpositions (π⁰, η, η′, ρ⁰, ω)
}

export function defaultColour(sym, hint) {
    const k = colourKindOf(sym);
    if (k === 'quark' || k === 'antiquark') return { q: hint || 'r' };
    if (k === 'gluon') return { c: 'r', a: 'g' };
    if (k === 'meson') return { q: ['r', 'r'] };
    if (k === 'baryon' || k === 'antibaryon') return { q: ['r', 'g', 'b'] };
    return null;
}

const dot = (c, anti) => `<i class="cdot" style="background:${anti ? ANTIHUE[c] : HUE[c]}" title="${anti ? ANTINAME[c] : NAME[c]}"></i>`;

/** Small coloured dots describing a choice, for chips. */
export function colourBadge(sym, spec) {
    if (!spec) return '';
    const k = colourKindOf(sym);
    if (k === 'quark') return dot(spec.q, false);
    if (k === 'antiquark') return dot(spec.q, true);
    if (k === 'gluon') return dot(spec.c, false) + dot(spec.a, true);
    if (k === 'meson') return dot(spec.q[0], false) + dot(spec.q[1], true);
    if (k === 'baryon') return spec.q.map(c => dot(c, false)).join('');
    if (k === 'antibaryon') return spec.q.map(c => dot(c, true)).join('');
    return '';
}

/** Text form used by the typed process box: u:r  ū:g  g:rb  K⁻:gg  Ω⁻:rgb. */
export function specText(sym, spec) {
    const k = colourKindOf(sym);
    if (!spec || !k) return '';
    if (k === 'quark' || k === 'antiquark') return spec.q;
    if (k === 'gluon') return spec.c + spec.a;
    return spec.q.join('');
}
export function parseSpec(sym, txt) {
    const k = colourKindOf(sym);
    if (!k || !txt) return null;
    const cs = txt.toLowerCase().split('').filter(c => COLS.includes(c));
    if ((k === 'quark' || k === 'antiquark') && cs.length === 1) return { q: cs[0] };
    if (k === 'gluon' && cs.length === 2) return { c: cs[0], a: cs[1] };
    if (k === 'meson' && cs.length === 2) return { q: [cs[0], cs[0]] };
    if ((k === 'baryon' || k === 'antibaryon') && cs.length === 3 && new Set(cs).size === 3) return { q: cs };
    return undefined;
}

function select(options, value, title) {
    const s = document.createElement('select');
    s.className = 'csel';
    if (title) s.title = title;
    options.forEach(([v, label, colour]) => {
        const o = document.createElement('option');
        o.value = v; o.textContent = label; o.style.color = colour;
        if (v === value) o.selected = true;
        s.appendChild(o);
    });
    s.style.color = (options.find(o => o[0] === value) || [])[2] || '';
    s.addEventListener('change', () => { s.style.color = (options.find(o => o[0] === s.value) || [])[2] || ''; });
    return s;
}
const colOpts = () => COLS.map(c => [c, NAME[c], HUE[c]]);
const antiOpts = () => COLS.map(c => [c, 'anti' + NAME[c], ANTIHUE[c]]);

/**
 * Editable colour controls for one particle. onChange(spec) fires on every change.
 * Used both in the particle panel (with an Add button) and on the chips in the zones.
 */
export function colourEditor(sym, spec, onChange) {
    const k = colourKindOf(sym);
    const wrap = document.createElement('span');
    wrap.className = 'ceditor';
    if (!k) return wrap;
    spec = spec ? JSON.parse(JSON.stringify(spec)) : defaultColour(sym);
    const emit = () => onChange && onChange(JSON.parse(JSON.stringify(spec)));
    if (k === 'quark' || k === 'antiquark') {
        const s = select(k === 'quark' ? colOpts() : antiOpts(), spec.q, k === 'quark' ? 'Quark colour' : 'Antiquark anticolour');
        s.addEventListener('change', () => { spec.q = s.value; emit(); });
        wrap.append(s);
    } else if (k === 'gluon') {
        const a = select(colOpts(), spec.c, 'Gluon colour'), b = select(antiOpts(), spec.a, 'Gluon anticolour');
        a.addEventListener('change', () => { spec.c = a.value; emit(); });
        b.addEventListener('change', () => { spec.a = b.value; emit(); });
        wrap.append(a, b);
    } else if (k === 'meson') {
        const parts = constituents(sym);
        const why = 'A meson is a colour singlet: the antiquark carries the anticolour of the quark’s colour (rr̄ + gḡ + bb̄; one term is drawn).';
        const qi = parts.findIndex(q => !isAntiQuark(q) && q !== 'q̄'), ai = 1 - qi;
        const a = select(colOpts(), spec.q[qi], parts[qi] + ' colour. ' + why), b = select(antiOpts(), spec.q[ai], parts[ai] + ' anticolour. ' + why);
        const sync = (v) => { spec.q = [v, v]; a.value = v; b.value = v; a.dispatchEvent(new Event('restyle')); a.style.color = HUE[v]; b.style.color = ANTIHUE[v]; emit(); };
        a.addEventListener('change', () => sync(a.value));
        b.addEventListener('change', () => sync(b.value));
        const pair = (txt, sel) => { const sp = document.createElement('span'); sp.className = 'cpair'; const l = document.createElement('span'); l.className = 'clab'; l.textContent = txt; sp.append(l, sel); return sp; };
        wrap.append(pair(parts[qi], a), pair(parts[ai], b));
    } else {
        const parts = constituents(sym), anti = k === 'antibaryon';
        const why = 'A baryon is a colour singlet: its three quarks carry red, green and blue, one each (ε_ijk).';
        const sels = parts.map((q, i) => {
            const s = select(anti ? antiOpts() : colOpts(), spec.q[i], q + (anti ? ' anticolour. ' : ' colour. ') + why);
            const sp = document.createElement('span'); sp.className = 'cpair';
            const lab = document.createElement('span'); lab.className = 'clab'; lab.textContent = q;
            sp.append(lab, s); wrap.append(sp);
            return s;
        });
        sels.forEach((s, i) => s.addEventListener('change', () => {
            const v = s.value, j = spec.q.indexOf(v);
            if (j >= 0 && j !== i) { spec.q[j] = spec.q[i]; sels[j].value = spec.q[j]; sels[j].style.color = (anti ? ANTIHUE : HUE)[spec.q[j]]; }
            spec.q[i] = v;
            emit();
        }));
    }
    return wrap;
}

/**
 * The row under a particle in the panel: three one-click buttons for quarks and
 * antiquarks, selectors plus an Add button for everything else that carries colour.
 */
export function colourPickerRow(sym, onPick) {
    const k = colourKindOf(sym);
    if (!k) return null;
    const row = document.createElement('div');
    row.className = 'colour-row';
    row.addEventListener('click', e => e.stopPropagation());
    row.addEventListener('dragstart', e => e.stopPropagation());
    if (k === 'quark' || k === 'antiquark') {
        COLS.forEach(c => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'cbtn';
            const anti = k === 'antiquark';
            b.style.setProperty('--c', anti ? ANTIHUE[c] : HUE[c]);
            b.innerHTML = '<i></i>' + (anti ? ANTILETTER[c] : LETTER[c]);
            b.title = 'Add ' + sym + ' with ' + (anti ? ANTINAME[c] : NAME[c]);
            b.addEventListener('click', () => onPick({ q: c }));
            row.appendChild(b);
        });
        return row;
    }
    let spec = defaultColour(sym);
    const ed = colourEditor(sym, spec, s => { spec = s; });
    const add = document.createElement('button');
    add.type = 'button'; add.className = 'cbtn add'; add.textContent = 'Add';
    add.title = 'Add ' + sym + ' with these colours';
    add.addEventListener('click', () => onPick(spec));
    row.append(ed, add);
    return row;
}
