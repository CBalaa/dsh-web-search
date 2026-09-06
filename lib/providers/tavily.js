/**
 * Tavily vendor.
 *
 *   search → POST {baseURL}/search   → results[] {url,title,content,published_date} + answer
 *   fetch  → POST {baseURL}/extract  → results[0].raw_content
 *
 * Key resolution: config.apiKey → $TAVILY_API_KEY (env name overridable via
 * config.apiKeyEnv) → ~/.tavily/config.json (written by `tvly login`).
 */
export const name = "tavily";

const DEFAULT_BASE_URL = "https://api.tavily.com";
const TAVILY_HARD_MAX_RESULTS = 20;
const USER_AGENT = "dsh-web-search/tavily";

export function create(config, h) {
  const options = () => ({
    apiKey:
      h.firstNonBlank(config.apiKey) ??
      h.envValue(config.apiKeyEnv ?? "TAVILY_API_KEY") ??
      h.firstNonBlank(h.readHomeJson(".tavily", "config.json")?.api_key) ??
      "",
    baseURL: config.baseURL ?? DEFAULT_BASE_URL,
    maxResults: h.positiveInteger(config.maxResults),
    searchDepth: config.searchDepth === "advanced" ? "advanced" : "basic",
    includeAnswer: config.includeAnswer !== false,
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

  /** Non-2xx / unparseable body → providerError; otherwise the parsed JSON. */
  function ensureOk(result, operation) {
    const parsed = h.parseJson(result.bodyText);
    if (result.status < 200 || result.status >= 300) {
      const detail = h.firstNonBlank(parsed?.error, parsed?.detail, parsed?.message);
      throw h.errors.providerError(detail ?? `Tavily ${operation} failed (HTTP ${result.status})`);
    }
    if (parsed === undefined || typeof parsed !== "object") {
      throw h.errors.providerError(`Tavily ${operation} returned an unprocessable response body`);
    }
    return parsed;
  }

  const search = {
    id: "tavily",
    available() {
      const o = options();
      return o.apiKey.length > 0 && URL.canParse(o.baseURL);
    },
    async search(request, signal) {
      const o = options();
      const wanted = h.positiveInteger(request.maxResults) ?? o.maxResults ?? 8;
      const parsed = ensureOk(
        await call(
          "/search",
          {
            query: request.query,
            max_results: Math.min(Math.max(wanted, 1), TAVILY_HARD_MAX_RESULTS),
            search_depth: o.searchDepth,
            include_answer: o.includeAnswer,
          },
          signal,
        ),
        "search",
      );
      const sources = (Array.isArray(parsed.results) ? parsed.results : [])
        .filter((item) => typeof item?.url === "string" && item.url.length > 0)
        .map((item) => ({
          url: item.url,
          ...(h.firstNonBlank(item.title) !== undefined ? { title: item.title.trim() } : {}),
          ...(h.firstNonBlank(item.content) !== undefined ? { snippet: item.content.trim() } : {}),
          ...(h.firstNonBlank(item.published_date) !== undefined ? { publishedAt: item.published_date.trim() } : {}),
        }));
      return {
        ...(h.firstNonBlank(parsed.answer) !== undefined ? { content: parsed.answer.trim() } : {}),
        sources,
        truncated: false, // the web seam owns maxResults enforcement on the way back
      };
    },
  };

  const fetch = {
    id: "tavily-extract",
    available() {
      const o = options();
      return o.apiKey.length > 0 && URL.canParse(o.baseURL);
    },
    async fetch(request, signal) {
      const parsed = ensureOk(await call("/extract", { urls: [request.url], extract_depth: "basic" }, signal), "extract");
      const failure = (Array.isArray(parsed.failed_results) ? parsed.failed_results : []).find(
        (entry) => entry?.url === request.url,
      );
      if (failure !== undefined) {
        throw h.errors.providerError(h.firstNonBlank(failure.error) ?? `Tavily extract failed for ${request.url}`);
      }
      const item = (Array.isArray(parsed.results) ? parsed.results : []).find((entry) => entry?.url === request.url) ??
        (Array.isArray(parsed.results) ? parsed.results : [])[0];
      if (item === undefined) throw h.errors.providerError(`Tavily extract returned no result for ${request.url}`);
      const content = typeof item.raw_content === "string" ? item.raw_content : "";
      return { url: request.url, statusCode: 200, body: { kind: "text", content }, truncated: false };
    },
  };

  return { search, fetch };
}
