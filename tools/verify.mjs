#!/usr/bin/env node
// Check a built page against its plan.
//
//   node tools/verify.mjs <pageDir> [--screens <dir>]
//
// Static checks always run: the plan is valid, the script parses, only allowlisted outside
// files load, the page has <main> and <header> landmarks, every timed moment sits in one of its
// own section's chapters, and every planned section, moment and simple #id target exists.
// Browser checks run in headless Chrome or Edge when one is found: no console errors, every
// anchor and action target resolves, every button can be clicked, every theme renders,
// no sideways scroll at phone width, and the page survives storage being blocked.
import { readFileSync, writeFileSync, existsSync, mkdirSync, mkdtempSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL, fileURLToPath } from "node:url";
import { validatePlan, pageConfig } from "./plan.mjs";
import { chapterAt } from "../lib/js/follow-core.js";
import { findBrowser, launch, chromePathProblem } from "./cdp.mjs";

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
const SKINS = ["auto", "field-dark", "chalk", "notebook-light", "notebook-dark", "manim"];
const read = p => readFileSync(p, "utf8").replace(/^﻿/, "");
// ids go into a RegExp, so their special characters must be literal
const reEsc = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const simpleId = s => /^#[\w-]+$/.test(s);
const steps = list => (list || []).filter(s => typeof s === "string" && !s.startsWith("demo:"));

export function staticChecks(pageDir) {
  const problems = [];
  const plan = JSON.parse(read(join(pageDir, "plan.json")));
  problems.push(...validatePlan(plan).map(p => "plan: " + p));
  const last = join(pageDir, ".last-build");
  const file = existsSync(last) ? read(last).trim() : join(pageDir, "index.html");
  if (!existsSync(file)) return { plan, problems: [...problems, "the built page is missing: run build first"] };
  const html = read(file);
  // the inline script parses
  const js = html.split("<script>\n").pop().split("</script>")[0];
  const tmp = join(mkdtempSync(join(tmpdir(), "explorables-")), "page.js");
  writeFileSync(tmp, js);
  const chk = spawnSync(process.execPath, ["--check", tmp], { encoding: "utf8" });
  if (chk.status !== 0) problems.push("script does not parse: " + (chk.stderr.split("\n").find(l => /Error/.test(l)) || chk.stderr.trim()));
  // only allowlisted outside files
  for (const m of html.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)) if (m[1] !== THREE_URL) problems.push(`script from a host that isn't allowed: ${m[1]}`);
  for (const m of html.matchAll(/<link[^>]*\shref="(https?:[^"]+)"/g)) if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com(\/|$)/.test(m[1])) problems.push(`stylesheet from a host that isn't allowed: ${m[1]}`);
  for (const m of html.matchAll(/<(img|iframe|video|audio|source|embed|object)[^>]*\ssrc="(https?:[^"]+)"/g)) problems.push(`outside ${m[1]} not allowed: ${m[2]}`);
  // landmarks: screen readers jump by them
  if (!/<main[\s>]/.test(html)) problems.push("the page has no <main> landmark (wrap the sections in <main>)");
  if (!/<header[\s>]/.test(html)) problems.push("the page has no <header> landmark (the follow bar's <header class=\"top\">)");
  // every timed moment sits inside one of its own section's chapters
  if (plan.source && plan.source.kind === "video") {
    const { chapters } = pageConfig(plan);
    for (const s of plan.sections || []) {
      if (!chapters.some(c => c[2] === s.id)) continue;
      for (const m of s.moments || []) {
        if (typeof m.t !== "number" || !chapters.length) continue;
        if (m.t < chapters[0][0]) { problems.push(`moment ${m.t} of ${s.id} is before the first chapter (${chapters[0][0]})`); continue; }
        const owner = chapters[chapterAt(chapters, m.t)][2];
        if (owner !== s.id) problems.push(`moment ${m.t} of ${s.id} falls in a chapter of ${owner}, not of its own section`);
      }
    }
  }
  // planned sections and moments exist
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  for (const s of plan.sections || []) {
    const start = html.search(new RegExp(`<section[^>]*\\sid="${reEsc(s.id)}"`));
    if (start < 0) { problems.push(`section ${s.id} is in the plan but not in the page`); continue; }
    const rest = html.slice(start + 8), end = rest.search(/<section[\s>]|<\/main>/);
    const body = end < 0 ? rest : rest.slice(0, end);
    for (const m of s.moments || []) {
      if (m.t != null && !body.includes(`data-t="${m.t}"`)) problems.push(`moment ${m.t} of ${s.id} has no .moments link in the page`);
      if (m.anchor && m.anchor.startsWith("#") && simpleId(m.anchor) && !ids.has(m.anchor.slice(1))) problems.push(`anchor of moment ${m.t} points at ${m.anchor}, which isn't in the page`);
      for (const a of steps(m.action)) if (simpleId(a) && !ids.has(a.slice(1))) problems.push(`action of moment ${m.t} clicks ${a}, which isn't in the page`);
    }
  }
  for (const [id, list] of Object.entries(plan.intro || {})) {
    if (!ids.has(id)) problems.push(`intro picture ${id} isn't in the page`);
    for (const a of steps(list)) if (simpleId(a) && !ids.has(a.slice(1))) problems.push(`intro of ${id} clicks ${a}, which isn't in the page`);
  }
  return { plan, problems };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
async function loaded(b, extra = 1200) {
  for (let i = 0; i < 100; i++) {
    const r = await b.send("Runtime.evaluate", { expression: "document.readyState", returnByValue: true }).catch(() => null);
    if (r && r.result && r.result.value === "complete") break;
    await wait(100);
  }
  await wait(extra);
}
const evalJSON = async (b, expr) => (await b.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

export async function browserChecks(pageDir, plan, { screens } = {}) {
  const bad = chromePathProblem();
  if (bad) throw new Error(bad);
  const path = findBrowser();
  if (!path) return { skipped: "no Chrome or Edge found (set CHROME_PATH to use one)" };
  if (typeof WebSocket === "undefined") return { skipped: "needs Node 22 or newer" };
  const problems = [];
  const b = await launch(path, { width: 1280, height: 860 });
  let phase = "load";
  const errors = [];
  b.on("Runtime.exceptionThrown", p => errors.push(`${phase}: ${(p.exceptionDetails.exception && p.exceptionDetails.exception.description || p.exceptionDetails.text).split("\n")[0]}`));
  b.on("Runtime.consoleAPICalled", p => { if (p.type === "error") errors.push(`${phase}: console.error ${p.args.map(a => a.value ?? a.description ?? "").join(" ").slice(0, 200)}`); });
  try {
    await b.send("Page.enable"); await b.send("Runtime.enable");
    const preview = join(pageDir, ".preview.html");
    await b.send("Page.navigate", { url: pathToFileURL(preview).href });
    await loaded(b, 1800);
    // anchors, action targets and intro targets resolve
    const data = [];
    for (const s of plan.sections || []) for (const m of s.moments || []) data.push({ sec: s.id, t: m.t, anchor: m.anchor || null, action: steps(m.action) });
    const intro = Object.entries(plan.intro || {}).map(([id, list]) => ({ id, action: steps(list) }));
    phase = "targets";
    const missing = await evalJSON(b, `(() => {
      const data = ${JSON.stringify(data)}, intro = ${JSON.stringify(intro)}, out = [];
      const q = s => { try { return document.querySelector(s); } catch (e) { return null; } };
      for (const m of data) {
        const sec = document.getElementById(m.sec);
        if (m.anchor && m.anchor.startsWith("#") && !q(m.anchor)) out.push("anchor of moment " + m.t + " points at " + m.anchor + ", which isn't in the page");
        const mm = m.anchor && /^means:(\\d+)$/.exec(m.anchor);
        if (mm && sec) { const p = sec.querySelector(".prose"); if (!p || p.querySelectorAll("li").length < +mm[1]) out.push("anchor of moment " + m.t + " wants bullet " + mm[1] + " of " + m.sec + "'s explanation, which doesn't exist"); }
        for (const a of m.action) if (!q(a)) out.push("action of moment " + m.t + " clicks " + a + ", which isn't in the page");
      }
      for (const i of intro) for (const a of i.action) if (!q(a)) out.push("intro of " + i.id + " clicks " + a + ", which isn't in the page");
      return out;
    })()`);
    problems.push(...missing);
    // every visible button in the page can be clicked
    phase = "clicking buttons";
    const clicked = await evalJSON(b, `(async () => {
      const bs = [...document.querySelectorAll("main button")].filter(x => !x.disabled && x.offsetParent !== null);
      for (const x of bs) { try { x.click(); } catch (e) { console.error("click failed", x.id || x.textContent); } await new Promise(r => setTimeout(r, 40)); }
      return bs.length;
    })()`);
    await wait(1500);
    // every theme renders
    phase = "themes";
    if (screens) mkdirSync(screens, { recursive: true });
    for (const skin of SKINS) {
      await evalJSON(b, `(() => { ${skin === "auto" ? 'document.documentElement.removeAttribute("data-skin")' : `document.documentElement.setAttribute("data-skin", ${JSON.stringify(skin)})`}; window.scrollTo(0, 0); return 1; })()`);
      await wait(300);
      if (screens) {
        const shot = await b.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(join(screens, `${skin}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    // phone width: no sideways scroll
    phase = "phone width";
    await b.send("Emulation.setDeviceMetricsOverride", { width: 375, height: 812, deviceScaleFactor: 1, mobile: true });
    await b.send("Page.reload"); await loaded(b, 1200);
    const wide = await evalJSON(b, "document.documentElement.scrollWidth - window.innerWidth");
    if (wide > 1) problems.push(`at 375px wide the page scrolls sideways by ${wide}px`);
    await b.send("Emulation.clearDeviceMetricsOverride");
    // storage blocked (a data: URL has no localStorage)
    phase = "storage blocked";
    const html = read(preview);
    await b.send("Page.navigate", { url: "data:text/html;charset=utf-8;base64," + Buffer.from(html).toString("base64") });
    await loaded(b, 1500);
    problems.push(...errors);
    return { problems, clicked };
  } finally { await b.close(); }
}

async function main(argv) {
  const dir = argv[0] && resolve(argv[0]);
  if (!dir) { console.error("usage: verify.mjs <pageDir> [--screens <dir>]"); process.exit(2); }
  const i = argv.indexOf("--screens"), screens = i >= 0 ? resolve(argv[i + 1]) : undefined;
  const st = staticChecks(dir);
  console.log(st.problems.length ? `static: ${st.problems.length} problem(s)` : "static: ok");
  st.problems.forEach(p => console.log("  - " + p));
  let failed = st.problems.length > 0;
  if (!existsSync(join(dir, ".preview.html"))) { console.log("browser: skipped (no .preview.html: run build first)"); process.exit(failed ? 1 : 0); }
  try {
    const br = await browserChecks(dir, st.plan, { screens });
    if (br.skipped) console.log(`browser: skipped (${br.skipped})`);
    else {
      console.log(br.problems.length ? `browser: ${br.problems.length} problem(s)` : `browser: ok (${br.clicked} buttons clicked, ${SKINS.length} themes${screens ? ", screenshots in " + screens : ""})`);
      br.problems.forEach(p => console.log("  - " + p));
      failed = failed || br.problems.length > 0;
    }
  } catch (e) {
    // a browser that exists but fails is not a skip: nothing was checked in it
    console.log(`browser: could not run (${e.message}); the page was not checked in a browser`);
    failed = true;
  }
  process.exit(failed ? 1 : 0);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
