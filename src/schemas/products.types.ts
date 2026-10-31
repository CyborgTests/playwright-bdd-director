/**
 * Products API Types
 *
 * TypeScript interfaces for the catalog API responses (observed behavior, no published contract).
 */

export interface Product {
  id: number
  name: string
  price: string // "Rs. 500"
  brand: string
  category: { usertype: { usertype: string }; category: string }
}

export interface ProductsListResponse {
  responseCode: number
  products: Product[]
}

/** Error responses: HTTP 200 with the error code in the body */
export interface ErrorResponse {
  responseCode: number
  message: string
}
