// dsh-web-search-firecrawl — DSH web providers backed by Firecrawl.
// Registers on the ctx.web seam, fully independent of the conversation LLM
// provider. Requires FIRECRAWL_API_KEY (or config.apiKey).
//
// Search  -> POST {baseURL}/search        -> data.web[] { url, title, description }
// Fetch   -> POST {baseURL}/scrape        -> data.markdown + data.metadata.{ url, statusCode }

import { WebError } from "@deepseek-ai/dsh-web";

const SEARCH_PROVIDER_ID = "firecrawl";
const FETCH_PROVIDER_ID = "firecrawl-scrape";
const DEFAULT_BASE_URL = "https://api.firecrawl.dev/v2";
const USER_AGENT = "deepseek-harness/dsh-web-search-firecrawl";

function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** First non-blank string among candidates, trimmed; undefined if none. */
function firstNonBlank(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function resolveApiKey(options) {
  return options.apiKey || process.env.FIRECRAWL_API_KEY || "";
}

/** Collapse Firecrawl's markdown-heavy description into a clean one-line snippet. */
function cleanSnippet(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "")        // strip markdown heading markers
    .replace(/```[a-zA-Z0-9_-]*/g, "")  // strip code-fence markers
    .replace(/\s+/g, " ")               // collapse whitespace/newlines
    .trim();
}

/** Read a Firecrawl error body into a message, falling back to HTTP status. */
async function firecrawlErrorMessage(response, operation) {
  let message = `Firecrawl ${operation} error (HTTP ${response.status})`;
  try {
    const parsed = await response.json();
    const detail = firstNonBlank(parsed.error?.message, parsed.error, parsed.message);
    if (detail !== undefined) message = detail;
  } catch {
    // keep the HTTP fallback
  }
  return message;
}

function mapSearchItem(item) {
  const source = { url: item.url };
  const title = firstNonBlank(item.title);
  const rawSnippet = firstNonBlank(item.description, item.content);
  if (title !== undefined) source.title = title;
  if (rawSnippet !== undefined) source.snippet = cleanSnippet(rawSnippet);
  return source;
}

class FirecrawlSearchProvider {
  id = SEARCH_PROVIDER_ID;

  constructor(options) {
    this.options = options;
  }

  available() {
    return resolveApiKey(this.options).length > 0 && URL.canParse(this.options.baseURL);
  }

  async search(request, signal) {
    const limit = request.maxResults ?? this.options.limit;
    let response;
    try {
      response = await fetch(`${this.options.baseURL}/search`, {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: `Bearer ${resolveApiKey(this.options)}`,
          "content-type": "application/json",
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
        body: JSON.stringify({
          query: request.query,
          ...(limit !== undefined ? { limit } : {}),
        }),
        ...(signal !== undefined ? { signal } : {}),
      });
    } catch (error) {
      if (isAbortError(error)) throw new WebError("Firecrawl search aborted", "WEB_ABORTED", { cause: error });
      throw new WebError(`Firecrawl search request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }

    if (!response.ok) throw new WebError(await firecrawlErrorMessage(response, "search"), "WEB_PROVIDER_ERROR");

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (isAbortError(error)) throw new WebError("Firecrawl search aborted", "WEB_ABORTED", { cause: error });
      throw new WebError(`Firecrawl returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }

    if (payload.success === false) {
      const detail = firstNonBlank(payload.error?.message, payload.error, payload.message) ?? "Firecrawl search failed";
      throw new WebError(detail, "WEB_PROVIDER_ERROR");
    }

    const items = payload?.data?.web ?? [];
    const sources = items
      .map(mapSearchItem)
      .filter((source) => typeof source.url === "string" && source.url.length > 0);
    return { sources, truncated: false };
  }
}

class FirecrawlScrapeProvider {
  id = FETCH_PROVIDER_ID;

  constructor(options) {
    this.options = options;
  }

  available() {
    return resolveApiKey(this.options).length > 0 && URL.canParse(this.options.baseURL);
  }

  async fetch(request, signal) {
    let response;
    try {
      response = await fetch(`${this.options.baseURL}/scrape`, {
        method: "POST",
        redirect: "error",
        headers: {
          authorization: `Bearer ${resolveApiKey(this.options)}`,
          "content-type": "application/json",
          accept: "application/json",
          "user-agent": USER_AGENT,
        },
        body: JSON.stringify({ url: request.url, formats: ["markdown"] }),
        ...(signal !== undefined ? { signal } : {}),
      });
    } catch (error) {
      if (isAbortError(error)) throw new WebError("Firecrawl scrape aborted", "WEB_ABORTED", { cause: error });
      throw new WebError(`Firecrawl scrape request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }

    if (!response.ok) throw new WebError(await firecrawlErrorMessage(response, "scrape"), "WEB_PROVIDER_ERROR");

    let payload;
    try {
      payload = await response.json();
    } catch (error) {
      if (isAbortError(error)) throw new WebError("Firecrawl scrape aborted", "WEB_ABORTED", { cause: error });
      throw new WebError(`Firecrawl returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
    }

    if (payload.success === false) {
      const detail = firstNonBlank(payload.error?.message, payload.error, payload.message) ?? "Firecrawl scrape failed";
      throw new WebError(detail, "WEB_PROVIDER_ERROR");
    }

    const data = payload?.data ?? {};
    const markdown = typeof data.markdown === "string" ? data.markdown : "";
    const finalUrl = firstNonBlank(data.metadata?.url, data.metadata?.sourceURL) ?? request.url;
    const statusCode = typeof data.metadata?.statusCode === "number" ? data.metadata.statusCode : 200;
    return {
      url: finalUrl,
      statusCode,
      body: { kind: "text", content: markdown },
      truncated: false,
    };
  }
}

export const name = "web-search-firecrawl";
export const inject = ["web"];

export function apply(ctx, config = {}) {
  const options = {
    apiKey: config.apiKey ?? process.env.FIRECRAWL_API_KEY ?? "",
    baseURL: config.baseURL ?? DEFAULT_BASE_URL,
    limit: config.limit,
  };
  ctx.web.registerSearchProvider(new FirecrawlSearchProvider(options));
  ctx.web.registerFetchProvider(new FirecrawlScrapeProvider(options));
}
