/**
 * Auth API Schemas
 *
 * NOTE: This site doesn't have Swagger/OpenAPI documentation available.
 * In a production environment with Swagger, these schemas would be auto-generated
 * from the API specification using tools like swagger-typescript-api or openapi-generator.
 *
 * Best practice: Generate schemas from Swagger/OpenAPI to ensure they stay
 * synchronized with the actual API contract and reduce maintenance overhead.
 *
 * For this project, we're manually creating TypeScript interfaces and validation
 * schemas that mirror what would be generated from Swagger.
 */

import { SchemaValidator } from '@/test-utils/schema-validator'

/**
 * Schema wrapper for APIExpect compatibility
 */
export interface APISchema {
  compare: (data: unknown) => string | undefined
}

function createAPISchema(validator: Record<string, (value: unknown) => boolean>): APISchema {
  return {
    compare: (data: unknown) => SchemaValidator.validate(data, validator)
  }
}

export const AuthSchemas = {
  /**
   * User Registration Response Schema
   * Used for: POST /api/createAccount endpoint
   */
  userRegistration: createAPISchema({
    message: SchemaValidator.nonEmptyString(),
    responseCode: SchemaValidator.number()
  }),

  /**
   * User Login Response Schema
   * Used for: POST /api/verifyLogin endpoint
   */
  userLogin: createAPISchema({
    message: SchemaValidator.nonEmptyString(),
    responseCode: SchemaValidator.number()
  }),

  /**
   * User Update Response Schema
   * Used for: PUT /api/updateAccount endpoint
   */
  userUpdate: createAPISchema({
    message: SchemaValidator.nonEmptyString(),
    responseCode: SchemaValidator.number()
  }),

  /**
   * User Delete Response Schema
   * Used for: DELETE /api/deleteAccount endpoint
   */
  userDelete: createAPISchema({
    message: SchemaValidator.nonEmptyString(),
    responseCode: SchemaValidator.number()
  }),

  /**
   * User Logout Response Schema
   * Used for: POST /api/logout endpoint
   */
  userLogout: createAPISchema({
    message: SchemaValidator.nonEmptyString(),
    responseCode: SchemaValidator.number()
  }),

  /**
   * User Detail Response Schema
   * Used for: GET /api/getUserDetailByEmail endpoint
   */
  userDetail: createAPISchema({
    responseCode: SchemaValidator.number()
  })
}
