/**
 * Optional consumption of `@deepseek-ai/dsh-credentials`: the peer is declared
 * optional, so this module resolves the reference-branding helpers when the
 * harness tree carries the package and degrades to a pass-through otherwise
 * (the env fallback below still resolves a plain env var name). Mirrored on
 * the errors.js try-import pattern.
 */
let brandRef = null;
let isRefName = null;
try {
  ({ credentialRef: brandRef, isCredentialRefName: isRefName } = await import("@deepseek-ai/dsh-credentials"));
} catch {
  // credentials seam absent from the dependency tree — env-only operation
}

/** Brand an env-var name as a CredentialRef when the seam is importable, else undefined. */
export function asCredentialRef(name) {
  if (brandRef === null || isRefName === null) return undefined;
  return isRefName(name) ? brandRef(name) : undefined;
}

/** True when the credentials service can be asked about this reference. */
export function hasCredentialBranding() {
  return brandRef !== null;
}
