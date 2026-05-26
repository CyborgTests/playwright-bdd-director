/**
 * Auth API Types
 *
 * TypeScript interfaces for authentication API responses.
 * These types are based on the actual API documentation from api_list.
 */

/**
 * Test user data for auth API requests
 */
export interface TestUser {
  name: string
  email: string
  password: string
  title: string
  birth_day: string
  birth_month: string
  birth_year: string
  firstname: string
  lastname: string
  address1: string
  country: string
  state: string
  city: string
  zipcode: string
  mobile_number: string
  [key: string]: string | number | boolean
}

/**
 * Base API Response interface
 */
export interface BaseAPIResponse {
  message: string
  data?: unknown
}

/**
 * User Registration Response Schema
 * Used for: POST /api/createAccount endpoint
 */
export interface UserRegistrationResponse {
  message: string // "User created!"
  responseCode: number // 201
}

/**
 * User Login Response Schema
 * Used for: POST /api/verifyLogin endpoint
 */
export interface UserLoginResponse {
  message: string // "User exists!" or "User not found!"
  responseCode: number // 200 or 404
}

/**
 * User Update Response Schema
 * Used for: PUT /api/updateAccount endpoint
 */
export interface UserUpdateResponse {
  message: string // "User updated!"
  responseCode: number // 200
}

/**
 * User Delete Response Schema
 * Used for: DELETE /api/deleteAccount endpoint
 */
export interface UserDeleteResponse {
  message: string // "Account deleted!"
  responseCode: number // 200
}

/**
 * User Detail Response Schema
 * Used for: GET /api/getUserDetailByEmail endpoint
 */
export interface UserDetailResponse {
  responseCode: number // 200
  // User detail JSON structure (varies based on user data)
}
