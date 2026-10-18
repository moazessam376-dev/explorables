# Explorables v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the micrograd companion into Explorables: a Claude Code plugin and skill with a tested
parts library, so a learner gets a companion page for any lecture in one sitting.

**Architecture:**
- A `lib/` of plain JS and CSS parts, pulled out of the original micrograd page (`original/src` below). Each JS file is an
  ES module, so Node can test it.
- `tools/build.mjs` strips imports and exports and joins the lib parts with a page's own pieces
  into one self-contained HTML file.
- A page is described by a `plan.json`: chapters, moments, anchors and actions. The build turns it
  into the page's config, and `tools/verify.mjs` checks the built page against it in headless
  Chrome.
- The skill (`skills/explorables/SKILL.md` plus references) is the workflow Claude follows:
  intake, plan, build, verify, review, deliver, and the study step.

**Tech Stack:**
- Node ≥ 20 (`node --test`, built-in WebSocket for the Chrome DevTools Protocol, zero npm
  dependencies).
- three.js r128 from cdnjs.
- Google Fonts.
- Python only for the vendored claudetube.

**Spec:** `docs/superpowers/specs/2026-10-18-explorables-design.md`

## Global Constraints

- Name: **Explorables**. Repo root: `F:\explorables`. GitHub `moazessam376-dev/explorables` is
  created only when the owner says so. License: MIT.
- Every built page is one self-contained `.html` file:
  - external scripts only from `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`;
  - stylesheets only from `https://fonts.googleapis.com`;
  - no `<!doctype>`, `<html>`, `<head>` or `<body>` tags (the artifact host wraps the page);
  - a `<title>` and `<meta name="claude:viewport-fit-sides" content="cover">` at the top.
- Every `localStorage` call is wrapped in try/catch, and the page works without storage.
- Respect `prefers-reduced-motion`. No sideways page scroll at 375px wide. Every 3D stage has
  keyboard controls.
- Colour roles are fixed across themes: `--data` (a value), `--grad` (a slope or gradient),
  `--nudge` (the nudge h), `--ok` (downhill or positive), `--neg` (negative).
- Themes: `field-light` (the default, via no `data-skin`), `field-dark`, `chalk`,
  `notebook-light`, `notebook-dark`, `manim`. The picker value `auto` follows the system setting.
- Copyright: no transcripts in pages; quotes under 15 words.
- Text written for learners follows the reference page's style: plain English, short sentences,
  no em-dash asides.
- Never put the learner's personal details in `examples/`.
- Source files are UTF-8. Never rewrite them with PowerShell 5.1 `Get-Content`/`Set-Content`;
  use Node or the editor tools.

## Review Focus

These are the situations the spec implies but no feature test naturally exercises.

1. **localStorage throws or is unavailable** (data: URLs, private windows). The page must still
   load and follow along. *Test: Task 7, `follow works with storage disabled`.*
2. **A plan that disagrees with the built page:** a moment whose anchor or action selector
   doesn't exist. Verify must name it and not crash. *Test: Task 9, `reports missing anchor and
   missing action target`.*
3. **No Chrome or Edge on the machine.** Verify must say so and still run the static checks.
   *Test: Task 9, `static checks run when no browser is found`.*
4. **Clicking the follow controls (±10s, clock, timeline, Resume) while following.** This must jump
   straight there; the click must not count as reading. *Test: Task 6, `control intent clears
   busy state`.*
5. **A section with no moments** (a must-read section, or a book landmark page). Following,
   centring and progress must skip it gracefully. *Test: Task 6, `idxAt and chapterAt with
   sections that have no moments`.*

---

## File Structure

```
.claude-plugin/plugin.json            plugin manifest (name "explorables")
.claude-plugin/marketplace.json       marketplace manifest
README.md                             what it is, install, "use straight from the repo"
AGENTS.md                             instructions for any agent handed the repo; points at the skill
CLAUDE.md                             one line: "Read AGENTS.md."
LICENSE                               MIT
package.json                          { "type": "module", "scripts": { "test": "node --test" } }
lib/css/themes.css                    theme tokens (from original/src/themes.css)
lib/css/base.css                      page styles (from style.css, micrograd-specific rules removed)
lib/js/core.js                        helpers: $, $$, S, T, py, f2, f4, fmtTime, parseTime, clamp, lerp, ease, tween, sleep, rng, safe, marker, whenNear, DEMO, AUTO, drive, ytUrl
lib/js/three-stage.js                 Stage, heightSurface, contours, cssVar, themeSubs
lib/js/graph2d.js                     graph2D(svg, spec)
lib/js/follow-core.js                 pure follow-along logic (testable)
lib/js/follow.js                      follow-along DOM glue (reads PAGE)
lib/js/autoplay.js                    loops start on first view (reads PAGE.intro)
lib/js/skin.js                        theme picker + margin-notes layout
lib/js/progress.js                    "Mark done" + auto-complete
lib/js/links.js                       data-v/data-t links → URLs from PAGE.refs
templates/page/head.html              title + meta + fonts (title filled by build)
templates/page/bar.html               sticky bar: theme picker, follow controls, timeline, now line, switches, read-first card
templates/station.html                one station skeleton, copied by the skill
tools/build.mjs                       build page | build course
tools/plan.mjs                        validatePlan(plan), pageConfig(plan)
tools/course.mjs                      renderCourseHome(course)
tools/verify.mjs                      static + headless Chrome checks
tools/cdp.mjs                         minimal Chrome DevTools Protocol client
skills/explorables/SKILL.md           the workflow
skills/explorables/references/*.md    intake, plan-format, anatomy, pictures, pitfalls, review, study-step, delivery
skills/watch-youtube/                 vendored claudetube skill (MIT, with its LICENSE)
examples/micrograd/src/               page pieces (impersonal)
examples/micrograd/plan.json
examples/micrograd/index.html         built output
tests/*.test.js                       node --test suites
tests/fixtures/mini-page/             a two-station page used by build/verify tests
```

`PAGE` is the page config object emitted by the build, from `plan.json`:

```js
const PAGE = {
  id: "micrograd",                     // storage key prefix
  title: "Micrograd Companion",
  source: { kind: "video", provider: "youtube", id: "VMj-3S1tku0", duration: 8752 },  // kind: "video" | "text"
  refs: { k: "VMj-3S1tku0", c1: "aircAruvnKk" },   // data-v keys → video ids
  chapters: [[0, "intro", "s-overview"], [25, "micrograd overview", "s-overview"]],  // [t, title, sectionId]
  anchors: { 237: "means:3", 759: "#dv-read" },    // moment t → anchor key (default: first moment "head", others "fig")
  actions: { 759: ["#dv-tiny"] },                  // moment t → steps (CSS selectors; functions only in page JS via DEMO)
  intro: { "land": ["#land-run"] },                 // element id → steps on first view
  mustRead: ["s-big"]                               // section ids asked before following from the start
};
```

---

### Task 1: Repo scaffold, manifests, test runner

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`,
  `LICENSE`, `CLAUDE.md`, `.gitignore`
- Test: `tests/manifest.test.js`

**Interfaces:** Produces `npm test` (runs `node --test tests/`).

- [ ] **Step 1: Write the failing test** `tests/manifest.test.js`.
  - It parses both manifests.
  - It asserts `plugin.name === "explorables"`, `plugin.license === "MIT"`, and
    `plugin.repository === "https://github.com/moazessam376-dev/explorables"`.
  - It asserts `marketplace.plugins[0].name === "explorables"` and `source === "./"`.
- [ ] **Step 2:** Run `node --test tests/manifest.test.js`. Expect FAIL (file not found).
- [ ] **Step 3:** Write the manifests in the same shape as claudetube's
  (`~/.claude/plugins/cache/claudetube/claudetubeskim/0.2.0/.claude-plugin/`):
  - `displayName: "Explorables"`;
  - description "Turn anything you're learning into an interactive companion page: plain-language
    re-explanations, 2D/3D pictures you control, and a follow-along that keeps pace with the
    lecture.";
  - `package.json` with `"type": "module"`;
  - an MIT `LICENSE` © 2026 moazessam376-dev;
  - a `.gitignore` covering `node_modules/`, `*.log` and `tests/.out/`.
- [ ] **Step 4:** Run `npm test`. Expect PASS.
- [ ] **Step 5:** `git init`, then commit "chore: scaffold explorables plugin".

### Task 2: lib core and three-stage

**Files:**
- Create: `lib/js/core.js`, `lib/js/three-stage.js`, `lib/js/graph2d.js`
- Source: `original/src/js/00-core.js`, `01-three.js`, `14-graph2d.js` (lines 1–118 only)
- Test: `tests/core.test.js`, `tests/contours.test.js`

**Interfaces:**
- Produces, as ES `export`s, every name in the File Structure line for `core.js`,
  `three-stage.js` and `graph2d.js`.
- Signatures are unchanged from the source.
- `L_SPEC`, `NEURON_SPEC` and `NEURON_B` move to the example (Task 10), not into lib.
- `ytUrl(refs, key, t)` now takes the refs map instead of the global `VID`.

- [ ] **Step 1: Write failing tests.**
  - `py(4) === "4.0"`, `py(0.00001) === "1e-05"`, `py(-3.000000000010772) === "-3.000000000010772"`.
  - `fmtTime(4142) === "1:09:02"`, `parseTime("1:09:02") === 4142`, `parseTime("20") === 1200`,
    `parseTime("x") === null`.
  - `rng(3)` yields the same first three values twice.
  - `contours((x, z) => x, -1, 1, -1, 1, 10, [0], () => 0)` returns only segments with `x ≈ 0`.
- [ ] **Step 2:** Run `npm test`. Expect FAIL.
- [ ] **Step 3:** Copy the source functions into the three files and add `export` to each.
  - Add `import` lines where one file uses another's names: `three-stage.js` and `graph2d.js`
    import from `core.js`.
  - `whenNear`, `Stage` and `heightSurface` stay DOM-only. Tests import only the pure functions.
- [ ] **Step 4:** Run `npm test`. Expect PASS.
- [ ] **Step 5:** Commit "feat(lib): core helpers, 3D stage, 2D graph".

### Task 3: Themes and base CSS with a token check

**Files:**
- Create: `lib/css/themes.css` (copied verbatim from `original/src/themes.css`) and
  `lib/css/base.css` (from `style.css`).
- Test: `tests/css-tokens.test.js`

**Interfaces:** Produces the CSS class names the bar, stations and figures use (unchanged from the
source).

- [ ] **Step 1: Write a failing test.**
  - Collect every `var(--name)` used in `base.css`.
  - Assert each is defined in the bare `:root` block of `themes.css`.
  - Assert each theme block (`field-dark`, `chalk`, `notebook-light`, `notebook-dark`, `manim`)
    defines every colour token from the bare `:root`: `--paper`, `--panel`, `--ink`, `--muted`,
    `--rule`, `--wash`, `--data`, `--grad`, `--nudge`, `--ok`, `--neg`, and the five `-soft`
    variants, `--stage` and `--top-*`.
  - Font and shape tokens may be inherited.
  - Assert `base.css` contains no class selector `.ghost` other than `.btn.ghost` (pitfall).
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Create the files.
  - Move micrograd-only rules (`.knob*`, `.flowline`, `.game`, `.opts`, `.lists`, `.lst`,
    `.sq-wrap`, `.scale`) into `examples/micrograd/src/page.css` (created in Task 10; for now,
    leave them out of base).
  - Keep the `[hidden]{display:none!important}` rule.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(lib): themes and base styles".

### Task 4: Page plan validation and the config generator

**Files:**
- Create: `tools/plan.mjs`
- Test: `tests/plan.test.js`

**Interfaces:**
- Produces `validatePlan(plan) -> string[]`: a list of problems; empty means valid.
- Produces `pageConfig(plan) -> object`: the `PAGE` object above.
- The `plan.json` shape (documented in `skills/explorables/references/plan-format.md`, Task 11):

```json
{ "id": "micrograd", "title": "Micrograd Companion",
  "source": { "kind": "video", "provider": "youtube", "id": "VMj-3S1tku0", "duration": 8752 },
  "refs": { "k": "VMj-3S1tku0" },
  "mustRead": ["s-big"],
  "sections": [
    { "id": "s-deriv", "title": "The derivative: how much does the output react?",
      "chapter": [488, "derivative of a simple function with one input"],
      "pictures": [ { "id": "dv-main", "proves": "slope = rise/run approaches 6x-4 as h shrinks" } ],
      "moments": [ { "t": 759, "text": "Too many zeros in h and floating point breaks.", "anchor": "#dv-read", "action": ["#dv-tiny"] } ] } ],
  "intro": { "dv-main": ["#dv-sweep"] } }
```

- [ ] **Step 1: Write failing tests.**
  - A valid fixture returns `[]`.
  - Each of these is reported with the offending section id or moment time:
    - moments out of order;
    - a moment beyond `duration`;
    - duplicate section ids;
    - an anchor key outside the grammar `head|fig|fig2|why|words|py|means|means:N|#css`;
    - a section with no `pictures` (density bar: every section has at least one);
    - a `mustRead` id that isn't a section.
  - `source.kind: "text"` skips the time checks and allows `"page"` landmarks instead of `t`.
  - `pageConfig` turns `sections[].chapter` into the `chapters` triples, sorted.
  - It fills `anchors` only for explicit anchors.
  - It copies `actions`, `intro` and `mustRead`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement both functions in `tools/plan.mjs`.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(tools): page plan validation and config".

### Task 5: The build tool

**Files:**
- Create: `tools/build.mjs`, `templates/page/head.html`, `templates/page/bar.html`
- Create the fixture: `tests/fixtures/mini-page/` containing `plan.json` (two sections, three
  moments), `src/body.html`, `src/page.css` and `src/js/10-mini.js`
- Test: `tests/build.test.js`

**Interfaces:**
- Consumes: `validatePlan` and `pageConfig` (Task 4).
- Produces the CLI `node tools/build.mjs page <pageDir> [--lib <libDir>] [--out <file>]`.
  - It reads `<pageDir>/plan.json` and `<pageDir>/src/`, and writes `<pageDir>/index.html` by
    default.
  - It exits 1 and prints the problems if `validatePlan` returns any.
- The build order of the output:
  1. head (title from the plan);
  2. `<style>` themes.css + base.css + `src/page.css`;
  3. bar.html with the brand filled from the plan title;
  4. `src/body.html`;
  5. the three.js `<script src>`;
  6. one `<script>` IIFE with `"use strict"`, `const PAGE = {...};`, the lib js in fixed order
     (core, three-stage, graph2d, links, skin, follow-core, follow, progress, autoplay), then
     `src/js/*.js` sorted by name.
- `import` lines and leading `export ` are stripped from every JS file.
- Files are read as UTF-8 with the BOM stripped.
- It also writes `<pageDir>/.preview.html`: the same page wrapped in
  `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" ...></head><body>…`,
  for local testing.

- [ ] **Step 1: Write failing tests.** Build the fixture into `tests/.out/` and assert that the
  output:
  - starts with `<title>Mini</title>`;
  - contains `const PAGE =`;
  - contains no `import ` or `export ` at the start of any line;
  - has exactly one external `<script src=` and it is the cdnjs three.js URL;
  - passes `node --check` on its script (extracted into a temp file);
  - comes out exactly the same on a second build.
  
  Also: a plan with a duplicate section id makes the CLI exit 1 with that id in stderr.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement `build.mjs`.
  - Split `templates/page/bar.html` out of `original/src/body1.html` lines 1–60 (the
    header, the read-first card).
  - Replace the hard-coded brand with `{{title}}` and `{{subtitle}}`.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(tools): single-file page build".

### Task 6: Follow-along logic, pure and tested

**Files:**
- Create: `lib/js/follow-core.js`
- Source: `original/src/js/02-follow.js` (the decision parts)
- Test: `tests/follow-core.test.js`

**Interfaces:** Produces:
- `parseAnchor(key) -> {kind, n?, sel?}`
- `idxAt(anchors: {t}[], t) -> number`
- `chapterAt(chapters, t) -> number`
- `makeEngagement({busyMs=5000, readMaxMs=20000}) -> { busy(now, ms?), move(now, dist, onControls), leave(), intent(), engaged(now, selected) }`
- `scrollDecision({pending, autoScroll, onScreen, engaged}) -> "none"|"glide"|"offer"`
- `actionDue({actFor, now, until, autoPlay, engaged, onScreen}) -> "wait"|"run"|"drop"`
- `autoCompleteDue(chapters, prevT, t) -> sectionId[]`: the sections whose end the clock has just
  passed
- Constants: `LEAD = 1.2` s, `BUSY = 5000`, `READ_MAX = 20000`, `ACTION_WINDOW = 10000` ms

- [ ] **Step 1: Write failing tests.**
  - `parseAnchor("means:3")` gives `{kind:"means", n:3}`.
  - `parseAnchor("#dv-read")` gives `{kind:"sel", sel:"#dv-read"}`.
  - `parseAnchor("bogus")` throws.
  - `idxAt` before the first moment returns 0.
  - **idxAt and chapterAt with sections that have no moments:** chapter triples whose section has
    no moments still map time correctly.
  - Engagement:
    - `move` beyond 30px makes `engaged` true for 2.5 s;
    - a resting mouse inside the page stays engaged until `readMaxMs` after the last activity;
    - `leave()` ends it;
    - `selected = true` keeps it engaged.
  - **Control intent clears busy state:** after `busy(now)`, `intent()` makes `engaged(now)`
    false.
  - `scrollDecision`:
    - on screen → `"none"`;
    - off screen and engaged → `"offer"`;
    - off screen and idle → `"glide"`;
    - autoScroll off → `"none"`.
  - `autoCompleteDue` with chapters `[[0,_, "a"],[100,_, "b"],[200,_, "c"]]`:
    - from 90 to 110 returns `["a"]`;
    - from 110 to 120 returns `[]`;
    - jumping from 50 to 250 returns `["a","b"]`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement it, porting the rules from `02-follow.js` exactly (the values above).
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(lib): follow-along decision logic".

### Task 7: Follow-along, auto-play, theme, progress and links glue

**Files:**
- Create: `lib/js/follow.js`, `lib/js/autoplay.js`, `lib/js/skin.js`, `lib/js/progress.js`,
  `lib/js/links.js`
- Source: `02-follow.js`, `04-autoplay.js`, `00a-skin.js`, and the links block of `00-core.js`
- Test: `tests/glue.test.js` (static) plus the verify run in Task 9

**Interfaces:**
- Consumes: `PAGE` (Task 4), `follow-core` (Task 6), `core` (Task 2).
- Every hard-coded micrograd value is replaced:
  - `CH` becomes `PAGE.chapters`;
  - `END` becomes `PAGE.source.duration`;
  - `ANCHOR` becomes `PAGE.anchors`;
  - `ACT` becomes `PAGE.actions`, where a step is a selector string or `"demo:<name>(<args>)"`,
    calling `DEMO[name](...args)`;
  - `INTRO` becomes `PAGE.intro`;
  - `#s-big` becomes `PAGE.mustRead`;
  - storage keys are prefixed `${PAGE.id}:`.
- `progress.js` produces:
  - a "Mark done" button appended at the end of each `section.st` that has moments;
  - a `✓` on its timeline segment and next to its `h2`;
  - an "auto-complete" switch (`#fl-autodone`) beside auto-play, which uses `autoCompleteDue`
    while following;
  - state in `localStorage[`${PAGE.id}:done`]` as a JSON array of section ids.
- When `PAGE.source.kind === "text"`, `follow.js` hides the clock, ±10s, speed, Resume and
  Follow, and leaves the theme picker and progress.

- [ ] **Step 1: Write a failing static test.** Read the five files and assert:
  - none contains the strings `VMj-3S1tku0`, `8752`, `s-big` or `ANCHOR = {`;
  - every `localStorage` access sits inside a `try` block (regex over the source).
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Port the glue as described.
- [ ] **Step 4:** Run it. Expect PASS. Then build the fixture (Task 5) and open its
  `.preview.html`. **Follow works with storage disabled:** the fixture loaded as a `data:` URL
  (storage throws) shows the bar and follows. This is checked automatically in Task 9.
- [ ] **Step 5:** Commit "feat(lib): follow-along, auto-play, themes, progress".

### Task 8: Course home

**Files:**
- Create: `tools/course.mjs`; add the subcommand to `tools/build.mjs`
- Test: `tests/course.test.js`

**Interfaces:**
- `course.json` (documented in `references/study-step.md`):

```json
{ "id": "zero-to-hero", "title": "Neural Networks: Zero to Hero",
  "source": { "provider": "youtube", "playlist": "PLAqhIrjkxbuWI23v9cThsA9GvCAUhRvKZ" },
  "parts": [ { "id": "01-micrograd", "title": "micrograd", "status": "done", "page": "01-micrograd/index.html",
               "notes": "chain rule clicked; tanh saturation was shaky" } ],
  "current": "02-makemore-bigram" }
```

- `status` is one of `"not-started" | "page-ready" | "done"`.
- `renderCourseHome(course) -> string` returns a full page string with the same head, themes and
  theme picker as a page, and no follow bar.
- CLI: `node tools/build.mjs course <courseDir>` writes `<courseDir>/index.html`.

- [ ] **Step 1: Write failing tests.**
  - It renders one row per part, in order, with a status chip.
  - A `done` part links to its page.
  - A `not-started` part has no link.
  - `current` is highlighted.
  - Titles are HTML-escaped: a part titled `<b>` renders as text.
  - An unknown `status` is reported as an error.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement it.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(tools): course home".

### Task 9: The verify tool

**Files:**
- Create: `tools/cdp.mjs`, `tools/verify.mjs`
- Test: `tests/verify.test.js` (uses the fixture; the browser part is skipped when no browser is
  found)

**Interfaces:**
- `findBrowser() -> string | null` looks for Chrome or Edge in the standard Windows, macOS and Linux
  paths, and in `$CHROME_PATH`.
- `cdp.mjs` produces `launch(path, {width, height}) -> {send(method, params), on(event, fn), close()}`.
  It starts `--headless=new --remote-debugging-port=0` with a temp profile and talks over the
  built-in `WebSocket`.
- CLI: `node tools/verify.mjs <pageDir> [--screens <dir>]` prints a report and exits 1 on any
  failure.
- **Static checks (no browser):**
  - `validatePlan`;
  - a `node --check` of the extracted script;
  - only allowlisted external URLs;
  - every `plan.sections[].id` exists as `section.st#id` in `index.html`;
  - every moment `t` exists as `.moments a[data-t]` in that section.
- **Browser checks:** load `.preview.html` at 1280×860, then:
  1. no console errors or exceptions;
  2. every anchor resolves to an element;
  3. every action selector matches an enabled element;
  4. every `<button>` inside `main` can be clicked with no exception;
  5. for each theme, set `data-skin` and capture a screenshot to `--screens`;
  6. at 375×812, `scrollWidth <= innerWidth`;
  7. loaded with storage blocked (a `data:` URL), no uncaught exception.

- [ ] **Step 1: Write failing tests.**
  - **Static checks run when no browser is found:** with `CHROME_PATH` set to a missing file and
    the standard paths masked by an env flag `EXPLORABLES_NO_BROWSER=1`, the CLI prints `browser:
    skipped` and still reports static results.
  - **Reports missing anchor and missing action target:** a fixture copy with
    `anchor:"#nope"` and `action:["#gone"]` exits 1, with `#nope` and `#gone` in the output.
  - The unmodified fixture exits 0 (if a browser is found).
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Implement `cdp.mjs` and then `verify.mjs`.
  - Use `Runtime.evaluate` with `awaitPromise` for the in-page checks.
  - Use `Emulation.setDeviceMetricsOverride` for the phone width.
  - Use `Page.captureScreenshot` for the screenshots.
- [ ] **Step 4:** Run it. Expect PASS. Run it on the fixture with screenshots and look at one per
  theme.
- [ ] **Step 5:** Commit "feat(tools): verify pages statically and in headless Chrome".

### Task 10: The micrograd example on the library, made impersonal

**Files:**
- Create: `examples/micrograd/plan.json`, `examples/micrograd/src/body.html`,
  `examples/micrograd/src/page.css`, and `examples/micrograd/src/js/*.js`.
- The JS comes from `original/src/js/05-engine.js` and `10`–`30`, with the moved
  `L_SPEC`, `NEURON_SPEC` and `NEURON_B`.
- Build output: `examples/micrograd/index.html`.

**Interfaces:**
- Consumes the whole lib and the tools.
- `plan.json` carries:
  - every section, chapter and moment from `body1.html`/`body2.html`;
  - the `ANCHOR` and `ACT` maps from `02-follow.js`, converted to plan form (function steps
    become `"demo:builderTo(5)"`, `"demo:tensor(2,3,1)"`, and toggle-guarded clicks become
    `"demo:ensurePlaying(#gr-play)"`, with `DEMO.ensurePlaying(sel)` added to `lib/js/core.js`.
    It clicks `sel` only when the button's text doesn't contain "Stop" or "Pause");
  - `INTRO` from `04-autoplay.js`;
  - `mustRead: ["s-big"]`.
- Impersonal rewrite (spec §8):
  - remove the learner's name, goals, study plan and tracker;
  - rewrite the "why this matters" lines against a neutral goal ("a small GPT of your own");
  - keep the Arabic school-term columns, labelled "your language (example: Arabic)".

- [ ] **Step 1: Write a failing test** `tests/example.test.js`.
  - `node tools/build.mjs page examples/micrograd` exits 0.
  - `node tools/verify.mjs examples/micrograd` exits 0.
  - The built page contains none of the words listed in the git-ignored
    `tests/private-words.txt` (whole words).
  - It contains 18 `section.st` and at least 20 `figure` elements.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Port the pieces as described.
- [ ] **Step 4:** Run it. Expect PASS. Also run the engine checks from the original build: L
  grads 6, −4, −2, −2, −2, 4; the neuron o is 0.7071; training at lr 0.05 drops the loss below 0.01
  within 200 steps. Add them as `tests/engine.test.js` importing
  `examples/micrograd/src/js/05-engine.js`.
- [ ] **Step 5:** Commit "feat(examples): micrograd companion on the library".

### Task 11: The skill workflow

**Files:**
- Create: `skills/explorables/SKILL.md` and `skills/explorables/references/` `intake.md`,
  `plan-format.md`, `anatomy.md`, `pictures.md`, `pitfalls.md`, `review.md`, `study-step.md`,
  `delivery.md`
- Create: `templates/station.html`
- Test: `tests/skill-docs.test.js`

**Interfaces:**
- **`SKILL.md` frontmatter:**
  - `name: explorables`;
  - description: "Use when someone wants to learn something with a companion page: a YouTube
    lecture or playlist, a course, a book chapter, docs, or a bare topic. Builds an interactive
    page with plain-language re-explanations, 2D/3D pictures, vocabulary in their language, and a
    follow-along for videos. Also use when they say they finished a part (the study step)."
- **`SKILL.md` body:** the steps, each pointing at its reference file.
  1. Profile: read `~/.explorables/profile.md` and `~/.explorables/pitfalls.md`; create them on
     first run.
  2. Intake: situational questions, one at a time (`intake.md`).
  3. Watch or read the source: claudetube for YouTube; `Read` for files; the learner's Chrome
     through Claude in Chrome for logged-in sites, only after asking (v2).
  4. Write `plan.json` and run `validatePlan` (`plan-format.md`). Check every timestamp against
     the transcript.
  5. Build the stations from `templates/station.html` and the pictures from the lib
     (`pictures.md`, `anatomy.md`). Run `build`.
  6. Verify: `node tools/verify.mjs` until it exits 0, then look at one screenshot per theme.
  7. Review: one reviewer subagent with `review.md`'s prompt (facts and timestamps vs source, and
     UI). Fix, re-verify once.
  8. Deliver (`delivery.md`): publish as an artifact when the Artifact tool exists, otherwise open
     the local file. Update `course.json`.
  9. Study step (`study-step.md`): when the learner says they finished a part, run the out-loud
     quiz (3–5 questions), mark the part done, write notes, rebuild the course home.
- **Learner work location:** `<cwd>/explorables/<course-id>/<NN-part-id>/` (`plan.json`, `src/`,
  `index.html`); the course home is at `<cwd>/explorables/<course-id>/index.html`.
- **`profile.md` fields:** goal, starting point, term language, hands-on rule (on by default),
  theme, check count, notes per course.
- **`pitfalls.md` (repo):**
  - every pitfall listed in spec §8, each with its fix;
  - a line telling builders to append the learner's own lessons to `~/.explorables/pitfalls.md`.
  
  Bug reports from learners are drafted as GitHub issues only with their permission.
- **`pictures.md`:** a catalogue of the lib's parts (Stage, heightSurface, contours, graph2D) and
  of the example's reusable patterns (slider plot, step-through builder, nudge machine, gears,
  surface with slices, MLP 3D, live trainer). For each: when to use it, the minimal code, and what
  it proves.
- **`anatomy.md`:** the station anatomy from spec §7.2; the writing rules (plain words, short
  sentences, no em-dash asides, quotes under 15 words); the word-box format with the optional
  language column; how many check questions.
- **`delivery.md`:** artifact publish rules (same file path keeps the URL; read before republish),
  and opening the local `.html` otherwise.

- [ ] **Step 1: Write a failing test.**
  - `SKILL.md` has frontmatter with `name: explorables`.
  - Every `references/*.md` path mentioned in `SKILL.md` exists.
  - `pitfalls.md` mentions every pitfall keyword from spec §8: `slider`, `sticky`, `.ghost`,
    `PowerShell`, `scroll`, `[hidden]`, `camera`, `localStorage`.
  - `templates/station.html` contains the anchors `st-head`, `moments`, `check`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Write the docs, with the content listed above.
- [ ] **Step 4:** Run it. Expect PASS.
- [ ] **Step 5:** Commit "feat(skill): explorables workflow and references".

### Task 12: Bundle claudetube, README, AGENTS.md

**Files:**
- Create: `skills/watch-youtube/` (a copy of
  `~/.claude/plugins/cache/claudetube/claudetubeskim/0.2.0/skills/watch-youtube/` plus its
  `LICENSE`)
- Create: `README.md`, `AGENTS.md`
- Test: `tests/repo-docs.test.js`

**Interfaces:**
- `AGENTS.md` tells any agent handed the repo:
  - read `skills/explorables/SKILL.md` and follow it;
  - tools run with `node tools/...` from the repo root;
  - Node ≥ 20 is required;
  - claudetube needs Python 3, yt-dlp and ffmpeg (exit code 2 prints the install command).
- `README.md` covers:
  - what it is, with a screenshot of the micrograd example;
  - installing as a plugin (`/plugin marketplace add moazessam376-dev/explorables`, then
    `/plugin install explorables`);
  - "or just hand Claude the repo";
  - the themes;
  - the privacy note: everything stays local, except what the learner publishes.

- [ ] **Step 1: Write a failing test.**
  - `AGENTS.md` contains `skills/explorables/SKILL.md`.
  - `skills/watch-youtube/SKILL.md` and `skills/watch-youtube/LICENSE` exist.
  - `README.md` mentions `examples/micrograd`.
- [ ] **Step 2:** Run it. Expect FAIL.
- [ ] **Step 3:** Copy the skill and write the docs.
- [ ] **Step 4:** Run `npm test`. Expect the whole suite to PASS.
- [ ] **Step 5:** Commit "docs: README, AGENTS, bundled watch-youtube".

### Task 13: The original page on the library

**Files:**
- Modify: `original/src/` so it becomes a page dir: add `plan.json`, keep the personal
  `body*.html` and the page JS.
- `original/src/build.py` is replaced by
  `node tools/build.mjs page original/src --out original/01-micrograd.html`.

**Interfaces:** Consumes everything above. The output path is unchanged, so the published page
keeps its URL.

- [ ] **Step 1:** Run `verify` on the personal page dir. Expect FAIL (no plan.json yet).
- [ ] **Step 2:** Generate `plan.json` from the example's (same structure) and keep the personal
  text.
- [ ] **Step 3:** Run build and verify. Expect exit 0.
- [ ] **Step 4:** Republish to the same artifact URL (Artifact tool, same file path). Confirm
  Follow, Resume, the themes and auto-complete in the published page.
- [ ] **Step 5:** Commit in `F:\explorables` (no commit in the learner's folder unless they ask).

### Task 14: Acceptance run (spec §11)

**Files:** none in the repo, except fixes the run uncovers.

- [ ] **Step 1:** In the learner's study folder, ask Claude to "use Explorables" for Karpathy's makemore (part 1:
  bigram) lecture, with the plugin loaded from `F:\explorables`.
- [ ] **Step 2:** Check that the run asks only situational questions, reuses the saved profile,
  and writes `explorables/zero-to-hero/02-makemore-bigram/`.
- [ ] **Step 3:** Expect one sitting; `verify` exits 0; the reviewer's findings are fixed; the page
  matches the reference density (a picture per section).
- [ ] **Step 4:** The learner uses it with the video. Every bug goes into the lib plus `pitfalls.md`,
  with a test where one fits.
- [ ] **Step 5:** Ask the owner before creating the public GitHub repo and pushing.
