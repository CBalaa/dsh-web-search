/**
 * Declarative settings schema for the `web-search` namespace.
 *
 * One schema serves two masters (「风险与注意」3 of the integration plan):
 *
 * - the composition layer — the cordis plugin config from the profile's
 *   cordis.patch.yml must validate unchanged (e.g.
 *   `{ search: "tavily", fetch: "tavily", providers: { tavily: {} } }`);
 * - the settings document — the `web-search:` section of the settings
 *   document (`settings.yaml`), resolved as schema defaults < composition base <
 *   user section (user overrides win).
 *
 * Every field therefore carries a default and every nested object is
 * `.default({})`, so a sparse stored section resolves instead of rejecting.
 *
 * Adding a vendor: register it in lib/registry.js and add one
 * `VENDOR_SCHEMAS` entry here (build it with `vendorSchema()` plus per-vendor
 * extras) — the search/fetch vendor enums regenerate from the registry
 * automatically.
 */
import z from "@deepseek-ai/schemastery";
import { listProviders } from "./registry.js";

/** Transport values the schema admits; "auto" = resolveTransport's proxy-aware default. */
const TRANSPORTS = ["auto", "curl", "fetch"];

/** Fields every vendor shares: key reference, endpoint, transport, timeout. */
function vendorSchema(extra) {
  return z.object({
    apiKey: z.string().role("secret"),
    apiKeyEnv: z.string().role("credential-ref"),
    baseURL: z.string(),
    transport: z.union(TRANSPORTS.map((value) => z.const(value))).default("auto"),
    timeoutSec: z.number().min(1).default(30),
    ...extra,
  });
}

const VENDOR_SCHEMAS = {
  tavily: vendorSchema({
    apiKeyEnv: z.string().role("credential-ref").default("TAVILY_API_KEY"),
    baseURL: z.string().default("https://api.tavily.com"),
    maxResults: z.number().step(1).min(1).max(20).default(8),
    searchDepth: z.union([z.const("basic"), z.const("advanced")]).default("basic"),
    includeAnswer: z.boolean().default(true),
  }),
  firecrawl: vendorSchema({
    apiKeyEnv: z.string().role("credential-ref").default("FIRECRAWL_API_KEY"),
    baseURL: z.string().default("https://api.firecrawl.dev/v2"),
    limit: z.number().step(1).min(1).max(50),
  }),
};

/** Registered vendor names, sorted — the enum source for `search`/`fetch`. */
const vendors = listProviders();

const vendorEnum = () => z.union(vendors.map((vendor) => z.const(vendor)));

/**
 * Per-vendor options. Only registered vendors are known keys; keys the schema
 * does not know pass through untyped, so a composition naming a future vendor
 * still resolves instead of hard-failing.
 */
const ProvidersSchema = z.object(
  Object.fromEntries(vendors.map((vendor) => [vendor, (VENDOR_SCHEMAS[vendor] ?? z.object({})).default({})])),
);

export const Config = z.object({
  search: vendorEnum().default("tavily"),
  fetch: z.union([z.const("off"), vendorEnum()]).default("off"),
  providers: ProvidersSchema.default({}),
});

export { vendors as configurableVendors };
