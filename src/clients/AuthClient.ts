import { APIResponse, expect } from '@playwright/test'

import { AuthSchemas } from '@/schemas/auth.schemas'
import { TestUser, UserLoginResponse, UserRegistrationResponse } from '@/schemas/auth.types'
import { APIExpect } from '@/test-utils/APIExpect'

import { BaseClient } from './BaseClient'

/**
 * Auth API client extending BaseClient
 * Provides auth-specific HTTP methods and assertions
 */
export class AuthClient extends BaseClient {
  private readonly registerEndpoint = '/api/createAccount'
  private readonly verifyLoginEndpoint = '/api/verifyLogin'
  private readonly updateAccountEndpoint = '/api/updateAccount'
  private readonly deleteAccountEndpoint = '/api/deleteAccount'
  private readonly logoutEndpoint = '/api/logout'
  private readonly getAccountDetailEndpoint = '/api/getUserDetailByEmail'
  private readonly registeredMsg = 'User created!'
  private readonly loginSuccessMsg = 'User exists!'
  private readonly loginFailedMsg = 'User not found!'
  private readonly logoutSuccessMsg = 'User logout!'

  // Navigation methods (using inherited methods from BaseClient)

  async navigateToHome(): Promise<APIResponse> {
    return this.navigate('/')
  }

  async navigateToLogin(): Promise<APIResponse> {
    return this.navigate('/login')
  }

  async navigateToAccount(): Promise<APIResponse> {
    return this.navigate('/account')
  }

  // Auth API methods

  async register(user: TestUser): Promise<APIResponse> {
    return this.post(this.registerEndpoint, { form: user })
  }

  async verifyLogin(email: string, password: string): Promise<APIResponse> {
    return this.post(this.verifyLoginEndpoint, { form: { email, password } })
  }

  async updateAccount(user: TestUser): Promise<APIResponse> {
    return this.put(this.updateAccountEndpoint, { form: user })
  }

  async deleteAccount(email: string, password: string): Promise<APIResponse> {
    return this.delete(this.deleteAccountEndpoint, { form: { email, password } })
  }

  async logout(): Promise<APIResponse> {
    return this.post(this.logoutEndpoint)
  }

  async getAccountDetail(email: string): Promise<APIResponse> {
    return this.get(this.getAccountDetailEndpoint, { params: { email } })
  }

  // Assertions

  // Using inherited expectPageAccessible from BaseClient

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

  async expectAccountUpdated(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(AuthSchemas.userUpdate)
  }

  async expectAccountDeleted(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(AuthSchemas.userDelete)
  }

  async expectLogoutSuccess(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
    await apiExpect.expectMatchSchema(AuthSchemas.userLogout)
    const data = apiExpect.getData<UserLoginResponse>()
    expect.soft(data.message).toContain(this.logoutSuccessMsg)
  }

  async expectAccountDetailSuccess(response: APIResponse): Promise<void> {
    const apiExpect = new APIExpect(response)
    await apiExpect.expectStatus(200)
  }
}
