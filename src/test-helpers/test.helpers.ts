/** Keys whose values never reach logs and reports */
const SENSITIVE_PATTERNS = [/password/i, /token/i, /secret/i, /credential/i, /auth/i, /key/i]

const MASK = '***MASKED***'

/**
 * Copy of a value with sensitive fields masked and emails reduced to their domain - for
 * request / response details attached to reports
 */
export function sanitizeObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitizeObject)
  if (value === null || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).map(([key, field]) => {
      if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) return [key, MASK]
      if (/email/i.test(key) && typeof field === 'string' && field.includes('@')) {
        return [key, `***@${field.split('@')[1]}`]
      }
      return [key, sanitizeObject(field)]
    })
  )
}
