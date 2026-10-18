import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { findBrowser, launch } from "../tools/cdp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const wait = ms => new Promise(r => setTimeout(r, ms));

test("the now line only changes when the moment changes (screen readers)",
  { skip: !findBrowser() && "no Chrome or Edge on this machine", timeout: 60000 }, async () => {
    const dir = join(root, "tests/.out/fb-now");
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
    assert.equal(spawnSync(process.execPath, [join(root, "tools/build.mjs"), "page", dir]).status, 0);
    const b = await launch(findBrowser());
    const ev = async expr => (await b.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    try {
      await b.send("Page.enable"); await b.send("Runtime.enable");
      await b.send("Page.navigate", { url: pathToFileURL(join(dir, ".preview.html")).href });
      const changes = await ev(`(async () => {
        const until = async ok => { for (let i = 0; i < 100 && !ok(); i++) await new Promise(r => setTimeout(r, 100)); };
        await until(() => document.readyState === "complete" && document.getElementById("fl-now").textContent);
        document.getElementById("pr-skip").click();      // start following (skipping the read-first card)
        await until(() => document.getElementById("fl-play").textContent.includes("Pause"));
        await new Promise(r => setTimeout(r, 300));
        let n = 0;
        new MutationObserver(m => { n += m.length; }).observe(document.getElementById("fl-now"), { childList: true, subtree: true, characterData: true });
        await new Promise(r => setTimeout(r, 1500));       // 0:00 to ~0:02: still the first moment
        return n;
      })()`);
      assert.ok(changes <= 1, `#fl-now changed ${changes} times in 1.5 s`);
    } finally { await b.close(); }
  });

test("auto-complete marks the last section done when the lecture ends",
  { skip: !findBrowser() && "no Chrome or Edge on this machine", timeout: 60000 }, async () => {
    const dir = join(root, "tests/.out/fb-end");
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
    assert.equal(spawnSync(process.execPath, [join(root, "tools/build.mjs"), "page", dir]).status, 0);
    const b = await launch(findBrowser());
    const ev = async expr => (await b.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    try {
      await b.send("Page.enable"); await b.send("Runtime.enable");
      await b.send("Page.navigate", { url: pathToFileURL(join(dir, ".preview.html")).href });
      const done = await ev(`(async () => {
        const $ = s => document.querySelector(s);
        const until = async ok => { for (let i = 0; i < 100 && !ok(); i++) await new Promise(r => setTimeout(r, 100)); };
        await until(() => document.readyState === "complete" && $("#fl-now").textContent);
        const box = $("#fl-autodone"); box.checked = true; box.dispatchEvent(new Event("change"));
        $("#pr-skip").click();
        await until(() => $("#fl-play").textContent.includes("Pause"));
        $("#fl-clock").click(); $("#fl-input").value = "4:59"; $("#fl-form").requestSubmit();
        await until(() => !$("#fl-play").textContent.includes("Pause"));
        await new Promise(r => setTimeout(r, 200));
        return $("#s-b").classList.contains("is-done");
      })()`);
      assert.equal(done, true);
    } finally { await b.close(); }
  });
