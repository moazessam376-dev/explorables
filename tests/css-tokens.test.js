import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = p => readFileSync(new URL("../lib/css/" + p, import.meta.url), "utf8");
// the declarations inside the last block whose selector text matches `sel`
// (the last one, because a theme can also appear in a shared font rule earlier on)
function block(src, sel) {
  const i = src.lastIndexOf(sel);
  if (i < 0) return null;
  const open = src.indexOf("{", i), close = src.indexOf("}", open);
  return src.slice(open + 1, close);
}
const defined = body => new Set([...body.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));

const COLOURS = ["--paper", "--panel", "--ink", "--muted", "--rule", "--wash", "--data", "--grad", "--nudge", "--ok", "--neg",
  "--data-soft", "--grad-soft", "--nudge-soft", "--ok-soft", "--neg-soft", "--stage",
  "--top-bg", "--top-ink", "--top-muted", "--top-rule", "--top-tl", "--top-field", "--on-data"];

test("every token base.css uses is defined in the default theme", () => {
  const themes = css("themes.css"), base = css("base.css");
  const root = defined(block(themes, ":root{"));
  const used = new Set([...base.matchAll(/var\((--[\w-]+)/g)].map(m => m[1]));
  const missing = [...used].filter(v => !root.has(v));
  assert.deepEqual(missing, []);
});

test("every theme defines every colour token", () => {
  const themes = css("themes.css");
  for (const sel of ['[data-skin="field-dark"]', ':root[data-skin="chalk"]', ':root[data-skin="notebook-light"]{', ':root[data-skin="notebook-dark"]', ':root[data-skin="manim"]']) {
    const body = block(themes, sel);
    assert.ok(body, `theme block ${sel} exists`);
    const have = defined(body);
    const missing = COLOURS.filter(c => !have.has(c));
    assert.deepEqual(missing, [], `${sel} is missing colours`);
  }
});

test("no bare .ghost class that would collide with .btn.ghost", () => {
  const base = css("base.css");
  const bare = [...base.matchAll(/(^|[\s,}])\.ghost\b/g)];
  assert.equal(bare.length, 0);
});

test("hidden elements stay hidden", () => {
  assert.match(css("base.css"), /\[hidden\]\{display:none!important\}/);
});

test("sliders and checkboxes are drawn from the theme in both browser engines", () => {
  const base = css("base.css");
  for (const k of ["::-webkit-slider-runnable-track", "::-webkit-slider-thumb", "::-moz-range-track", "::-moz-range-thumb",
    "::-moz-range-progress", "var(--fill", "input[type=checkbox]:checked", "var(--on-data)", "forced-colors"]) {
    assert.ok(base.includes(k), `base.css should style ${k}`);
  }
  assert.ok(!base.includes("accent-color"), "no browser-default accent-color controls left");
});

test("every theme gives sliders its own look", () => {
  const themes = css("themes.css");
  const LOOK = ["--track-h", "--track-r", "--track-bg", "--thumb-w", "--thumb-h", "--thumb-r", "--thumb-bg", "--thumb-bw", "--thumb-glow"];
  for (const sel of [":root{", ':root[data-skin="chalk"]', ':root[data-skin="notebook-light"], :root[data-skin="notebook-dark"]', ':root[data-skin="manim"]']) {
    const have = defined(block(themes, sel));
    assert.deepEqual(LOOK.filter(k => !have.has(k)), [], `${sel} is missing slider looks`);
  }
});
