import { Step } from './bdd'

Step('Verify Login Page is accessible', async ({ authClient }) => {
  const response = await authClient.navigateToLogin()

  await authClient.expectPageAccessible(response)
})

Step('Register New User and verify Account is created', async ({ authClient, testUser }) => {
  const response = await authClient.register(testUser)

  await authClient.expectRegistered(response)
})

Step(
  'Verify Login with wrong Password is rejected',
  async ({ authClient, registeredUser, wrongPassword }) => {
    const response = await authClient.verifyLogin(registeredUser.email, wrongPassword)

    await authClient.expectLoginFailed(response)
  }
)

Step('Verify Login without Email is rejected', async ({ authClient, registeredUser }) => {
  const response = await authClient.verifyLogin('', registeredUser.password)

  await authClient.expectLoginFailed(response)
})

Step('Verify Login with valid credentials succeeds', async ({ authClient, registeredUser }) => {
  const response = await authClient.verifyLogin(registeredUser.email, registeredUser.password)

  await authClient.expectLoginSuccess(response)
})

Step(
  'Delete Account and verify Login is rejected afterwards',
  async ({ authClient, registeredUser }) => {
    const deleted = await authClient.deleteAccount(registeredUser.email, registeredUser.password)

    await authClient.expectAccountDeleted(deleted)

    const response = await authClient.verifyLogin(registeredUser.email, registeredUser.password)

    await authClient.expectLoginFailed(response)
  }
)

// Skeleton from `npm run steps auth-api`: an API test with a step without code stays test.fixme
Step('Update City and verify it is saved', async ({}) => {
  // TODO: implement step
})
