import { test } from '@/fixtures/auth.fixture'
import { TAG } from '@/test-constants/tags'

test.describe(
  '[API] Authentication Tests',
  { tag: [TAG.TEST.AUTO, TAG.TYPE.API, TAG.SUITE.AUTH] },
  () => {
    test('User Registration', async ({ authClient, testUser }) => {
      try {
        await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
          const response = await authClient.navigateToLogin()

          await authClient.expectPageAccessible(response)
        })

        await test.step('Complete "New User Signup!" Form with valid User data', async () => {
          // API: Initial signup data (name/email) included in register call
        })

        await test.step('Complete Account Information and verify successful Account creation', async () => {
          const response = await authClient.register(testUser)

          await authClient.expectRegistered(response)
        })
      } finally {
        await authClient.deleteAccount(testUser.email, testUser.password)
      }
    })

    test('Login With Wrong Password', async ({ authenticatedUser, wrongPassword }) => {
      const { testUser, authClient } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        const response = await authClient.navigateToLogin()

        await authClient.expectPageAccessible(response)
      })

      await test.step('Attempt Login with invalid Password and verify Error Message', async () => {
        const response = await authClient.verifyLogin(testUser.email, wrongPassword)

        await authClient.expectLoginFailed(response)
      })
    })

    test('Verify Login Without Email', async ({ authenticatedUser }) => {
      const { testUser, authClient } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        const response = await authClient.navigateToLogin()

        await authClient.expectPageAccessible(response)
      })

      await test.step('Enter Password without Email and verify validation error', async () => {
        const response = await authClient.verifyLogin('', testUser.password)

        await authClient.expectLoginFailed(response)
      })
    })

    test('User Login', async ({ authenticatedUser }) => {
      const { testUser, authClient } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        const response = await authClient.navigateToLogin()

        await authClient.expectPageAccessible(response)
      })

      await test.step('Enter valid login credentials and verify successful authentication', async () => {
        const response = await authClient.verifyLogin(testUser.email, testUser.password)

        await authClient.expectLoginSuccess(response)
      })
    })

    test('Delete User Account', async ({ authenticatedUser }) => {
      const { testUser, authClient } = authenticatedUser

      await test.step('Navigate to and Verify "Signup/Login" Page', async () => {
        const response = await authClient.navigateToLogin()

        await authClient.expectPageAccessible(response)
      })

      await test.step('Enter valid login credentials and verify successful authentication', async () => {
        const response = await authClient.verifyLogin(testUser.email, testUser.password)

        await authClient.expectLoginSuccess(response)
      })

      await test.step('Delete Account and verify Account removal', async () => {
        await authClient.deleteAccount(testUser.email, testUser.password)
        const response = await authClient.verifyLogin(testUser.email, testUser.password)

        await authClient.expectLoginFailed(response)
      })
    })
  }
)
