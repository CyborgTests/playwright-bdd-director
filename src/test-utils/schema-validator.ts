/**
 * Schema Validator Class
 *
 * This is a lightweight alternative to Joi that provides similar functionality
 * for validating API responses. In a Swagger-generated environment, we would
 * typically use JSON Schema validators like Ajv, but this custom implementation
 * gives us full control while maintaining similar patterns to Joi.
 *
 * This validator is reusable across different API schemas and follows
 * a similar pattern to Joi for familiarity.
 */
export class SchemaValidator {
  /**
   * Validates response data against expected structure
   * Similar to Joi.validate() but returns error message instead of throwing
   */
  static validate(
    data: unknown,
    schema: Record<string, (value: unknown) => boolean>
  ): string | undefined {
    if (!data || typeof data !== 'object') {
      return 'Response data must be an object'
    }

    const recordData = data as Record<string, unknown>

    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in recordData)) {
        return `Missing required field: ${key}`
      }
      if (!validator(recordData[key])) {
        return `Invalid field format: ${key}`
      }
    }

    return undefined
  }

  /**
   * Creates a string validator
   * Joi equivalent: Joi.string()
   */
  static string(): (value: unknown) => boolean {
    return (value) => typeof value === 'string'
  }

  /**
   * Creates a required string validator
   * Joi equivalent: Joi.string().required()
   */
  static nonEmptyString(): (value: unknown) => boolean {
    return (value) => typeof value === 'string' && value.trim().length > 0
  }

  /**
   * Creates an optional string validator
   * Joi equivalent: Joi.string().optional()
   */
  static optionalString(): (value: unknown) => boolean {
    return (value) => value === undefined || value === null || typeof value === 'string'
  }

  /**
   * Creates a number validator
   * Joi equivalent: Joi.number()
   */
  static number(): (value: unknown) => boolean {
    return (value) => typeof value === 'number' && !isNaN(value)
  }

  /**
   * Creates an object validator
   * Joi equivalent: Joi.object()
   */
  static object(): (value: unknown) => boolean {
    return (value) => typeof value === 'object' && value !== null && !Array.isArray(value)
  }

  /**
   * Creates an array validator
   * Joi equivalent: Joi.array()
   */
  static array(): (value: unknown) => boolean {
    return (value) => Array.isArray(value)
  }

  /**
   * Creates a boolean validator
   * Joi equivalent: Joi.boolean()
   */
  static boolean(): (value: unknown) => boolean {
    return (value) => typeof value === 'boolean'
  }

  /**
   * Creates an enum validator
   * Joi equivalent: Joi.string().valid(...values)
   */
  static enum<T extends string>(...values: T[]): (value: unknown) => boolean {
    return (value) => typeof value === 'string' && values.includes(value as T)
  }
}
