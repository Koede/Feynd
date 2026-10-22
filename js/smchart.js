// js/smchart.js
// The Elementary tab laid out as the standard Standard Model chart:
//   columns  = the three generations (I, II, III), then the gauge bosons, then the scalar;
//   rows     = up-type quarks, down-type quarks, charged leptons, neutrinos.
// Gauge bosons sit beside the fermions they couple to in the usual picture: g and γ beside the
// quarks, Z and W beside the leptons. Every cell holds the particle and its antiparticle, each
// a normal panel entry (draggable icon, click to add, colour picker in Add Color mode), so the
// pages that use it keep their existing behaviour.

export const SM_CHART = {
    generations: [
        { id: 'I', label: 'I' }, { id: 'II', label: 'II' }, { id: 'III', label: 'III' }
    ],
    rows: [
        { category: 'quark',  label: 'Quarks',  sub: 'up-type',   cells: [['u', 'ū'], ['c', 'c̄'], ['t', 't̄']],       gauge: ['g'] },
        { category: 'quark',  label: '',        sub: 'down-type', cells: [['d', 'd̄'], ['s', 's̄'], ['b', 'b̄']],       gauge: ['γ'] },
        { category: 'lepton', label: 'Leptons', sub: 'charged',   cells: [['e⁻', 'e⁺'], ['μ⁻', 'μ⁺'], ['τ⁻', 'τ⁺']], gauge: ['Z⁰'] },
        { category: 'lepton', label: '',        sub: 'neutrinos', cells: [['νe', 'ν̄e'], ['νμ', 'ν̄μ'], ['ντ', 'ν̄τ']], gauge: ['W⁺', 'W⁻'] }
    ],
    scalar: ['h']
};

/** Short caption under a cell: 'Up Quark' → 'Up', 'Electron Neutrino' → 'Electron ν'. */
function caption(info) {
    return (info.name || '').replace(/ Quark$/, '').replace(/ Neutrino$/, ' ν').replace(/ Boson$/, '').replace(/[+-]$/, '');
}

/**
 * entryElement(symbol, categoryClass, isAnti) is the panel's own entry builder.
 * Returns the chart as one element.
 */
export function smChartElement(entryElement, PARTICLES) {
    const chart = document.createElement('div');
    chart.className = 'sm-chart';
    const grid = document.createElement('div');
    grid.className = 'sm-grid';
    chart.appendChild(grid);

    const put = (el, col, row, span = 1) => {
        el.style.gridColumn = String(col);
        el.style.gridRow = span > 1 ? `${row} / span ${span}` : String(row);
        grid.appendChild(el);
        return el;
    };
    const div = (cls, text) => { const d = document.createElement('div'); d.className = cls; if (text) d.textContent = text; return d; };

    // header row
    put(div('sm-corner'), 1, 1);
    SM_CHART.generations.forEach((g, i) => put(div('sm-head', 'Generation ' + g.label), i + 2, 1));
    put(div('sm-head sm-head-gauge', 'Gauge bosons'), 5, 1);
    put(div('sm-head sm-head-scalar', 'Scalar'), 6, 1);

    const cell = (symbols, category, row, col, span = 1) => {
        const c = div('sm-cell ' + category);
        const pair = div('sm-pair');
        symbols.forEach((s, i) => {
            const e = entryElement(s, category[0].toUpperCase() + category.slice(1), i > 0);
            if (e) pair.appendChild(e);
        });
        c.appendChild(pair);
        const info = PARTICLES[symbols[0]];
        if (info) {
            const cap = div('sm-name', caption(info) + (symbols.length > 1 && info.type === 'boson' ? ' ±' : ''));
            c.appendChild(cap);
        }
        return put(c, col, row, span);
    };

    SM_CHART.rows.forEach((r, ri) => {
        const row = ri + 2;
        const lab = div('sm-rowlabel ' + r.category);
        lab.innerHTML = (r.label ? `<b>${r.label}</b>` : '') + `<span>${r.sub}</span>`;
        put(lab, 1, row);
        r.cells.forEach((syms, ci) => cell(syms, r.category, row, ci + 2));
        cell(r.gauge, 'boson', row, 5);
    });
    cell(SM_CHART.scalar, 'boson', 3, 6, 2);
    return chart;
}
