// js/loops/solve.js
// Extended-state search: when nothing connects the particles as given, look for
// diagrams with one more external particle (on either side), and if that fails, one
// more on each side. Every candidate goes through the same selection rules and colour
// check as a process the user typed in.

import { FV } from './engine.js';
import { toEngineIds, toSiteSymbol } from './symbols.js';
import { checkProcess } from './rules.js';
import { colourValid } from './color.js';

const MAX_ITEMS = 18;

function prepared(d) {
    const nd = FV.cloneDiag(d);
    FV.layoutDiag(nd);
    return nd;
}

/** initial, final: site symbols. Returns items with engine ids and the added legs marked. */
export function extendedDiagrams(initial, final, { sqrtS = null, deadline = Infinity } = {}) {
    const items = [], seen = new Set();
    const candidates = FV.ORDER.filter(id => FV.isVisible(id)).map(id => ({ id, sym: toSiteSymbol(id) })).filter(c => c.sym);
    const tryOne = (sIni, sFin, extra, side, marks) => {
        if (Date.now() > deadline) return;
        const ini = toEngineIds(sIni), fin = toEngineIds(sFin);
        if (!ini || !fin || ini.length + fin.length > 6) return;
        if (FV.checkConservation(ini, fin).length) return;
        const rules = checkProcess(sIni, sFin, { sqrtS });
        if (!rules.allowed) return;
        const res = FV.generate(ini, fin);
        if (res.kind !== 'tree' || !res.bases.length) return;
        const base = res.bases.find(b => colourValid(b));
        if (!base) return;
        const sig = side + ':' + extra.join(',');
        if (seen.has(sig)) return;
        seen.add(sig);
        const nd = prepared(base);
        marks.forEach(([s, pid]) => {
            const v = (s === 'in' ? nd.verts : [...nd.verts].reverse()).find(x => x.kind === 'ext' && x.side === s && x.pid === pid && !x.extra);
            if (v) v.extra = true;
        });
        items.push({ diagram: nd, title: base.label, group: 'Tree level', ini, fin, initial: sIni, final: sFin, extra: extra.map(FV.labHTML).join(', '), side, strength: base.strength || 0 });
    };
    for (const c of candidates) {
        tryOne(initial.concat([c.sym]), final, [c.id], 'in', [['in', c.id]]);
        tryOne(initial, final.concat([c.sym]), [c.id], 'out', [['out', c.id]]);
        if (items.length >= MAX_ITEMS * 2) break;
    }
    if (!items.length) {
        for (const x of candidates) for (const y of candidates) {
            if (Date.now() > deadline || items.length >= MAX_ITEMS * 2) break;
            tryOne(initial.concat([x.sym]), final.concat([y.sym]), [x.id, y.id], 'both', [['in', x.id], ['out', y.id]]);
        }
    }
    const rank = it => (it.extra === FV.labHTML('gamma') || it.extra === FV.labHTML('gamma') + ', ' + FV.labHTML('gamma') ? 0 : 1);
    items.sort((a, b) => (rank(a) - rank(b)) || (b.strength - a.strength));
    return items.slice(0, MAX_ITEMS);
}
