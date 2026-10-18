import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
import { findBrowser, launch } from "../tools/cdp.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));

test("when three.js can't load, every 3D stage says so",
  { skip: !findBrowser() && "no Chrome or Edge on this machine", timeout: 60000 }, async () => {
    const dir = join(root, "tests/.out/three-offline");
    rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
    cpSync(join(root, "tests/fixtures/mini-page"), dir, { recursive: true });
    const body = join(dir, "src/body.html");
    // one stage the page builds, and one far down that nothing has reached yet
    writeFileSync(body, readFileSync(body, "utf8").replace("</main>",
      '<div class="stage" id="t3a"></div><div style="height:4000px"></div><div class="stage" id="t3b"></div></main>'));
    writeFileSync(join(dir, "src/js/90-stage.js"), 'safe("t3a", () => { new Stage($("#t3a")); });\n');
    assert.equal(spawnSync(process.execPath, [join(root, "tools/build.mjs"), "page", dir]).status, 0);
    const b = await launch(findBrowser());
    const ev = async expr => (await b.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
    try {
      await b.send("Page.enable"); await b.send("Runtime.enable"); await b.send("Network.enable");
      await b.send("Network.setBlockedURLs", { urls: ["*cdnjs.cloudflare.com*"] });
      await b.send("Page.navigate", { url: pathToFileURL(join(dir, ".preview.html")).href });
      const texts = await ev(`(async () => {
        for (let i = 0; i < 100 && document.readyState !== "complete"; i++) await new Promise(r => setTimeout(r, 100));
        await new Promise(r => setTimeout(r, 300));
        return ["t3a", "t3b"].map(id => document.getElementById(id).textContent);
      })()`);
      for (const t of texts) assert.match(t, /three\.js.*offline/i, JSON.stringify(texts));
    } finally { await b.close(); }
  });
