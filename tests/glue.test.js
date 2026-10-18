import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const FILES = ["follow", "autoplay", "skin", "progress", "links"];
const src = f => readFileSync(new URL(`../lib/js/${f}.js`, import.meta.url), "utf8");

test("the glue holds no micrograd-specific values", () => {
  for (const f of FILES) {
    const s = src(f);
    for (const bad of ["VMj-3S1tku0", "8752", "s-big", "ANCHOR = {", "ACT = {", "INTRO = {"]) {
      assert.ok(!s.includes(bad), `${f}.js still contains ${bad}`);
    }
  }
});

test("the glue reads its data from PAGE", () => {
  assert.match(src("follow"), /PAGE\.chapters/);
  assert.match(src("follow"), /PAGE\.anchors/);
  assert.match(src("follow"), /PAGE\.actions/);
  assert.match(src("follow"), /PAGE\.mustRead/);
  assert.match(src("autoplay"), /PAGE\.intro/);
  assert.match(src("links"), /PAGE\.refs/);
  assert.match(src("progress"), /PAGE\.id/);
});

test("every localStorage access sits inside a try block", () => {
  for (const f of FILES) {
    const lines = src(f).split("\n");
    lines.forEach((line, i) => {
      if (!line.includes("localStorage")) return;
      // the same line, or one of the two before it, opens a try
      const ctx = lines.slice(Math.max(0, i - 2), i + 1).join("\n");
      assert.match(ctx, /try\s*\{/, `${f}.js:${i + 1} uses localStorage outside try`);
    });
  }
});

test("follow uses the tested decision functions", () => {
  const s = src("follow");
  for (const fn of ["makeEngagement", "scrollDecision", "actionDue", "scrollBehavior", "needsCatchUp", "parseAnchor"]) {
    assert.match(s, new RegExp(fn + "\\("), `follow.js should call ${fn}`);
  }
  assert.match(src("progress"), /autoCompleteDue\(/);
});
