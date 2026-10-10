// js/loops/explorer-css.js — styles for the loop explorer (lives in a shadow root so it cannot leak into the host page).
export default `.hname { font: 600 22px var(--sans); }
.ln.spec { opacity: .9; }
:host { all: initial; display: block; color: var(--ink); font: 14px/1.5 var(--sans);
   --bg: #eceff3; --surface: #f8fafb; --raise: #ffffff; --ink: #14202b; --muted: #566676; --rule: #d3dbe3; --grid: #dde4ea;
   --accent: #0b5d87; --accent-ink: #ffffff; --accent-soft: rgba(11, 93, 135, .13);
   --c-photon: #1d78b2; --c-z: #6b47a6; --c-w: #b2531b; --c-gluon: #956500; --c-higgs: #4d5964; --c-ghost: #76828e;
   --qed: #1d78b2; --qcd: #956500; --ew: #6b47a6; --warn: #9a3412; --warn-bg: #fdeadb;
   --serif: 'Newsreader', Georgia, 'Times New Roman', serif;
   --sans: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
   --mono: 'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace;
   --math: 'STIX Two Text', 'Cambria Math', Georgia, 'Times New Roman', serif;
}
*, *::before, *::after { box-sizing: border-box; }
h1, h2, h3, p, ul, figure { margin: 0; }
sub, sup { line-height: 0; }
.ov { text-decoration: overline; }
button, input, select { font: inherit; color: inherit; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

.eyebrow { font: 500 11px/1 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
h1 { font: 500 clamp(30px, 5vw, 44px)/1 var(--serif); letter-spacing: -.01em; text-wrap: balance; }
h1 em { font-style: italic; color: var(--accent); }
.lede { max-width: 56ch; color: var(--muted); font-size: 14px; }

.side { background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; }
.blk { padding: 16px; }
.blk + .blk { border-top: 1px solid var(--rule); }
h2 { font: 500 11px/1.2 var(--mono); letter-spacing: .09em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
input[type="search"], input[type="text"] { width: 100%; border: 1px solid var(--rule); background: var(--raise); border-radius: 5px; padding: 8px 10px; font: 13px var(--mono); }
.plist { list-style: none; padding: 0; margin: 8px -6px 0; max-height: 292px; overflow-y: auto; }
.pitem { display: block; width: 100%; text-align: left; background: none; border: 0; border-radius: 5px; padding: 7px 8px; cursor: pointer; }
.pitem:hover { background: var(--accent-soft); }
.pitem.on { background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent); }
.pn { display: block; font-size: 13px; font-weight: 500; }
.pf { display: block; font: 15px/1.3 var(--math); color: var(--muted); }
.pf .arrow { padding: 0 2px; }
.none { padding: 8px; color: var(--muted); font-size: 13px; }
.io { display: grid; grid-template-columns: 52px minmax(0, 1fr); gap: 8px; align-items: center; }
.io label { font-size: 12px; color: var(--muted); }
#palette { margin-top: 12px; display: grid; gap: 8px; }
.pgrp { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.pgl { flex: 0 0 100%; font: 500 10px/1 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 2px; }
.chip-b { min-width: 34px; height: 30px; padding: 0 7px; border: 1px solid var(--rule); background: var(--raise); border-radius: 5px; font: 16px/1 var(--math); cursor: pointer; }
.chip-b:hover { border-color: var(--accent); background: var(--accent-soft); }
.msg { margin-top: 10px; font-size: 12.5px; color: var(--muted); }
.msg.warn { color: var(--warn); background: var(--warn-bg); padding: 8px 10px; border-radius: 5px; }
.msg:empty { display: none; }

.stage { min-width: 0; display: grid; gap: 14px; }
.stagehead { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px; }
#title { font: 400 clamp(20px, 3vw, 26px)/1.2 var(--math); }
#title .arrow { padding: 0 4px; color: var(--muted); }
.kind { font: 12px var(--mono); color: var(--muted); }
.seg { display: flex; flex-wrap: wrap; gap: 0; border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; background: var(--raise); }
.seg button { border: 0; background: none; padding: 7px 12px; font: 15px/1.2 var(--math); cursor: pointer; border-right: 1px solid var(--rule); }
.seg button:last-child { border-right: 0; }
.seg button:hover { background: var(--accent-soft); }
.seg button.on { background: var(--accent); color: var(--accent-ink); }
.sel-l { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); min-width: 0; }
select { border: 1px solid var(--rule); background: var(--raise); border-radius: 5px; padding: 7px 8px; font-size: 13px; min-width: 0; max-width: 100%; }

.canvas { position: relative; border: 1px solid var(--rule); border-radius: 8px; background-color: var(--raise); background-image: radial-gradient(var(--grid) 1.1px, transparent 1.2px); background-size: 22px 22px; }
.svgwrap { overflow-x: auto; }
.fd { display: block; width: 100%; min-width: 620px; height: auto; }
.ln { fill: none; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.ln.fermion { stroke: var(--ink); }
.ln.photon { stroke: var(--c-photon); }
.ln.zboson { stroke: var(--c-z); }
.ln.wboson { stroke: var(--c-w); }
.ln.gluon { stroke: var(--c-gluon); stroke-width: 1.7; }
.ln.higgs { stroke: var(--c-higgs); stroke-dasharray: 7 5; }
.ln.goldstone { stroke: var(--c-higgs); stroke-dasharray: 2.5 3.5 7 3.5; }
.ln.ghost { stroke: var(--c-ghost); stroke-dasharray: .5 4.5; stroke-width: 2.4; }
.arw { fill: var(--ink); }
.vx { fill: var(--ink); }
.ct circle { fill: var(--raise); stroke: var(--accent); stroke-width: 1.8; }
.ct path { stroke: var(--accent); stroke-width: 1.8; fill: none; }
.lbl { font: italic 400 17px var(--math); fill: var(--ink); }
.lbl.ext { font-size: 20px; }
.axis path { stroke: var(--muted); fill: none; stroke-width: 1.2; }
.axis path:last-of-type { fill: var(--muted); }
.axis text { font: 11px var(--mono); fill: var(--muted); letter-spacing: .06em; }
.hit { fill: none; stroke: transparent; stroke-width: 16; pointer-events: stroke; cursor: help; }
.hit:hover { stroke: var(--accent-soft); }
.hit-v { fill: transparent; pointer-events: all; cursor: help; }
.hit-v:hover { fill: var(--accent-soft); }
.hl-edge { fill: none; stroke: var(--accent); stroke-opacity: .3; stroke-width: 12; stroke-linecap: round; }
.hl-vx { fill: var(--accent-soft); stroke: var(--accent); stroke-width: 1.5; }

.tip { position: absolute; z-index: 5; max-width: 340px; pointer-events: none; opacity: 0; transition: opacity .12s; background: var(--raise); border: 1px solid var(--rule); border-radius: 7px; padding: 10px 12px; box-shadow: 0 10px 28px rgba(8, 20, 32, .24); }
.tip.on { opacity: 1; }
.t-h { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 8px; font: 15px/1.3 var(--math); }
.chip { font: 500 10px/1 var(--mono); letter-spacing: .05em; text-transform: uppercase; color: var(--muted); border: 1px solid var(--rule); border-radius: 3px; padding: 3px 5px; }
.t-rule { font: italic 17px/1.4 var(--math); margin: 6px 0 4px; }
.pt { border-collapse: collapse; font: 12px/1.5 var(--mono); margin: 2px 0; }
.pt td { padding: 0 6px 0 0; }
.pt td:first-child { font-family: var(--math); font-size: 14px; }
.t-n { font-size: 12px; color: var(--muted); margin-top: 4px; }

.loopbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 12px 14px; background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; }
.lcount { display: flex; align-items: baseline; gap: 6px; padding-right: 14px; border-right: 1px solid var(--rule); }
.ln-n { font: 500 34px/1 var(--serif); font-variant-numeric: tabular-nums; }
.ln-t { font: 11px var(--mono); text-transform: uppercase; letter-spacing: .06em; color: var(--muted); }
.lsel { display: grid; gap: 4px; flex: 1 1 260px; min-width: 0; }
.lsel select { width: 100%; }
.btns { display: flex; flex-wrap: wrap; gap: 8px; }
.btn { border: 1px solid var(--rule); background: var(--raise); border-radius: 5px; padding: 8px 13px; cursor: pointer; font-size: 13px; }
.btn:hover:not(:disabled) { border-color: var(--accent); }
.btn:disabled, select:disabled { opacity: .45; cursor: not-allowed; }
.btn.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); font-weight: 600; }
.chk { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); cursor: pointer; }
.capnote { flex: 1 0 100%; font-size: 12px; color: var(--muted); }
.capnote:empty { display: none; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1px; background: var(--rule); border: 1px solid var(--rule); border-radius: 6px; overflow: hidden; }
.stats div { background: var(--surface); padding: 8px 12px; min-width: 0; }
.stats span { display: block; font: 10px/1.2 var(--mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
.stats b { font: 500 17px/1.2 var(--math); font-variant-numeric: tabular-nums; }
.empty { border: 1px dashed var(--rule); border-radius: 8px; padding: 40px 20px; color: var(--muted); background: var(--surface); }
.empty p { max-width: 54ch; font-size: 14px; }
.ctrow h3, .rcard h3 { font: 500 18px/1.2 var(--serif); margin-bottom: 8px; }
.ctgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; }
.ctf { border: 1px solid var(--rule); border-radius: 8px; background: var(--raise); padding: 8px; min-width: 0; }
.ctf svg { width: 100%; min-width: 0; height: auto; display: block; }
.ctf figcaption, .ctn { font-size: 12px; color: var(--muted); padding: 4px 4px 0; }

.reno { margin-top: 30px; padding-top: 20px; border-top: 1px solid var(--rule); }
.reno > h2 { margin-bottom: 14px; }
.rgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr)); gap: 16px; align-items: start; }
.rcard { background: var(--surface); border: 1px solid var(--rule); border-radius: 8px; padding: 16px; min-width: 0; }
.rn { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.ri { padding: 10px 0; border-top: 1px solid var(--rule); }
.ri:first-of-type { border-top: 0; padding-top: 2px; }
.rh { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 10px; font: 15px/1.35 var(--math); }
.rf { margin-left: auto; color: var(--muted); }
.re { font-size: 13px; margin-top: 5px; overflow-wrap: anywhere; }
.re.m, .m { font-family: var(--math); font-size: 15px; }
.re.note { color: var(--muted); font-size: 12px; }
.k { font: 10px var(--mono); text-transform: uppercase; letter-spacing: .07em; color: var(--muted); margin-right: 6px; }
.tag { font: 500 10px/1 var(--mono); letter-spacing: .05em; text-transform: uppercase; border: 1px solid currentColor; border-radius: 3px; padding: 3px 5px; }
.tag.qed { color: var(--qed); } .tag.qcd { color: var(--qcd); } .tag.ew { color: var(--ew); } .tag.box { color: var(--muted); }
.conv { padding-left: 18px; display: grid; gap: 6px; font-size: 13px; color: var(--muted); }
@media (max-width: 880px) { .grid { grid-template-columns: minmax(0, 1fr); } .lcount { border-right: 0; padding-right: 0; } }
@media (prefers-reduced-motion: reduce) { .tip { transition: none; } }

/* Matched to the host page: its fonts, ink, legend colours (photon orange, W red, Z purple, gluon green) and dashed cards. */
:host {
  --bg: #f7f5ee; --surface: rgba(255, 255, 255, .62); --raise: #fffdf8; --ink: #1b221c; --muted: #5b6770; --rule: #d6dacf; --grid: #e3e6dc;
  --accent: #1f5e8e; --accent-ink: #ffffff; --accent-soft: rgba(31, 94, 142, .12);
  --c-photon: #b45309; --c-z: #8e44ad; --c-w: #e74c3c; --c-gluon: #27ae60; --c-higgs: #4d5964; --c-ghost: #7a868e;
  --qed: #b45309; --qcd: #27ae60; --ew: #8e44ad; --warn: #9a3412; --warn-bg: #fdeadb;
  --sans: 'Segoe UI', Roboto, system-ui, -apple-system, sans-serif;
  --serif: 'Segoe UI', Roboto, system-ui, sans-serif;
  --mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
  color-scheme: light;
}
.ln.two { stroke-width: 1.7; }
.cflow .lbl { font-size: 17px; }
`;
