import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { findBrowser } from "../tools/cdp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const out = join(root, "tests", ".out");
const node = (args, env = {}) => spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, ...env }, timeout: 120000 });
const build = dir => node([join(root, "tools/build.mjs"), "page", dir]);
const verify = (dir, env) => node([join(root, "tools/verify.mjs"), dir], env);

function freshCopy(name, edit) {
  const dir = join(out, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
  if (edit) {
    const plan = JSON.parse(readFileSync(join(dir, "plan.json"), "utf8"));
    edit(plan);
    writeFileSync(join(dir, "plan.json"), JSON.stringify(plan, null, 2));
  }
  assert.equal(build(dir).status, 0);
  return dir;
}

test("static checks run when no browser is found", () => {
  const dir = freshCopy("v-static");
  const r = verify(dir, { EXPLORABLES_NO_BROWSER: "1" });
  assert.match(r.stdout, /browser: skipped/);
  assert.match(r.stdout, /static: ok/);
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("verify finds a page that was built to a custom --out path", () => {
  const dir = join(out, "v-out");
  rmSync(dir, { recursive: true, force: true });
  cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
  const target = join(out, "v-out-built.html");
  assert.equal(node([join(root, "tools/build.mjs"), "page", dir, "--out", target]).status, 0);
  const r = verify(dir, { EXPLORABLES_NO_BROWSER: "1" });
  assert.match(r.stdout, /static: ok/);
  assert.equal(r.status, 0, r.stdout);
});

test("reports missing anchor and missing action target", () => {
  const dir = freshCopy("v-missing", p => {
    p.sections[1].moments[1].anchor = "#nope";
    p.sections[1].moments[1].action = ["#gone"];
  });
  const r = verify(dir, { EXPLORABLES_NO_BROWSER: "1" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /#nope/);
  assert.match(r.stdout, /#gone/);
});

test("a section in the plan but not in the page is reported", () => {
  const dir = freshCopy("v-nosection", p => {
    p.sections.push({ id: "s-ghost", title: "Ghost", chapter: [200, "ghost"], pictures: [{ id: "g", proves: "x" }], moments: [{ t: 200, text: "boo" }] });
  });
  const r = verify(dir, { EXPLORABLES_NO_BROWSER: "1" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /s-ghost/);
});

test("the fixture passes in a real browser", { skip: !findBrowser() && "no Chrome or Edge on this machine" }, () => {
  const dir = freshCopy("v-browser");
  const r = verify(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /browser: ok/);
});
