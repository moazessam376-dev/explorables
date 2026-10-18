import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, statSync, cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { rng } from "../lib/js/core.js";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "examples/micrograd");
// the build and verify run on a copy in tests/.out, so the tracked page (and its .last-build
// and .preview.html) are left alone
const copy = join(root, "tests/.out/micrograd");
const node = args => spawnSync(process.execPath, args, { encoding: "utf8", timeout: 240000 });

test("the micrograd example builds and verifies", () => {
  const tracked = join(dir, "index.html"), before = statSync(tracked).mtimeMs;
  rmSync(copy, { recursive: true, force: true }); mkdirSync(copy, { recursive: true });
  for (const f of ["plan.json", "src"]) cpSync(join(dir, f), join(copy, f), { recursive: true });
  const b = node([join(root, "tools/build.mjs"), "page", copy]);
  assert.equal(b.status, 0, b.stderr);
  const v = node([join(root, "tools/verify.mjs"), copy]);
  assert.equal(v.status, 0, v.stdout + v.stderr);
  assert.equal(statSync(tracked).mtimeMs, before, "the test rebuilt the tracked examples/micrograd/index.html");
});

// the words to look for are personal themselves, so they live outside the repo: one per line in
// tests/private-words.txt (git-ignored). A word in "quotes" is matched case-sensitively.
function privateWords() {
  try {
    return readFileSync(join(root, "tests/private-words.txt"), "utf8").split(/\r?\n/).map(w => w.trim()).filter(Boolean)
      .map(w => /^".+"$/.test(w) ? [w.slice(1, -1), ""] : [w, "i"]);
  } catch { return []; }
}

test("the example is impersonal", () => {
  // visible text only: CSS and JS have words like --h-track that aren't about anyone
  const text = readFileSync(join(dir, "index.html"), "utf8").replace(/<style>[\s\S]*?<\/style>|<script>[\s\S]*?<\/script>/g, "");
  for (const [word, flags] of privateWords()) {
    assert.doesNotMatch(text, new RegExp(`\\b${word}\\b`, flags), `example still mentions ${word}`);
  }
});

test("the example keeps the reference density", () => {
  const html = readFileSync(join(dir, "index.html"), "utf8");
  assert.equal((html.match(/<section class="st"/g) || []).length, 18);
  assert.ok((html.match(/<figure[\s>]/g) || []).length >= 20);
});

// the JS micrograd engine reproduces Karpathy's numbers
const engine = () => {
  const src = readFileSync(join(dir, "src/js/05-engine.js"), "utf8");
  return new Function("rng", src + "\nreturn { V, MLP, XS, YS };")(rng);
};

test("engine: the L graph gives Karpathy's gradients", () => {
  const { V } = engine();
  const a = new V(2), b = new V(-3), c = new V(10), f = new V(-2);
  const e = a.mul(b), d = e.add(c), L = d.mul(f);
  L.backward();
  assert.equal(L.data, -8);
  assert.deepEqual([a.grad, b.grad, c.grad, e.grad, d.grad, f.grad], [6, -4, -2, -2, -2, 4]);
});

test("engine: the neuron gives 0.7071 and Karpathy's gradients", () => {
  const { V } = engine();
  const x1 = new V(2), x2 = new V(0), w1 = new V(-3), w2 = new V(1), b = new V(6.8813735870195432);
  const o = x1.mul(w1).add(x2.mul(w2)).add(b).tanh();
  o.backward();
  assert.ok(Math.abs(o.data - 0.7071) < 1e-4);
  for (const [g, want] of [[x1.grad, -1.5], [w1.grad, 1], [x2.grad, 0.5], [w2.grad, 0]]) assert.ok(Math.abs(g - want) < 1e-9);
});

test("engine: training at lr 0.05 gets the loss under 0.01 within 200 steps", () => {
  const { V, MLP, XS, YS } = engine();
  const m = new MLP(3, [4, 4, 1], 3);
  let loss;
  for (let k = 0; k < 200; k++) {
    const yp = XS.map(x => m.call(x));
    loss = yp.reduce((acc, y, i) => acc.add(y.sub(YS[i]).pow(2)), new V(0));
    m.parameters().forEach(p => { p.grad = 0; });
    loss.backward();
    m.parameters().forEach(p => { p.data += -0.05 * p.grad; });
  }
  assert.ok(loss.data < 0.01, `loss ${loss.data}`);
  assert.equal(m.parameters().length, 41);
});
