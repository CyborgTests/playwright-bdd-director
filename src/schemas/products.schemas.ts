/**
 * Products API Schemas
 *
 * NOTE: The catalog API has no published contract - these schemas encode observed behavior.
 */

import { createAPISchema, SchemaValidator } from '@/test-utils/schema-validator'

export const ProductsSchemas = {
  /**
   * Used for: GET /api/productsList, POST /api/searchProduct
   */
  productsList: createAPISchema({
    responseCode: SchemaValidator.number(),
    products: SchemaValidator.array()
  }),

  /**
   * Error body of every catalog endpoint: unsupported method, missing parameter
   */
  error: createAPISchema({
    responseCode: SchemaValidator.number(),
    message: SchemaValidator.nonEmptyString()
  })
}
