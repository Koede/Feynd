// js/loops/worker.js
// Runs the diagram searches off the main thread so the page stays responsive during
// long combinatorial searches. Messages:
//   in : { id, type: 'build', initial, final, opts } | { id, type: 'discover', initial, opts }
//   out: { id, type: 'progress', text, done, total } | { id, type: 'group', group }
//        { id, type: 'result', data } | { id, type: 'error', message }

import { buildRuleDiagrams } from './build.js';
import { discover } from './discovery.js';

function strip(obj) {
    // diagrams are plain data already; this drops functions defensively
    return JSON.parse(JSON.stringify(obj));
}

self.onmessage = (ev) => {
    const msg = ev.data || {};
    const post = (o) => self.postMessage(Object.assign({ id: msg.id }, o));
    try {
        if (msg.type === 'build') {
            const data = buildRuleDiagrams(msg.initial, msg.final, Object.assign({}, msg.opts, {
                onProgress: (text) => post({ type: 'progress', text })
            }));
            post({ type: 'result', data: strip(data) });
        } else if (msg.type === 'discover') {
            let last = 0;
            const data = discover(msg.initial, Object.assign({}, msg.opts, {
                onProgress: (done, total, text) => { const t = Date.now(); if (t - last > 150) { last = t; post({ type: 'progress', done, total, text }); } },
                onGroup: (g) => post({ type: 'group', group: strip(g) })
            }));
            post({ type: 'result', data: strip(data) });
        }
    } catch (e) {
        post({ type: 'error', message: String(e && e.stack || e) });
    }
};
