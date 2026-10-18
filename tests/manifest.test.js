import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));

test("plugin manifest names explorables, MIT, and the repo", () => {
  const plugin = read(".claude-plugin/plugin.json");
  assert.equal(plugin.name, "explorables");
  assert.equal(plugin.license, "MIT");
  assert.equal(plugin.repository, "https://github.com/moazessam376-dev/explorables");
});

test("marketplace lists the plugin from the repo root", () => {
  const market = read(".claude-plugin/marketplace.json");
  assert.equal(market.plugins[0].name, "explorables");
  assert.equal(market.plugins[0].source, "./");
});
