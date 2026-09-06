/**
 * Phase A real-machine verification (plan A4, second half) — boots a REAL
 * cordis app in-process with the real `@deepseek-ai/dsh-web` seam, the real
 * file-backed settings provider (on a scratch document), and this plugin,
 * then drives the settings document exactly like a user edit of
 * ~/.dsh/settings.yaml and observes the hot vendor switch through the seam.
 *
 * Not run by `npm test` (network + real cordis boot): run explicitly with
 *   node tests/integration.mjs
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { Context } from "@deepseek-ai/cordis";
import WebRuntime from "@deepseek-ai/dsh-web";
import SettingsFile from "@deepseek-ai/dsh-settings-file";

import { apply } from "../lib/index.js";
import * as plugin from "../lib/index.js";

const TAVILY_ANSWER = { results: [{ url: "https://example.test", title: "t", content: "c" }], answer: "a" };
const FIRECRAWL_ANSWER = { success: true, data: { web: [{ url: "https://example.test", title: "f", description: "d" }] } };

/** Deterministic fetch stub: routes canned answers per host, records calls. */
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  calls.push({ url, authorization: init.headers?.authorization });
  const host = new URL(url).host;
  return {
    status: 200,
    text: async () => JSON.stringify(host.includes("firecrawl") ? FIRECRAWL_ANSWER : TAVILY_ANSWER),
  };
};

const dir = await mkdtemp(join(tmpdir(), "dsh-web-search-it-"));
const settingsPath = join(dir, "settings.yaml");
await writeFile(settingsPath, "# scratch settings document\n");

const app = new Context();
// The web seam with the same fixed ids the profile composition selects.
await app.plugin(WebRuntime, { searchProvider: "dsh-web-search", fetchProvider: "dsh-web-fetch" });
// The real file-backed settings service over the scratch document.
await app.plugin(SettingsFile, { path: settingsPath, debounceMs: 50 });
// The plugin under test, straight from this checkout. Passing the module
// object keeps its `inject = ["web"]` declaration on the fiber.
await app.plugin(plugin, {
  search: "tavily",
  fetch: "off",
  providers: { tavily: { apiKey: "k-tavily", transport: "fetch" } },
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

try {
  // 1. Composition config serves tavily out of the gate.
  const first = await app.web.search({ query: "integration-a" });
  assert.equal(calls.at(-1).url, "https://api.tavily.com/search");
  assert.equal(calls.at(-1).authorization, "Bearer k-tavily");
  assert.ok(Array.isArray(first.sources));
  console.log("ok 1: composition config serves tavily");

  // 2. A user-style document edit switches the vendor — no restart.
  await writeFile(settingsPath, "web-search:\n  search: firecrawl\n  providers:\n    firecrawl:\n      apiKey: k-firecrawl\n      transport: fetch\n");
  await sleep(500); // provider reload debounce + watch fan-out
  await app.web.search({ query: "integration-b" });
  assert.equal(calls.at(-1).url, "https://api.firecrawl.dev/v2/search");
  assert.equal(calls.at(-1).authorization, "Bearer k-firecrawl");
  console.log("ok 2: settings.yaml edit hot-switched search tavily -> firecrawl");

  // 3. Editing back restores tavily.
  await writeFile(settingsPath, "web-search:\n  search: tavily\n");
  await sleep(500);
  await app.web.search({ query: "integration-c" });
  assert.equal(calls.at(-1).url, "https://api.tavily.com/search");
  assert.equal(calls.at(-1).authorization, "Bearer k-tavily");
  console.log("ok 3: editing back hot-restored tavily");

  // 4. Missing key surfaces the readable credential error through the seam.
  await writeFile(settingsPath, "web-search:\n  search: firecrawl\n  providers:\n    firecrawl:\n      apiKeyEnv: DSH_WEB_SEARCH_IT_MISSING\n");
  await sleep(500);
  await assert.rejects(
    () => app.web.search({ query: "integration-d" }),
    (error) => {
      assert.match(String(error), /DSH_WEB_SEARCH_IT_MISSING/);
      return true;
    },
  );
  console.log("ok 4: keyless firecrawl fails with the readable credential error");

  // 5. Clearing the section re-inherits the composition config.
  await writeFile(settingsPath, "# scratch settings document\n");
  await sleep(500);
  await app.web.search({ query: "integration-e" });
  assert.equal(calls.at(-1).url, "https://api.tavily.com/search");
  console.log("ok 5: clearing the user section re-inherits the composition config");
} finally {
  await app.fiber.dispose();
  globalThis.fetch = originalFetch;
  await rm(dir, { recursive: true, force: true });
}

console.log("integration: all checks passed");
