// Shared helpers for every Explorables page. Plain functions; the build strips `export`.
// Shared helpers, YouTube links, the lecture timeline and the "I'm at" jump box.
export const NS = "http://www.w3.org/2000/svg";
export const RM = typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
export function S(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
export function T(parent, x, y, txt, cls, anchor) {
  const t = S("text", { x, y, class: cls || "lbl", "text-anchor": anchor || "start" }, parent);
  t.textContent = txt;
  return t;
}
// Python-style float repr (shortest round-trip, exponent padded like Python)
export function py(x) {
  if (!Number.isFinite(x)) return String(x);
  if (x === 0) return Object.is(x, -0) ? "-0.0" : "0.0";
  const a = Math.abs(x);
  if (Number.isInteger(x) && a < 1e16) return x.toFixed(1);
  const s = (a < 1e-4 || a >= 1e16) ? x.toExponential() : String(x);
  return s.replace(/e([+-])(\d)$/, "e$10$2");
}
export const f4 = v => (Object.is(v, -0) ? 0 : v).toFixed(4);
export const f2 = v => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
export const sleep = ms => new Promise(r => setTimeout(r, RM ? 0 : ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = p => (p < .5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);
export function tween(ms, fn) {
  if (RM || ms <= 0) { fn(1); return Promise.resolve(); }
  const t0 = performance.now();
  return new Promise(res => {
    function fr(now) {
      const p = Math.min(1, (now - t0) / ms);
      fn(p);
      if (p < 1) requestAnimationFrame(fr); else res();
    }
    requestAnimationFrame(fr);
  });
}
export function fmtTime(s) {
  s = Math.round(s);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (h ? h + ":" + String(m).padStart(2, "0") : String(m)) + ":" + String(sec).padStart(2, "0");
}
export function parseTime(str) {
  str = (str || "").trim().replace(/\s/g, "");
  if (!str) return null;
  const p = str.split(":").map(Number);
  if (p.some(n => !Number.isFinite(n) || n < 0)) return null;
  if (p.length === 1) return p[0] * 60;
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}
export const ytUrl = (refs, key, t) => "https://www.youtube.com/watch?v=" + refs[key] + (t != null ? "&t=" + t + "s" : "");
// Hooks that pictures expose so the follow-along and auto-play can drive them.
export const DEMO = {};
// While the page drives a picture itself, its clicks must not count as "you're busy".
export const AUTO = { driving: false, play: true };
// "demo:name(2, 3, #sel)" becomes a call to DEMO.name(2, 3, "#sel"); anything else returns null
export function demoStep(s) {
  const m = typeof s === "string" && /^demo:(\w+)\((.*)\)$/.exec(s);
  if (!m) return null;
  const args = m[2].trim() ? m[2].split(",").map(a => a.trim()).map(a => (a !== "" && isFinite(+a) ? +a : a.replace(/^['"]|['"]$/g, ""))) : [];
  return () => { if (DEMO[m[1]]) DEMO[m[1]](...args); };
}
// Click a list of buttons (CSS selectors), run "demo:" steps or call functions, one after another.
export async function drive(steps, gap) {
  AUTO.driving = true;
  try {
    for (const s of steps) {
      const fn = typeof s === "function" ? s : demoStep(s);
      if (fn) fn();
      else { const el = document.querySelector(s); if (el && !el.disabled) el.click(); }
      await sleep(gap ?? 650);
    }
  } finally { setTimeout(() => { AUTO.driving = false; }, 300); }
}
// Click a play/spin button only when it isn't already running.
DEMO.ensurePlaying = sel => {
  const b = typeof document !== "undefined" && document.querySelector(sel);
  if (b && !/Stop|Pause/.test(b.textContent)) b.click();
};
// Run one module; a failure in one picture must not break the rest of the page.
export function safe(name, fn) {
  try { fn(); } catch (e) { console.error("[" + name + "]", e); }
}
export function marker(svg, id, cls) {
  let defs = svg.querySelector("defs");
  if (!defs) defs = S("defs", null, svg);
  const m = S("marker", { id, viewBox: "0 0 10 10", refX: "9", refY: "5", markerWidth: "7", markerHeight: "7", orient: "auto-start-reverse" }, defs);
  S("path", { d: "M0,0 L10,5 L0,10 z", class: cls || "mk" }, m);
  return "url(#" + id + ")";
}
// Small seeded RNG so "random" weights are the same every reset with the same seed.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Run fn once the element first scrolls near the screen (saves WebGL work until needed).
export function whenNear(el, fn) {
  if (!("IntersectionObserver" in window)) { fn(); return; }
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); }
  }, { rootMargin: "600px 0px" });
  io.observe(el);
}


