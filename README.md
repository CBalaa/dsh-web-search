# dsh-web-search

DSH web plugin: **multi-vendor `web_search` / `web_fetch` backends** for the
`ctx.web` seam. Works with any LLM provider — you no longer need DeepSeek's
native search for `web_search` to work.

| Vendor    | Config name | Search provider      | Fetch provider                 | Key lookup (in order)                                        |
| --------- | ----------- | -------------------- | ------------------------------ | ------------------------------------------------------------ |
| Tavily    | `tavily`    | `POST /search`       | `POST /extract` (clean text)   | `config.apiKey` → `$TAVILY_API_KEY` → `~/.tavily/config.json` |
| Firecrawl | `firecrawl` | `POST /v2/search`    | `POST /v2/scrape` (markdown)   | `config.apiKey` → `$FIRECRAWL_API_KEY`                        |
| *yours*   | —           | see [Adding a vendor](#adding-a-vendor) | —                 | —                                                            |

The plugin registers under the **fixed** ids `dsh-web-search` (search) and
`dsh-web-fetch` (fetch), so switching vendors never touches the web-seam row —
one config line does it.

## Install

```sh
dsh plugin --profile web add dsh-web-search
```

The bundle patch mounts the plugin and points `searchProvider` at it
(`fetchProvider` stays on the built-in anonymous `http` provider until you opt
in — free, no vendor credits).

## Configure (one file)

Everything lives in your profile's `~/.dsh/profiles/<name>/cordis.patch.yml`:

```yaml
# 1) Plugin row: pick vendors + supply options/keys.
- id: web-search
  config:
    search: tavily          # vendor for web_search
    fetch: tavily           # vendor for web_fetch (omit → no plugin fetch)
    providers:
      tavily: {}            # key comes from $TAVILY_API_KEY / ~/.tavily/config.json
      # firecrawl:
      #   apiKey: 'fc-...'  # or export FIRECRAWL_API_KEY

# 2) Web seam row: enable the plugin's fetch provider (optional).
- id: web
  config:
    searchProvider: dsh-web-search
    fetchProvider: dsh-web-fetch   # or keep the built-in "http"
```

Switching search vendor = change `search: tavily` → `search: firecrawl`. Done.

### Per-vendor options

Common to every vendor (all optional):

| Field         | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| `apiKey`      | inline key (prefer env/files for secrets)                          |
| `apiKeyEnv`   | env var name to read, per-vendor default                           |
| `baseURL`     | endpoint root override                                             |
| `transport`   | `"curl"` or `"fetch"` — default: auto (`curl` when a `*_proxy` env var is set, since Node fetch ignores proxy env unless `NODE_USE_ENV_PROXY=1`) |
| `timeoutSec`  | per-request budget, default 30                                     |

Tavily adds `maxResults` (default 8), `searchDepth` (`basic`|`advanced`),
`includeAnswer` (default `true`). Firecrawl adds `limit` (default result count).

> Keys are read **per request**, so rotating a key in the env var or
> `~/.tavily/config.json` needs no restart. The curl transport passes requests
> via `-K -` stdin config: keys never appear in the process argv.

## Adding a vendor

1. Create `lib/providers/<vendor>.js`:

   ```js
   export const name = "myvendor";

   export function create(config, h) {
     const options = () => ({
       apiKey: h.firstNonBlank(config.apiKey) ?? h.envValue("MYVENDOR_API_KEY") ?? "",
       baseURL: config.baseURL ?? "https://api.myvendor.example",
     });
     const search = {
       id: "myvendor",
       available: () => options().apiKey.length > 0 && URL.canParse(options().baseURL),
       async search(request, signal) {
         const o = options();
         const { status, bodyText } = await h.postJson(
           `${o.baseURL}/search`,
           { authorization: `Bearer ${o.apiKey}` },
           { q: request.query, limit: request.maxResults },
           { transport: config.transport, timeoutSec: config.timeoutSec, signal },
         );
         if (status < 200 || status >= 300) throw h.errors.providerError(`myvendor HTTP ${status}`);
         const data = h.parseJson(bodyText) ?? {};
         // → { content?, sources: [{url, title?, snippet?, publishedAt?}], truncated: false }
         return { sources: data.results ?? [], truncated: false };
       },
     };
     // Optional fetch provider: { id, available(), fetch(request, signal) }
     // → { url, statusCode, body: { kind: "text", content }, truncated }
     return { search };
   }
   ```

2. Register one line in `lib/registry.js` (`import` + array entry).
3. Add a row to the README vendor table.

That's the whole contract — helpers (`postJson`, `envValue`, `readHomeJson`,
`firstNonBlank`, `cleanSnippet`, `parseJson`, `positiveInteger`, `errors`) are
injected, so vendor modules need no harness imports and share the
proxy-aware transport.

## Notes

- Fully independent of your conversation LLM provider — custom
  OpenAI-compatible gateways work out of the box.
- `web_fetch` stays on the built-in anonymous `http` provider unless you set
  `fetch:` + `fetchProvider: dsh-web-fetch`; switch when you want JS rendering
  / PDF parsing (Firecrawl scrape) or clean article text (Tavily extract).
- Errors surface as typed `WebError`s (`WEB_PROVIDER_ERROR` / `WEB_ABORTED`)
  when `@deepseek-ai/dsh-web` is importable, plain coded Errors otherwise.
