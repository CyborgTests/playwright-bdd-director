import type { TestFile } from './DirectorModel'

let ws: WebSocket | null = null
let messageId = 0
const pendingRequests = new Map<
  number,
  { resolve: (data: unknown) => void; reject: (error: string) => void }
>()

/** The server accepts only loopback connections with the token it put into uiMode.html */
export function connectWs(port: number, token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ws = new WebSocket(`ws://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`)

    ws.onopen = () => resolve()

    ws.onerror = (err) => reject(err)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
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

export async function runStage() {
  const result = await sendRequest('RUN_STAGE', undefined, 300000)
  return result as { output: string; code: number }
}
