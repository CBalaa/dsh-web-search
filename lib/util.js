import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** First non-blank string among candidates, trimmed; undefined if none. */
export function firstNonBlank(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

/** Trimmed environment variable value, or undefined when unset/blank. */
export function envValue(name) {
  if (typeof name !== "string" || name.length === 0) return undefined;
  return firstNonBlank(process.env[name]);
}

/** Read a JSON file, returning undefined on any failure. */
export function readJsonFile(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/** Read a JSON credential file under $HOME (e.g. ~/.tavily/config.json). */
export function readHomeJson(...segments) {
  return readJsonFile(join(homedir(), ...segments));
}

/**
 * Parse a response body as JSON. Returns the parsed value, or undefined when
 * the body is not valid JSON (providers then fall back to a text snippet).
 */
export function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Collapse markdown-heavy text into a clean one-line snippet. */
export function cleanSnippet(text) {
  return text
    .replace(/^#{1,6}\s+/gm, "") // strip markdown heading markers
    .replace(/```[a-zA-Z0-9_-]*/g, "") // strip code-fence markers
    .replace(/\s+/g, " ") // collapse whitespace/newlines
    .trim();
}

export function isAbortError(error) {
  return error instanceof DOMException && error.name === "AbortError";
}

/** Positive integer or undefined. */
export function positiveInteger(value) {
  return Number.isInteger(value) && value > 0 ? value : undefined;
}
