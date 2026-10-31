import { APIResponse, expect } from '@playwright/test'

import { AuthSchemas } from '@/schemas/auth.schemas'
import { TestUser, UserLoginResponse, UserRegistrationResponse } from '@/schemas/auth.types'
import { APIExpect } from '@/test-utils/APIExpect'

import { BaseClient } from './BaseClient'

/**
 * Auth API client: account registration, login check and deletion
 */
export class AuthClient extends BaseClient {
  private readonly registerEndpoint = '/api/createAccount'
  private readonly verifyLoginEndpoint = '/api/verifyLogin'
  private readonly deleteAccountEndpoint = '/api/deleteAccount'
  private readonly registeredMsg = 'User created!'
  private readonly loginSuccessMsg = 'User exists!'
  private readonly loginFailedMsg = 'User not found!'

  async navigateToLogin(): Promise<APIResponse> {
    return this.navigate('/login')
  }

  async register(user: TestUser): Promise<APIResponse> {
    return this.post(this.registerEndpoint, { form: user })
  }

  async verifyLogin(email: string, password: string): Promise<APIResponse> {
    return this.post(this.verifyLoginEndpoint, { form: { email, password } })
  }

  async deleteAccount(email: string, password: string): Promise<APIResponse> {
    return this.delete(this.deleteAccountEndpoint, { form: { email, password } })
  }

  // Assertions

  async expectRegistered(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectContentType('text/html')
    await apiExpect.expectMatchSchema(AuthSchemas.userRegistration)
    const data = apiExpect.getData<UserRegistrationResponse>()
    expect.soft(data.responseCode).toBe(201)
    expect.soft(data.message).toContain(this.registeredMsg)
  }

  async expectLoginSuccess(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(AuthSchemas.userLogin)
    const data = apiExpect.getData<UserLoginResponse>()
    expect.soft(data.message).toContain(this.loginSuccessMsg)
  }

  async expectLoginFailed(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(AuthSchemas.userLogin)
    const data = apiExpect.getData<UserLoginResponse>()
    expect.soft(data.message).toContain(this.loginFailedMsg)
  }
}
