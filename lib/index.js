/**
 * dsh-web-search — multi-vendor web_search / web_fetch backends for the DSH
 * web capability seam (ctx.web), independent of the conversation LLM provider.
 *
 * One config file drives everything (profile cordis.patch.yml):
 *
 *   - insert:
 *       - id: web-search
 *         name: 'dsh-web-search'
 *         config:
 *           search: tavily        # vendor for web_search  (registry name)
 *           fetch: tavily         # vendor for web_fetch   (optional)
 *           providers:
 *             tavily: {}          # per-vendor options; keys fall back to
 *             firecrawl: {}       # $TAVILY_API_KEY / $FIRECRAWL_API_KEY etc.
 *
 *   - id: web
 *     config:
 *       searchProvider: dsh-web-search   # fixed id this plugin registers under
 *       fetchProvider: dsh-web-fetch     # (or keep the built-in "http")
 *
 * Vendors are registered under the FIXED ids above so switching vendors is a
 * one-line change (`search:` / `fetch:`) — the web seam row never moves.
 *
 * Adding a vendor: see lib/registry.js — drop a module into lib/providers/,
 * register one line, document in README. No other code changes.
 */
import { createProviders, listProviders } from "./registry.js";
import { postJson } from "./transport.js";
import * as errors from "./errors.js";
import { cleanSnippet, envValue, firstNonBlank, parseJson, positiveInteger, readHomeJson } from "./util.js";

export const name = "web-search";
export const inject = ["web"];

/** Fixed registration ids; the web seam selects providers by exact id. */
export const SEARCH_PROVIDER_ID = "dsh-web-search";
export const FETCH_PROVIDER_ID = "dsh-web-fetch";

const HELPERS = Object.freeze({
  postJson,
  envValue,
  readHomeJson,
  firstNonBlank,
  cleanSnippet,
  parseJson,
  positiveInteger,
  errors,
});

export function apply(ctx, config = {}) {
  const vendors = config.providers ?? {};

  if (typeof config.search === "string" && config.search.length > 0) {
    const { search } = createProviders(config.search, vendors[config.search], HELPERS);
    if (search === null) {
      throw new Error(`dsh-web-search: vendor "${config.search}" provides no search capability.`);
    }
    ctx.web.registerSearchProvider({ ...search, id: SEARCH_PROVIDER_ID });
  }

  if (typeof config.fetch === "string" && config.fetch.length > 0) {
    const { fetch } = createProviders(config.fetch, vendors[config.fetch], HELPERS);
    if (fetch === null) {
      throw new Error(`dsh-web-search: vendor "${config.fetch}" provides no fetch capability.`);
    }
    ctx.web.registerFetchProvider({ ...fetch, id: FETCH_PROVIDER_ID });
  }
}

export { listProviders };
