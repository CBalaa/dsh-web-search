/**
 * Phase A verification (plan A4): mocked unit tests over the apply() wiring.
 *
 * - a) a pushed settings source reaches the NEXT search() (baseURL + key)
 * - b) a vendor switch disposes the old registration once and re-registers
 *      the new vendor under the same fixed id
 * - c) with no settings service the composition config drives everything
 * - d) the current profile cordis config validates against the schema
 * - e) the credentials service participates in the key chain, and a total
 *      absence of keys fails with WEB_PROVIDER_CREDENTIAL_MISSING
 */
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { apply, FETCH_PROVIDER_ID, SEARCH_PROVIDER_ID, SETTINGS_NAMESPACE } from "../lib/index.js";
import { Config } from "../lib/config-schema.js";

/** Deterministic fetch stub: records requests, answers the canned JSON. */
function stubFetch(answerJson) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url, headers: init.headers, payload: JSON.parse(init.body) });
    return { status: 200, text: async () => JSON.stringify(answerJson) };
  };
  return { calls, restore: () => (globalThis.fetch = original) };
}

const noopLogger = { warn() {}, info() {}, error() {} };

/**
 * Mock plugin context. `services.settings` presence decides whether the
 * ctx.inject(["settings"]) callback runs (cordis optional injection).
 */
function mockCtx(services = {}) {
  const events = [];
  const providers = { search: new Map(), fetch: new Map() };
  const settingsInstalls = [];
  const ctx = {
    logger: noopLogger,
    web: {
      registerSearchProvider(provider) {
        if (providers.search.has(provider.id)) throw new Error(`duplicate search id ${provider.id}`);
        providers.search.set(provider.id, provider);
        events.push(`register:search:${provider.id}`);
        return () => {
          providers.search.delete(provider.id);
          events.push(`dispose:search:${provider.id}`);
        };
      },
      registerFetchProvider(provider) {
        if (providers.fetch.has(provider.id)) throw new Error(`duplicate fetch id ${provider.id}`);
        providers.fetch.set(provider.id, provider);
        events.push(`register:fetch:${provider.id}`);
        return () => {
          providers.fetch.delete(provider.id);
          events.push(`dispose:fetch:${provider.id}`);
        };
      },
    },
    inject(deps, cb) {
      if (deps.includes("settings") && services.settings !== undefined) {
        cb({ ...ctx, settings: services.settings });
      }
    },
    get(name) {
      return services[name];
    },
  };
  return { ctx, events, providers, settingsInstalls };
}

/**
 * Mock settings service mirroring installSection semantics: capture the
 * hooks, resolve pushed values through the registered schema, and drive
 * setSource/onChange exactly like the real implementation.
 */
function mockSettings() {
  const installs = [];
  return {
    installs,
    installSection(owner, ns, schema, entry, hooks) {
      installs.push({ ns, schema, entry, hooks });
      this.push(entry);
    },
    /** Push a new raw section: resolve through the schema, swap source, notify. */
    push(raw) {
      const install = installs.at(-1);
      const resolved = install.schema(raw);
      install.hooks.setSource(() => resolved);
      install.hooks.onChange();
    },
  };
}

const TAVILY_ANSWER = { results: [{ url: "https://example.test", title: "t", content: "c" }], answer: "a" };
const FIRECRAWL_ANSWER = { success: true, data: { web: [{ url: "https://example.test", title: "t", description: "d" }] } };

test.afterEach(() => {
  delete process.env.DSH_WEB_SEARCH_TEST_KEY;
});

test("a) settings source push hot-applies baseURL and key to the next search", async () => {
  const settings = mockSettings();
  const mock = mockCtx({ settings });
  const stub = stubFetch(TAVILY_ANSWER);
  try {
    apply(mock.ctx, {
      search: "tavily",
      providers: { tavily: { apiKey: "k1", baseURL: "https://a.example", transport: "fetch" } },
    });
    assert.equal(settings.installs.length, 1);
    assert.equal(settings.installs[0].ns, SETTINGS_NAMESPACE);
    // installSection ran with the composition entry as base, resolved via schema
    const provider = searchProviderOf(mock);
    await provider.search({ query: "q" });
    assert.equal(stub.calls.at(-1).url, "https://a.example/search");
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer k1");
  } finally {
    stub.restore();
  }
});

/** Reach the registered search provider of a mock ctx. */
function searchProviderOf(mock) {
  const provider = mock.providers.search.get(SEARCH_PROVIDER_ID);
  assert.ok(provider, "expected a registered search provider");
  return provider;
}

test("a2) pushed config changes key/baseURL without re-registration", async () => {
  const settings = mockSettings();
  const mock = mockCtx({ settings });
  const stub = stubFetch(TAVILY_ANSWER);
  try {
    apply(mock.ctx, {
      search: "tavily",
      providers: { tavily: { apiKey: "k1", baseURL: "https://a.example", transport: "fetch" } },
    });
    const provider = searchProviderOf(mock);
    await provider.search({ query: "q1" });
    assert.equal(stub.calls.at(-1).url, "https://a.example/search");
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer k1");

    settings.push({
      search: "tavily",
      providers: { tavily: { apiKey: "k2", baseURL: "https://b.example", transport: "fetch" } },
    });
    await provider.search({ query: "q2" });
    assert.equal(stub.calls.at(-1).url, "https://b.example/search");
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer k2");
    // same vendor: no dispose/re-register churn
    assert.deepEqual(
      mock.events.filter((event) => event.startsWith("dispose")),
      [],
    );
    assert.equal(mock.providers.search.size, 1);
  } finally {
    stub.restore();
  }
});

test("b) vendor switch disposes once and re-registers under the fixed id", async () => {
  const settings = mockSettings();
  const mock = mockCtx({ settings });
  const stub = stubFetch(FIRECRAWL_ANSWER);
  try {
    apply(mock.ctx, {
      search: "tavily",
      providers: { tavily: { apiKey: "k1", transport: "fetch" } },
    });
    assert.deepEqual(mock.events, [`register:search:${SEARCH_PROVIDER_ID}`]);

    settings.push({
      search: "firecrawl",
      providers: { firecrawl: { apiKey: "fc", baseURL: "https://fc.example", transport: "fetch" } },
    });
    assert.deepEqual(mock.events, [
      `register:search:${SEARCH_PROVIDER_ID}`,
      `dispose:search:${SEARCH_PROVIDER_ID}`,
      `register:search:${SEARCH_PROVIDER_ID}`,
    ]);
    assert.equal(mock.providers.search.size, 1);

    await searchProviderOf(mock).search({ query: "q" });
    assert.equal(stub.calls.at(-1).url, "https://fc.example/search");
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer fc");

    // switching back restores tavily
    settings.push({ search: "tavily", providers: { tavily: { apiKey: "k1", transport: "fetch" } } });
    assert.deepEqual(mock.events.slice(-2), [`dispose:search:${SEARCH_PROVIDER_ID}`, `register:search:${SEARCH_PROVIDER_ID}`]);
  } finally {
    stub.restore();
  }
});

test("b2) fetch switching off disposes without registering", async () => {
  const settings = mockSettings();
  const mock = mockCtx({ settings });
  apply(mock.ctx, { search: "tavily", providers: { tavily: { apiKey: "k1" } } });
  assert.equal(mock.providers.search.size, 1);
  settings.push({ search: "tavily", fetch: "tavily", providers: { tavily: { apiKey: "k1" } } });
  assert.equal(mock.providers.fetch.size, 1);
  settings.push({ search: "tavily", fetch: "off", providers: { tavily: { apiKey: "k1" } } });
  assert.equal(mock.providers.fetch.size, 0);
  assert.equal(mock.events.at(-1), `dispose:fetch:${FETCH_PROVIDER_ID}`);
  assert.equal(mock.providers.search.size, 1);
});

test("c) without a settings service the composition config drives everything", async () => {
  const mock = mockCtx(); // no settings service: inject callback never runs
  const stub = stubFetch(TAVILY_ANSWER);
  try {
    apply(mock.ctx, {
      search: "tavily",
      fetch: "tavily",
      providers: { tavily: { apiKey: "kC", baseURL: "https://c.example", transport: "fetch" } },
    });
    assert.equal(mock.providers.search.size, 1);
    assert.equal(mock.providers.fetch.size, 1);
    await searchProviderOf(mock).search({ query: "q" });
    assert.equal(stub.calls.at(-1).url, "https://c.example/search");
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer kC");
  } finally {
    stub.restore();
  }
});

test("d) the current profile cordis config validates (backward compat)", () => {
  const profile = { search: "tavily", fetch: "tavily", providers: { tavily: {} } };
  const resolved = Config(profile);
  assert.equal(resolved.search, "tavily");
  assert.equal(resolved.fetch, "tavily");
  assert.equal(resolved.providers.tavily.maxResults, 8);
  // bundle-patch shape (fetch omitted) resolves to fetch: "off"
  const bundle = Config({ search: "tavily", providers: { tavily: {} } });
  assert.equal(bundle.fetch, "off");
  // legacy transport pins still validate; "auto" is admitted too
  assert.equal(Config({ providers: { tavily: { transport: "curl" } } }).providers.tavily.transport, "curl");
  assert.equal(Config({ providers: { tavily: { transport: "auto" } } }).providers.tavily.transport, "auto");
  assert.throws(() => Config({ search: "unknown-vendor" }));
  assert.throws(() => Config({ fetch: "" }));
});

test("e) credentials service joins the key chain; total absence fails readable", async () => {
  process.env.DSH_WEB_SEARCH_TEST_KEY = "";
  const credentials = {
    calls: [],
    async resolve(ref) {
      this.calls.push(String(ref));
      return { value: "k-from-service" };
    },
  };
  const mock = mockCtx({ credentials });
  const stub = stubFetch(FIRECRAWL_ANSWER);
  try {
    apply(mock.ctx, {
      search: "firecrawl",
      providers: { firecrawl: { apiKeyEnv: "DSH_WEB_SEARCH_TEST_KEY", transport: "fetch" } },
    });
    await searchProviderOf(mock).search({ query: "q" });
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer k-from-service");
    assert.deepEqual(credentials.calls, ["DSH_WEB_SEARCH_TEST_KEY"]);

    // and when every channel is empty the request fails with the readable code
    credentials.resolve = async () => undefined;
    await assert.rejects(
      () => searchProviderOf(mock).search({ query: "q" }),
      (error) => {
        assert.equal(error.code, "WEB_PROVIDER_CREDENTIAL_MISSING");
        assert.match(error.message, /DSH_WEB_SEARCH_TEST_KEY/);
        return true;
      },
    );
  } finally {
    stub.restore();
  }
});

test("e2) env fallback still works when the credentials service is absent", async () => {
  process.env.DSH_WEB_SEARCH_TEST_KEY = "k-from-env";
  const mock = mockCtx(); // no credentials service
  const stub = stubFetch(FIRECRAWL_ANSWER);
  try {
    apply(mock.ctx, {
      search: "firecrawl",
      providers: { firecrawl: { apiKeyEnv: "DSH_WEB_SEARCH_TEST_KEY", transport: "fetch" } },
    });
    await searchProviderOf(mock).search({ query: "q" });
    assert.equal(stub.calls.at(-1).headers.authorization, "Bearer k-from-env");
  } finally {
    stub.restore();
  }
});
