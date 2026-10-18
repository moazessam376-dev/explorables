import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "tests", ".out");
const build = (...args) => spawnSync(process.execPath, [join(root, "tools", "build.mjs"), ...args], { encoding: "utf8" });
const THREE = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";

test("builds the mini page into one self-contained file", () => {
  mkdirSync(out, { recursive: true });
  const file = join(out, "mini.html");
  const r = build("page", join(root, "tests/fixtures/mini-page"), "--out", file);
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(file, "utf8");
  assert.ok(html.startsWith("<title>Mini</title>"));
  assert.ok(html.includes("const PAGE ="));
  assert.ok(!/^\s*(import|export) /m.test(html), "no import/export lines left");
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(srcs, [THREE]);
  assert.ok(html.includes("Mini <small>Test lecture</small>"));
  assert.ok(html.includes("Before you start: Before you press play"));
  // the inline script parses
  const js = html.split("<script>\n")[1].split("</script>")[0];
  const tmp = join(out, "mini.js");
  writeFileSync(tmp, js);
  execFileSync(process.execPath, ["--check", tmp]);
});

test("renamed imports are refused, because the page shares one scope", async () => {
  const { stripModules } = await import("../tools/build.mjs");
  assert.throws(() => stripModules('import { idxAt as idxIn } from "./follow-core.js";\nidxIn([], 1);'), /renamed import/);
  assert.doesNotThrow(() => stripModules('import { idxAt,\n  chapterAt } from "./follow-core.js";'));
  assert.throws(() => stripModules('import * as core from "./core.js";'), /renamed import/);
});

test("stripping an import never swallows the code after it", async () => {
  const { stripModules } = await import("../tools/build.mjs");
  const out = stripModules('import { a } from "./a.js"; // helper\nconst x = 1;\nimport { b,\n  c } from "./b.js";\nconst y = 2;');
  assert.match(out, /const x = 1;/);
  assert.match(out, /const y = 2;/);
  assert.doesNotMatch(out, /import/);
});

test("the build is deterministic", () => {
  const a = join(out, "a.html"), b = join(out, "b.html");
  build("page", join(root, "tests/fixtures/mini-page"), "--out", a);
  build("page", join(root, "tests/fixtures/mini-page"), "--out", b);
  assert.equal(readFileSync(a, "utf8"), readFileSync(b, "utf8"));
});

test("an invalid plan stops the build and names the problem", () => {
  const dir = join(out, "bad-page");
  rmSync(dir, { recursive: true, force: true });
  cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
  const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
  plan.sections[2].id = "s-a";
  writeFileSync(join(dir, "plan.json"), JSON.stringify(plan));
  const r = build("page", dir, "--out", join(out, "bad.html"));
  assert.equal(r.status, 1);
  assert.match(r.stderr, /s-a/);
});
