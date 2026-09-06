# dsh-web-search

DSH web plugin: **multi-vendor `web_search` / `web_fetch` backends** for the
`ctx.web` seam. Works with any LLM provider — you no longer need DeepSeek's
native search for `web_search` to work.

| Vendor    | Config name | Search provider      | Fetch provider                 | Key lookup (in order)                                                        |
| --------- | ----------- | -------------------- | ------------------------------ | ---------------------------------------------------------------------------- |
| Tavily    | `tavily`    | `POST /search`       | `POST /extract` (clean text)   | `apiKey` → credentials service(`apiKeyEnv`) → `$TAVILY_API_KEY` → Tavily CLI config file |
| Firecrawl | `firecrawl` | `POST /v2/search`    | `POST /v2/scrape` (markdown)   | `apiKey` → credentials service(`apiKeyEnv`) → `$FIRECRAWL_API_KEY`            |
| *yours*   | —           | see [Adding a vendor](#adding-a-vendor) | —                 | —                                                            |

The plugin registers under the **fixed** ids `dsh-web-search` (search) and
`dsh-web-fetch` (fetch), so switching vendors never touches the web-seam row —
one config line does it.

## Build & install locally

This plugin is installed **from a local checkout** (it is not published to the
npm registry). The plugin manager is `dsh plugin` — note that `dsh web` boots
the UI and is not the plugin manager.

### 1. Install build dependencies and build

Run these from the checkout root:

```sh
npm install        # tsdown / react / playwright-core (dev) + schemastery (runtime)
npm run build      # bundles src/client/settings-card.tsx → lib/client.js
```

The repo ships a pre-built `lib/client.js`, so installation works without a
build; but **after editing `src/client/`, re-run `npm run build`** or the
settings card will still serve the old bundle.

### 2. Install into a profile

Run this from inside the checkout:

```sh
dsh plugin --profile web add file:.
```

`dsh plugin add` forwards to `pnpm add` inside the profile directory, then
reconciles `dsh.profile.bundles`: because this package declares
`dsh.bundle.patch`, `dsh-web-search` is appended to the bundle stack
automatically — no manual `cordis.patch.yml` edit to mount it. The `file:.`
spec is anchored to your invoking directory, so run it from inside the
checkout.

### 3. Restart and verify

```sh
dsh web --port 9000
```

After restarting, the plugin is live: open **Settings → Plugins → Plugin
configuration** to see the "Web search" card, or run a `web_search` /
`web_fetch` to confirm. The bundle patch mounts the plugin and points
`searchProvider` at it (`fetchProvider` stays on the built-in anonymous `http`
provider until you opt in — free, no vendor credits).

> **Requirements** — Node.js >= 20. The plugin's only runtime dependency is
> `@deepseek-ai/schemastery` (installed from npm); the `@deepseek-ai/dsh-web`,
> `@deepseek-ai/dsh-settings`, and `@deepseek-ai/dsh-credentials` peers are
> provided by the harness tree the plugin runs inside. The settings and
> credentials peers are optional: without them the plugin still works
> composition-only / env-only.

## Configure (two layers)

Configuration resolves through two layers, **both hot-applied**:

1. **Composition** — the plugin row's cordis config in your profile's
   `cordis.patch.yml`, applied at boot.
2. **Settings** (optional) — the `web-search:` section of the settings
   document (`settings.yaml`), layered **over** the composition config
   (`schema defaults < composition < user document`; user edits win). Editing
   the document — or saving the **Settings → Plugins → Plugin configuration →
   Web search** card — takes effect **without a restart**: vendor switches
   dispose/re-register the fixed-id providers, and key/endpoint/parameter
   edits reach the very next request.

```yaml
# your profile's cordis.patch.yml
- id: web-search
  config:
    search: tavily          # vendor for web_search
    fetch: tavily           # vendor for web_fetch  ("off" = none)
    providers:
      tavily: {}            # key from credentials / $TAVILY_API_KEY / Tavily CLI config file
      # firecrawl:
      #   apiKey: 'fc-...'  # or store/export FIRECRAWL_API_KEY

- id: web
  config:
    searchProvider: dsh-web-search
    fetchProvider: dsh-web-fetch   # or keep the built-in "http"
```

The equivalent in the settings document (`settings.yaml`), saved hot:

```yaml
web-search:
  search: firecrawl          # switches web_search to Firecrawl immediately
  providers:
    firecrawl:
      maxResults: 10
```

Switching search vendor = change `search:` and save. Done.

> **`fetch` migration**: the composition config used to mean "omit `fetch:` =
> no plugin fetch provider". The schema now spells that case explicitly as
> `"off"`. A profile patch that sets `fetch: tavily` keeps working unchanged;
> a user document that wrote an empty `fetch:` should now read `off`.

### The settings card

When a settings provider is mounted, the plugin registers the `web-search`
namespace and contributes a card to **Settings → Plugins → Plugin
configuration**. The card edits vendor selection and per-vendor options, plus
**capability-scoped API keys**: a **Search API key** (always shown, for the
search vendor) and a **Fetch API key** (shown only when the fetch vendor
differs from the search vendor — a shared vendor needs one key). Keys are
written through the **credentials** domain (never into `settings.yaml` or
hardcoded in the plugin), addressed by each vendor's `apiKeyEnv` reference,
and show a configured/unconfigured badge. A blank key box leaves the stored
key untouched.

> The card appears only while a settings service is running. Without one, the
> plugin still works exactly as composed (`cordis.patch.yml`), and edits to
> the settings document (`settings.yaml`) simply have no effect on it.

### Per-vendor options

Common to every vendor (all optional):

| Field         | Meaning                                                            |
| ------------- | ------------------------------------------------------------------ |
| `apiKey`      | inline key (prefer credentials/env/files for secrets)              |
| `apiKeyEnv`   | credential reference / env var name to read, per-vendor default    |
| `baseURL`     | endpoint root override                                             |
| `transport`   | `"auto"` (default), `"curl"`, or `"fetch"` — `auto` picks curl when a `*_proxy` env var is set (Node fetch ignores proxy env unless `NODE_USE_ENV_PROXY=1`) |
| `timeoutSec`  | per-request budget, default 30                                     |

Tavily adds `maxResults` (default 8), `searchDepth` (`basic`|`advanced`),
`includeAnswer` (default `true`). Firecrawl adds `limit` (default result count).

> Keys are resolved **per request**, so rotating a key in the credentials
> service, the env var, or the Tavily CLI config file needs no restart. A
> request with no key anywhere fails with a readable
> `WEB_PROVIDER_CREDENTIAL_MISSING`. The curl transport passes requests via
> `-K -` stdin config: keys never appear in the process argv.

## Adding a vendor

1. Create `lib/providers/<vendor>.js`:

   ```js
   export const name = "myvendor";

   export function create(configOrThunk, h) {
     const readConfig = () => (typeof configOrThunk === "function" ? configOrThunk() : configOrThunk) ?? {};
     const options = () => ({
       apiKey: h.firstNonBlank(readConfig().apiKey) ?? h.envValue("MYVENDOR_API_KEY") ?? "",
       baseURL: readConfig().baseURL ?? "https://api.myvendor.example",
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
           { transport: readConfig().transport, timeoutSec: readConfig().timeoutSec, signal },
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
3. Add a `VENDOR_SCHEMAS` entry in `lib/config-schema.js` (built with
   `vendorSchema()` + per-vendor extras) so the settings namespace validates
   and the card can render it.
4. Add a row to the README vendor table.

That's the whole contract — helpers (`postJson`, `envValue`, `readHomeJson`,
`firstNonBlank`, `cleanSnippet`, `parseJson`, `positiveInteger`, `errors`,
`resolveCredential`) are injected, so vendor modules need no harness imports
and share the proxy-aware transport and the credentials-service key chain.

## Development & tests

```sh
npm test                        # node:test unit suite (mock ctx.web + settings service)
node tests/integration.mjs      # real cordis + dsh-web + file settings hot-switch
node tests/verify-client.mjs    # loads lib/client.js through a stub module table
```

## Notes

- Fully independent of your conversation LLM provider — custom
  OpenAI-compatible gateways work out of the box.
- `web_fetch` stays on the built-in anonymous `http` provider unless you set
  `fetch:` + `fetchProvider: dsh-web-fetch`; switch when you want JS rendering
  / PDF parsing (Firecrawl scrape) or clean article text (Tavily extract).
- Errors surface as typed `WebError`s (`WEB_PROVIDER_ERROR` /
  `WEB_PROVIDER_CREDENTIAL_MISSING` / `WEB_ABORTED`) when
  `@deepseek-ai/dsh-web` is importable, plain coded Errors otherwise.
