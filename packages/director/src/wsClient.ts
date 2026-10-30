import type { TestFile } from './DirectorModel'

let ws: WebSocket | null = null
let messageId = 0
let generationListener: ((event: GenerationEvent) => void) | undefined
const pendingRequests = new Map<
  number,
  { resolve: (data: unknown) => void; reject: (error: string) => void }
>()

/** Regeneration of the tests after a change of specs or source */
export type GenerationEvent = { done: number; total: number } | { seconds: string; failed: boolean }

export function onGeneration(listener: (event: GenerationEvent) => void): void {
  generationListener = listener
}

/** The server accepts only loopback connections with the token it put into uiMode.html */
export function connectWs(port: number, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`)

    ws.onopen = () => resolve()

    ws.onerror = (err) => reject(err)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'GENERATION') generationListener?.(msg.data)
        const pending = pendingRequests.get(msg.id)
        if (pending) {
          pendingRequests.delete(msg.id)
          if (msg.type === 'ERROR') {
            pending.reject(msg.error)
          } else {
            pending.resolve(msg.data)
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    ws.onclose = () => {
      ws = null
    }
  })
}

function sendRequest(type: string, data?: unknown, timeoutMs = 5000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      reject('WebSocket not connected')
      return
    }

    const id = ++messageId
    pendingRequests.set(id, { resolve, reject })

    ws.send(JSON.stringify({ id, type, data }))

    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id)
        reject('Request timeout')
      }
    }, timeoutMs)
  })
}

export async function getFiles(): Promise<TestFile[]> {
  return (await sendRequest('GET_FILES')) as TestFile[]
}

export async function createFile(name: string, content: string) {
  return sendRequest('CREATE_FILE', { name, content })
}

export async function saveFile(name: string, content: string) {
  return sendRequest('SAVE_FILE', { name, content })
}

export async function deleteFile(name: string) {
  return sendRequest('DELETE_FILE', { name })
}

/** `npm run adapt` on the spec: .md ↔ .feature, the new file replaces it (`target`) */
export async function adaptFile(name: string) {
  const result = await sendRequest('ADAPT_FILE', { name }, 60000)
  return result as { output: string; target: string }
}

/**
 * `npm run rename` on the spec: new base name for it and its step file (`target`); `check` only
 * finds out whether the name is free (rejects otherwise)
 */
export async function renameFile(name: string, newName: string, check = false) {
  const result = await sendRequest('RENAME_FILE', { name, newName, check }, 60000)
  return result as { output: string; target: string }
}

/**
 * What a spec line holds (1-based): a step - the pattern of its step definition or its own text -
 * or a title (`label`: Suite, Rule, Test case)
 */
export async function findLine(name: string, line: number) {
  const { output } = (await sendRequest('REWORD_STEP', { name, line }, 60000)) as {
    output: string
  }
  return JSON.parse(output.trim().split('\n').pop()!) as {
    kind: 'step' | 'title'
    text: string
    definition?: string
    label?: string
  }
}

/** `npm run reword -- --at`: a new title for the suite, a rule or a test case at the line */
export async function rewordTitle(name: string, line: number, to: string) {
  const result = await sendRequest('REWORD_STEP', { name, line, to }, 60000)
  return result as { output: string }
}

/** `npm run reword`: the step's new text in every spec and in its step definition pattern */
export async function rewordStep(from: string, to: string) {
  const result = await sendRequest('REWORD_STEP', { from, to }, 60000)
  return result as { output: string }
}

/** "Record run" checkbox: the next run keeps its coverage matrix in the run history or not */
export async function setRecordRun(record: boolean) {
  return sendRequest('SET_RECORD_RUN', { record })
}

export async function runStage() {
  const result = await sendRequest('RUN_STAGE', undefined, 300000)
  return result as { output: string; code: number }
}
