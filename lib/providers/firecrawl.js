/**
 * Firecrawl vendor.
 *
 *   search → POST {baseURL}/search  → data.web[] { url, title, description }
 *   fetch  → POST {baseURL}/scrape  → data.markdown + data.metadata.{url,statusCode}
 *
 * Key resolution: config.apiKey → $FIRECRAWL_API_KEY (env name overridable
 * via config.apiKeyEnv).
 */
export const name = "firecrawl";

const DEFAULT_BASE_URL = "https://api.firecrawl.dev/v2";
const USER_AGENT = "dsh-web-search/firecrawl";

export function create(config, h) {
  const options = () => ({
    apiKey: h.firstNonBlank(config.apiKey) ?? h.envValue(config.apiKeyEnv ?? "FIRECRAWL_API_KEY") ?? "",
    baseURL: config.baseURL ?? DEFAULT_BASE_URL,
    limit: h.positiveInteger(config.limit),
    transport: config.transport,
    timeoutSec: config.timeoutSec,
  });

  function call(path, payload, signal) {
    const o = options();
    return h.postJson(`${o.baseURL}${path}`, { authorization: `Bearer ${o.apiKey}`, "user-agent": USER_AGENT }, payload, {
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
      return o.apiKey.length > 0 && URL.canParse(o.baseURL);
    },
    async search(request, signal) {
      const o = options();
      const limit = h.positiveInteger(request.maxResults) ?? o.limit;
      const payload = { query: request.query, ...(limit !== undefined ? { limit } : {}) };
      const parsed = await ensureOk(await call("/search", payload, signal), "search");
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
      return o.apiKey.length > 0 && URL.canParse(o.baseURL);
    },
    async fetch(request, signal) {
      const parsed = await ensureOk(await call("/scrape", { url: request.url, formats: ["markdown"] }, signal), "scrape");
      const data = parsed?.data ?? {};
      const markdown = typeof data.markdown === "string" ? data.markdown : "";
      const finalUrl = h.firstNonBlank(data.metadata?.url, data.metadata?.sourceURL) ?? request.url;
      const statusCode = typeof data.metadata?.statusCode === "number" ? data.metadata.statusCode : 200;
      return { url: finalUrl, statusCode, body: { kind: "text", content: markdown }, truncated: false };
    },
  };

  return { search, fetch };
}
