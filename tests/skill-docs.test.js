import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const skill = join(root, "skills/explorables");
const read = p => readFileSync(p, "utf8");

test("SKILL.md has frontmatter naming the skill", () => {
  const s = read(join(skill, "SKILL.md"));
  assert.match(s, /^---\nname: explorables\ndescription: .+\n---\n/);
});

test("every reference SKILL.md mentions exists", () => {
  const s = read(join(skill, "SKILL.md"));
  const refs = [...s.matchAll(/references\/([\w-]+\.md)/g)].map(m => m[1]);
  assert.ok(refs.length >= 8, "SKILL.md points at its references");
  for (const r of new Set(refs)) assert.ok(existsSync(join(skill, "references", r)), `missing references/${r}`);
});

test("the verify step says what to do without a browser or when it fails", () => {
  const s = read(join(skill, "SKILL.md"));
  assert.match(s, /browser: skipped/);
  assert.match(s, /browser: could not run/);
});

test("the pitfalls list covers every lesson so far", () => {
  const p = read(join(skill, "references/pitfalls.md"));
  for (const k of ["slider", "sticky", ".ghost", "PowerShell", "scroll", "[hidden]", "camera", "localStorage", "renamed import", "hidden tab"]) {
    assert.ok(p.includes(k), `pitfalls.md should mention ${k}`);
  }
});

test("the station template has the anatomy's parts", () => {
  const t = read(join(root, "templates/station.html"));
  for (const k of ["st-head", "Play with it", "What he means", "Why we need this", "Words and refreshers", "moments", "check"]) {
    assert.ok(t.includes(k), `station.html should include ${k}`);
  }
});
