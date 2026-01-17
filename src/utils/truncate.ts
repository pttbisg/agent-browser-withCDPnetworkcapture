/**
 * Truncation utilities for reducing token usage in LLM agent responses
 */

export interface TruncateOptions {
  maxStringLength: number; // Default: 500
}

export interface TruncateResult {
  value: string;
  truncated: boolean;
  originalLength: number;
}

const DEFAULT_MAX_STRING_LENGTH = 500;

/**
 * Truncate a plain text string with an indicator showing original length
 * Format: "This is a long value...[+342 chars]"
 */
export function truncateString(
  str: string,
  maxLength: number = DEFAULT_MAX_STRING_LENGTH
): TruncateResult {
  if (str.length <= maxLength) {
    return {
      value: str,
      truncated: false,
      originalLength: str.length,
    };
  }

  const remaining = str.length - maxLength;
  // Leave room for the indicator: "...[+N chars]"
  const indicatorLength = `...[+${remaining} chars]`.length;
  const truncateAt = Math.max(0, maxLength - indicatorLength);
  const truncatedValue = `${str.slice(0, truncateAt)}...[+${remaining} chars]`;

  return {
    value: truncatedValue,
    truncated: true,
    originalLength: str.length,
  };
}

/**
 * Recursively truncate string values in a JSON structure, preserving the structure itself.
 * Numbers, booleans, nulls, and keys are preserved as-is.
 * Only string VALUES are truncated.
 */
export function truncateJsonValues(obj: unknown, options?: Partial<TruncateOptions>): unknown {
  const maxStringLength = options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  // Handle null and undefined
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings - truncate them
  if (typeof obj === 'string') {
    const result = truncateString(obj, maxStringLength);
    return result.value;
  }

  // Handle primitives (numbers, booleans) - return as-is
  if (typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays - recurse into each element
  if (Array.isArray(obj)) {
    return obj.map((item) => truncateJsonValues(item, options));
  }

  // Handle objects - recurse into each value (preserving keys)
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = truncateJsonValues(value, options);
  }
  return result;
}

/**
 * Format binary data size for display
 * Returns "[Binary data: 45.2 KB]" or similar
 */
export function formatBinarySize(bytes: number): string {
  if (bytes < 1024) {
    return `[Binary data: ${bytes} B]`;
  } else if (bytes < 1024 * 1024) {
    return `[Binary data: ${(bytes / 1024).toFixed(1)} KB]`;
  } else {
    return `[Binary data: ${(bytes / (1024 * 1024)).toFixed(1)} MB]`;
  }
}

/**
 * Check if a string appears to be base64-encoded binary data
 * More conservative check - looks for typical base64 characteristics
 */
export function isBase64Binary(str: string): boolean {
  // Check if it looks like base64 and is reasonably long
  if (str.length < 100) return false;

  // Remove whitespace for checking
  const cleaned = str.replace(/\s/g, '');

  // Base64 must be valid length (multiple of 4)
  if (cleaned.length % 4 !== 0) return false;

  // Base64 pattern - must have +, /, or = characters (not just alphanumeric)
  // This distinguishes it from plain text that happens to be alphanumeric
  const hasBase64Chars = /[+/=]/.test(cleaned);
  if (!hasBase64Chars) return false;

  // Full base64 pattern check
  const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
  // Take a sample to avoid checking huge strings
  const sample = cleaned.slice(0, 1000);
  return base64Pattern.test(sample);
}

/**
 * Intelligently truncate response body content
 * - JSON: parse and truncate values
 * - Binary/Base64: show size indicator
 * - Plain text: truncate with indicator
 */
export function truncateResponseBody(
  body: string,
  base64Encoded: boolean,
  options?: Partial<TruncateOptions>
): { body: string; truncated: boolean; originalLength: number; type: 'json' | 'binary' | 'text' } {
  const maxStringLength = options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  // Handle base64-encoded binary data
  if (base64Encoded || isBase64Binary(body)) {
    // Estimate actual binary size (base64 is ~4/3 of original)
    const estimatedBytes = Math.floor((body.length * 3) / 4);
    return {
      body: formatBinarySize(estimatedBytes),
      truncated: true,
      originalLength: body.length,
      type: 'binary',
    };
  }

  // Try to parse as JSON
  try {
    const parsed = JSON.parse(body);
    const truncated = truncateJsonValues(parsed, { maxStringLength });
    const truncatedBody = JSON.stringify(truncated, null, 2);
    // Check if anything was actually truncated by comparing lengths
    const originalFormatted = JSON.stringify(parsed, null, 2);
    return {
      body: truncatedBody,
      truncated: truncatedBody.length < originalFormatted.length,
      originalLength: body.length,
      type: 'json',
    };
  } catch {
    // Not JSON, treat as plain text
    const result = truncateString(body, maxStringLength);
    return {
      body: result.value,
      truncated: result.truncated,
      originalLength: result.originalLength,
      type: 'text',
    };
  }
}

/**
 * Network entry type for truncation
 */
export interface NetworkEntryForTruncation {
  requestId: string;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  mimeType?: string;
  resourceType: string;
  timestamp: number;
  completed: boolean;
  error?: string;
}

/**
 * Truncate network entry for list view
 * Focuses on URL truncation for cleaner output
 */
export function truncateNetworkEntry<T extends NetworkEntryForTruncation>(
  entry: T,
  options?: Partial<TruncateOptions>
): T {
  const maxStringLength = options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;

  return {
    ...entry,
    url: truncateString(entry.url, maxStringLength).value,
    statusText: entry.statusText
      ? truncateString(entry.statusText, maxStringLength).value
      : entry.statusText,
    error: entry.error ? truncateString(entry.error, maxStringLength).value : entry.error,
  };
}

/**
 * Truncate headers object values
 */
export function truncateHeaders(
  headers: Record<string, string>,
  options?: Partial<TruncateOptions>
): Record<string, string> {
  const maxStringLength = options?.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    result[key] = truncateString(value, maxStringLength).value;
  }

  return result;
}
