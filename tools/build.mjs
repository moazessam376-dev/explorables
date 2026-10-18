#!/usr/bin/env node
// Build an Explorables page into one self-contained HTML file.
//
//   node tools/build.mjs page <pageDir> [--lib <libDir>] [--out <file>]
//   node tools/build.mjs course <courseDir>
//
// A page dir holds plan.json and src/ (body.html, optional page.css, optional js/*.js).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePlan, pageConfig } from "./plan.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
// lib scripts, in the order they must run
export const LIB_ORDER = ["core", "controls", "three-stage", "graph2d", "links", "skin", "follow-core", "follow", "progress", "autoplay"];

export const readText = p => readFileSync(p, "utf8").replace(/^﻿/, "");
// lib files are ES modules for testing; on the page they share one script scope
export const stripModules = js => {
  // a renamed import (`a as b`) would leave `b` undefined once imports are stripped
  for (const m of js.matchAll(/^[ \t]*import[ \t]*(\{[^}]*\}|\*[ \t]*as[ \t]+[\w$]+)/gm)) {
    if (/\bas\b/.test(m[1])) throw new Error(`renamed import not supported (the page shares one scope): ${m[0].replace(/\s+/g, " ")}`);
  }
  return stripImportsExports(js);
};
// each pattern ends at its own from-string (plus an optional ; and // comment), so it can
// never run on into the code after it
const TAIL = String.raw`[ \t]*from[ \t]*["'][^"'\n]+["'][ \t]*;?(?:[ \t]*\/\/[^\n]*)?$`;
const stripImportsExports = js => js
  .replace(new RegExp(String.raw`^[ \t]*import[ \t]*\{[^}]*\}` + TAIL, "gm"), "")        // import { a, b } (may span lines)
  .replace(new RegExp(String.raw`^[ \t]*import[ \t]+[\w$]+` + TAIL, "gm"), "")            // import x from "..."
  .replace(/^[ \t]*import[ \t]*["'][^"'\n]+["'][ \t]*;?(?:[ \t]*\/\/[^\n]*)?$/gm, "")    // import "..."
  .split(/\r?\n/)
  .map(line => line.replace(/^export (default )?(?=(async )?function|const|let|var|class)/, ""))
  .join("\n");
const fill = (tpl, vars) => tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// JSON that is safe inside <script>
const scriptJSON = v => JSON.stringify(v).replace(/</g, "\\u003c");

export function buildPage(pageDir, { lib = join(ROOT, "lib"), out } = {}) {
  const plan = JSON.parse(readText(join(pageDir, "plan.json")));
  const problems = validatePlan(plan);
  if (problems.length) { const e = new Error("plan has problems"); e.problems = problems; throw e; }
  const PAGE = pageConfig(plan);
  const src = join(pageDir, "src");
  const pageCss = existsSync(join(src, "page.css")) ? readText(join(src, "page.css")) : "";
  const pageJsDir = join(src, "js");
  const pageJs = existsSync(pageJsDir) ? readdirSync(pageJsDir).filter(f => f.endsWith(".js")).sort()
    .map(f => `// ---- page: ${f} ----\n` + stripModules(readText(join(pageJsDir, f)))) : [];
  const libJs = LIB_ORDER.map(name => {
    const p = join(lib, "js", name + ".js");
    if (!existsSync(p)) throw new Error(`missing lib file ${p}`);
    return `// ---- lib: ${name}.js ----\n` + stripModules(readText(p));
  });
  const mustSec = plan.sections.find(s => s.id === (plan.mustRead || [])[0]);
  const vars = { title: esc(plan.title), subtitle: esc(plan.subtitle || ""), mustReadTitle: esc(mustSec ? mustSec.title : "the first section") };
  const html =
    fill(readText(join(ROOT, "templates/page/head.html")), vars) +
    "<style>\n" + readText(join(lib, "css/themes.css")) + "\n" + readText(join(lib, "css/base.css")) + "\n" + pageCss + "\n</style>\n" +
    fill(readText(join(ROOT, "templates/page/bar.html")), vars) + "\n" +
    readText(join(src, "body.html")) + "\n" +
    `<script src="${THREE_URL}"></script>\n` +
    "<script>\n(() => {\n\"use strict\";\nconst PAGE = " + scriptJSON(PAGE) + ";\n" +
    [...libJs, ...pageJs].join("\n") + "\n})();\n</script>\n";
  const file = out || join(pageDir, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  // remember where the page went, so verify finds it after a --out build
  writeFileSync(join(pageDir, ".last-build"), file);
  // the same page with the skeleton the artifact host adds, for opening locally
  writeFileSync(join(pageDir, ".preview.html"),
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    "</head><body>" + html + "</body></html>");
  return { file, bytes: Buffer.byteLength(html) };
}

function main(argv) {
  const [cmd, dir, ...rest] = argv;
  const opt = k => { const i = rest.indexOf(k); return i >= 0 ? rest[i + 1] : undefined; };
  if (cmd === "page" && dir) {
    try {
      const r = buildPage(resolve(dir), { lib: opt("--lib") && resolve(opt("--lib")), out: opt("--out") && resolve(opt("--out")) });
      console.log(`built ${r.file} (${Math.round(r.bytes / 1024)} KB)`);
    } catch (e) {
      if (e.problems) { console.error("plan.json has problems:\n- " + e.problems.join("\n- ")); process.exit(1); }
      console.error(e.message); process.exit(1);
    }
    return;
  }
  if (cmd === "course" && dir) {
    return import("./course.mjs").then(m => m.buildCourse(resolve(dir))).catch(e => { console.error(e.message); process.exit(1); });
  }
  console.error("usage: build.mjs page <pageDir> [--lib <libDir>] [--out <file>] | build.mjs course <courseDir>");
  process.exit(2);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
