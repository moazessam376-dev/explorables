// The course home: every part of a course with its status, links to the finished pages,
// and where the learner is. Built from <courseDir>/course.json, which Claude keeps up to date
// during the study step (pages can't write to it).
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const STATUSES = ["not-started", "page-ready", "done"];
const LABEL = { "not-started": "not started", "page-ready": "page ready", "done": "done" };
const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const read = p => readFileSync(p, "utf8").replace(/^﻿/, "");

export function validateCourse(c) {
  const out = [];
  if (!c || !c.id || !c.title) out.push("course needs an id and a title");
  const parts = Array.isArray(c?.parts) ? c.parts : [];
  if (!parts.length) out.push("course has no parts");
  const ids = new Set();
  for (const p of parts) {
    if (!p.id) { out.push("a part has no id"); continue; }
    if (ids.has(p.id)) out.push(`duplicate part id ${p.id}`);
    ids.add(p.id);
    if (!STATUSES.includes(p.status)) out.push(`part ${p.id} has unknown status "${p.status}" (use ${STATUSES.join(", ")})`);
    if (p.status !== "not-started" && !p.page) out.push(`part ${p.id} is ${p.status} but has no page`);
  }
  if (c?.current && !ids.has(c.current)) out.push(`current part ${c.current} is not in parts`);
  return out;
}

export function renderCourseHome(c) {
  const problems = validateCourse(c);
  if (problems.length) throw new Error("course.json has problems:\n- " + problems.join("\n- "));
  const done = c.parts.filter(p => p.status === "done").length;
  const rows = c.parts.map((p, i) => {
    const name = p.status === "not-started" ? `<span class="pname">${esc(p.title)}</span>` : `<a class="pname" href="${esc(p.page)}">${esc(p.title)}</a>`;
    const notes = p.notes ? `<p class="pnotes">${esc(p.notes)}</p>` : "";
    return `<li class="part${p.id === c.current ? " current" : ""}" data-part="${esc(p.id)}"><span class="pnum">${String(i + 1).padStart(2, "0")}</span><div class="pbody">${name}${notes}</div><span class="chip ${p.status}">${LABEL[p.status]}</span></li>`;
  }).join("\n");
  const head = read(join(ROOT, "templates/page/head.html")).replace("{{title}}", esc(c.title));
  const css = read(join(ROOT, "lib/css/themes.css")) + "\n" + read(join(ROOT, "lib/css/base.css"));
  return head + `<style>\n${css}\n${COURSE_CSS}\n</style>
<header class="top"><div class="wrap"><div class="top-row">
  <div class="brand">${esc(c.title)} <small>course home</small></div>
  <select class="skin" id="skin" aria-label="Theme">
    <option value="auto">Field Manual (auto)</option><option value="field-light">Field Manual · light</option><option value="field-dark">Field Manual · dark</option>
    <option value="chalk">Chalkboard</option><option value="notebook-light">Notebook · light</option><option value="notebook-dark">Notebook · dark</option><option value="manim">Manim Night</option>
  </select>
</div></div></header>
<main class="wrap">
  <div class="intro"><div class="eyebrow">${done} of ${c.parts.length} parts done</div><h1>${esc(c.title)}</h1>
  <p>Each part gets its own companion page when you reach it. Tell Claude when you finish one, and it runs a short out-loud quiz, marks it done here, and builds the next page.</p></div>
  <ol class="parts">
${rows}
  </ol>
</main>
<script>
(() => { const sel = document.getElementById("skin"), k = ${JSON.stringify(c.id + ":skin")};
  const apply = v => v === "auto" ? document.documentElement.removeAttribute("data-skin") : document.documentElement.setAttribute("data-skin", v);
  let v = "auto"; try { v = localStorage.getItem(k) || "auto"; } catch (e) { /* storage off */ }
  sel.value = v; apply(v);
  sel.addEventListener("change", () => { apply(sel.value); try { localStorage.setItem(k, sel.value); } catch (e) { /* storage off */ } });
})();
</script>
`;
}

const COURSE_CSS = `
.parts{list-style:none;margin:24px 0 60px;padding:0;display:grid;gap:10px;max-width:820px}
.part{display:grid;grid-template-columns:3em minmax(0,1fr) auto;gap:14px;align-items:center;background:var(--panel);border:1px var(--line) var(--rule);border-radius:var(--r);padding:14px 16px}
.part.current{border:2px solid var(--nudge)}
.pnum{font:600 .9rem var(--f-mono);color:var(--muted)}
.pname{font:700 1.05rem var(--f-display);text-transform:var(--h-case);color:var(--ink);text-decoration:none}
a.pname:hover{color:var(--data)}
.pnotes{margin:4px 0 0;font-size:.9rem;color:var(--muted)}
.chip{font:700 .72rem var(--f-body);letter-spacing:.06em;text-transform:uppercase;padding:3px 9px;border-radius:999px;border:1px solid var(--rule);color:var(--muted);white-space:nowrap}
.chip.done{border-color:var(--ok);color:var(--ok)}
.chip.page-ready{border-color:var(--data);color:var(--data)}
`;

export function buildCourse(courseDir) {
  const c = JSON.parse(read(join(courseDir, "course.json")));
  writeFileSync(join(courseDir, "index.html"), renderCourseHome(c));
  console.log(`built ${join(courseDir, "index.html")}`);
}
