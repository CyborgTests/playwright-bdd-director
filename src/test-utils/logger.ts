import * as fs from 'node:fs/promises'

import { test } from '@playwright/test'

export async function log(name: string, message: string) {
  if (process.env.NO_LOGS === 'true') {
    return
  }
  try {
    await test.info().attach(name, {
      body: message,
      contentType: 'text/plain'
    })
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

export async function logJson(name: string, data: unknown) {
  if (process.env.NO_LOGS === 'true') {
    return
  }
  const pretty = JSON.stringify(data, null, 2)
  try {
    await test.info().attach(name, {
      body: pretty,
      contentType: 'application/json'
    })
  } catch (error) {
    // Ignore errors when test.info() is not available (e.g., in Artillery context)
    if (
      error instanceof Error &&
      error.message.includes('can only be called while test is running')
    ) {
      return
    }
    throw error
  }
}

export async function logFile(
  name: string,
  content: string | Buffer,
  contentType = 'application/json'
) {
  if (process.env.NO_LOGS === 'true') {
    return
  }
  try {
    const filePath = test.info().outputPath(`${Date.now()}-${name.replace(/[^\w.-]+/g, '_')}`)
    await fs.writeFile(filePath, content)
    await test.info().attach(name, {
      path: filePath,
      contentType
    })
  } catch (error) {
    // Ignore errors when test.info() is not available (e.g., in Artillery context)
    if (
      error instanceof Error &&
      error.message.includes('can only be called while test is running')
    ) {
      return
    }
    throw error
  }
}
