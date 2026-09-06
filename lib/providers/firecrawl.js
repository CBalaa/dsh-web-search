/**
 * Firecrawl vendor.
 *
 *   search → POST {baseURL}/search  → data.web[] { url, title, description }
 *   fetch  → POST {baseURL}/scrape  → data.markdown + data.metadata.{url,statusCode}
 *
 * Key resolution (per request, async): config.apiKey (literal) → credentials
 * service resolve of apiKeyEnv → $FIRECRAWL_API_KEY (env name overridable via
 * config.apiKeyEnv). `available()` mirrors the DeepSeek provider's semantics:
 * a literal key OR the existence of the resolution channel reports true (a
 * sync method cannot await the chain); a genuinely missing key fails the
 * request with a readable WEB_PROVIDER_CREDENTIAL_MISSING.
 *
 * The first `create` argument is a thunk returning the vendor's live config
 * sub-object (or a plain config object in standalone use): `options()` reads
 * through it on every request so settings edits hot-apply.
 */
export const name = "firecrawl";

const DEFAULT_BASE_URL = "https://api.firecrawl.dev/v2";
const DEFAULT_API_KEY_ENV = "FIRECRAWL_API_KEY";
const USER_AGENT = "dsh-web-search/firecrawl";

export function create(configOrThunk, h) {
  const readConfig = () => (typeof configOrThunk === "function" ? configOrThunk() : configOrThunk) ?? {};

  /** Resolve one operation's key through the full chain. */
  async function resolveApiKey(config) {
    const apiKeyEnv = config.apiKeyEnv ?? DEFAULT_API_KEY_ENV;
    return h.firstNonBlank(config.apiKey, await h.resolveCredential(apiKeyEnv), h.envValue(apiKeyEnv));
  }

  const options = () => {
    const config = readConfig();
    const apiKeyEnv = config.apiKeyEnv ?? DEFAULT_API_KEY_ENV;
    return {
      ...(h.firstNonBlank(config.apiKey) !== undefined ? { apiKey: h.firstNonBlank(config.apiKey) } : {}),
      resolveApiKey: () => resolveApiKey(config),
      apiKeyEnv,
      baseURL: config.baseURL ?? DEFAULT_BASE_URL,
      limit: h.positiveInteger(config.limit),
      transport: config.transport,
      timeoutSec: config.timeoutSec,
    };
  };

  /** This operation's key, or a readable credential-missing failure. */
  async function apiKeyOf(o, operation) {
    const apiKey = h.firstNonBlank(o.apiKey, await o.resolveApiKey());
    if (apiKey === undefined) throw h.errors.credentialMissingError(`Firecrawl ${operation}`, o.apiKeyEnv);
    return apiKey;
  }

  async function call(path, payload, signal, operation) {
    const o = options();
    const apiKey = await apiKeyOf(o, operation);
    return h.postJson(`${o.baseURL}${path}`, { authorization: `Bearer ${apiKey}`, "user-agent": USER_AGENT }, payload, {
      transport: o.transport,
      timeoutSec: o.timeoutSec,
      signal,
    });
  }

  /** Non-2xx or {success:false} → providerError with Firecrawl's detail. */
  async function ensureOk(result, operation) {
    const parsed = h.parseJson(result.bodyText);
    if (result.status < 200 || result.status >= 300) {
      const detail = h.firstNonBlank(parsed?.error?.message, parsed?.error, parsed?.message);
      throw h.errors.providerError(detail ?? `Firecrawl ${operation} error (HTTP ${result.status})`);
    }
    if (parsed === undefined) {
      throw h.errors.providerError(`Firecrawl ${operation} returned an unprocessable response body`);
    }
    if (parsed.success === false) {
      const detail = h.firstNonBlank(parsed.error?.message, parsed.error, parsed.message) ?? `Firecrawl ${operation} failed`;
      throw h.errors.providerError(detail);
    }
    return parsed;
  }

  const search = {
    id: "firecrawl",
    available() {
      const o = options();
      return (o.apiKey !== undefined || o.resolveApiKey !== undefined) && URL.canParse(o.baseURL);
    },
    async search(request, signal) {
      const o = options();
      const limit = h.positiveInteger(request.maxResults) ?? o.limit;
      const payload = { query: request.query, ...(limit !== undefined ? { limit } : {}) };
      const parsed = await ensureOk(await call("/search", payload, signal, "search"), "search");
      const items = parsed?.data?.web ?? [];
      const sources = items
        .map((item) => {
          const source = { url: item.url };
          const title = h.firstNonBlank(item.title);
          const rawSnippet = h.firstNonBlank(item.description, item.content);
          if (title !== undefined) source.title = title;
          if (rawSnippet !== undefined) source.snippet = h.cleanSnippet(rawSnippet);
          return source;
        })
        .filter((source) => typeof source.url === "string" && source.url.length > 0);
      return { sources, truncated: false };
    },
  };

  const fetch = {
    id: "firecrawl-scrape",
    available() {
      const o = options();
      return (o.apiKey !== undefined || o.resolveApiKey !== undefined) && URL.canParse(o.baseURL);
    },
    async fetch(request, signal) {
      const parsed = await ensureOk(await call("/scrape", { url: request.url, formats: ["markdown"] }, signal, "scrape"), "scrape");
      const data = parsed?.data ?? {};
      const markdown = typeof data.markdown === "string" ? data.markdown : "";
      const finalUrl = h.firstNonBlank(data.metadata?.url, data.metadata?.sourceURL) ?? request.url;
      const statusCode = typeof data.metadata?.statusCode === "number" ? data.metadata.statusCode : 200;
      return { url: finalUrl, statusCode, body: { kind: "text", content: markdown }, truncated: false };
    },
  };

  return { search, fetch };
}
