import { test } from "node:test";
import assert from "node:assert/strict";
import { findBrowser, launch } from "../tools/cdp.mjs";

test("a call after the browser is gone fails fast instead of hanging",
  { skip: !findBrowser() && "no Chrome or Edge on this machine", timeout: 30000 }, async () => {
    const b = await launch(findBrowser());
    const ok = await b.send("Runtime.evaluate", { expression: "1 + 1", returnByValue: true });
    assert.equal(ok.result.value, 2);
    await b.close();
    const started = Date.now();
    await assert.rejects(b.send("Runtime.evaluate", { expression: "1" }), /closed/);
    assert.ok(Date.now() - started < 3000);
  });
