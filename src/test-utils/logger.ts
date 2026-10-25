import * as fs from 'node:fs/promises'

import { test, type TestInfo } from '@playwright/test'

/**
 * Report attachments of the running test; NO_LOGS=true turns them off. Outside a test (hooks of
 * other tools, scripts) they are skipped instead of failing.
 */
async function attach(name: string, options: Parameters<TestInfo['attach']>[1]): Promise<void> {
  if (process.env.NO_LOGS === 'true') return
  try {
    await test.info().attach(name, options)
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('can only be called while test is running')
    ) {
      return
    }
    throw error
  }
}

export async function log(name: string, message: string): Promise<void> {
  await attach(name, { body: message, contentType: 'text/plain' })
}

export async function logJson(name: string, data: unknown): Promise<void> {
  await attach(name, { body: JSON.stringify(data, null, 2), contentType: 'application/json' })
}

/** A file in the test output folder, attached - for content too big or binary for the body */
export async function logFile(
  name: string,
  content: string | Buffer,
  contentType = 'application/json'
): Promise<void> {
  if (process.env.NO_LOGS === 'true') return
  let filePath: string
  try {
    filePath = test.info().outputPath(`${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`)
  } catch {
    return // not inside a test
  }
  await fs.writeFile(filePath, content)
  await attach(name, { path: filePath, contentType })
}
