import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAnchor, idxAt, chapterAt, makeEngagement, scrollDecision, actionDue, autoCompleteDue,
  scrollBehavior, needsCatchUp, sectionStartTime, LEAD, BUSY, READ_MAX, ACTION_WINDOW
} from "../lib/js/follow-core.js";

test("constants match the reference page", () => {
  assert.equal(LEAD, 1.2); assert.equal(BUSY, 5000); assert.equal(READ_MAX, 20000); assert.equal(ACTION_WINDOW, 10000);
});

test("parseAnchor understands the anchor grammar", () => {
  assert.deepEqual(parseAnchor("means:3"), { kind: "means", n: 3 });
  assert.deepEqual(parseAnchor("means"), { kind: "means" });
  assert.deepEqual(parseAnchor("fig2"), { kind: "fig2" });
  assert.deepEqual(parseAnchor("#dv-read"), { kind: "sel", sel: "#dv-read" });
  assert.deepEqual(parseAnchor("#s-torch .tablewrap"), { kind: "sel", sel: "#s-torch .tablewrap" });
  assert.throws(() => parseAnchor("bogus"));
});

test("idxAt finds the latest moment at or before t", () => {
  const a = [{ t: 0 }, { t: 25 }, { t: 95 }];
  assert.equal(idxAt(a, -5), 0);
  assert.equal(idxAt(a, 24.9), 0);
  assert.equal(idxAt(a, 25), 1);
  assert.equal(idxAt(a, 1e9), 2);
});

test("idxAt and chapterAt with sections that have no moments", () => {
  const chapters = [[0, "intro", "s-a"], [100, "b", "s-b"], [200, "c", "s-c"]];
  assert.equal(chapterAt(chapters, 150), 1);
  assert.equal(chapterAt(chapters, -1), 0);
  assert.equal(idxAt([], 50), -1);
});

test("mouse movement makes you busy for 2.5 s", () => {
  const e = makeEngagement();
  e.move(1000, 40, false);
  assert.equal(e.engaged(3000, false), true);
  e.leave();
  assert.equal(e.engaged(3600, false), false);
});

test("a resting mouse on the page counts as reading up to READ_MAX", () => {
  const e = makeEngagement();
  e.move(1000, 40, false);
  assert.equal(e.engaged(15000, false), true);
  assert.equal(e.engaged(1000 + READ_MAX + 1, false), false);
});

test("selected text keeps you engaged", () => {
  const e = makeEngagement();
  assert.equal(e.engaged(0, true), true);
});

test("moving over the follow controls is not reading", () => {
  const e = makeEngagement();
  e.move(1000, 400, true);
  assert.equal(e.engaged(1100, false), false);
});

test("control intent clears busy state", () => {
  const e = makeEngagement();
  e.busy(1000, 8000); e.move(1000, 40, false);
  e.intent();
  assert.equal(e.engaged(1001, false), false);
});

test("scrollDecision moves only when it should", () => {
  assert.equal(scrollDecision({ pending: true, autoScroll: true, onScreen: true, engaged: false }), "none");
  assert.equal(scrollDecision({ pending: true, autoScroll: true, onScreen: false, engaged: true }), "offer");
  assert.equal(scrollDecision({ pending: true, autoScroll: true, onScreen: false, engaged: false }), "glide");
  assert.equal(scrollDecision({ pending: true, autoScroll: false, onScreen: false, engaged: false }), "none");
  assert.equal(scrollDecision({ pending: false, autoScroll: true, onScreen: false, engaged: false }), "none");
});

test("actionDue waits, runs, or drops", () => {
  const base = { actFor: 3, now: 1000, until: 5000, autoPlay: true, engaged: false, onScreen: true };
  assert.equal(actionDue(base), "run");
  assert.equal(actionDue({ ...base, engaged: true }), "wait");
  assert.equal(actionDue({ ...base, onScreen: false }), "wait");
  assert.equal(actionDue({ ...base, now: 6000 }), "drop");
  assert.equal(actionDue({ ...base, autoPlay: false }), "drop");
  assert.equal(actionDue({ ...base, actFor: -1 }), "wait");
});

test("autoCompleteDue lists sections whose end the clock just passed", () => {
  const ch = [[0, "", "a"], [100, "", "b"], [200, "", "c"]];
  assert.deepEqual(autoCompleteDue(ch, 90, 110), ["a"]);
  assert.deepEqual(autoCompleteDue(ch, 110, 120), []);
  assert.deepEqual(autoCompleteDue(ch, 50, 250), ["a", "b"]);
  assert.deepEqual(autoCompleteDue(ch, 250, 50), []);
});

test("a section starts at its first moment, else its chapter, else 0", () => {
  const ch = [[0, "intro", "s-a"], [60, "mid", "s-mid"], [120, "b", "s-b"]];
  assert.equal(sectionStartTime("s-a", 10, ch), 10);
  assert.equal(sectionStartTime("s-mid", null, ch), 60);
  assert.equal(sectionStartTime("s-pre", null, ch), 0);
});

test("long trips jump, short ones glide", () => {
  assert.equal(scrollBehavior({ distance: 3000, viewportH: 800, reducedMotion: false }), "auto");
  assert.equal(scrollBehavior({ distance: 900, viewportH: 800, reducedMotion: false }), "smooth");
  assert.equal(scrollBehavior({ distance: 100, viewportH: 800, reducedMotion: true }), "auto");
});

test("coming back after being away triggers a catch-up", () => {
  assert.equal(needsCatchUp({ gapMs: 16, hiddenMs: 0 }), false);
  assert.equal(needsCatchUp({ gapMs: 2000, hiddenMs: 0 }), true);
  assert.equal(needsCatchUp({ gapMs: 16, hiddenMs: 30 * 60 * 1000 }), true);
});
