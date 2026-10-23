/**
 * ShopLedger Structured Redacting Logger
 *
 * Automatically redacts sensitive fields like authorization tokens, passwords,
 * private keys, images, and base64 payloads to comply with security requirements.
 */

const SENSITIVE_KEYS = new Set([
  'authorization',
  'token',
  'idtoken',
  'refreshtoken',
  'password',
  'secret',
  'privatekey',
  'image',
  'imagedata',
  'buffer',
  'base64',
]);

function redact(data: unknown): unknown {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;

  if (Array.isArray(data)) {
    return data.map((item) => redact(item));
  }

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'string' && val.length > 500 && (lowerKey.includes('image') || lowerKey.includes('base64'))) {
      result[key] = '[REDACTED_LARGE_STRING]';
    } else if (typeof val === 'object') {
      result[key] = redact(val);
    } else {
      result[key] = val;
    }
  }
  return result;
}

export const logger = {
  info(message: string, context?: unknown) {
    console.log(`[INFO]  ${new Date().toISOString()} - ${message}`, context ? JSON.stringify(redact(context)) : '');
  },
  warn(message: string, context?: unknown) {
    console.warn(`[WARN]  ${new Date().toISOString()} - ${message}`, context ? JSON.stringify(redact(context)) : '');
  },
  error(message: string, error?: unknown) {
    const errorDetails = error instanceof Error
      ? { name: error.name, message: error.message }
      : error;
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, errorDetails ? JSON.stringify(redact(errorDetails)) : '');
  },
  debug(message: string, context?: unknown) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, context ? JSON.stringify(redact(context)) : '');
    }
  },
};
