type FieldValidator = (value: unknown) => boolean

/**
 * Schema of a response body for APIExpect.expectMatchSchema: an error message, undefined when
 * the body matches
 */
export interface APISchema {
  compare: (data: unknown) => string | undefined
}

export function createAPISchema(validator: Record<string, FieldValidator>): APISchema {
  return {
    compare: (data: unknown) => SchemaValidator.validate(data, validator)
  }
}

/**
 * Field validators of the schemas in src/schemas - a small dependency-free alternative to Joi or
 * Zod. With an OpenAPI contract, generate the schemas instead (e.g. JSON Schema + Ajv).
 */
export class SchemaValidator {
  /**
   * Every schema field is present and valid; extra fields are allowed
   */
  static validate(data: unknown, schema: Record<string, FieldValidator>): string | undefined {
    if (!data || typeof data !== 'object') {
      return 'Response data must be an object'
    }

    const record = data as Record<string, unknown>
    for (const [key, validator] of Object.entries(schema)) {
      if (!(key in record)) return `Missing required field: ${key}`
      if (!validator(record[key])) return `Invalid field format: ${key}`
    }
    return undefined
  }

  static nonEmptyString(): FieldValidator {
    return (value) => typeof value === 'string' && value.trim().length > 0
  }

  static number(): FieldValidator {
    return (value) => typeof value === 'number' && !isNaN(value)
  }

  static array(): FieldValidator {
    return (value) => Array.isArray(value)
  }
}
