/**
 * HTTP transport for provider calls.
 *
 * Two backends behind one `postJson` seam:
 *
 * - `fetch` — the platform global. Fine in open networks, but Node's undici
 *   fetch ignores `http_proxy` / `https_proxy` unless the process was started
 *   with `NODE_USE_ENV_PROXY=1`, so on hosts whose egress firewall only
 *   permits the proxy (observed: edge answering `403` with `server:
 *   awselb/2.0` for direct connections) it cannot reach provider APIs.
 *
 * - `curl` — shells out to the system curl, which honors the ambient proxy
 *   configuration in any process. Request URL, headers, and body travel in
 *   the `-K -` stdin config so API keys never appear in the process argv.
 *
 * `resolveTransport` default: `curl` whenever a proxy env var is present
 * (direct undici would bypass it), otherwise `fetch`. A provider's config may
 * pin either backend with `transport: "curl" | "fetch"`.
 */
import { execFile } from "node:child_process";
import { abortedError, providerError } from "./errors.js";
import { isAbortError } from "./util.js";

const DEFAULT_TIMEOUT_SEC = 30;
const CURL_MAX_BUFFER = 16 * 1024 * 1024;

export function resolveTransport(preference) {
  if (preference === "curl" || preference === "fetch") return preference;
  const proxied =
    process.env.https_proxy ??
    process.env.HTTPS_PROXY ??
    process.env.http_proxy ??
    process.env.HTTP_PROXY ??
    process.env.all_proxy ??
    process.env.ALL_PROXY;
  return proxied !== undefined && proxied.length > 0 ? "curl" : "fetch";
}

/** Escape a value for a quoted string inside a curl `-K` config file. */
function curlQuote(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}

/**
 * POST JSON through curl. Resolves `{ status, bodyText }`; rejects on
 * transport failure (curl exit ≠ 0) or malformed output. `signal` SIGTERMs
 * the curl process.
 */
function curlPostJson(url, headers, payload, timeoutSec, signal) {
  return new Promise((resolve, reject) => {
    const config =
      [
        'request = "POST"',
        `url = "${curlQuote(url)}"`,
        ...Object.entries(headers).map(([name, value]) => `header = "${curlQuote(`${name}: ${value}`)}"`),
        `data-binary = "${curlQuote(JSON.stringify(payload))}"`,
        `max-time = "${Math.max(1, Math.floor(timeoutSec))}"`,
        "silent",
        "show-error",
        'write-out = "\\n%{http_code}"',
      ].join("\n") + "\n";
    let settled = false;
    const child = execFile("curl", ["-K", "-"], { maxBuffer: CURL_MAX_BUFFER }, (error, stdout, stderr) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) return reject(abortedError("HTTP request", signal.reason));
      if (error) {
        const detail = typeof stderr === "string" && stderr.trim().length > 0 ? `: ${stderr.trim().slice(0, 300)}` : "";
        return reject(providerError(`curl transport failed (exit ${error.code ?? "unknown"})${detail}`));
      }
      const split = stdout.lastIndexOf("\n");
      if (split === -1) return reject(providerError("curl returned malformed output (no status line)"));
      const status = Number.parseInt(stdout.slice(split + 1).trim(), 10);
      if (!Number.isInteger(status) || status <= 0) {
        return reject(providerError("curl returned malformed output (bad status code)"));
      }
      resolve({ status, bodyText: stdout.slice(0, split) });
    });
    const onAbort = () => child.kill("SIGTERM");
    signal?.addEventListener("abort", onAbort, { once: true });
    child.stdin.end(config);
  });
}

/** POST JSON through global fetch. Resolves `{ status, bodyText }`. */
async function fetchPostJson(url, headers, payload, timeoutSec, signal) {
  const timeout = AbortSignal.timeout(timeoutSec * 1000);
  const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout;
  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      redirect: "error",
      headers,
      body: JSON.stringify(payload),
      signal: combined,
    });
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw abortedError("HTTP request", error);
    throw providerError(`fetch transport failed: ${String(error)}`, { cause: error });
  }
  let bodyText;
  try {
    bodyText = await response.text();
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) throw abortedError("HTTP request", error);
    throw providerError(`failed reading response body: ${String(error)}`, { cause: error });
  }
  return { status: response.status, bodyText };
}

/**
 * POST `payload` to `url` and return `{ status, bodyText }`.
 * `options.transport`: "curl" | "fetch" | undefined (auto, see resolveTransport).
 * Non-2xx statuses are NOT errors here — providers own their error-body shapes.
 */
export function postJson(url, headers, payload, options = {}) {
  const timeoutSec = typeof options.timeoutSec === "number" && options.timeoutSec > 0 ? options.timeoutSec : DEFAULT_TIMEOUT_SEC;
  const transport = resolveTransport(options.transport);
  const jsonHeaders = { "content-type": "application/json", accept: "application/json", ...headers };
  return transport === "curl"
    ? curlPostJson(url, jsonHeaders, payload, timeoutSec, options.signal)
    : fetchPostJson(url, jsonHeaders, payload, timeoutSec, options.signal);
}
