import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = p => readFileSync(join(root, p), "utf8");

test("AGENTS.md sends any agent to the skill", () => {
  const a = read("AGENTS.md");
  assert.match(a, /skills\/explorables\/SKILL\.md/);
  assert.match(a, /Node 22/);
});

test("claudetube's watch-youtube skill is bundled with its license", () => {
  assert.ok(existsSync(join(root, "skills/watch-youtube/SKILL.md")));
  assert.ok(existsSync(join(root, "skills/watch-youtube/LICENSE")));
  assert.ok(existsSync(join(root, "skills/watch-youtube/scripts/claudetube.py")));
});

test("README shows the example and both ways in", () => {
  const r = read("README.md");
  assert.match(r, /examples\/micrograd/);
  assert.match(r, /\/plugin marketplace add moazessam376-dev\/explorables/);
  assert.match(r, /use Explorables/);
});
