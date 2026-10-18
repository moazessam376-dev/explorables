import { test } from "node:test";
import assert from "node:assert/strict";
import { py, fmtTime, parseTime, rng, ytUrl } from "../lib/js/core.js";
import { contours, Stage, heightSurface } from "../lib/js/three-stage.js";
import { graph2D } from "../lib/js/graph2d.js";

test("browser-only parts import cleanly in Node", () => {
  assert.equal(typeof Stage, "function");
  assert.equal(typeof heightSurface, "function");
  assert.equal(typeof graph2D, "function");
});

test("py prints floats like Python's repr", () => {
  assert.equal(py(4), "4.0");
  assert.equal(py(0.00001), "1e-05");
  assert.equal(py(-3.000000000010772), "-3.000000000010772");
  assert.equal(py(14.003000000002), "14.003000000002");
});

test("fmtTime and parseTime round-trip lecture times", () => {
  assert.equal(fmtTime(4142), "1:09:02");
  assert.equal(fmtTime(759), "12:39");
  assert.equal(parseTime("1:09:02"), 4142);
  assert.equal(parseTime("12:39"), 759);
  assert.equal(parseTime("20"), 1200);
  assert.equal(parseTime("x"), null);
  assert.equal(parseTime(""), null);
});

test("rng is deterministic per seed", () => {
  const a = rng(3), b = rng(3);
  const xs = [a(), a(), a()], ys = [b(), b(), b()];
  assert.deepEqual(xs, ys);
  assert.ok(xs.every(v => v >= 0 && v < 1));
});

test("ytUrl builds a timed link from the refs map", () => {
  assert.equal(ytUrl({ k: "abc" }, "k", 25), "https://www.youtube.com/watch?v=abc&t=25s");
  assert.equal(ytUrl({ k: "abc" }, "k"), "https://www.youtube.com/watch?v=abc");
});

test("contours of f = x at level 0 lie on x = 0", () => {
  const seg = contours((x, z) => x, -1, 1, -1, 1, 10, [0], () => 0);
  assert.ok(seg.length > 0);
  for (let i = 0; i < seg.length; i += 3) assert.ok(Math.abs(seg[i]) < 1e-9, `x=${seg[i]}`);
});
