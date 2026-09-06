/**
 * Vendor registry: provider-name → factory. This is THE extension seam —
 * adding a new vendor is: (1) drop a module in ./providers/ exporting
 * { name, create }, (2) import + register it here, (3) document it in the
 * README's provider table. No other file changes.
 *
 * Factory contract:
 *   create(configOrThunk, helpers) → {
 *     search?: { id: string, available(): boolean,
 *                search(request, signal?): Promise<WebSearchResult> }
 *     fetch?:  { id: string, available(): boolean,
 *                fetch(request, signal?): Promise<WebFetchResult> }
 *   }
 *
 * - `configOrThunk` is either the vendor's own config sub-object from the
 *   plugin config or (normal operation) a thunk returning it. Vendors call
 *   the thunk inside their per-request `options()` so settings edits
 *   (endpoint, limits, key reference) reach the very next request without
 *   re-registration.
 * - `helpers` carries { postJson, envValue, readHomeJson, firstNonBlank,
 *   cleanSnippet, parseJson, positiveInteger, errors, resolveCredential } so
 *   vendor modules stay free of harness imports and share one
 *   transport/errors implementation. `resolveCredential(envName)` consults
 *   the optional credentials service (async) and returns undefined when the
 *   seam is absent — always fall through to `envValue`.
 * - Registration uses the RETURNED ids verbatim: supply fixed ids (the web
 *   seam selects providers by exact id) unless a per-instance suffix is
 *   genuinely needed.
 */
import * as firecrawl from "./providers/firecrawl.js";
import * as tavily from "./providers/tavily.js";

const FACTORIES = new Map(
  [tavily, firecrawl].map((module) => [module.name, module.create]),
);

/** Sorted list of registered vendor names (for diagnostics/errors). */
export function listProviders() {
  return [...FACTORIES.keys()].sort();
}

/**
 * Instantiate the named vendor's providers.
 * Throws (plain Error) on an unknown name — the loader surfaces it at boot.
 */
export function createProviders(name, config, helpers) {
  const factory = FACTORIES.get(name);
  if (factory === undefined) {
    throw new Error(
      `dsh-web-search: unknown provider "${name}". Registered providers: ${listProviders().join(", ")}.`,
    );
  }
  const providers = factory(config ?? {}, helpers) ?? {};
  return {
    search: providers.search ?? null,
    fetch: providers.fetch ?? null,
  };
}
