/**
 * Error factory: emits `@deepseek-ai/dsh-web`'s WebError when the harness seam
 * package is importable (normal in-profile operation), otherwise a plain Error
 * carrying the same `.code`. The try-import keeps this plugin runnable in
 * standalone tests and tools where the peer tree is absent.
 */
let WebErrorCtor = null;
try {
  ({ WebError: WebErrorCtor } = await import("@deepseek-ai/dsh-web"));
} catch {
  // standalone context — plain Error fallback below
}

/** Shared codes mirror dsh-web's vocabulary; consumers tolerate any string. */
export const WEB_PROVIDER_ERROR = "WEB_PROVIDER_ERROR";
export const WEB_ABORTED = "WEB_ABORTED";

export function webError(message, code, options) {
  if (WebErrorCtor !== null) return new WebErrorCtor(message, code, options);
  const error = new Error(message, options);
  error.code = code;
  return error;
}

export function providerError(message, options) {
  return webError(message, WEB_PROVIDER_ERROR, options);
}

export function abortedError(operation, cause) {
  return webError(`${operation} aborted`, WEB_ABORTED, { cause });
}
