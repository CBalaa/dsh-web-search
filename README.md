# dsh-web-search-firecrawl

DSH web plugin: **Firecrawl-backed `web_search` and `web_fetch` providers** for the
`ctx.web` seam. Works with any LLM provider — you no longer need DeepSeek's native
search for `web_search` to work.

Registers two providers:

| Provider id       | Capability | Endpoint            | Notes                                   |
| ----------------- | ---------- | ------------------- | --------------------------------------- |
| `firecrawl`       | search     | `POST /v2/search`   | returns `url / title / snippet` sources |
| `firecrawl-scrape`| fetch      | `POST /v2/scrape`   | clean markdown, JS rendering, PDFs      |

## Install

```sh
dsh plugin --profile web add dsh-web-search-firecrawl
```

Then point the web seam at the Firecrawl search provider. Add to your profile's
`cordis.patch.yml` (or use the Settings → Plugins page):

```yaml
- id: web
  config:
    searchProvider: firecrawl
    fetchProvider: http        # or: firecrawl-scrape
```

## Configure

Set your Firecrawl API key via environment variable (recommended):

```sh
# ~/.dsh/.env
FIRECRAWL_API_KEY=fc-...
```

Or pass it in config:

```yaml
- insert:
    - id: web-search-firecrawl
      name: 'dsh-web-search-firecrawl'
      config:
        apiKey: 'fc-...'
```

Optional config fields: `baseURL` (default `https://api.firecrawl.dev/v2`),
`limit` (default result count when the tool passes no `maxResults`).

## Notes

- The search provider is fully independent of your conversation LLM provider,
  so custom OpenAI-compatible gateways work out of the box.
- `web_fetch` stays on the built-in anonymous `http` provider by default (free,
  no Firecrawl credits); switch to `firecrawl-scrape` if you want markdown
  extraction, JS rendering, or PDF parsing.
