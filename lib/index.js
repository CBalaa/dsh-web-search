/**
 * dsh-web-search — multi-vendor web_search / web_fetch backends for the DSH
 * web capability seam (ctx.web), independent of the conversation LLM provider.
 *
 * Configuration resolves through two layers, both hot-applied:
 *
 * - composition (always present): the plugin row's cordis config —
 *
 *     - id: web-search
 *       name: '@balababa/dsh-web-search'
 *       config:
 *         search: tavily        # vendor for web_search  (registry name)
 *         fetch: tavily         # vendor for web_fetch   (optional; "off" = none)
 *         providers:
 *           tavily: {}          # per-vendor options; keys fall back to
 *           firecrawl: {}       # credentials service / $VENDOR_API_KEY / files
 *
 * - settings (optional): when a settings provider is mounted, the `web-search`
 *   namespace of the settings document (`settings.yaml`) resolves over the
 *   composition config (schema defaults < base < user section). Editing the
 *   document or saving the Settings → Plugins → Plugin configuration card
 *   takes effect without a restart — vendor switches dispose/re-register the
 *   fixed-id providers, key/endpoint/parameter edits reach the next request
 *   through thunks.
 *
 * Vendors are registered under the FIXED ids below so switching vendors is a
 * one-line change (`search:` / `fetch:`) — the web seam row never moves.
 *
 * Adding a vendor: see lib/registry.js — drop a module into lib/providers/,
 * register one line, add its schema entry in lib/config-schema.js, document
 * in README.
 */
import { Config } from "./config-schema.js";
import { asCredentialRef } from "./credentials.js";
import { createProviders, listProviders } from "./registry.js";
import { postJson } from "./transport.js";
import * as errors from "./errors.js";
import { cleanSnippet, envValue, firstNonBlank, parseJson, positiveInteger, readHomeJson } from "./util.js";

export const name = "web-search";
export const inject = ["web"];

/** Fixed registration ids; the web seam selects providers by exact id. */
export const SEARCH_PROVIDER_ID = "dsh-web-search";
export const FETCH_PROVIDER_ID = "dsh-web-fetch";

/** Settings namespace carrying this plugin's vendor selection and options. */
export const SETTINGS_NAMESPACE = "web-search";

export function apply(ctx, config = {}) {
  let current = () => config;

  const helpers = Object.freeze({
    postJson,
    envValue,
    readHomeJson,
    firstNonBlank,
    cleanSnippet,
    parseJson,
    positiveInteger,
    errors,
    /**
     * Resolve one credential reference through the optional credentials
     * service. Returns the stored value, or undefined when the service is
     * absent, the name is outside the reference grammar, or nothing is
     * stored — callers then fall back to the process environment.
     */
    resolveCredential: async (apiKeyEnv) => {
      const credentials = ctx.get("credentials");
      const ref = asCredentialRef(apiKeyEnv);
      if (credentials === undefined || ref === undefined) return undefined;
      try {
        return firstNonBlank((await credentials.resolve(ref))?.value);
      } catch {
        return undefined; // a broken provider must not mask the env fallback
      }
    },
  });

  /**
   * Live registration state per capability kind. `vendor` names the vendor
   * whose provider currently holds the fixed id (null = nothing registered);
   * `dispose` is the seam disposer returned at registration.
   */
  const registered = {
    search: { vendor: null, dispose: null },
    fetch: { vendor: null, dispose: null },
  };

  /**
   * Diff the desired vendor for one capability against the registered state
   * and converge: dispose the stale registration first (fixed ids make a
   * re-register without it a WEB_DUPLICATE_PROVIDER), then register the new
   * vendor's provider under the fixed id. Unknown vendors and vendors without
   * the capability leave the kind unregistered — the seam then reports a
   * readable WEB_PROVIDER_CONFIGURED_MISSING at call time.
   */
  function syncProvider(kind, desired) {
    const slot = registered[kind];
    const vendor = typeof desired === "string" && desired !== "off" && desired.length > 0 ? desired : undefined;
    if (slot.vendor === vendor) return;
    if (slot.dispose !== null) {
      slot.dispose();
      slot.vendor = null;
      slot.dispose = null;
    }
    if (vendor === undefined) return;
    let providers;
    try {
      providers = createProviders(vendor, () => current()?.providers?.[vendor], helpers);
    } catch (error) {
      ctx.logger.warn("dsh-web-search: %s", error instanceof Error ? error.message : String(error));
      return;
    }
    const provider = providers[kind];
    if (provider === null) {
      ctx.logger.warn(`dsh-web-search: vendor "${vendor}" provides no ${kind} capability; no ${kind} provider registered.`);
      return;
    }
    slot.dispose =
      kind === "search"
        ? ctx.web.registerSearchProvider({ ...provider, id: SEARCH_PROVIDER_ID })
        : ctx.web.registerFetchProvider({ ...provider, id: FETCH_PROVIDER_ID });
    slot.vendor = vendor;
  }

  /** Reconcile both capabilities with the currently authoritative config. */
  function reconcile() {
    const section = current() ?? {};
    syncProvider("search", section.search);
    syncProvider("fetch", section.fetch);
  }

  // Optional settings consumption: while a settings service exists the
  // `web-search` namespace resolves over the composition config; when it goes
  // away installSection itself switches the source back to the composition
  // entry, so the plugin keeps working exactly as composed.
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.settings.installSection(ctx, SETTINGS_NAMESPACE, Config, config, {
      setSource: (source) => {
        current = source;
      },
      onChange: () => reconcile(),
    });
  });

  reconcile();
}

export { listProviders };
