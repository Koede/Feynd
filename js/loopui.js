// js/loopui.js (clone of the panel half of ui.js)
// The left-hand particle panel: Elementary and Hadrons tabs, the 3D eightfold-way view,
// and the colour pickers shown under every coloured particle in Add Color mode.

import { PARTICLES, ELEMENTARY_PANEL, SELF_CONJUGATE } from './particles.js';
import { HADRONS, HADRON_PANEL } from './hadrons.js';
import { mountEightfold } from './loops/eightfold.js';
import { colourPickerRow } from './loops/colourui.js';

const MINUS = '−';   // true minus sign, matches the existing typography
const THIRD = '⅓';   // ⅓
const TWO_THIRDS = '⅔'; // ⅔

/** '+⅔', '−⅓', ... matching the original panel's notation. */
export function formatCharge(q) {
    if (q === 0) return '0';
    const sign = q < 0 ? MINUS : '+';
    const mag = Math.abs(q);
    let body;
    if (Math.abs(mag - 1) < 1e-9) body = '1';
    else if (Math.abs(mag - 2 / 3) < 1e-9) body = TWO_THIRDS;
    else if (Math.abs(mag - 1 / 3) < 1e-9) body = THIRD;
    else body = String(mag);
    return sign + body;
}

/** Splits '2.16 MeV' into { value: '2.16', unit: 'MeV' }; tolerant of '<27 eV' and '--'. */
function splitMass(label) {
    const match = /^(.*?)\s*([A-Za-z]+)$/.exec(label || '');
    if (match) return { value: match[1], unit: match[2] };
    return { value: label || '--', unit: '' };
}

// ------------------------------------------------------- particle panel

function entryElement(symbol, category, isAnti) {
    const info = PARTICLES[symbol] || HADRONS[symbol];
    if (!info) return null;

    const entry = document.createElement('div');
    entry.className = 'entry' + (isAnti ? ` anti ${category}` : '');

    const icon = document.createElement('span');
    icon.className = 'particle-icon';
    icon.draggable = true;
    icon.dataset.symbol = symbol;
    icon.innerHTML = info.label || symbol;

    const infoBox = document.createElement('div');
    infoBox.className = 'particle-info';

    const nameRow = document.createElement('div');
    nameRow.className = 'particle-name-row';

    const name = document.createElement('span');
    name.className = 'particle-name';
    name.textContent = info.name;
    nameRow.appendChild(name);

    const metaTop = document.createElement('div');
    metaTop.className = 'particle-meta';
    const charge = document.createElement('span');
    charge.className = 'charge-badge';
    charge.textContent = formatCharge(info.Q);
    metaTop.appendChild(charge);
    nameRow.appendChild(metaTop);
    infoBox.appendChild(nameRow);

    const meta = document.createElement('div');
    meta.className = 'particle-meta';
    if (info.massLabel) {
        const { value, unit } = splitMass(info.massLabel);
        const badge = document.createElement('span');
        badge.className = 'mass-badge';
        badge.dataset.particle = symbol;
        badge.dataset.mass = value;
        badge.dataset.uncertainty = info.unc || '0';
        badge.dataset.unit = unit;
        badge.textContent = info.massLabel;
        meta.appendChild(badge);
    }
    if (info.quarks) {
        const q = document.createElement('span');
        q.className = 'quark-badge';
        q.textContent = info.quarks.join(' ');
        meta.appendChild(q);
    } else if (info.note) {
        const n = document.createElement('span');
        n.className = 'quark-badge';
        n.textContent = 'flavour mixture';
        meta.appendChild(n);
    }
    if (meta.childNodes.length) infoBox.appendChild(meta);

    entry.append(icon, infoBox);
    const row = colourPickerRow(symbol, (colour) => entry.dispatchEvent(new CustomEvent('particle-pick', { detail: { symbol, colour }, bubbles: true })));
    if (row) infoBox.appendChild(row);
    return entry;
}

function categoryElement({ category, title, badge, color, groups }) {
    const box = document.createElement('div');
    box.className = `category ${category}`;

    const heading = document.createElement('h2');
    heading.innerHTML = `<i class="fas fa-circle" style="color: ${color};"></i> ${title}`;
    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = badge;
    heading.appendChild(count);
    box.appendChild(heading);

    for (const group of groups) {
        const wrap = document.createElement('div');
        wrap.className = 'particle-group';
        if (group.label) {
            const label = document.createElement('div');
            label.className = 'group-label';
            label.textContent = group.label;
            wrap.appendChild(label);
        }
        for (const row of group.rows) {
            const card = document.createElement('div');
            card.className = 'particle';
            row.forEach((symbol, i) => {
                const el = entryElement(symbol, category[0].toUpperCase() + category.slice(1), i > 0);
                if (el) card.appendChild(el);
            });
            wrap.appendChild(card);
        }
        box.appendChild(wrap);
    }
    return box;
}

/**
 * One boxed section per hadron group. Each group gets the same `.category` +
 * `<h2>` treatment as Quarks / Leptons / Bosons, so Mesons, Baryons and
 * Antibaryons read as three distinct sections instead of one long list.
 */
function hadronSection(group) {
    const symbols = Object.values(HADRONS).filter(h => h.group === group.group);
    if (!symbols.length) return null;

    const box = document.createElement('div');
    box.className = `category ${group.group}`;

    const heading = document.createElement('h2');
    heading.innerHTML = `<i class="fas fa-circle" style="color: ${group.color};"></i> ${group.title}`;
    const badge = document.createElement('span');
    badge.className = 'group-count';
    badge.textContent = group.badge;
    heading.appendChild(badge);
    box.appendChild(heading);

    const wrap = document.createElement('div');
    wrap.className = 'particle-group';
    for (const info of symbols) {
        const card = document.createElement('div');
        card.className = 'particle';
        const el = entryElement(info.symbol, group.group, false);
        if (el) card.appendChild(el);
        wrap.appendChild(card);
    }
    box.appendChild(wrap);
    return box;
}

/** Builds both tabs and wires the tab strip. */
export function renderParticlePanel(panelEl) {
    const strip = document.createElement('div');
    strip.className = 'tab-strip';
    strip.innerHTML = `
        <button class="tab-btn active" data-tab="elementary">Elementary</button>
        <button class="tab-btn" data-tab="hadrons">Hadrons</button>`;

    const elementaryView = document.createElement('div');
    elementaryView.className = 'tab-view';
    elementaryView.dataset.tab = 'elementary';
    for (const cat of ELEMENTARY_PANEL) elementaryView.appendChild(categoryElement(cat));

    const footnote = document.createElement('div');
    footnote.className = 'panel-note';
    footnote.innerHTML = `<span><i class="fas fa-table"></i> charge · mass</span><br>`
        + `<i class="fas fa-sync-alt"></i> ${SELF_CONJUGATE.join(', ')} are their own antiparticles<br>`
        + `Mass taken from F. Takahashi et al. (Particle Data Group), to be published in Int. J. Mod. Phys. A41, 2630011 (2026)`;
    elementaryView.appendChild(footnote);

    const hadronView = document.createElement('div');
    hadronView.className = 'tab-view';
    hadronView.dataset.tab = 'hadrons';
    hadronView.hidden = true;
    // Two views of the same catalogue: the SU(3)/SU(4) flavour multiplets in 3D, and the list.
    const viewSwitch = document.createElement('div');
    viewSwitch.className = 'ef-view';
    viewSwitch.innerHTML = '<button type="button" class="on" data-view="3d">Eightfold way (3D)</button><button type="button" data-view="list">List</button>';
    const efHost = document.createElement('div');
    const listHost = document.createElement('div');
    listHost.className = 'ef-list';
    listHost.hidden = true;
    hadronView.append(viewSwitch, efHost, listHost);
    viewSwitch.addEventListener('click', (e) => {
        const b = e.target.closest('[data-view]');
        if (!b) return;
        viewSwitch.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
        efHost.hidden = b.dataset.view !== '3d';
        listHost.hidden = b.dataset.view !== 'list';
    });
    mountEightfold(efHost, {
        onPick: (symbol) => panelEl.dispatchEvent(new CustomEvent('particle-pick', { detail: { symbol }, bubbles: true }))
    });
    for (const group of HADRON_PANEL) {
        const section = hadronSection(group);
        if (section) listHost.appendChild(section);
    }
    const hadronNote = document.createElement('div');
    hadronNote.className = 'panel-note';
    hadronNote.innerHTML = '<i class="fas fa-info-circle"></i> Drawn at quark level: valence quarks grouped by a brace, with the mediators built from the Standard Model vertices. '
        + 'Masses are the measured hadron masses, not the sum of the constituent quarks.';
    hadronView.appendChild(hadronNote);

    panelEl.append(strip, elementaryView, hadronView);

    strip.addEventListener('click', (event) => {
        const btn = event.target.closest('.tab-btn');
        if (!btn) return;
        strip.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
        panelEl.querySelectorAll('.tab-view').forEach(view => {
            view.hidden = view.dataset.tab !== btn.dataset.tab;
        });
    });
}

