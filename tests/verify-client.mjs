/**
 * Client bundle verification (plan B2): loads the built lib/client.js through
 * a stub window.__ModuleLoader__ with mock client services and drives the
 * staged form exactly like the settings page would — locale registration,
 * scope binding, slot registration, credential badges, revision-fenced
 * mutates, secret writes outside the section, and the keep-drafts-on-failure
 * contract.
 *
 * Not part of `npm test` (it reads the build artifact): run with
 *   node tests/verify-client.cjs
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const React = require("react");

// ---- load the bundle through a stub module table ----
let registration = null;
globalThis.window = { __ModuleLoader__: { load: (reg) => (registration = reg) } };
eval(readFileSync(new URL("../lib/client.js", import.meta.url), "utf8"));
assert.equal(registration.id, "@balababa/dsh-web-search");

const store = (v) => {
  let val = v;
  const subs = new Set();
  return {
    getSnapshot: () => val,
    subscribe: (l) => (subs.add(l), () => subs.delete(l)),
    set: (v2) => {
      val = v2;
      subs.forEach((l) => l());
    },
    update: (fn) => fn(val),
  };
};
const exports_ = registration.factory((id) =>
  ({
    react: React,
    "react/jsx-runtime": require("react/jsx-runtime"),
    "@deepseek-ai/dsh-client-ui-primitives": { IconChevronDownOutline14: () => null },
    "@deepseek-ai/dsh-client-store": { createSnapshotStore: store },
  })[id],
);
assert.deepEqual(Object.keys(exports_).sort(), ["apply", "inject"]);
assert.deepEqual(exports_.inject, ["slots", "locale", "remote", "remote.credentials", "settingsScope"]);

// ---- mock client services ----
const log = [];
const scopeSnapshot = {
  status: "ready",
  writable: true,
  revision: 3,
  value: {
    search: "tavily",
    fetch: "off",
    providers: {
      tavily: {
        apiKeyEnv: "TAVILY_API_KEY",
        baseURL: "https://api.tavily.com",
        transport: "auto",
        timeoutSec: 30,
        maxResults: 8,
        searchDepth: "basic",
        includeAnswer: true,
      },
      firecrawl: {
        apiKeyEnv: "FIRECRAWL_API_KEY",
        baseURL: "https://api.firecrawl.dev/v2",
        transport: "auto",
        timeoutSec: 30,
      },
    },
  },
  base: {},
  user: { fetch: "off" },
};
const scope = {
  getSnapshot: () => scopeSnapshot,
  subscribe: () => () => {},
  mutate: async (ops) => log.push(["mutate", ops]),
};
const slotEntries = [];
const ctx = {
  locale: {
    register: (ns, dicts) => {
      log.push(["locale.register", ns, Object.keys(dicts)]);
      return () => {};
    },
  },
  settingsScope: {
    bind: (spec) => {
      log.push(["settingsScope.bind", spec.namespace]);
      return scope;
    },
  },
  remote: {
    $on: (event) => {
      log.push(["remote.$on", event]);
      return () => {};
    },
    credentials: {
      describe: async (refs) => ({
        ok: true,
        value: Object.fromEntries(refs.map((ref) => [ref, { configured: ref === "TAVILY_API_KEY", writable: true }])),
      }),
      set: async (ref, value) => log.push(["credentials.set", ref, value]),
    },
  },
  slots: {
    inject: (name, cb) => {
      log.push(["slots.inject", name]);
      const gen = cb();
      while (!gen.next().done);
    },
    register: (opts, comp) => {
      slotEntries.push({ opts, comp });
      return () => {};
    },
  },
  effect: (fn) => fn(),
};

exports_.apply(ctx);
assert.deepEqual(log[0], ["locale.register", "dsh-web-search", ["zh", "en"]]);
assert.deepEqual(log.find((e) => e[0] === "settingsScope.bind"), ["settingsScope.bind", "web-search"]);
assert.ok(log.some((e) => e[0] === "remote.$on" && e[1] === "credentials/reference-updated"));
assert.equal(slotEntries.length, 1);
assert.equal(slotEntries[0].opts.name, "settings.plugin.item");
assert.equal(slotEntries[0].opts.key, "web-search");
assert.equal(slotEntries[0].opts.locale, "dsh-web-search");

const injected = slotEntries[0].opts.inject();
assert.deepEqual(Object.keys(injected.hooks), ["webSearchCard"]);

// ---- settle the constructor-time credential describe ----
await new Promise((resolve) => setTimeout(resolve, 0));
const snap = injected.hooks.webSearchCard.getSnapshot();
assert.equal(snap.available, true);
assert.equal(snap.writable, true);
assert.equal(snap.dirty, false);
assert.deepEqual(snap.search, { text: "tavily", overridden: false, invalid: false });
assert.deepEqual(snap.fetch, { text: "off", overridden: true, invalid: false });
assert.equal(snap.searchVendor, "tavily");
assert.equal(snap.fetchVendor, "off");
assert.equal(snap.fetchKeyVisible, false);
assert.deepEqual(snap.activeVendors, ["tavily"]);
assert.equal(snap.searchKey.ref, "TAVILY_API_KEY");
assert.equal(snap.searchKey.configured, true);
assert.equal(snap.searchKey.writable, true);
assert.equal(snap.searchKey.text, "");
assert.equal(snap.fetchKey.ref, "");
assert.deepEqual(snap.tavily.fields.maxResults, { text: "8", overridden: false, invalid: false });
assert.deepEqual(snap.tavily.fields.includeAnswer, { text: true, overridden: false, invalid: false });

// ---- same vendor → single key (no second key) ----
injected.edit("fetch", "tavily"); // now identical to search
let sameVendor = injected.hooks.webSearchCard.getSnapshot();
assert.equal(sameVendor.fetchKeyVisible, false, "same vendor must not show a second key");
assert.deepEqual(sameVendor.activeVendors, ["tavily"]);

// ---- different vendors → second key appears ----
injected.edit("search", "firecrawl");
injected.edit("searchKey", "sk");
injected.edit("fetchKey", "fk");
injected.edit("tavily.maxResults", "12");
injected.edit("tavily.timeoutSec", "abc"); // invalid: blocks save
const staged = injected.hooks.webSearchCard.getSnapshot();
assert.equal(staged.dirty, true);
assert.equal(staged.invalid, true);
assert.equal(staged.search.text, "firecrawl");
assert.equal(staged.search.overridden, true);
assert.equal(staged.fetch.text, "tavily");
assert.equal(staged.fetchKeyVisible, true, "different vendors must show a second key");
assert.deepEqual(staged.activeVendors, ["firecrawl", "tavily"]);
assert.equal(staged.searchKey.ref, "FIRECRAWL_API_KEY");
assert.equal(staged.fetchKey.ref, "TAVILY_API_KEY");
assert.equal(staged.tavily.fields.maxResults.overridden, true);
assert.equal(staged.tavily.fields.timeoutSec.invalid, true);

await injected.save();
assert.equal(log.filter((e) => e[0] === "mutate").length, 0, "invalid draft must block the whole save");

injected.edit("tavily.timeoutSec", "45");
await injected.save();
const mutates = log.filter((e) => e[0] === "mutate").map((e) => e[1]);
assert.deepEqual(mutates, [
  [{ op: "set", path: ["fetch"], value: "tavily" }],
  [{ op: "set", path: ["search"], value: "firecrawl" }],
  [{ op: "set", path: ["providers", "tavily", "maxResults"], value: 12 }],
  [{ op: "set", path: ["providers", "tavily", "timeoutSec"], value: 45 }],
]);
const secretWrites = log.filter((e) => e[0] === "credentials.set");
assert.deepEqual(secretWrites, [
  ["credentials.set", "FIRECRAWL_API_KEY", "sk"],
  ["credentials.set", "TAVILY_API_KEY", "fk"],
]);
// the mock user layer never reflects the writes, so the read-back verdict is "not landed"
assert.equal(injected.hooks.webSearchCard.getSnapshot().failed, true);

// ---- a credential write must never appear in section mutates ----
assert.ok(!JSON.stringify(mutates).includes("apiKey"));

console.log("verify-client: all checks passed");
