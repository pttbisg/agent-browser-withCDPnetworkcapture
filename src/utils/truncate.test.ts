import { describe, it, expect } from 'vitest';
import {
  truncateString,
  truncateJsonValues,
  truncateResponseBody,
  truncateNetworkEntry,
  truncateHeaders,
  formatBinarySize,
  isBase64Binary,
} from './truncate.js';

describe('truncateString', () => {
  it('should not truncate strings shorter than maxLength', () => {
    const result = truncateString('hello world', 500);
    expect(result.value).toBe('hello world');
    expect(result.truncated).toBe(false);
    expect(result.originalLength).toBe(11);
  });

  it('should truncate strings longer than maxLength', () => {
    const longString = 'a'.repeat(600);
    const result = truncateString(longString, 100);
    expect(result.truncated).toBe(true);
    expect(result.originalLength).toBe(600);
    expect(result.value).toContain('...[+');
    expect(result.value).toContain('chars]');
  });

  it('should use default maxLength of 500', () => {
    const longString = 'a'.repeat(600);
    const result = truncateString(longString);
    expect(result.truncated).toBe(true);
  });

  it('should not truncate string of exactly maxLength', () => {
    const exactString = 'a'.repeat(100);
    const result = truncateString(exactString, 100);
    expect(result.truncated).toBe(false);
    expect(result.value).toBe(exactString);
  });
});

describe('truncateJsonValues', () => {
  it('should handle null', () => {
    expect(truncateJsonValues(null)).toBe(null);
  });

  it('should handle undefined', () => {
    expect(truncateJsonValues(undefined)).toBe(undefined);
  });

  it('should not modify numbers', () => {
    expect(truncateJsonValues(12345)).toBe(12345);
  });

  it('should not modify booleans', () => {
    expect(truncateJsonValues(true)).toBe(true);
    expect(truncateJsonValues(false)).toBe(false);
  });

  it('should truncate long strings', () => {
    const longString = 'a'.repeat(600);
    const result = truncateJsonValues(longString, { maxStringLength: 100 });
    expect(typeof result).toBe('string');
    expect((result as string).length).toBeLessThan(longString.length);
  });

  it('should preserve short strings', () => {
    const result = truncateJsonValues('hello', { maxStringLength: 100 });
    expect(result).toBe('hello');
  });

  it('should recursively truncate arrays', () => {
    const input = ['a'.repeat(100), 'short', 'b'.repeat(100)];
    const result = truncateJsonValues(input, { maxStringLength: 50 }) as string[];
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toContain('...[+');
    expect(result[1]).toBe('short');
    expect(result[2]).toContain('...[+');
  });

  it('should recursively truncate objects', () => {
    const input = {
      short: 'hello',
      long: 'x'.repeat(200),
      nested: {
        alsoLong: 'y'.repeat(200),
      },
    };
    const result = truncateJsonValues(input, { maxStringLength: 100 }) as Record<string, unknown>;
    expect(result.short).toBe('hello');
    expect(result.long).toContain('...[+');
    expect((result.nested as Record<string, unknown>).alsoLong).toContain('...[+');
  });

  it('should preserve object keys', () => {
    const input = { veryLongKeyNameThatShouldNotBeTruncated: 'value' };
    const result = truncateJsonValues(input, { maxStringLength: 10 }) as Record<string, unknown>;
    expect('veryLongKeyNameThatShouldNotBeTruncated' in result).toBe(true);
  });
});

describe('truncateResponseBody', () => {
  it('should detect and handle base64 binary data', () => {
    const base64Data = btoa('x'.repeat(1000));
    const result = truncateResponseBody(base64Data, true);
    expect(result.type).toBe('binary');
    expect(result.truncated).toBe(true);
    expect(result.body).toContain('Binary data');
  });

  it('should parse and truncate JSON bodies', () => {
    const jsonBody = JSON.stringify({ value: 'x'.repeat(1000) });
    const result = truncateResponseBody(jsonBody, false, { maxStringLength: 100 });
    expect(result.type).toBe('json');
    const parsed = JSON.parse(result.body);
    expect(parsed.value).toContain('...[+');
  });

  it('should truncate plain text bodies', () => {
    const textBody = 'x'.repeat(1000);
    const result = truncateResponseBody(textBody, false, { maxStringLength: 100 });
    expect(result.type).toBe('text');
    expect(result.truncated).toBe(true);
    expect(result.body).toContain('...[+');
  });

  it('should preserve short JSON bodies', () => {
    const jsonBody = JSON.stringify({ short: 'value' });
    const result = truncateResponseBody(jsonBody, false, { maxStringLength: 500 });
    expect(result.type).toBe('json');
    expect(result.truncated).toBe(false);
  });
});

describe('truncateNetworkEntry', () => {
  it('should truncate URL', () => {
    const entry = {
      requestId: '123',
      method: 'GET',
      url: 'https://example.com/' + 'x'.repeat(600),
      resourceType: 'Document',
      timestamp: Date.now(),
      completed: true,
    };
    const result = truncateNetworkEntry(entry, { maxStringLength: 100 });
    expect(result.url).toContain('...[+');
    expect(result.requestId).toBe('123');
    expect(result.method).toBe('GET');
  });

  it('should handle optional fields', () => {
    const entry = {
      requestId: '123',
      method: 'GET',
      url: 'https://example.com',
      resourceType: 'Document',
      timestamp: Date.now(),
      completed: true,
      status: 200,
      statusText: 'OK',
      error: undefined,
    };
    const result = truncateNetworkEntry(entry, { maxStringLength: 500 });
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
  });
});

describe('truncateHeaders', () => {
  it('should truncate long header values', () => {
    const headers = {
      'Content-Type': 'application/json',
      'X-Long-Header': 'x'.repeat(1000),
    };
    const result = truncateHeaders(headers, { maxStringLength: 100 });
    expect(result['Content-Type']).toBe('application/json');
    expect(result['X-Long-Header']).toContain('...[+');
  });

  it('should preserve short header values', () => {
    const headers = {
      'Content-Type': 'application/json',
      Accept: '*/*',
    };
    const result = truncateHeaders(headers);
    expect(result['Content-Type']).toBe('application/json');
    expect(result['Accept']).toBe('*/*');
  });
});

describe('formatBinarySize', () => {
  it('should format bytes', () => {
    expect(formatBinarySize(500)).toBe('[Binary data: 500 B]');
  });

  it('should format kilobytes', () => {
    expect(formatBinarySize(5000)).toBe('[Binary data: 4.9 KB]');
  });

  it('should format megabytes', () => {
    expect(formatBinarySize(5000000)).toBe('[Binary data: 4.8 MB]');
  });
});

describe('isBase64Binary', () => {
  it('should detect base64 encoded data', () => {
    const base64 = btoa('x'.repeat(100));
    expect(isBase64Binary(base64)).toBe(true);
  });

  it('should reject short strings', () => {
    expect(isBase64Binary('short')).toBe(false);
  });

  it('should reject non-base64 strings', () => {
    const notBase64 = 'This is not base64 encoded data! @#$%^&*()';
    expect(isBase64Binary(notBase64)).toBe(false);
  });
});
