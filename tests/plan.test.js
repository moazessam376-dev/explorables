import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePlan, pageConfig } from "../tools/plan.mjs";

const good = () => ({
  id: "mini", title: "Mini",
  source: { kind: "video", provider: "youtube", id: "abc", duration: 300 },
  refs: { k: "abc" },
  mustRead: ["s-pre"],
  sections: [
    { id: "s-pre", title: "Before you press play", pictures: [{ id: "p0", proves: "the loop" }], moments: [] },
    { id: "s-a", title: "A", chapter: [0, "intro"], pictures: [{ id: "pa", proves: "x" }],
      moments: [{ t: 10, text: "start" }, { t: 40, text: "nudge", anchor: "#pa-read", action: ["#pa-go"] }] },
    { id: "s-b", title: "B", chapter: [120, "part b"], pictures: [{ id: "pb", proves: "y" }],
      moments: [{ t: 120, text: "b starts", anchor: "means:2" }] }
  ],
  intro: { pa: ["#pa-run"] }
});

test("a valid plan has no problems", () => {
  assert.deepEqual(validatePlan(good()), []);
});

test("moments out of order are reported with their time", () => {
  const p = good(); p.sections[1].moments.reverse();
  assert.ok(validatePlan(p).some(m => m.includes("40")));
});

test("a moment beyond the duration is reported", () => {
  const p = good(); p.sections[2].moments.push({ t: 999, text: "late" });
  assert.ok(validatePlan(p).some(m => m.includes("999")));
});

test("duplicate section ids are reported", () => {
  const p = good(); p.sections[2].id = "s-a";
  assert.ok(validatePlan(p).some(m => m.includes("s-a")));
});

test("an anchor outside the grammar is reported", () => {
  const p = good(); p.sections[1].moments[1].anchor = "bogus";
  assert.ok(validatePlan(p).some(m => m.includes("bogus")));
});

test("a section without pictures is reported", () => {
  const p = good(); p.sections[2].pictures = [];
  assert.ok(validatePlan(p).some(m => m.includes("s-b")));
});

test("a mustRead id that isn't a section is reported", () => {
  const p = good(); p.mustRead = ["s-nope"];
  assert.ok(validatePlan(p).some(m => m.includes("s-nope")));
});

test("text sources skip time checks and allow page landmarks", () => {
  const p = good();
  p.source = { kind: "text", title: "A book" };
  p.sections[1].chapter = [0, "ch 1"];
  p.sections[1].moments = [{ page: "12", text: "figure 1.2" }];
  p.sections[2].moments = [{ page: "40", text: "table 3" }];
  assert.deepEqual(validatePlan(p), []);
});

test("pageConfig builds sorted chapters and explicit anchors only", () => {
  const p = good(); p.sections.reverse();
  const c = pageConfig(p);
  assert.deepEqual(c.chapters, [[0, "intro", "s-a"], [120, "part b", "s-b"]]);
  assert.deepEqual(c.anchors, { 40: "#pa-read", 120: "means:2" });
  assert.deepEqual(c.actions, { 40: ["#pa-go"] });
  assert.deepEqual(c.intro, { pa: ["#pa-run"] });
  assert.deepEqual(c.mustRead, ["s-pre"]);
  assert.equal(c.source.duration, 300);
  assert.equal(c.id, "mini");
});
