/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * List of sensitive key patterns that should be masked in logs
 */
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /credential/i,
  /auth/i,
  /key/i,
  /apikey/i,
  /api_key/i
]

/**
 * Checks if a key name contains sensitive information
 */
function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))
}

/**
 * Sanitizes a single value - masks it if the key is sensitive
 */
export function sanitizeValue(key: string, value: any): string {
  if (isSensitiveKey(key)) {
    return '***MASKED***'
  }

  // Partially mask email addresses (show domain only)
  if (key.toLowerCase().includes('email') && typeof value === 'string' && value.includes('@')) {
    const [, domain] = value.split('@')
    return `***@${domain}`
  }

  return JSON.stringify(value)
}

/**
 * Recursively sanitizes an object, masking sensitive fields
 */
export function sanitizeObject(object: any): any {
  if (object === null || object === undefined) {
    return object
  }

  if (typeof object !== 'object') {
    return object
  }

  if (Array.isArray(object)) {
    return object.map((item) => sanitizeObject(item))
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(object)) {
    if (isSensitiveKey(key)) {
      sanitized[key] = '***MASKED***'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value)
    } else if (
      key.toLowerCase().includes('email') &&
      typeof value === 'string' &&
      value.includes('@')
    ) {
      const [, domain] = value.split('@')
      sanitized[key] = `***@${domain ?? ''}`
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}
