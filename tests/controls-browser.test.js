import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { findBrowser, launch } from "../tools/cdp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("a slider's fill follows its value, even when code sets it; checkboxes are themed",
  { skip: !findBrowser() && "no Chrome or Edge on this machine", timeout: 60000 }, async () => {
    const dir = join(root, "tests/.out/controls");
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
    const body = join(dir, "src/body.html");
    writeFileSync(body, readFileSync(body, "utf8").replace('<output id="pa-out">',
      '<div class="slider"><label for="t-r">x</label><input type="range" id="t-r" min="-4" max="4" step="0.5" value="2"><output>2</output></div>' +
      '<label class="chk"><input type="checkbox" id="t-c" checked> a box</label><output id="pa-out">'));
    assert.equal(spawnSync(process.execPath, [join(root, "tools/build.mjs"), "page", dir]).status, 0);
    const b = await launch(findBrowser());
    const ev = async expr => (await b.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    try {
      await b.send("Page.enable"); await b.send("Runtime.enable");
      await b.send("Page.navigate", { url: pathToFileURL(join(dir, ".preview.html")).href });
      const r = await ev(`(async () => {
        for (let i = 0; i < 100 && document.readyState !== "complete"; i++) await new Promise(r => setTimeout(r, 100));
        const s = document.getElementById("t-r"), c = document.getElementById("t-c");
        const fill = () => s.style.getPropertyValue("--fill");
        const atLoad = fill();
        s.value = -4; const fromCode = fill();
        s.value = 4; s.dispatchEvent(new Event("input", { bubbles: true })); const fromInput = fill();
        return { atLoad, fromCode, fromInput, range: getComputedStyle(s).appearance, box: getComputedStyle(c).appearance };
      })()`);
      assert.deepEqual(r, { atLoad: "75%", fromCode: "0%", fromInput: "100%", range: "none", box: "none" });
    } finally { await b.close(); }
  });
