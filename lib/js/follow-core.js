// The follow-along's decisions, as pure functions (tested in tests/follow-core.test.js).
// follow.js wires them to the page.

export const LEAD = 1.2;               // s: move a little early, so the part is on screen when it starts
export const BUSY = 5000;              // ms you count as busy after a click or input
export const READ_MAX = 20000;         // ms a resting mouse on the page counts as reading
export const ACTION_WINDOW = 10000;    // ms a picture action may wait for its moment

// "head" | "fig" | "fig2" | "why" | "words" | "py" | "means" | "means:N" | "#css selector"
export function parseAnchor(key) {
  if (typeof key === "string" && key.startsWith("#")) return { kind: "sel", sel: key };
  const m = /^(head|fig|fig2|why|words|py|means)(?::(\d+))?$/.exec(key || "");
  if (!m || (m[2] && m[1] !== "means")) throw new Error(`bad anchor "${key}"`);
  return m[2] ? { kind: m[1], n: +m[2] } : { kind: m[1] };
}

// index of the latest item whose time is at or before t (0 before the first; -1 when empty)
export function idxAt(items, t) {
  if (!items.length) return -1;
  let i = 0;
  while (i + 1 < items.length && items[i + 1].t <= t) i++;
  return i;
}
export function chapterAt(chapters, t) {
  let i = 0;
  chapters.forEach((c, k) => { if (t >= c[0]) i = k; });
  return i;
}

// Are you busy on the page? Clicks, typing, scrolling, mouse movement and selected text say yes.
// A mouse resting on the page counts as reading for READ_MAX; using the follow controls doesn't.
export function makeEngagement({ busyMs = BUSY, readMaxMs = READ_MAX } = {}) {
  let busyUntil = 0, lastActive = -Infinity, inside = false, acc = 0;
  return {
    busy(now, ms) { lastActive = now; busyUntil = Math.max(busyUntil, now + (ms || busyMs)); },
    move(now, dist, onControls) {
      inside = true;
      if (onControls) return;
      acc += dist;
      if (acc > 30) { acc = 0; lastActive = now; busyUntil = Math.max(busyUntil, now + 2500); }
    },
    leave() { inside = false; },
    intent() { busyUntil = 0; lastActive = -Infinity; acc = 0; },
    engaged(now, selected) { return now < busyUntil || !!selected || (inside && now - lastActive < readMaxMs); }
  };
}

export function scrollDecision({ pending, autoScroll, onScreen, engaged }) {
  if (!pending || !autoScroll || onScreen) return "none";
  return engaged ? "offer" : "glide";
}

export function actionDue({ actFor, now, until, autoPlay, engaged, onScreen }) {
  if (actFor < 0) return "wait";
  if (now > until || !autoPlay) return "drop";
  return !engaged && onScreen ? "run" : "wait";
}

// Sections whose end the clock passed between prevT and t. A section ends where the next
// different section's chapter starts (neighbouring chapters of one section count as one);
// the last one ends at `end`, the end of the source.
export function autoCompleteDue(chapters, prevT, t, end = Infinity) {
  if (!(t > prevT)) return [];
  const merged = [];
  for (const c of chapters) if (!merged.length || merged[merged.length - 1].id !== c[2]) merged.push({ id: c[2], start: c[0] });
  const out = [];
  merged.forEach((s, i) => {
    const stop = i + 1 < merged.length ? merged[i + 1].start : end;
    if (prevT < stop && stop <= t && !out.includes(s.id)) out.push(s.id);
  });
  return out;
}

// where "the part you're reading" starts: its first moment, else its chapter, else 0
export function sectionStartTime(sectionId, firstMomentT, chapters) {
  if (firstMomentT != null) return firstMomentT;
  const c = chapters.find(ch => ch[2] === sectionId);
  return c ? c[0] : 0;
}

// long trips (more than two screens) jump instead of crawling
export function scrollBehavior({ distance, viewportH, reducedMotion }) {
  return reducedMotion || Math.abs(distance) > viewportH * 2 ? "auto" : "smooth";
}

// after the tab was hidden or the page stalled, go straight to where the lecture is now
export function needsCatchUp({ gapMs, hiddenMs }) {
  return gapMs > 1500 || hiddenMs > 3000;
}
