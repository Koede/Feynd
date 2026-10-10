// js/loops/symbols.js
// Translates between the site's Unicode particle symbols ('e⁻', 'ν̄μ', 'Z⁰', 'h') and
// the loop engine's ids ('e-', 'nubar_mu', 'Z', 'H').

import { FV } from './engine.js';

const BASE = {
    'e': 'e-', 'μ': 'mu-', 'τ': 'tau-',
    'u': 'u', 'd': 'd', 'c': 'c', 's': 's', 't': 't', 'b': 'b',
    'νe': 'nu_e', 'νμ': 'nu_mu', 'ντ': 'nu_tau',
    'γ': 'gamma', 'g': 'g', 'Z': 'Z', 'h': 'H', 'W': 'W'
};

/** Site symbol -> engine id, or null when the engine has no such particle (hadrons, etc). */
export function toEngineId(symbol) {
    let s = String(symbol).normalize('NFD');
    let bar = false;
    if (/[̄¯]/.test(s)) { bar = true; s = s.replace(/[̄¯]/g, ''); }
    let charge = '';
    s = s.replace(/[⁺⁻]/g, (c) => { charge = c === '⁺' ? '+' : '-'; return ''; });
    s = s.replace(/⁰/g, '');
    const base = BASE[s];
    if (!base) return null;
    let id = base;
    if (s === 'W') id = charge === '+' ? 'W+' : 'W-';
    else if (charge === '+' && /^(e|mu|tau)-$/.test(base)) id = base.replace('-', '+');
    else if (bar) id = FV.anti(base);
    if (!FV.P[id]) return null;
    return id;
}

/** Engine ids for a whole list, or null if any particle is unsupported. */
export function toEngineIds(symbols) {
    const out = [];
    for (const s of symbols) {
        const id = toEngineId(s);
        if (!id) return null;
        out.push(id);
    }
    return out;
}

/** True when the loop explorer can handle this process. */
export function loopSupported(initial, final) {
    if (!initial.length || !final.length) return false;
    const a = toEngineIds(initial), b = toEngineIds(final);
    if (!a || !b) return false;
    if (FV.checkConservation(a, b).length) return false;
    return FV.generate(a, b).bases.length > 0;
}

// engine id -> the page's symbol
import { PARTICLES } from '../particles.js';
const SITE = {};
Object.keys(PARTICLES).forEach(s => { const id = toEngineId(s); if (id && !SITE[id]) SITE[id] = s; });
export function toSiteSymbol(id) { return SITE[id] || null; }
export const SITE_SYMBOLS = Object.keys(PARTICLES);
